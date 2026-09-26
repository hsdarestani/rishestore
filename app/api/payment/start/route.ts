import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/auth";
import { createZibalTransaction, zibalStartUrl } from "@/lib/zibal";

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

    if (order.transactionId && order.paymentStatus === "PENDING" && order.paymentProvider === "zibal") {
      return NextResponse.json({ url: zibalStartUrl(order.transactionId) });
    }

    const payment = await createZibalTransaction({
      orderCode: order.code,
      amountToman: order.total,
      mobile: order.phone,
    });

    await db.order.update({
      where: { id: order.id },
      data: {
        paymentProvider: "zibal",
        paymentStatus: "PENDING",
        transactionId: payment.trackId,
        paymentRef: null,
      },
    });

    return NextResponse.json({ url: payment.url });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error && error.message === "PAYMENT_NOT_CONFIGURED"
        ? "درگاه زیبال روی سرور تنظیم نشده است."
        : "اتصال به درگاه زیبال انجام نشد.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
