import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { assertSameOrigin, normalizeIdentity, setSession } from "@/lib/auth";
import { validIranPhone } from "@/lib/money";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const name = String(body.name || "").trim();
    const phone = normalizeIdentity(String(body.phone || ""));
    const email = String(body.email || "").trim().toLowerCase() || null;
    const password = String(body.password || "");
    if (name.length < 2) return NextResponse.json({ error: "نام را کامل وارد کنید." }, { status: 400 });
    if (!validIranPhone(phone)) return NextResponse.json({ error: "شماره موبایل معتبر نیست." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "رمز عبور باید حداقل ۸ کاراکتر باشد." }, { status: 400 });
    const exists = await db.user.findFirst({ where: { OR: [{ phone }, ...(email ? [{ email }] : [])] } });
    if (exists) return NextResponse.json({ error: "برای این شماره یا ایمیل قبلاً حساب ساخته شده است." }, { status: 409 });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({ data: { name, phone, email, passwordHash } });
    await setSession(user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "ثبت‌نام انجام نشد." }, { status: 500 });
  }
}
