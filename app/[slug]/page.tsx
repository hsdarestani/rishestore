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
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    };
    return <div className="page-shell container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <header className="page-hero compact"><span className="eyebrow">راهنمای خرید</span><h1>سوالات متداول ریشه</h1><p>پاسخ سوالات رایج درباره محصول، ارسال، پرداخت و پیگیری سفارش.</p></header>
      <section className="faq-list">{faqs.map((faq, index) => <details key={faq.id} open={index === 0}><summary><span>{String(index + 1).padStart(2, "0")}</span>{faq.question}</summary><p>{faq.answer}</p></details>)}</section>
    </div>;
  }

  const page = await db.page.findUnique({ where: { slug } });
  if (!page) notFound();
  const config = await getStoreConfig();

  if (slug === "contact") {
    const channels = [
      config.storePhone ? { label: "تماس تلفنی", value: config.storePhone, href: "tel:" + config.storePhone, hint: "برای هماهنگی سریع و سوال پیش از خرید" } : null,
      config.whatsappUrl ? { label: "واتس‌اپ", value: "پیام مستقیم", href: config.whatsappUrl, hint: "برای ارسال پیام، عکس یا جزئیات سفارش" } : null,
      config.baleUrl ? { label: "پیام‌رسان بله", value: "گفت‌وگو با ریشه", href: config.baleUrl, hint: "یک مسیر جایگزین برای پشتیبانی" } : null,
      config.instagramUrl ? { label: "اینستاگرام", value: "صفحه ریشه", href: config.instagramUrl, hint: "برای دنبال کردن محتوا و خبرهای ریشه" } : null,
    ].filter(Boolean) as Array<{label:string;value:string;href:string;hint:string}>;

    return <div className="page-shell container contact-page">
      <header className="page-hero"><span className="eyebrow">پشتیبانی ریشه</span><h1>از چه راهی راحت‌ترید؟</h1><p>برای خرید، پیگیری سفارش یا گزارش مغایرت، یک راه ارتباطی را انتخاب کنید. لازم نیست بین چند صفحه دنبال شماره و لینک بگردید.</p></header>
      <section className="contact-hub">
        <div className="contact-channel-grid">
          {channels.map((item) => <a key={item.label} href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
            <span>{item.label}</span><strong>{item.value}</strong><p>{item.hint}</p><b>ارتباط الآن ←</b>
          </a>)}
        </div>
        <div className="contact-address-grid">
          {config.storeAddress && <article><span>آدرس فروشگاه</span><strong>{config.storeAddress}</strong></article>}
          {config.warehouseAddress && <article><span>آدرس انبار</span><strong>{config.warehouseAddress}</strong></article>}
        </div>
        <div className="contact-order-help"><div><span>برای سفارش موجود</span><h2>شماره سفارش را همراه پیام بفرستید</h2><p>این کار باعث می‌شود تیم پشتیبانی سریع‌تر سفارش و وضعیت پرداخت یا ارسال را پیدا کند.</p></div><Link className="btn btn-primary" href="/order-tracking">پیگیری سفارش</Link></div>
      </section>
    </div>;
  }

  const paragraphs = page.content.split(/\n\n+/);
  const title = slug === "returns" ? "رسیدگی به سفارش و مغایرت" : page.title;
  const excerpt = slug === "returns" ? "اگر محصول یا سفارش با اطلاعات زمان خرید تطابق نداشت، از این مسیر درخواست بررسی ثبت کنید." : page.excerpt;
  const cta = slug === "shipping"
    ? { href: "/shop", label: "انتخاب محصول و شروع خرید" }
    : slug === "returns"
      ? { href: "/contact", label: "درخواست بررسی سفارش" }
      : { href: "/shop", label: "مشاهده محصولات ریشه" };

  return <div className="page-shell content-page container">
    <header className="page-hero"><span className="eyebrow">{page.kicker || "ریشه"}</span><h1>{title}</h1>{excerpt && <p>{excerpt}</p>}</header>
    <div className="content-layout">
      <article className="prose panel">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</article>
      <aside className="side-card side-card-action">
        <span className="eyebrow">قدم بعدی</span>
        {slug === "shipping" && <><h3>آماده خریدی؟</h3><p>هزینه نهایی ارسال قبل از پرداخت به شما نشان داده می‌شود.</p>{config.freeShippingThreshold > 0 && <p>ارسال رایگان از {toman(config.freeShippingThreshold)}</p>}</>}
        {slug === "returns" && <><h3>سفارشی برای بررسی داری؟</h3><p>شماره سفارش و توضیح مسئله را آماده کن و مستقیم با پشتیبانی در تماس باش.</p></>}
        {!["shipping","returns"].includes(slug) && <><h3>محصولات را ببین</h3><p>اگر آماده انتخاب هستی، مستقیم وارد ویترین محصولات شو.</p></>}
        <Link className="btn btn-primary btn-wide" href={cta.href}>{cta.label}</Link>
        <Link className="text-link" href="/faq">سوالات متداول</Link>
      </aside>
    </div>
  </div>;
}
