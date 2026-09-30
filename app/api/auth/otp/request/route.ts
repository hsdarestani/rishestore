import { NextResponse } from "next/server";
import { assertSameOrigin, normalizeIdentity } from "@/lib/auth";
import { validIranPhone } from "@/lib/money";
import { sendOtp } from "@/lib/smsir";
import { clientIp, consumeRateLimit } from "@/lib/rateLimit";

function limited(retryAfter: number) {
  return NextResponse.json(
    { error: "تعداد درخواست کد زیاد شده است. کمی بعد دوباره تلاش کنید.", retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const phone = normalizeIdentity(String(body.phone || ""));
    if (!validIranPhone(phone)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست." }, { status: 400 });
    }

    const ip = clientIp(request);
    const [phoneLimit, ipLimit] = await Promise.all([
      consumeRateLimit("otp:phone:" + phone, 6, 60 * 60 * 1000, 60 * 60 * 1000),
      consumeRateLimit("otp:ip:" + ip, 20, 60 * 60 * 1000, 60 * 60 * 1000),
    ]);
    if (!phoneLimit.allowed || !ipLimit.allowed) return limited(Math.max(phoneLimit.retryAfter, ipLimit.retryAfter));

    const result = await sendOtp(phone);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "OTP_RATE_LIMIT") {
      const retryAfter = Number((error as Error & { retryAfter?: number }).retryAfter || 60);
      return NextResponse.json({ error: "کد قبلی هنوز معتبر است. کمی بعد دوباره تلاش کنید.", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    }
    if (message === "SMSIR_NOT_CONFIGURED") {
      return NextResponse.json({ error: "سرویس پیامک هنوز روی سرور تنظیم نشده است." }, { status: 503 });
    }
    if (message === "SMSIR_BLACKLIST") {
      return NextResponse.json({
        error: "این شماره در لیست سیاه پیامکی قرار دارد. از ورود با رمز عبور استفاده کنید.",
        blacklist: true,
      }, { status: 422 });
    }
    if (message === "SMSIR_SEND_FAILED") {
      return NextResponse.json({ error: "ارسال پیامک انجام نشد. دوباره تلاش کنید یا از ورود با رمز عبور استفاده کنید." }, { status: 502 });
    }
    console.error(error);
    return NextResponse.json({ error: "ارسال کد تایید انجام نشد." }, { status: 500 });
  }
}
