import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/money";

export async function GET(request: NextRequest) {
  const code = String(request.nextUrl.searchParams.get("code") || "").trim().toUpperCase();
  const phone = normalizePhone(String(request.nextUrl.searchParams.get("phone") || ""));
  if (!code || !phone) return NextResponse.json({ error: "کد سفارش و شماره موبایل را وارد کنید." }, { status: 400 });
  const order = await db.order.findFirst({ where: { code, phone }, select: { code: true, status: true, paymentStatus: true, total: true, createdAt: true } });
  if (!order) return NextResponse.json({ error: "سفارشی با این اطلاعات پیدا نشد." }, { status: 404 });
  return NextResponse.json({ order });
}
