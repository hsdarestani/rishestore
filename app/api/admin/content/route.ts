import { NextResponse } from "next/server";
import { assertSameOrigin, requireCapability } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await requireCapability("content.write"))) return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
    const body = await request.json();
    const kind = String(body.kind || "");
    const id = String(body.id || "");
    if (kind === "page") {
      await db.page.update({ where: { id }, data: { title: String(body.title || "").trim(), kicker: String(body.kicker || "").trim() || null, excerpt: String(body.excerpt || "").trim() || null, content: String(body.content || "").trim(), seoTitle: String(body.seoTitle || "").trim() || null, seoDescription: String(body.seoDescription || "").trim() || null } });
    } else if (kind === "post") {
      await db.post.update({ where: { id }, data: { title: String(body.title || "").trim(), excerpt: String(body.excerpt || "").trim(), content: String(body.content || "").trim(), keywords: String(body.keywords || "").trim() || null, image: String(body.image || "").trim() || null, published: Boolean(body.published), healthDisclaimer: Boolean(body.healthDisclaimer) } });
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


export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await requireCapability("content.write"))) return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
    const body = await request.json();
    const kind = String(body.kind || "");
    if (kind === "page") {
      const slug = String(body.slug || "").trim().toLowerCase();
      const title = String(body.title || "").trim();
      if (!title || !/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: "عنوان و اسلاگ انگلیسی معتبر لازم است." }, { status: 400 });
      const row = await db.page.create({ data: {
        slug, title,
        kicker: String(body.kicker || "").trim() || null,
        excerpt: String(body.excerpt || "").trim() || null,
        content: String(body.content || "").trim(),
        seoTitle: String(body.seoTitle || "").trim() || null,
        seoDescription: String(body.seoDescription || "").trim() || null,
      } });
      return NextResponse.json({ ok: true, id: row.id });
    }
    if (kind === "post") {
      const slug = String(body.slug || "").trim().toLowerCase();
      const title = String(body.title || "").trim();
      if (!title || !/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: "عنوان و اسلاگ انگلیسی معتبر لازم است." }, { status: 400 });
      const row = await db.post.create({ data: {
        slug, title,
        excerpt: String(body.excerpt || "").trim(),
        content: String(body.content || "").trim(),
        keywords: String(body.keywords || "").trim() || null,
        image: String(body.image || "").trim() || null,
        published: Boolean(body.published),
        healthDisclaimer: Boolean(body.healthDisclaimer),
      } });
      return NextResponse.json({ ok: true, id: row.id });
    }
    if (kind === "faq") {
      const question = String(body.question || "").trim();
      const answer = String(body.answer || "").trim();
      if (!question || !answer) return NextResponse.json({ error: "سوال و پاسخ لازم است." }, { status: 400 });
      const row = await db.faq.create({ data: { question, answer, sort: Math.trunc(Number(body.sort || 0)) } });
      return NextResponse.json({ ok: true, id: row.id });
    }
    return NextResponse.json({ error: "نوع محتوا معتبر نیست." }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ساخت محتوا انجام نشد؛ اسلاگ یا سوال تکراری نباشد." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await requireCapability("content.write"))) return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
    const body = await request.json();
    const kind = String(body.kind || "");
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "شناسه لازم است." }, { status: 400 });
    if (kind === "page") await db.page.delete({ where: { id } });
    else if (kind === "post") await db.post.delete({ where: { id } });
    else if (kind === "faq") await db.faq.delete({ where: { id } });
    else return NextResponse.json({ error: "نوع محتوا معتبر نیست." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "حذف محتوا انجام نشد." }, { status: 500 });
  }
}
