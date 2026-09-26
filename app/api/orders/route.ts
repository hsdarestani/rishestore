import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { calculateOrder, createOrderCode } from "@/lib/order";
import { reserveOrderInventory } from "@/lib/inventory";
import { normalizePhone, validIranPhone } from "@/lib/money";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const customerName = String(body.customerName || "").trim();
    const phone = normalizePhone(String(body.phone || ""));
    const email = String(body.email || "").trim().toLowerCase() || null;
    const province = String(body.province || "").trim();
    const city = String(body.city || "").trim();
    const address = String(body.address || "").trim();
    const postalCode = String(body.postalCode || "").trim() || null;
    const notes = String(body.notes || "").trim() || null;
    const promotionCode = String(body.promotionCode || "").trim().toUpperCase() || null;

    if (customerName.length < 2 || !validIranPhone(phone) || !province || !city || address.length < 8) {
      return NextResponse.json({ error: "اطلاعات دریافت‌کننده و آدرس را کامل وارد کنید." }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    const customer = await db.customer.upsert({
      where: { mobileNormalized: phone },
      create: {
        customerKey: "mobile:" + phone,
        mobileNormalized: phone,
        name: customerName,
        email,
        province,
        city,
        sourceCode: "website",
      },
      update: {
        name: customerName,
        email,
        province,
        city,
        sourceCode: "website",
      },
    });

    const calculation = await calculateOrder(Array.isArray(body.items) ? body.items : [], {
      promotionCode,
      customerId: customer.id,
      channel: "website",
    });

    if (!calculation.config.paymentReady) {
      return NextResponse.json({ error: "درگاه پرداخت فروشگاه هنوز فعال نشده است." }, { status: 503 });
    }

    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          code: createOrderCode(),
          userId: currentUser?.id || null,
          customerId: customer.id,
          customerName,
          phone,
          email,
          province,
          city,
          address,
          postalCode,
          notes,
          salesChannel: "website",
          subtotal: calculation.subtotal,
          discount: calculation.discount,
          promotionCode: calculation.promotionCode,
          shippingCost: calculation.shippingCost,
          total: calculation.total,
          items: {
            create: calculation.items.map(({ product, quantity, total, unitPrice }) => ({
              productId: product.id,
              productName: product.name,
              productSlug: product.slug,
              unitPrice,
              quantity,
              total,
            })),
          },
        },
      });

      await reserveOrderInventory(
        tx,
        created.id,
        calculation.items.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
          allowBackorder: product.allowBackorder,
        })),
        30,
      );

      await tx.orderHistory.create({
        data: {
          orderId: created.id,
          fromState: null,
          toState: "PENDING",
          reason: "ثبت سفارش وب‌سایت و رزرو موجودی",
          actorId: currentUser?.id || null,
        },
      });

      await tx.analyticsEvent.create({
        data: {
          eventKey: "order_created:" + created.id,
          eventType: "order_created",
          orderId: created.id,
          customerId: customer.id,
          salesChannel: "website",
          sourceCode: "website",
          province,
          city,
          amount: created.total,
          correlationId: randomUUID(),
          occurredAt: new Date(),
        },
      });

      return created;
    });

    if (currentUser) {
      const last = await db.address.findFirst({ where: { userId: currentUser.id, province, city, address } });
      if (!last) {
        await db.address.create({ data: { userId: currentUser.id, province, city, address, postalCode } });
      }
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      code: order.code,
      discount: calculation.discount,
      total: calculation.total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("OUT_OF_STOCK:") || message === "OUT_OF_STOCK") {
      return NextResponse.json({ error: "موجودی یکی از محصولات سبد کافی نیست. صفحه را تازه‌سازی کنید." }, { status: 409 });
    }
    if (message === "INVALID_PROMOTION") {
      return NextResponse.json({ error: "کد تخفیف معتبر یا فعال نیست." }, { status: 400 });
    }
    if (message === "PROMOTION_LIMIT") {
      return NextResponse.json({ error: "سقف استفاده از این کد تخفیف پر شده است." }, { status: 409 });
    }
    if (message === "EMPTY_CART" || message === "INVALID_PRODUCT") {
      return NextResponse.json({ error: "سبد خرید معتبر نیست. صفحه را تازه‌سازی کنید." }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "ثبت سفارش انجام نشد." }, { status: 500 });
  }
}
