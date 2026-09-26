import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { assertSameOrigin, normalizeIdentity, setSession } from "@/lib/auth";
import { validIranPhone } from "@/lib/money";
import { setSetting } from "@/lib/settings";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (await db.user.count({ where: { role: "ADMIN" } })) return NextResponse.json({ error: "راه‌اندازی قبلاً انجام شده است." }, { status: 409 });
    const body = await request.json();
    const name = String(body.name || "").trim();
    const phone = normalizeIdentity(String(body.phone || ""));
    const password = String(body.password || "");
    const shippingFlatRate = Math.max(0, Number(body.shippingFlatRate || 0));
    const freeShippingThreshold = Math.max(0, Number(body.freeShippingThreshold || 0));
    const storePhone = String(body.storePhone || "").trim();
    const instagramUrl = String(body.instagramUrl || "").trim();
    const nextpayApiKey = String(body.nextpayApiKey || "").trim();

    if (name.length < 2 || !validIranPhone(phone) || password.length < 10) {
      return NextResponse.json({ error: "نام، موبایل و رمز حداقل ۱۰ کاراکتری را درست وارد کنید." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await db.user.create({ data: { name, phone, passwordHash, role: "ADMIN" } });
    await Promise.all([
      setSetting("shippingFlatRate", String(Math.trunc(shippingFlatRate))),
      setSetting("freeShippingThreshold", String(Math.trunc(freeShippingThreshold))),
      setSetting("storePhone", storePhone),
      setSetting("instagramUrl", instagramUrl),
      nextpayApiKey ? setSetting("nextpayApiKey", nextpayApiKey, true) : Promise.resolve(null),
    ]);
    await setSession(admin.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "راه‌اندازی فروشگاه انجام نشد." }, { status: 500 });
  }
}
