import { NextResponse } from "next/server";
import { assertSameOrigin, normalizeIdentity } from "@/lib/auth";
import { validIranPhone } from "@/lib/money";
import { sendOtp } from "@/lib/smsir";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const phone = normalizeIdentity(String(body.phone || ""));
    if (!validIranPhone(phone)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست." }, { status: 400 });
    }

    const result = await sendOtp(phone);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "OTP_RATE_LIMIT") {
      const retryAfter = Number((error as Error & { retryAfter?: number }).retryAfter || 60);
      return NextResponse.json({ error: "کد قبلی هنوز معتبر است. کمی بعد دوباره تلاش کنید.", retryAfter }, { status: 429 });
    }
    if (message === "SMSIR_NOT_CONFIGURED") {
      return NextResponse.json({ error: "سرویس پیامک هنوز روی سرور تنظیم نشده است." }, { status: 503 });
    }
    if (message === "SMSIR_SEND_FAILED") {
      return NextResponse.json({ error: "ارسال پیامک انجام نشد. دوباره تلاش کنید." }, { status: 502 });
    }
    console.error(error);
    return NextResponse.json({ error: "ارسال کد تایید انجام نشد." }, { status: 500 });
  }
}
