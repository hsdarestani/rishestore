import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { assertSameOrigin, hasCapability, requireCapability } from "@/lib/auth";

const str = (value: unknown) => String(value ?? "").trim();
const int = (value: unknown, min = 0) => {
  const parsed = Math.trunc(Number(value ?? 0));
  return Number.isFinite(parsed) ? Math.max(min, parsed) : min;
};
const optional = (value: unknown) => str(value) || null;
const code = (prefix: string) => prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

function capabilityForAction(action: string) {
  if (/^(warehouse|inventory|bom|production)\./.test(action)) return "inventory.write";
  if (/^(supplier|purchase)\./.test(action)) return "procurement.write";
  if (/^(account|voucher|treasury|tax)\./.test(action)) return "finance.write";
  if (/^manual-sale\./.test(action)) return "sales.write";
  if (/^(b2b|consignment)\./.test(action)) return "b2b.write";
  if (/^(carrier|shipment)\./.test(action)) return "logistics.write";
  if (/^goal\./.test(action)) return "analytics.write";
  if (/^(job|incident)\./.test(action)) return "operations.write";
  return "admin.access";
}

async function audit(userId: string, action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>) {
  await db.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId: entityId || null,
      correlationId: randomUUID(),
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}

async function consumeFromWarehouse(tx: any, warehouseId: string, productId: string, quantity: number, refType: string, refId: string) {
  let remaining = quantity;
  let totalCost = 0;
  const batches = await tx.inventoryBatch.findMany({
    where: { warehouseId, productId, quantity: { gt: 0 } },
    orderBy: [{ receivedAt: "asc" }, { id: "asc" }],
  });

  for (const batch of batches) {
    if (remaining <= 0) break;
    const available = Math.max(0, batch.quantity - batch.reserved);
    if (available <= 0) continue;
    const take = Math.min(available, remaining);
    await tx.inventoryBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: take } } });
    await tx.inventoryMovement.create({
      data: {
        warehouseId,
        productId,
        type: "issue",
        quantity: -take,
        unitCost: batch.unitCost,
        referenceType: refType,
        referenceId: refId,
      },
    });
    totalCost += take * batch.unitCost;
    remaining -= take;
  }

  if (remaining > 0) throw new Error("INSUFFICIENT_STOCK");
  return totalCost;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireCapability("admin.access");
    if (!admin) return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });

    const body = await request.json();
    const action = str(body.action);
    const required = capabilityForAction(action);
    if (!hasCapability(admin, required)) return NextResponse.json({ error: "برای این بخش دسترسی کافی ندارید." }, { status: 403 });
    let result: any = null;

    switch (action) {
      case "warehouse.create": {
        const name = str(body.name);
        if (!name) return NextResponse.json({ error: "نام انبار لازم است." }, { status: 400 });
        result = await db.warehouse.create({
          data: { code: str(body.code) || code("WH"), name, address: optional(body.address) },
        });
        await audit(admin.id, action, "warehouse", result.id);
        break;
      }

      case "inventory.receive": {
        const warehouseId = str(body.warehouseId);
        const productId = str(body.productId);
        const quantity = int(body.quantity, 1);
        const unitCost = int(body.unitCost);
        const batchCode = str(body.batchCode) || code("BATCH");
        result = await db.$transaction(async (tx) => {
          const batch = await tx.inventoryBatch.upsert({
            where: { warehouseId_productId_batchCode: { warehouseId, productId, batchCode } },
            create: { warehouseId, productId, batchCode, quantity, unitCost, notes: optional(body.notes) },
            update: { quantity: { increment: quantity }, unitCost, notes: optional(body.notes) },
          });
          await tx.inventoryMovement.create({
            data: { warehouseId, productId, type: "receipt", quantity, unitCost, referenceType: "manual_receipt", referenceId: batch.id, note: optional(body.notes) },
          });
          await tx.product.update({ where: { id: productId }, data: { stock: { increment: quantity } } });
          return batch;
        });
        await audit(admin.id, action, "inventory_batch", result.id, { quantity, unitCost });
        break;
      }

      case "inventory.transfer": {
        const fromWarehouseId = str(body.fromWarehouseId);
        const toWarehouseId = str(body.toWarehouseId);
        const productId = str(body.productId);
        const quantity = int(body.quantity, 1);
        if (!fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId) {
          return NextResponse.json({ error: "مبدأ و مقصد انتقال باید متفاوت باشند." }, { status: 400 });
        }
        const transferCode = code("TR");
        result = await db.$transaction(async (tx) => {
          const cost = await consumeFromWarehouse(tx, fromWarehouseId, productId, quantity, "transfer", transferCode);
          const averageCost = quantity > 0 ? Math.round(cost / quantity) : 0;
          const batch = await tx.inventoryBatch.upsert({
            where: { warehouseId_productId_batchCode: { warehouseId: toWarehouseId, productId, batchCode: transferCode } },
            create: { warehouseId: toWarehouseId, productId, batchCode: transferCode, quantity, unitCost: averageCost },
            update: { quantity: { increment: quantity } },
          });
          await tx.inventoryMovement.create({
            data: { warehouseId: toWarehouseId, productId, type: "transfer_in", quantity, unitCost: averageCost, referenceType: "transfer", referenceId: transferCode },
          });
          return batch;
        });
        await audit(admin.id, action, "inventory_transfer", transferCode, { productId, quantity });
        break;
      }

      case "supplier.create": {
        const name = str(body.name);
        if (!name) return NextResponse.json({ error: "نام تأمین‌کننده لازم است." }, { status: 400 });
        result = await db.supplier.create({
          data: { code: str(body.code) || code("SUP"), name, phone: optional(body.phone), email: optional(body.email), taxId: optional(body.taxId), address: optional(body.address), notes: optional(body.notes) },
        });
        await audit(admin.id, action, "supplier", result.id);
        break;
      }

      case "purchase.create": {
        const supplierId = str(body.supplierId);
        const productId = str(body.productId);
        const quantity = int(body.quantity, 1);
        const unitPrice = int(body.unitPrice);
        const total = quantity * unitPrice;
        result = await db.purchaseOrder.create({
          data: {
            code: code("PO"),
            supplierId,
            status: "draft",
            subtotal: total,
            total,
            notes: optional(body.notes),
            items: { create: [{ productId, quantity, unitPrice, total }] },
          },
        });
        await audit(admin.id, action, "purchase_order", result.id, { total });
        break;
      }

      case "purchase.status": {
        const id = str(body.id);
        const status = str(body.status);
        const allowed = new Set(["draft", "approved", "ordered", "part_received", "received", "cancelled"]);
        if (!allowed.has(status)) return NextResponse.json({ error: "وضعیت خرید معتبر نیست." }, { status: 400 });
        result = await db.purchaseOrder.update({ where: { id }, data: { status } });
        await audit(admin.id, action, "purchase_order", id, { status });
        break;
      }

      case "bom.create": {
        const productId = str(body.productId);
        const materialProductId = str(body.materialProductId);
        const outputQuantity = int(body.outputQuantity, 1);
        const materialQuantity = int(body.materialQuantity, 1);
        const latest = await db.bom.findFirst({ where: { productId }, orderBy: { version: "desc" } });
        result = await db.bom.create({
          data: {
            code: code("BOM"),
            productId,
            version: (latest?.version || 0) + 1,
            outputQuantity,
            active: Boolean(body.active),
            notes: optional(body.notes),
            items: { create: [{ materialProductId, quantity: materialQuantity, wasteBps: int(body.wasteBps) }] },
          },
        });
        await audit(admin.id, action, "bom", result.id);
        break;
      }

      case "production.run": {
        const bomId = str(body.bomId);
        const warehouseId = str(body.warehouseId);
        const quantity = int(body.quantity, 1);
        const laborCost = int(body.laborCost);
        const wasteCost = int(body.wasteCost);
        const bom = await db.bom.findUnique({ where: { id: bomId }, include: { items: true } });
        if (!bom) return NextResponse.json({ error: "فرمول تولید پیدا نشد." }, { status: 404 });
        const runCode = code("PR");
        result = await db.$transaction(async (tx) => {
          let materialCost = 0;
          for (const item of bom.items) {
            const needed = Math.ceil((item.quantity * quantity) / bom.outputQuantity);
            materialCost += await consumeFromWarehouse(tx, warehouseId, item.materialProductId, needed, "production", runCode);
            await tx.product.update({ where: { id: item.materialProductId }, data: { stock: { decrement: needed } } });
          }
          const outputQty = quantity;
          const totalCost = materialCost + laborCost + wasteCost;
          const unitCost = outputQty ? Math.round(totalCost / outputQty) : 0;
          const run = await tx.productionRun.create({
            data: { code: runCode, bomId, warehouseId, quantity: outputQty, status: "completed", materialCost, laborCost, wasteCost, totalCost, startedAt: new Date(), completedAt: new Date(), notes: optional(body.notes) },
          });
          await tx.inventoryBatch.create({
            data: { warehouseId, productId: bom.productId, batchCode: runCode, quantity: outputQty, unitCost, notes: "خروجی تولید " + runCode },
          });
          await tx.inventoryMovement.create({
            data: { warehouseId, productId: bom.productId, type: "production_output", quantity: outputQty, unitCost, referenceType: "production", referenceId: run.id },
          });
          await tx.product.update({ where: { id: bom.productId }, data: { stock: { increment: outputQty } } });
          return run;
        });
        await audit(admin.id, action, "production_run", result.id);
        break;
      }

      case "account.create": {
        const accountCode = str(body.code);
        const name = str(body.name);
        if (!accountCode || !name) return NextResponse.json({ error: "کد و نام حساب لازم است." }, { status: 400 });
        result = await db.accountingAccount.create({
          data: { code: accountCode, name, type: str(body.type) || "asset", level: int(body.level, 1), parentId: optional(body.parentId) },
        });
        await audit(admin.id, action, "accounting_account", result.id);
        break;
      }

      case "voucher.create": {
        const debitAccountId = str(body.debitAccountId);
        const creditAccountId = str(body.creditAccountId);
        const amount = int(body.amount, 1);
        result = await db.voucher.create({
          data: {
            code: code("JV"),
            status: str(body.status) === "posted" ? "posted" : "draft",
            description: optional(body.description),
            sourceType: "manual",
            totalDebit: amount,
            totalCredit: amount,
            postedAt: str(body.status) === "posted" ? new Date() : null,
            lines: {
              create: [
                { accountId: debitAccountId, debit: amount, credit: 0, description: optional(body.description) },
                { accountId: creditAccountId, debit: 0, credit: amount, description: optional(body.description) },
              ],
            },
          },
        });
        await audit(admin.id, action, "voucher", result.id, { amount });
        break;
      }

      case "treasury.account.create": {
        const name = str(body.name);
        result = await db.treasuryAccount.create({
          data: { code: str(body.code) || code("TA"), name, type: str(body.type) || "bank", iban: optional(body.iban), cardNumber: optional(body.cardNumber), accountNo: optional(body.accountNo) },
        });
        await audit(admin.id, action, "treasury_account", result.id);
        break;
      }

      case "treasury.transaction.create": {
        const amount = int(body.amount, 1);
        result = await db.treasuryTransaction.create({
          data: { accountId: str(body.accountId), direction: str(body.direction) === "debit" ? "debit" : "credit", amount, description: optional(body.description), sourceType: "manual", externalId: optional(body.externalId) },
        });
        await audit(admin.id, action, "treasury_transaction", result.id, { amount });
        break;
      }

      case "manual-sale.create": {
        const productId = str(body.productId);
        const warehouseId = str(body.warehouseId);
        const quantity = int(body.quantity, 1);
        const product = await db.product.findUnique({ where: { id: productId } });
        if (!product) return NextResponse.json({ error: "محصول پیدا نشد." }, { status: 404 });
        const unitPrice = int(body.unitPrice) || product.price;
        const total = unitPrice * quantity;
        const saleCode = code("SALE");
        result = await db.$transaction(async (tx) => {
          if (warehouseId) {
            await consumeFromWarehouse(tx, warehouseId, productId, quantity, "manual_sale", saleCode);
          }
          await tx.product.update({ where: { id: productId }, data: { stock: { decrement: quantity } } });
          return tx.manualSale.create({
            data: {
              code: saleCode,
              channel: str(body.channel) || "event",
              eventName: optional(body.eventName),
              customerName: optional(body.customerName),
              phone: optional(body.phone),
              seller: optional(body.seller),
              paymentType: optional(body.paymentType),
              total,
              items: { create: [{ productId, quantity, unitPrice, total }] },
            },
          });
        });
        await audit(admin.id, action, "manual_sale", result.id, { total });
        break;
      }

      case "b2b.account.create": {
        const name = str(body.name);
        result = await db.b2BAccount.create({
          data: { code: str(body.code) || code("B2B"), name, phone: optional(body.phone), email: optional(body.email), creditLimit: int(body.creditLimit), commissionBps: int(body.commissionBps), notes: optional(body.notes) },
        });
        await audit(admin.id, action, "b2b_account", result.id);
        break;
      }

      case "consignment.create": {
        const accountId = str(body.b2bAccountId);
        const productId = str(body.productId);
        const quantity = int(body.quantity, 1);
        const unitPrice = int(body.unitPrice);
        const total = quantity * unitPrice;
        result = await db.consignment.create({
          data: { code: code("CON"), b2bAccountId: accountId, total, notes: optional(body.notes), items: { create: [{ productId, quantity, unitPrice }] } },
        });
        await audit(admin.id, action, "consignment", result.id, { total });
        break;
      }

      case "carrier.create": {
        result = await db.carrier.create({
          data: { code: str(body.code) || code("CAR"), name: str(body.name), active: true },
        });
        await audit(admin.id, action, "carrier", result.id);
        break;
      }

      case "shipment.create": {
        const orderId = optional(body.orderId);
        let recipientName = str(body.recipientName);
        let phone = str(body.phone);
        let address = str(body.address);
        if (orderId) {
          const order = await db.order.findUnique({ where: { id: orderId } });
          if (order) {
            recipientName ||= order.customerName;
            phone ||= order.phone;
            address ||= order.address;
          }
        }
        if (!recipientName || !phone || !address) return NextResponse.json({ error: "اطلاعات گیرنده کامل نیست." }, { status: 400 });
        result = await db.shipment.create({
          data: { code: code("SHP"), orderId, carrierId: optional(body.carrierId), recipientName, phone, address, cost: int(body.cost), notes: optional(body.notes) },
        });
        await audit(admin.id, action, "shipment", result.id);
        break;
      }

      case "shipment.status": {
        const id = str(body.id);
        const status = str(body.status);
        const allowed = new Set(["draft", "ready", "booked", "shipped", "delivered", "cancelled"]);
        if (!allowed.has(status)) return NextResponse.json({ error: "وضعیت ارسال معتبر نیست." }, { status: 400 });
        result = await db.shipment.update({
          where: { id },
          data: {
            status,
            trackingCode: optional(body.trackingCode),
            actualCost: str(body.actualCost) ? int(body.actualCost) : undefined,
            shippedAt: status === "shipped" ? new Date() : undefined,
            deliveredAt: status === "delivered" ? new Date() : undefined,
          },
        });
        await audit(admin.id, action, "shipment", id, { status });
        break;
      }

      case "tax.profile.create": {
        result = await db.taxProfile.create({
          data: { name: str(body.name), taxId: str(body.taxId), memoryId: optional(body.memoryId), enabled: Boolean(body.enabled) },
        });
        await audit(admin.id, action, "tax_profile", result.id);
        break;
      }

      case "goal.create": {
        const start = new Date(str(body.periodStart));
        const end = new Date(str(body.periodEnd));
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return NextResponse.json({ error: "بازه هدف معتبر نیست." }, { status: 400 });
        result = await db.analyticsGoal.create({
          data: { name: str(body.name), metric: str(body.metric) || "sales", target: int(body.target), periodStart: start, periodEnd: end, salesChannel: optional(body.salesChannel), categoryId: optional(body.categoryId) },
        });
        await audit(admin.id, action, "analytics_goal", result.id);
        break;
      }

      case "job.create": {
        const key = str(body.idempotencyKey) || randomUUID();
        result = await db.operationJob.create({
          data: { type: str(body.type), aggregateId: optional(body.aggregateId), idempotencyKey: key, status: "pending", payload: body.payload && typeof body.payload === "object" ? (body.payload as Prisma.InputJsonValue) : undefined },
        });
        await audit(admin.id, action, "operation_job", result.id);
        break;
      }

      case "job.retry": {
        const id = str(body.id);
        result = await db.operationJob.update({ where: { id }, data: { status: "pending", nextRunAt: null, lastError: null } });
        await audit(admin.id, action, "operation_job", id);
        break;
      }

      case "incident.resolve": {
        const id = str(body.id);
        result = await db.systemIncident.update({ where: { id }, data: { status: "resolved", resolvedAt: new Date() } });
        await audit(admin.id, action, "system_incident", id);
        break;
      }

      default:
        return NextResponse.json({ error: "عملیات ناشناخته است." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "";
    if (message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "موجودی انبار برای این عملیات کافی نیست." }, { status: 409 });
    }
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "کد یا شناسه تکراری است." }, { status: 409 });
    }
    return NextResponse.json({ error: "عملیات ذخیره نشد." }, { status: 500 });
  }
}
