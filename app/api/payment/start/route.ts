import { NextResponse } from "next/server";
/** Keep historical payment callbacks operational; block new payment starts. */
export async function POST() {
  return NextResponse.json({ error: "پرداخت در سایت ریشه غیرفعال است؛ لطفاً از باسلام خرید کنید." }, { status: 410 });
}
