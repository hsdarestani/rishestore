import { NextResponse } from "next/server";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await requireAdmin())) return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
    const body = await request.json();
    const kind = String(body.kind || "");
    const id = String(body.id || "");
    if (kind === "page") {
      await db.page.update({ where: { id }, data: { title: String(body.title || "").trim(), kicker: String(body.kicker || "").trim() || null, excerpt: String(body.excerpt || "").trim() || null, content: String(body.content || "").trim() } });
    } else if (kind === "post") {
      await db.post.update({ where: { id }, data: { title: String(body.title || "").trim(), excerpt: String(body.excerpt || "").trim(), content: String(body.content || "").trim(), keywords: String(body.keywords || "").trim() || null, published: Boolean(body.published), healthDisclaimer: Boolean(body.healthDisclaimer) } });
    } else if (kind === "faq") {
      await db.faq.update({ where: { id }, data: { question: String(body.question || "").trim(), answer: String(body.answer || "").trim(), sort: Math.trunc(Number(body.sort || 0)) } });
    } else {
      return NextResponse.json({ error: "نوع محتوا معتبر نیست." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ذخیره محتوا انجام نشد." }, { status: 500 });
  }
}
