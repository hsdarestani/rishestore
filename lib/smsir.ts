import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

const SMSIR_VERIFY_URL = "https://api.sms.ir/v1/send/verify";
const TEMPLATE_ID = 103808;
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function appSecret() {
  const value = process.env.APP_SECRET;
  if (!value || value.length < 24) throw new Error("APP_SECRET is not configured");
  return value;
}

function codeHash(phone: string, code: string) {
  return createHmac("sha256", appSecret()).update(phone + ":" + code).digest("hex");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export async function sendOtp(phone: string) {
  const apiKey = String(process.env.SMSIR_API || "").trim();
  if (!apiKey) throw new Error("SMSIR_NOT_CONFIGURED");

  const latest = await db.authOtp.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_DELAY_MS) {
    const retryAfter = Math.max(1, Math.ceil((RESEND_DELAY_MS - (Date.now() - latest.createdAt.getTime())) / 1000));
    const error = new Error("OTP_RATE_LIMIT");
    (error as Error & { retryAfter?: number }).retryAfter = retryAfter;
    throw error;
  }

  await db.authOtp.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { consumedAt: { not: null }, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }] },
  }).catch(() => undefined);

  const code = String(randomInt(1000, 10000));
  const response = await fetch(SMSIR_VERIFY_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ mobile: phone, templateId: TEMPLATE_ID, parameters: [{ name: "Code", value: code }] }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });

  const payload: any = await response.json().catch(() => ({}));
  const smsStatus = Number(payload?.status || 0);
  if (smsStatus === 115) throw new Error("SMSIR_BLACKLIST");
  const success = response.ok && (smsStatus === 1 || payload?.data?.messageId || payload?.data?.messageIds);
  if (!success) {
    console.error("SMS.ir OTP failed", { status: response.status, smsStatus, message: payload?.message });
    throw new Error("SMSIR_SEND_FAILED");
  }

  const messageId = Number(payload?.data?.messageId || payload?.data?.messageIds?.[0] || 0) || null;
  console.info("SMS.ir OTP accepted", { phoneSuffix: phone.slice(-4), messageId: messageId || "n/a" });

  await db.authOtp.create({ data: { phone, codeHash: codeHash(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });

  return { expiresIn: Math.round(OTP_TTL_MS / 1000), resendAfter: Math.round(RESEND_DELAY_MS / 1000), messageId };
}

export async function verifyOtp(phone: string, code: string) {
  const otp = await db.authOtp.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false as const, reason: "expired" as const };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false as const, reason: "attempts" as const };

  const expected = codeHash(phone, code);
  if (!safeEqual(otp.codeHash, expected)) {
    await db.authOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false as const, reason: "invalid" as const };
  }

  await db.authOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return { ok: true as const };
}
