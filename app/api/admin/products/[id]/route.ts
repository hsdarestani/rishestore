import { NextResponse } from "next/server";
import { assertSameOrigin, requireCapability } from "@/lib/auth";
import { db } from "@/lib/db";

const n = (v: unknown) => { const x = Number(v || 0); return Number.isFinite(x) ? Math.max(0, Math.trunc(x)) : 0; };
const nullableN = (v: unknown) => String(v || "").trim() ? n(v) : null;
const text = (v: unknown) => String(v || "").trim() || null;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    if (!(await requireCapability("catalog.write"))) return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
    const { id } = await params;
    const body = await request.json();
    const slug = String(body.slug || "").trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: "اسلاگ فقط با حروف انگلیسی، عدد و خط تیره باشد." }, { status: 400 });
    await db.product.update({ where: { id }, data: {
      name: String(body.name || "").trim(), slug, kind: body.kind === "PACK" ? "PACK" : "PRODUCT",
      categoryId: body.categoryId || null, price: n(body.price), compareAt: nullableN(body.compareAt), stock: n(body.stock),
      weightGrams: nullableN(body.weightGrams), origin: text(body.origin), usage: text(body.usage),
      shortDescription: String(body.shortDescription || "").trim(), description: String(body.description || "").trim(),
      quality: text(body.quality), guarantee: text(body.guarantee), image: text(body.image),
      stockStatus: text(body.stockStatus), allowBackorder: Boolean(body.allowBackorder),
      seoTitle: text(body.seoTitle), seoDescription: text(body.seoDescription),
      active: Boolean(body.active), featured: Boolean(body.featured),
    } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ذخیره محصول انجام نشد." }, { status: 500 });
  }
}
