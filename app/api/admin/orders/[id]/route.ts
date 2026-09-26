import { NextResponse } from "next/server";
import { assertSameOrigin, requireCapability } from "@/lib/auth";
import { db } from "@/lib/db";

const allowed = new Set(["PENDING","PROCESSING","SHIPPED","COMPLETED","CANCELED"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  assertSameOrigin(request);
  if (!(await requireCapability("orders.write"))) return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const status = String(body.status || "");
  if (!allowed.has(status)) return NextResponse.json({ error: "وضعیت معتبر نیست." }, { status: 400 });
  await db.order.update({ where: { id }, data: { status: status as any } });
  return NextResponse.json({ ok: true });
}
