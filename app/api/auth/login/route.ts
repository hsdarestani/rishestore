import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { assertSameOrigin, normalizeIdentity, setSession } from "@/lib/auth";
import { validIranPhone } from "@/lib/money";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const phone = normalizeIdentity(String(body.phone || ""));
    const password = String(body.password || "");
    if (!validIranPhone(phone)) return NextResponse.json({ error: "شماره موبایل معتبر نیست." }, { status: 400 });
    const user = await db.user.findUnique({ where: { phone } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "شماره موبایل یا رمز عبور درست نیست." }, { status: 401 });
    }
    await setSession(user.id);
    return NextResponse.json({ ok: true, redirect: user.role === "CUSTOMER" ? "/account" : "/admin" });
  } catch {
    return NextResponse.json({ error: "ورود انجام نشد." }, { status: 500 });
  }
}
