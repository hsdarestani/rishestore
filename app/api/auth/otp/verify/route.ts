import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertSameOrigin, normalizeIdentity, setSession } from "@/lib/auth";
import { validIranPhone } from "@/lib/money";
import { verifyOtp } from "@/lib/smsir";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const phone = normalizeIdentity(String(body.phone || ""));
    const code = String(body.code || "").replace(/\D/g, "");
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase() || null;

    if (!validIranPhone(phone)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست." }, { status: 400 });
    }
    if (!/^\d{4}$/.test(code)) {
      return NextResponse.json({ error: "کد تایید ۴ رقمی را وارد کنید." }, { status: 400 });
    }

    let user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      if (name.length < 2) {
        return NextResponse.json({
          error: "برای این شماره هنوز حسابی ساخته نشده است. نام و نام خانوادگی را در بخش ثبت نام وارد کنید.",
          needsProfile: true,
        }, { status: 409 });
      }
      if (email) {
        const emailOwner = await db.user.findUnique({ where: { email } });
        if (emailOwner && emailOwner.phone !== phone) {
          return NextResponse.json({ error: "این ایمیل قبلاً برای حساب دیگری ثبت شده است." }, { status: 409 });
        }
      }
    }

    const verified = await verifyOtp(phone, code);
    if (!verified.ok) {
      const error = verified.reason === "expired"
        ? "کد تایید منقضی شده است. کد جدید بگیرید."
        : verified.reason === "attempts"
          ? "تعداد تلاش ناموفق زیاد بوده است. کد جدید بگیرید."
          : "کد تایید درست نیست.";
      return NextResponse.json({ error }, { status: 401 });
    }

    let created = false;
    if (!user) {
      const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
      user = await db.user.create({
        data: { name, phone, email, passwordHash, role: "CUSTOMER" },
      });
      created = true;

      const existingCustomer = await db.customer.findUnique({ where: { mobileNormalized: phone } });
      if (existingCustomer) {
        await db.customer.update({
          where: { id: existingCustomer.id },
          data: {
            name: existingCustomer.name || name,
            email: existingCustomer.email || email,
            sourceCode: existingCustomer.sourceCode || "site",
          },
        });
      } else {
        await db.customer.create({
          data: {
            customerKey: "phone:" + phone,
            mobileNormalized: phone,
            name,
            email,
            sourceCode: "site",
          },
        });
      }
    }

    await setSession(user.id);
    return NextResponse.json({
      ok: true,
      created,
      redirect: user.role === "CUSTOMER" ? "/account" : "/admin",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "تایید شماره انجام نشد." }, { status: 500 });
  }
}
