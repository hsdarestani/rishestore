import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getStoreConfig } from "@/lib/settings";
import ProductCard from "@/components/ProductCard";
import TrackOrderForm from "@/components/TrackOrderForm";
import { toman } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "faq") return { title: "سوالات متداول", description: "پاسخ سوالات رایج خرید، ارسال، پرداخت، کیفیت و پیگیری سفارش ریشه." };
  if (slug === "packs") return { title: "پک‌های ریشه", description: "پک‌های ساده از محصولات ریشه برای انتخاب راحت‌تر." };
  if (slug === "order-tracking") return { title: "پیگیری سفارش" };
  const page = await db.page.findUnique({ where: { slug } });
  return page ? { title: page.seoTitle || page.title, description: page.seoDescription || page.excerpt || undefined } : {};
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (slug === "faq") {
    const faqs = await db.faq.findMany({ orderBy: { sort: "asc" } });
    const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) };
    return <div className="page-shell container"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><header className="page-hero compact"><span className="eyebrow">راهنمای خرید</span><h1>سوالات متداول ریشه</h1><p>پاسخ‌ها درباره مسیر واقعی خرید، محصول، ارسال، پرداخت و پیگیری سفارش هستند.</p></header><section className="faq-list">{faqs.map((faq, index) => <details key={faq.id} open={index === 0}><summary><span>{String(index + 1).padStart(2, "0")}</span>{faq.question}</summary><p>{faq.answer}</p></details>)}</section></div>;
  }

  if (slug === "packs") {
    const packs = await db.product.findMany({ where: { active: true, kind: "PACK" }, include: { category: true }, orderBy: { updatedAt: "desc" } });
    return <div className="page-shell container"><header className="page-hero"><span className="eyebrow">پک‌های ریشه</span><h1>چند انتخاب کنار هم، یک خرید ساده‌تر.</h1><p>پک‌ها فقط وقتی نمایش داده می‌شوند که محتوا، قیمت و موجودی آن‌ها در پنل مدیریت تکمیل شده باشد.</p></header>{packs.length ? <div className="product-grid">{packs.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <div className="empty-state"><h2>پک فعال هنوز منتشر نشده است.</h2><p>پک‌های شروع، آشپزخانه و صبحانه در پنل مدیریت به‌صورت پیش‌نویس آماده‌اند.</p><Link className="btn btn-primary" href="/shop">مشاهده محصولات</Link></div>}</div>;
  }

  if (slug === "order-tracking") {
    return <div className="page-shell container"><header className="page-hero compact"><span className="eyebrow">پیگیری سفارش</span><h1>آخرین وضعیت سفارش را ببین.</h1><p>کد سفارش و شماره موبایلی که هنگام خرید ثبت شده را وارد کن.</p></header><TrackOrderForm /></div>;
  }

  const page = await db.page.findUnique({ where: { slug } });
  if (!page) notFound();
  const config = await getStoreConfig();
  const paragraphs = page.content.split(/\n\n+/);

  return <div className="page-shell content-page container"><header className="page-hero"><span className="eyebrow">{page.kicker || "ریشه"}</span><h1>{page.title}</h1>{page.excerpt && <p>{page.excerpt}</p>}</header><div className="content-layout"><article className="prose panel">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</article><aside className="side-card"><h3>مسیر بعدی</h3>{slug === "shipping" && <><p>هزینه فعلی ارسال: <strong>{config.shippingFlatRate > 0 ? toman(config.shippingFlatRate) : "در پنل قابل تنظیم"}</strong></p>{config.freeShippingThreshold > 0 && <p>ارسال رایگان از {toman(config.freeShippingThreshold)}</p>}</>}{slug === "contact" && <>{config.storePhone ? <a href={"tel:" + config.storePhone}>{config.storePhone}</a> : <p>شماره تماس هنوز در پنل ثبت نشده است.</p>}{config.instagramUrl && <a href={config.instagramUrl} target="_blank" rel="noreferrer">اینستاگرام ریشه</a>}</>}<Link className="btn btn-primary btn-wide" href="/shop">فروشگاه ریشه</Link><Link className="text-link" href="/faq">سوالات متداول</Link></aside></div></div>;
}
