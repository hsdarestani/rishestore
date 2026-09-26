import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { toman } from "@/lib/money";
import AddToCartButton from "@/components/AddToCartButton";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug } });
  if (!product) return {};
  const legacy: any = product.legacyContent || {};
  return {
    title: product.seoTitle || legacy?.hero?.display_title || product.name,
    description: product.seoDescription || legacy?.hero?.myth || product.shortDescription,
  };
}

function text(value: unknown) {
  return String(value || "").trim();
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug }, include: { category: true } });
  if (!product || !product.active) notFound();

  const legacy: any = product.legacyContent || {};
  const hero = legacy.hero || {};
  const specs = legacy.specs_section || {};
  const narrative = legacy.narrative || {};
  const legacyGuarantee = legacy.guarantee || {};
  const testimonials = legacy.testimonials_section || {};
  const legacyFaq = legacy.faq_section || {};

  const [related, posts] = await Promise.all([
    db.product.findMany({ where: { active: true, kind: "PRODUCT", categoryId: product.categoryId || undefined, id: { not: product.id } }, include: { category: true }, take: 4 }),
    db.post.findMany({
      where: {
        published: true,
        OR: [
          { keywords: { contains: product.name.split(" ")[0], mode: "insensitive" } },
          ...(product.category ? [{ keywords: { contains: product.category.name, mode: "insensitive" as const } }] : []),
        ],
      },
      take: 3,
    }),
  ]);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: text(hero.display_title) || product.name,
    description: text(hero.story) || product.shortDescription,
    image: product.image || undefined,
    brand: { "@type": "Brand", name: "ریشه" },
    offers: product.price > 0 ? {
      "@type": "Offer",
      priceCurrency: "IRR",
      price: product.price * 10,
      availability: product.stock > 0 ? "https://schema.org/InStock" : product.allowBackorder ? "https://schema.org/PreOrder" : "https://schema.org/OutOfStock",
      url: (process.env.NEXT_PUBLIC_SITE_URL || "") + "/product/" + product.slug,
    } : undefined,
  };

  return <div className="page-shell container">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <nav className="breadcrumbs"><Link href="/">خانه</Link><span>/</span><Link href="/shop">فروشگاه</Link>{product.category && <><span>/</span><Link href={"/category/" + product.category.slug}>{product.category.name}</Link></>}</nav>

    <section className="product-page">
      <div className="product-gallery">
        {product.image ? <img src={product.image} alt={text(hero.display_title) || product.name} /> : <div className="product-large-fallback"><span>{product.name}</span><small>تصویر محصول در حال آماده‌سازی است</small></div>}
      </div>

      <div className="product-info">
        {text(hero.badge) && <span className="legacy-hero-badge">{hero.badge}</span>}
        {product.category && <Link className="eyebrow" href={"/category/" + product.category.slug}>{text(hero.breadcrumb) || product.category.name}</Link>}
        <h1>{text(hero.display_title) || product.name}</h1>
        <p className="product-myth">{text(hero.myth) || product.shortDescription}</p>
        <p className="lead">{text(hero.story) || product.description}</p>

        {Array.isArray(hero.badges) && hero.badges.length > 0 && <div className="product-badges">
          {hero.badges.map((badge: string, index: number) => <span key={index}>{badge}</span>)}
        </div>}

        <div className="buy-box">
          <div><span>قیمت</span><strong>{product.price > 0 ? toman(product.price) : "در حال به‌روزرسانی"}</strong></div>
          {product.weightGrams && <div><span>وزن</span><strong>{product.weightGrams.toLocaleString("fa-IR")} گرم</strong></div>}
          <div><span>موجودی</span><strong>{product.stock > 0 ? product.stock.toLocaleString("fa-IR") + " عدد" : product.allowBackorder ? "پیش‌سفارش" : "ناموجود"}</strong></div>
        </div>

        <AddToCartButton product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.image,
          weightGrams: product.weightGrams,
          stock: product.stock,
          allowBackorder: product.allowBackorder,
        }} />
        <div className="micro-trust"><span>قیمت نهایی قبل از پرداخت</span><span>اطلاعات واقعی محصول</span><span>پرداخت امن زیبال</span></div>
      </div>
    </section>

    {Array.isArray(specs.items) && specs.items.length > 0 && <section className="legacy-section">
      <div className="section-heading"><span>{text(specs.eyebrow) || "شناخت محصول"}</span><h2>{text(specs.title) || "مشخصات محصول"}</h2></div>
      <div className="legacy-spec-grid">
        {specs.items.map((item: any, index: number) => <article key={index}><span>{text(item.label)}</span><strong>{text(item.value)}</strong></article>)}
      </div>
    </section>}

    <section className="product-details-grid">
      <article className="panel"><span className="eyebrow">چرا این محصول؟</span><h2>قبل از خرید چه می‌دانیم؟</h2><p>{text(narrative.intro) || product.description}</p></article>
      <dl className="details-list">
        {product.weightGrams && <div><dt>وزن</dt><dd>{product.weightGrams.toLocaleString("fa-IR")} گرم</dd></div>}
        {product.origin && <div><dt>مبدأ</dt><dd>{product.origin}</dd></div>}
        {product.usage && <div><dt>کاربرد</dt><dd>{product.usage}</dd></div>}
        <div><dt>وضعیت فروش</dt><dd>{product.stock > 0 ? "موجود" : product.allowBackorder ? "قابل پیش‌سفارش" : "ناموجود"}</dd></div>
        {product.stockStatus && <div><dt>وضعیت انبار</dt><dd>{product.stockStatus}</dd></div>}
      </dl>
    </section>

    {Array.isArray(narrative.steps) && narrative.steps.length > 0 && <section className="legacy-section narrative-section">
      <div className="section-heading"><span>{text(narrative.eyebrow) || "مسیر محصول"}</span><h2>{text(narrative.title)}</h2></div>
      <div className="narrative-grid">
        {narrative.steps.map((step: any, index: number) => <article key={index}><i>{text(step.number) || (index + 1).toLocaleString("fa-IR")}</i><h3>{text(step.title)}</h3><p>{text(step.body)}</p></article>)}
      </div>
    </section>}

    {(text(legacyGuarantee.body) || product.guarantee) && <section className="guarantee"><div><span className="eyebrow">تعهد کیفیت ریشه</span><h2>{text(legacyGuarantee.title) || "به شرط پخت"}</h2></div><p>{text(legacyGuarantee.body) || product.guarantee}</p></section>}

    {Array.isArray(testimonials.items) && testimonials.items.length > 0 && <section className="legacy-section">
      <div className="section-heading"><span>{text(testimonials.eyebrow) || "تجربه خریداران"}</span><h2>{text(testimonials.title) || "نظر خریداران"}</h2></div>
      <div className="review-grid">
        {testimonials.items.map((item: any, index: number) => <blockquote key={index}><div>{"★".repeat(Math.max(1, Math.min(5, Number(item.rating || 5))))}</div><p>{text(item.quote)}</p><cite>{text(item.name)}{text(item.location) ? " · " + text(item.location) : ""}</cite></blockquote>)}
      </div>
    </section>}

    {Array.isArray(legacyFaq.items) && legacyFaq.items.length > 0 && <section className="legacy-section product-faq">
      <div className="section-heading"><span>{text(legacyFaq.eyebrow) || "پرسش و پاسخ"}</span><h2>{text(legacyFaq.title) || "سوالات متداول"}</h2></div>
      <div className="faq-list">
        {legacyFaq.items.map((item: any, index: number) => <details key={index}><summary><span>{String(index + 1).padStart(2, "0")}</span>{text(item.question)}</summary><p>{text(item.answer)}</p></details>)}
      </div>
    </section>}

    {related.length > 0 && <section className="section"><div className="section-heading row-heading"><div><span>محصولات مرتبط</span><h2>انتخاب‌های نزدیک</h2></div></div><div className="product-grid">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div></section>}

    {posts.length > 0 && <section className="section"><div className="section-heading"><span>مجله ریشه</span><h2>برای شناخت بهتر این انتخاب</h2></div><div className="article-grid">{posts.map((post) => <Link className="article-card" key={post.id} href={"/magazine/" + post.slug}><h3>{post.title}</h3><p>{post.excerpt}</p><b>مطالعه ←</b></Link>)}</div></section>}
  </div>;
}
