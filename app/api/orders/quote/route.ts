import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";
import { calculateOrder } from "@/lib/order";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const calculation = await calculateOrder(Array.isArray(body.items) ? body.items : [], {
      promotionCode: String(body.promotionCode || "").trim() || null,
      channel: "website",
    });

    return NextResponse.json({
      ok: true,
      subtotal: calculation.subtotal,
      discount: calculation.discount,
      shippingCost: calculation.shippingCost,
      total: calculation.total,
      promotionCode: calculation.promotionCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "INVALID_PROMOTION") return NextResponse.json({ error: "کد تخفیف معتبر یا فعال نیست." }, { status: 400 });
    if (message === "PROMOTION_LIMIT") return NextResponse.json({ error: "سقف استفاده از این کد تخفیف پر شده است." }, { status: 409 });
    if (message.startsWith("OUT_OF_STOCK:") || message === "OUT_OF_STOCK") return NextResponse.json({ error: "موجودی یکی از محصولات کافی نیست." }, { status: 409 });
    return NextResponse.json({ error: "محاسبه سفارش انجام نشد." }, { status: 400 });
  }
}
