import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { verifyZibalTransaction } from "@/lib/zibal";
import { commitOrderReservations, releaseOrderReservations } from "@/lib/inventory";
import { getSetting } from "@/lib/settings";

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
    await db.$transaction(async (tx) => {
      await releaseOrderReservations(tx, order.id);
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED", paymentRef: callbackStatus || "callback-failed" },
      });
      await tx.orderHistory.create({
        data: { orderId: order.id, fromState: "PENDING", toState: "PAYMENT_FAILED", reason: callbackStatus || "بازگشت ناموفق از زیبال" },
      });
    });
    return NextResponse.redirect(successUrl(order.code, "failed"));
  }

  try {
    const verification = await verifyZibalTransaction(trackId);
    const expectedRial = order.total * 10;
    const amountMatches = verification.amountRial === 0 || verification.amountRial === expectedRial;

    if (!verification.ok || !amountMatches) {
      await db.$transaction(async (tx) => {
        await releaseOrderReservations(tx, order.id);
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "FAILED",
            paymentRef: !amountMatches ? "amount-mismatch" : String(verification.code),
          },
        });
        await tx.orderHistory.create({
          data: {
            orderId: order.id,
            fromState: "PENDING",
            toState: "PAYMENT_FAILED",
            reason: !amountMatches ? "مغایرت مبلغ پرداخت" : "تأیید زیبال ناموفق",
          },
        });
      });
      return NextResponse.redirect(successUrl(order.code, "failed"));
    }

    const loyaltyRate = Math.max(0, Math.trunc(Number(await getSetting("loyaltyPointsPer100k", "0")) || 0));

    await db.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
      if (!fresh || fresh.paymentStatus === "PAID") return;

      await commitOrderReservations(tx, order.id);

      let earnedPoints = 0;
      if (loyaltyRate > 0 && fresh.customerId) {
        earnedPoints = Math.floor(fresh.total / 100000) * loyaltyRate;
        if (earnedPoints > 0) {
          await tx.loyaltyEntry.create({
            data: {
              entryKey: "order-earned:" + fresh.id,
              customerId: fresh.customerId,
              orderId: fresh.id,
              points: earnedPoints,
              reason: "امتیاز خرید سفارش " + fresh.code,
            },
          });
        }
      }

      await tx.order.update({
        where: { id: fresh.id },
        data: {
          paymentStatus: "PAID",
          status: "PROCESSING",
          paymentRef: verification.refNumber || String(verification.code),
          loyaltyPointsEarned: earnedPoints,
        },
      });

      if (fresh.promotionCode) {
        const promotion = await tx.promotion.findFirst({ where: { code: fresh.promotionCode } });
        if (promotion) {
          await tx.promotionRedemption.upsert({
            where: { promotionId_orderId: { promotionId: promotion.id, orderId: fresh.id } },
            create: {
              promotionId: promotion.id,
              orderId: fresh.id,
              customerId: fresh.customerId,
              amount: fresh.discount,
            },
            update: {},
          });
        }
      }

      if (fresh.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: fresh.customerId } });
        await tx.customer.update({
          where: { id: fresh.customerId },
          data: {
            firstPurchase: customer?.firstPurchase || new Date(),
            lastPurchase: new Date(),
          },
        });
      }

      const treasuryAccount = await tx.treasuryAccount.upsert({
        where: { code: "ZIBAL_GATEWAY" },
        create: { code: "ZIBAL_GATEWAY", name: "درگاه زیبال", type: "gateway", active: true },
        update: { active: true },
      });

      const treasuryTx = await tx.treasuryTransaction.upsert({
        where: { externalId: "zibal:" + trackId },
        create: {
          accountId: treasuryAccount.id,
          externalId: "zibal:" + trackId,
          direction: "credit",
          amount: fresh.total,
          description: "دریافت سفارش " + fresh.code,
          sourceType: "order",
          sourceId: fresh.id,
          status: "posted",
        },
        update: {},
      });

      const existingMatch = await tx.treasuryMatch.findFirst({
        where: { transactionId: treasuryTx.id, matchType: "order", entityId: fresh.id },
      });
      if (!existingMatch) {
        await tx.treasuryMatch.create({
          data: {
            publicId: randomUUID(),
            transactionId: treasuryTx.id,
            matchType: "order",
            entityId: fresh.id,
            amount: fresh.total,
          },
        });
      }

      await tx.orderHistory.create({
        data: {
          orderId: fresh.id,
          fromState: "PENDING",
          toState: "PROCESSING",
          reason: "پرداخت موفق زیبال و قطعی‌شدن رزرو موجودی",
        },
      });

      await tx.analyticsEvent.upsert({
        where: { eventKey: "order_paid:" + fresh.id },
        create: {
          eventKey: "order_paid:" + fresh.id,
          eventType: "order_paid",
          orderId: fresh.id,
          customerId: fresh.customerId,
          salesChannel: fresh.salesChannel,
          sourceCode: "website",
          province: fresh.province,
          city: fresh.city,
          amount: fresh.total,
          correlationId: randomUUID(),
          occurredAt: new Date(),
        },
        update: {},
      });
    });

    return NextResponse.redirect(successUrl(order.code, "paid"));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(successUrl(order.code, "failed"));
  }
}
