import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyZibalTransaction } from "@/lib/zibal";

function successUrl(code: string, status: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return base + "/checkout/success?order=" + encodeURIComponent(code) + "&status=" + encodeURIComponent(status);
}

export async function GET(request: NextRequest) {
  const trackId = String(request.nextUrl.searchParams.get("trackId") || "").trim();
  const success = String(request.nextUrl.searchParams.get("success") || "").trim();
  const callbackStatus = String(request.nextUrl.searchParams.get("status") || "").trim();

  if (!trackId) return NextResponse.redirect(successUrl("unknown", "failed"));

  const order = await db.order.findUnique({
    where: { transactionId: trackId },
    include: { items: true },
  });

  if (!order || order.paymentProvider !== "zibal") {
    return NextResponse.redirect(successUrl("unknown", "failed"));
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.redirect(successUrl(order.code, "paid"));
  }

  if (success !== "1" && success !== "2") {
    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED", paymentRef: callbackStatus || "callback-failed" },
    });
    return NextResponse.redirect(successUrl(order.code, "failed"));
  }

  try {
    const verification = await verifyZibalTransaction(trackId);
    const expectedRial = order.total * 10;
    const amountMatches = verification.amountRial === 0 || verification.amountRial === expectedRial;

    if (!verification.ok || !amountMatches) {
      await db.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "FAILED",
          paymentRef: !amountMatches ? "amount-mismatch" : String(verification.code),
        },
      });
      return NextResponse.redirect(successUrl(order.code, "failed"));
    }

    await db.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({ where: { id: order.id } });
      if (!fresh || fresh.paymentStatus === "PAID") return;

      for (const item of order.items) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stock < item.quantity) throw new Error("STOCK_CHANGED");
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "PROCESSING",
          paymentRef: verification.refNumber || String(verification.code),
        },
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
