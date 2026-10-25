import { NextResponse } from "next/server";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { validBasalamUrl } from "@/lib/basalam";

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await requireAdmin())) return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
    const body = await request.json();
    const flat = Math.max(0, Math.trunc(Number(body.shippingFlatRate || 0)));
    const threshold = Math.max(0, Math.trunc(Number(body.freeShippingThreshold || 0)));

    const basalamStoreUrl = String(body.basalamStoreUrl || "").trim();
    if (basalamStoreUrl && !validBasalamUrl(basalamStoreUrl)) return NextResponse.json({ error: "لینک غرفه باید آدرس معتبر باسلام باشد." }, { status: 400 });
    const basalamProductUrls = String(body.basalamProductUrls || "{}").trim();
    let productUrls: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(basalamProductUrls);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw Error("invalid map");
      productUrls = parsed as Record<string, unknown>;
      if (Object.entries(productUrls).some(([slug,url]) => !/^[a-z0-9-]{1,140}$/.test(slug) || !validBasalamUrl(url))) throw Error("invalid URL");
    } catch { return NextResponse.json({ error: "نگاشت محصولات باید JSON با اسلاگ و لینک معتبر باسلام باشد." }, { status: 400 }); }
    await Promise.all([
      setSetting("basalamStoreUrl", basalamStoreUrl),
      setSetting("basalamProductUrls", JSON.stringify(productUrls)),
      setSetting("storeName", String(body.storeName || "ریشه").trim()),
      setSetting("storePhone", String(body.storePhone || "").trim()),
      setSetting("instagramUrl", String(body.instagramUrl || "").trim()),
      setSetting("baleUrl", String(body.baleUrl || "").trim()),
      setSetting("whatsappUrl", String(body.whatsappUrl || "").trim()),
      setSetting("warehouseAddress", String(body.warehouseAddress || "").trim()),
      setSetting("storeAddress", String(body.storeAddress || "").trim()),
      setSetting("shippingFlatRate", String(flat)),
      setSetting("freeShippingThreshold", String(threshold)),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ذخیره تنظیمات انجام نشد." }, { status: 500 });
  }
}
