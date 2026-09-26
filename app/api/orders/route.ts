import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { calculateOrder, createOrderCode } from "@/lib/order";
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

    if (customerName.length < 2 || !validIranPhone(phone) || !province || !city || address.length < 8) {
      return NextResponse.json({ error: "اطلاعات دریافت‌کننده و آدرس را کامل وارد کنید." }, { status: 400 });
    }

    const calculation = await calculateOrder(Array.isArray(body.items) ? body.items : []);
    if (!calculation.config.paymentReady) {
      return NextResponse.json({ error: "درگاه پرداخت فروشگاه هنوز فعال نشده است." }, { status: 503 });
    }

    const currentUser = await getCurrentUser();
    const order = await db.order.create({
      data: {
        code: createOrderCode(),
        userId: currentUser?.id || null,
        customerName,
        phone,
        email,
        province,
        city,
        address,
        postalCode,
        notes,
        subtotal: calculation.subtotal,
        shippingCost: calculation.shippingCost,
        total: calculation.total,
        items: {
          create: calculation.items.map(({ product, quantity, total }) => ({
            productId: product.id,
            productName: product.name,
            productSlug: product.slug,
            unitPrice: product.price,
            quantity,
            total,
          })),
        },
      },
    });

    if (currentUser) {
      const last = await db.address.findFirst({ where: { userId: currentUser.id, province, city, address } });
      if (!last) {
        await db.address.create({ data: { userId: currentUser.id, province, city, address, postalCode } });
      }
    }

    return NextResponse.json({ ok: true, orderId: order.id, code: order.code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("OUT_OF_STOCK:")) {
      return NextResponse.json({ error: "موجودی " + message.split(":").slice(1).join(":") + " کافی نیست." }, { status: 409 });
    }
    if (message === "EMPTY_CART" || message === "INVALID_PRODUCT") {
      return NextResponse.json({ error: "سبد خرید معتبر نیست. صفحه را تازه‌سازی کنید." }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "ثبت سفارش انجام نشد." }, { status: 500 });
  }
}
