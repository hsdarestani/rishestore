import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { assertSameOrigin, requireAdmin, STAFF_CAPABILITIES } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizePhone, validIranPhone } from "@/lib/money";

function cleanPermissions(value: unknown) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(STAFF_CAPABILITIES as readonly string[]);
  return [...new Set(value.map(String).filter((x) => allowed.has(x)))];
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "فقط مدیر اصلی می‌تواند اعضای تیم را مدیریت کند." }, { status: 403 });

    const body = await request.json();
    const name = String(body.name || "").trim();
    const phone = normalizePhone(String(body.phone || ""));
    const email = String(body.email || "").trim().toLowerCase() || null;
    const password = String(body.password || "");
    const permissions = cleanPermissions(body.permissions);

    if (name.length < 2 || !validIranPhone(phone) || password.length < 8) {
      return NextResponse.json({ error: "نام، موبایل معتبر و رمز حداقل ۸ کاراکتری لازم است." }, { status: 400 });
    }

    const exists = await db.user.findFirst({ where: { OR: [{ phone }, ...(email ? [{ email }] : [])] } });
    if (exists) return NextResponse.json({ error: "این موبایل یا ایمیل قبلاً استفاده شده است." }, { status: 409 });

    const staff = await db.user.create({
      data: {
        name,
        phone,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: "STAFF",
        permissions,
      },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "staff.create",
        entityType: "user",
        entityId: staff.id,
        correlationId: randomUUID(),
        metadata: { permissions },
      },
    });

    return NextResponse.json({ ok: true, id: staff.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ساخت کاربر تیم انجام نشد." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "فقط مدیر اصلی می‌تواند اعضای تیم را مدیریت کند." }, { status: 403 });

    const body = await request.json();
    const id = String(body.id || "");
    const target = await db.user.findUnique({ where: { id } });
    if (!target || target.role !== "STAFF") return NextResponse.json({ error: "کاربر تیم پیدا نشد." }, { status: 404 });

    const permissions = cleanPermissions(body.permissions);
    const password = String(body.password || "");
    const data: any = { permissions };
    if (String(body.name || "").trim()) data.name = String(body.name).trim();
    if (password) {
      if (password.length < 8) return NextResponse.json({ error: "رمز جدید باید حداقل ۸ کاراکتر باشد." }, { status: 400 });
      data.passwordHash = await bcrypt.hash(password, 12);
    }

    await db.user.update({ where: { id }, data });
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "staff.update",
        entityType: "user",
        entityId: id,
        correlationId: randomUUID(),
        metadata: { permissions, passwordReset: Boolean(password) },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ویرایش دسترسی انجام نشد." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "فقط مدیر اصلی می‌تواند اعضای تیم را مدیریت کند." }, { status: 403 });

    const body = await request.json();
    const id = String(body.id || "");
    const target = await db.user.findUnique({ where: { id } });
    if (!target || target.role !== "STAFF") return NextResponse.json({ error: "کاربر تیم پیدا نشد." }, { status: 404 });

    await db.user.update({ where: { id }, data: { role: "CUSTOMER", permissions: [] } });
    await db.auditLog.create({
      data: { userId: admin.id, action: "staff.revoke", entityType: "user", entityId: id, correlationId: randomUUID() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "لغو دسترسی انجام نشد." }, { status: 500 });
  }
}
