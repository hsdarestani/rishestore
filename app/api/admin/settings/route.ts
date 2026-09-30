import { NextResponse } from "next/server";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";
import { setSetting } from "@/lib/settings";

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await requireAdmin())) return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
    const body = await request.json();
    const flat = Math.max(0, Math.trunc(Number(body.shippingFlatRate || 0)));
    const threshold = Math.max(0, Math.trunc(Number(body.freeShippingThreshold || 0)));

    await Promise.all([
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
