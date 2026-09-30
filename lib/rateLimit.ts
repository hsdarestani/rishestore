import { db } from "@/lib/db";

export function clientIp(request: Request) {
  const headers = request.headers;
  const forwarded = headers.get("cf-connecting-ip") || headers.get("x-forwarded-for") || headers.get("x-real-ip") || "";
  return forwarded.split(",")[0].trim() || "unknown";
}

function retryAfter(blockedUntil?: Date | null) {
  if (!blockedUntil) return 0;
  return Math.max(1, Math.ceil((blockedUntil.getTime() - Date.now()) / 1000));
}

export async function checkThrottle(key: string) {
  const row = await db.authThrottle.findUnique({ where: { key } });
  if (!row?.blockedUntil || row.blockedUntil.getTime() <= Date.now()) return { blocked: false as const, retryAfter: 0 };
  return { blocked: true as const, retryAfter: retryAfter(row.blockedUntil) };
}

export async function recordFailure(key: string, limit: number, windowMs: number, blockMs: number) {
  const now = new Date();
  const existing = await db.authThrottle.findUnique({ where: { key } });
  if (!existing || now.getTime() - existing.windowStart.getTime() > windowMs) {
    await db.authThrottle.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now, blockedUntil: null },
      update: { count: 1, windowStart: now, blockedUntil: null },
    });
    return { blocked: false as const, retryAfter: 0 };
  }

  const next = existing.count + 1;
  const blockedUntil = next >= limit ? new Date(now.getTime() + blockMs) : existing.blockedUntil;
  await db.authThrottle.update({ where: { key }, data: { count: next, blockedUntil } });
  return blockedUntil && blockedUntil.getTime() > now.getTime()
    ? { blocked: true as const, retryAfter: retryAfter(blockedUntil) }
    : { blocked: false as const, retryAfter: 0 };
}

export async function consumeRateLimit(key: string, limit: number, windowMs: number, blockMs: number) {
  const now = new Date();
  const existing = await db.authThrottle.findUnique({ where: { key } });

  if (existing?.blockedUntil && existing.blockedUntil.getTime() > now.getTime()) {
    return { allowed: false as const, retryAfter: retryAfter(existing.blockedUntil) };
  }

  if (!existing || now.getTime() - existing.windowStart.getTime() > windowMs) {
    await db.authThrottle.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now, blockedUntil: null },
      update: { count: 1, windowStart: now, blockedUntil: null },
    });
    return { allowed: true as const, retryAfter: 0 };
  }

  const next = existing.count + 1;
  if (next > limit) {
    const blockedUntil = new Date(now.getTime() + blockMs);
    await db.authThrottle.update({ where: { key }, data: { count: next, blockedUntil } });
    return { allowed: false as const, retryAfter: retryAfter(blockedUntil) };
  }

  await db.authThrottle.update({ where: { key }, data: { count: next } });
  return { allowed: true as const, retryAfter: 0 };
}

export async function clearThrottle(key: string) {
  await db.authThrottle.deleteMany({ where: { key } }).catch(() => undefined);
}
