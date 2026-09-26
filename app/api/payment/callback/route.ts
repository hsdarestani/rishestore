import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyNextPayTransaction } from "@/lib/nextpay";

function successUrl(code: string, status: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return base + "/checkout/success?order=" + encodeURIComponent(code) + "&status=" + encodeURIComponent(status);
}

export async function GET(request: NextRequest) {
  const transId = request.nextUrl.searchParams.get("trans_id") || "";
  const orderCode = request.nextUrl.searchParams.get("order_id") || "";
  const amount = Number(request.nextUrl.searchParams.get("amount") || 0);

  const order = await db.order.findUnique({
    where: { code: orderCode },
    include: { items: true },
  });

  if (!order || !transId || order.transactionId !== transId || amount !== order.total) {
    return NextResponse.redirect(successUrl(orderCode || "unknown", "failed"));
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.redirect(successUrl(order.code, "paid"));
  }

  try {
    const verification = await verifyNextPayTransaction(transId, order.total);

    if (!verification.ok) {
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED", paymentRef: String(verification.code) },
      });
      return NextResponse.redirect(successUrl(order.code, "failed"));
    }

    await db.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({ where: { id: order.id } });
      if (!fresh || fresh.paymentStatus === "PAID") return;

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "PAID", status: "PROCESSING", paymentRef: "0" },
      });

      for (const item of order.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }
    });

    return NextResponse.redirect(successUrl(order.code, "paid"));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(successUrl(order.code, "failed"));
  }
}
