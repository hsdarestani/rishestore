import { PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "crypto";
import { execFileSync } from "child_process";
import { mkdirSync, statSync } from "fs";

const db = new PrismaClient();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function incident(fingerprint, title, message, severity = "warning") {
  await db.systemIncident.upsert({
    where: { fingerprint },
    create: { fingerprint, title, message, severity, status: "open", occurrences: 1, lastSeenAt: new Date() },
    update: { title, message, severity, status: "open", occurrences: { increment: 1 }, lastSeenAt: new Date(), resolvedAt: null },
  });
}

async function finish(job, status, error = null, nextRunAt = null) {
  await db.operationJob.update({
    where: { id: job.id },
    data: { status, lastError: error, nextRunAt },
  });
}

async function processBackup(job) {
  mkdirSync("/backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = "/backups/rishe-" + stamp + ".sql.gz";
  execFileSync("sh", ["-c", 'pg_dump "$DATABASE_URL" | gzip -c > "$BACKUP_FILE"'], {
    stdio: "inherit",
    env: { ...process.env, BACKUP_FILE: filename },
  });
  const size = statSync(filename).size;
  const checksum = execFileSync("sha256sum", [filename], { encoding: "utf8" }).trim().split(/\s+/)[0];
  await db.backupRecord.create({
    data: {
      filename,
      checksum,
      sizeBytes: Math.min(size, 2147483647),
      status: "verified",
      verifiedAt: new Date(),
      createdBy: String(job.payload?.requestedBy || "") || null,
    },
  });
  await finish(job, "completed");
}

async function processTax(job) {
  const endpoint = String(process.env.TAX_SUBMIT_ENDPOINT || "").trim();
  const token = String(process.env.TAX_API_TOKEN || "").trim();
  if (!endpoint || !token) {
    const next = new Date(Date.now() + 6 * 60 * 60 * 1000);
    await finish(job, "wait_retry", "TAX_SUBMIT_ENDPOINT/TAX_API_TOKEN not configured", next);
    await incident("tax-provider-not-configured", "ارسال سامانه مودیان تنظیم نشده", "صورتحساب در صف مانده چون Endpoint یا Token سامانه مالیاتی روی سرور تنظیم نشده است.");
    return;
  }

  const invoice = await db.taxInvoice.findUnique({ where: { id: job.aggregateId || "" } });
  if (!invoice) throw new Error("Tax invoice not found");
  const lines = await db.taxInvoiceLine.findMany({ where: { taxInvoiceId: invoice.id } });
  const attempt = await db.taxSubmission.count({ where: { taxInvoiceId: invoice.id } }) + 1;
  const payload = { invoice, lines };
  const requestHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + token, "x-idempotency-key": "rishe-tax-" + invoice.id },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));

  await db.taxSubmission.create({
    data: {
      publicId: randomUUID(),
      taxInvoiceId: invoice.id,
      attemptNumber: attempt,
      status: response.ok ? "submitted" : "failed",
      referenceNumber: body?.referenceNumber ? String(body.referenceNumber) : body?.reference ? String(body.reference) : null,
      requestHash,
      response: body,
    },
  });

  await db.taxEvent.create({
    data: { taxInvoiceId: invoice.id, eventType: response.ok ? "submitted" : "submit_failed", status: response.ok ? "submitted" : "failed", payloadHash: requestHash, payload: body },
  });

  if (!response.ok) throw new Error("Tax provider returned " + response.status);

  await db.taxInvoice.update({
    where: { id: invoice.id },
    data: { status: "submitted", submittedAt: new Date(), referenceId: body?.referenceNumber ? String(body.referenceNumber) : undefined },
  });
  await finish(job, "completed");
}

async function releaseExpiredReservations() {
  const expired = await db.inventoryReservation.findMany({ where: { status: "active", expiresAt: { lt: new Date() } } });
  for (const r of expired) {
    await db.$transaction(async (tx) => {
      if (r.batchId) {
        const batch = await tx.inventoryBatch.findUnique({ where: { id: r.batchId } });
        if (batch?.reserved) await tx.inventoryBatch.update({ where: { id: batch.id }, data: { reserved: { decrement: Math.min(batch.reserved, r.quantity) } } });
      }
      await tx.inventoryReservation.update({ where: { id: r.id }, data: { status: "expired", releasedAt: new Date() } });
    });
  }
}

async function refreshAlerts() {
  const products = await db.product.findMany({ where: { active: true } });
  for (const p of products) {
    const fingerprint = "low-stock:" + p.id;
    if (p.stock <= 5) {
      await db.analyticsAlert.upsert({
        where: { fingerprint },
        create: { alertKey: randomUUID(), fingerprint, ruleCode: "LOW_STOCK", severity: p.stock <= 0 ? "critical" : "warning", title: "موجودی پایین " + p.name, message: "موجودی فعلی: " + p.stock, entityType: "product", entityId: p.id, status: "open" },
        update: { severity: p.stock <= 0 ? "critical" : "warning", status: "open", message: "موجودی فعلی: " + p.stock, lastSeenAt: new Date(), resolvedAt: null },
      });
    } else {
      await db.analyticsAlert.updateMany({ where: { fingerprint, status: { not: "resolved" } }, data: { status: "resolved", resolvedAt: new Date(), lastSeenAt: new Date() } });
    }
  }
}

async function processJobs() {
  const now = new Date();
  const jobs = await db.operationJob.findMany({
    where: {
      status: { in: ["pending", "wait_retry"] },
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  for (const job of jobs) {
    const claimed = await db.operationJob.updateMany({
      where: { id: job.id, status: { in: ["pending", "wait_retry"] } },
      data: { status: "running", attempts: { increment: 1 }, lastError: null },
    });
    if (!claimed.count) continue;

    const fresh = await db.operationJob.findUnique({ where: { id: job.id } });
    if (!fresh) continue;

    try {
      if (fresh.type === "database_backup") await processBackup(fresh);
      else if (fresh.type === "tax_submit") await processTax(fresh);
      else await finish(fresh, "completed");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attempts = fresh.attempts;
      if (attempts >= fresh.maxAttempts) {
        await finish(fresh, "failed", message);
        await incident("job-failed:" + fresh.type + ":" + (fresh.aggregateId || fresh.id), "Job ناموفق: " + fresh.type, message, "error");
      } else {
        const delay = Math.min(3600_000, Math.pow(2, attempts) * 60_000);
        await finish(fresh, "wait_retry", message, new Date(Date.now() + delay));
      }
    }
  }
}

async function main() {
  console.log("Rishe worker started");
  while (true) {
    try {
      await releaseExpiredReservations();
      await refreshAlerts();
      await processJobs();
    } catch (error) {
      console.error("worker loop", error);
    }
    await sleep(15000);
  }
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
