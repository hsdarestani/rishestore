import { NextResponse } from "next/server";
import { assertSameOrigin, requireCapability } from "@/lib/auth";
import { db } from "@/lib/db";

function num(value: unknown) { const n = Number(value || 0); return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0; }

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await requireCapability("catalog.write"))) return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
    const body = await request.json();
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();
    const shortDescription = String(body.shortDescription || "").trim();
    const description = String(body.description || "").trim();
    if (!name || !/^[a-z0-9-]+$/.test(slug) || !shortDescription || !description) return NextResponse.json({ error: "نام، اسلاگ انگلیسی و توضیحات لازم است." }, { status: 400 });
    const product = await db.product.create({ data: {
      name,
      slug,
      shortDescription,
      description,
      kind: body.kind === "PACK" ? "PACK" : "PRODUCT",
      categoryId: body.categoryId || null,
      price: num(body.price),
      compareAt: String(body.compareAt || "").trim() ? num(body.compareAt) : null,
      stock: num(body.stock),
      stockStatus: String(body.stockStatus || "").trim() || null,
      allowBackorder: Boolean(body.allowBackorder),
      weightGrams: String(body.weightGrams || "").trim() ? num(body.weightGrams) : null,
      origin: String(body.origin || "").trim() || null,
      usage: String(body.usage || "").trim() || null,
      quality: String(body.quality || "").trim() || null,
      guarantee: String(body.guarantee || "").trim() || null,
      image: String(body.image || "").trim() || null,
      seoTitle: String(body.seoTitle || "").trim() || null,
      seoDescription: String(body.seoDescription || "").trim() || null,
      active: Boolean(body.active),
      featured: Boolean(body.featured),
    } });
    return NextResponse.json({ ok: true, id: product.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ساخت محصول انجام نشد؛ اسلاگ تکراری نباشد." }, { status: 500 });
  }
}
