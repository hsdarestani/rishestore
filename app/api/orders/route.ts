import { NextResponse } from "next/server";
/** Online website checkout is closed; ERP and POS transactions are unaffected. */
export async function POST() {
  return NextResponse.json({ error: "ثبت سفارش در سایت ریشه متوقف شده است. خرید از غرفه ریشه در باسلام انجام می‌شود." }, { status: 410 });
}
