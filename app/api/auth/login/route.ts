import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { assertSameOrigin, normalizeIdentity, setSession } from "@/lib/auth";
import { validIranPhone } from "@/lib/money";
import { checkThrottle, clearThrottle, clientIp, recordFailure } from "@/lib/rateLimit";

function limited(retryAfter: number) {
  return NextResponse.json(
    { error: "تعداد تلاش ورود زیاد شده است. چند دقیقه بعد دوباره امتحان کنید.", retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const phone = normalizeIdentity(String(body.phone || ""));
    const password = String(body.password || "");
    if (!validIranPhone(phone)) return NextResponse.json({ error: "شماره موبایل معتبر نیست." }, { status: 400 });

    const ip = clientIp(request);
    const phoneKey = "login:phone:" + phone;
    const ipKey = "login:ip:" + ip;
    const [phoneGate, ipGate] = await Promise.all([checkThrottle(phoneKey), checkThrottle(ipKey)]);
    if (phoneGate.blocked) return limited(phoneGate.retryAfter);
    if (ipGate.blocked) return limited(ipGate.retryAfter);

    const user = await db.user.findUnique({ where: { phone } });
    const valid = Boolean(user && await bcrypt.compare(password, user.passwordHash));
    if (!valid || !user) {
      const [phoneFailure, ipFailure] = await Promise.all([
        recordFailure(phoneKey, 6, 15 * 60 * 1000, 15 * 60 * 1000),
        recordFailure(ipKey, 20, 15 * 60 * 1000, 20 * 60 * 1000),
      ]);
      if (phoneFailure.blocked || ipFailure.blocked) return limited(Math.max(phoneFailure.retryAfter, ipFailure.retryAfter));
      return NextResponse.json({ error: "شماره موبایل یا رمز عبور درست نیست." }, { status: 401 });
    }

    await clearThrottle(phoneKey);
    await setSession(user.id);
    return NextResponse.json({ ok: true, redirect: user.role === "CUSTOMER" ? "/account" : "/admin" });
  } catch (error) {
    console.error("login failed", error);
    return NextResponse.json({ error: "ورود انجام نشد." }, { status: 500 });
  }
}
