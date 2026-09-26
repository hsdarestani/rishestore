import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/auth";
import { createNextPayTransaction } from "@/lib/nextpay";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const orderId = String(body.orderId || "");
    const order = await db.order.findUnique({ where: { id: orderId } });

    if (!order) return NextResponse.json({ error: "سفارش پیدا نشد." }, { status: 404 });
    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ error: "این سفارش قبلاً پرداخت شده است." }, { status: 409 });
    }

    if (order.transactionId && order.paymentStatus === "PENDING") {
      return NextResponse.json({ url: "https://nextpay.org/nx/gateway/payment/" + encodeURIComponent(order.transactionId) });
    }

    const payment = await createNextPayTransaction(order.code, order.total);
    await db.order.update({
      where: { id: order.id },
      data: { paymentProvider: "nextpay", paymentStatus: "PENDING", transactionId: payment.transId },
    });

    return NextResponse.json({ url: payment.url });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error && error.message === "PAYMENT_NOT_CONFIGURED"
        ? "درگاه پرداخت تنظیم نشده است."
        : "اتصال به درگاه پرداخت انجام نشد.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
