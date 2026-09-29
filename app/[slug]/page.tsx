import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getStoreConfig } from "@/lib/settings";
import { toman } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "faq") return { title: "سوالات متداول", description: "پاسخ سوالات رایج خرید، ارسال، پرداخت، کیفیت و پیگیری سفارش ریشه." };
  const page = await db.page.findUnique({ where: { slug } });
  return page ? { title: page.seoTitle || page.title, description: page.seoDescription || page.excerpt || undefined } : {};
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (slug === "faq") {
    const faqs = await db.faq.findMany({ orderBy: { sort: "asc" } });
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };
    return <div className="page-shell container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header className="page-hero compact">
        <span className="eyebrow">راهنمای خرید</span>
        <h1>سوالات متداول ریشه</h1>
        <p>پاسخ سوالات رایج درباره محصول، ارسال، پرداخت و پیگیری سفارش.</p>
      </header>
      <section className="faq-list">
        {faqs.map((faq, index) => <details key={faq.id} open={index === 0}>
          <summary><span>{String(index + 1).padStart(2, "0")}</span>{faq.question}</summary>
          <p>{faq.answer}</p>
        </details>)}
      </section>
    </div>;
  }

  const page = await db.page.findUnique({ where: { slug } });
  if (!page) notFound();

  const config = await getStoreConfig();
  const paragraphs = page.content.split(/\n\n+/);

  return <div className="page-shell content-page container">
    <header className="page-hero">
      <span className="eyebrow">{page.kicker || "ریشه"}</span>
      <h1>{page.title}</h1>
      {page.excerpt && <p>{page.excerpt}</p>}
    </header>
    <div className="content-layout">
      <article className="prose panel">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</article>
      <aside className="side-card">
        <h3>اطلاعات مرتبط</h3>
        {slug === "shipping" && <>
          <p>هزینه فعلی ارسال: <strong>{config.shippingFlatRate > 0 ? toman(config.shippingFlatRate) : "رایگان"}</strong></p>
          {config.freeShippingThreshold > 0 && <p>ارسال رایگان از {toman(config.freeShippingThreshold)}</p>}
        </>}
        {slug === "contact" && <>
          {config.storePhone && <a href={"tel:" + config.storePhone}>{config.storePhone}</a>}
          {config.baleUrl && <a href={config.baleUrl} target="_blank" rel="noreferrer">پیام‌رسان بله</a>}
          {config.instagramUrl && <a href={config.instagramUrl} target="_blank" rel="noreferrer">اینستاگرام ریشه</a>}
        </>}
        <Link className="btn btn-primary btn-wide" href="/shop">فروشگاه ریشه</Link>
        <Link className="text-link" href="/faq">سوالات متداول</Link>
      </aside>
    </div>
  </div>;
}
