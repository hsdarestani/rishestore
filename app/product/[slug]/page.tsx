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
  return {
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.shortDescription,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug }, include: { category: true } });
  if (!product || !product.active) notFound();
  const [related, posts] = await Promise.all([
    db.product.findMany({ where: { active: true, kind: "PRODUCT", categoryId: product.categoryId || undefined, id: { not: product.id } }, include: { category: true }, take: 4 }),
    db.post.findMany({ where: { published: true, OR: [{ keywords: { contains: product.name.split(" ")[0], mode: "insensitive" } }, ...(product.category ? [{ keywords: { contains: product.category.name, mode: "insensitive" as const } }] : [])] }, take: 3 }),
  ]);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    image: product.image || undefined,
    brand: { "@type": "Brand", name: "ریشه" },
    offers: product.price > 0 ? {
      "@type": "Offer",
      priceCurrency: "IRR",
      price: product.price * 10,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: (process.env.NEXT_PUBLIC_SITE_URL || "") + "/product/" + product.slug,
    } : undefined,
  };

  return <div className="page-shell container">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    <nav className="breadcrumbs"><Link href="/">خانه</Link><span>/</span><Link href="/shop">فروشگاه</Link>{product.category && <><span>/</span><Link href={"/category/" + product.category.slug}>{product.category.name}</Link></>}</nav>
    <section className="product-page">
      <div className="product-gallery">
        {product.image ? <img src={product.image} alt={product.name} /> : <div className="product-large-fallback"><span>{product.name}</span><small>تصویر محصول از پنل مدیریت قابل بارگذاری است</small></div>}
      </div>
      <div className="product-info">
        {product.category && <Link className="eyebrow" href={"/category/" + product.category.slug}>{product.category.name}</Link>}
        <h1>{product.name}</h1>
        <p className="lead">{product.shortDescription}</p>
        <div className="buy-box">
          <div><span>قیمت</span><strong>{product.price > 0 ? toman(product.price) : "در حال به‌روزرسانی"}</strong></div>
          {product.weightGrams && <div><span>وزن</span><strong>{product.weightGrams.toLocaleString("fa-IR")} گرم</strong></div>}
          <div><span>موجودی</span><strong>{product.stock > 0 ? product.stock.toLocaleString("fa-IR") + " عدد" : "ناموجود"}</strong></div>
        </div>
        <AddToCartButton product={{ id: product.id, slug: product.slug, name: product.name, price: product.price, image: product.image, weightGrams: product.weightGrams, stock: product.stock }} />
        <div className="micro-trust"><span>قیمت نهایی قبل از پرداخت</span><span>اطلاعات شفاف محصول</span><span>پیگیری سفارش با کد خرید</span></div>
      </div>
    </section>

    <section className="product-details-grid">
      <article className="panel"><span className="eyebrow">چرا این محصول؟</span><h2>قبل از خرید چه می‌دانیم؟</h2><p>{product.description}</p></article>
      <dl className="details-list">
        {product.weightGrams && <div><dt>وزن</dt><dd>{product.weightGrams.toLocaleString("fa-IR")} گرم</dd></div>}
        {product.origin && <div><dt>مبدأ</dt><dd>{product.origin}</dd></div>}
        {product.usage && <div><dt>کاربرد</dt><dd>{product.usage}</dd></div>}
        {product.quality && <div><dt>اطلاعات کیفیت</dt><dd>{product.quality}</dd></div>}
      </dl>
    </section>

    {product.guarantee && <section className="guarantee"><div><span className="eyebrow">تعهد کیفیت ریشه</span><h2>به شرط پخت</h2></div><p>{product.guarantee}</p></section>}

    {related.length > 0 && <section className="section"><div className="section-heading row-heading"><div><span>محصولات مرتبط</span><h2>انتخاب‌های نزدیک</h2></div></div><div className="product-grid">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div></section>}
    {posts.length > 0 && <section className="section"><div className="section-heading"><span>مجله ریشه</span><h2>برای شناخت بهتر این انتخاب</h2></div><div className="article-grid">{posts.map((post) => <Link className="article-card" key={post.id} href={"/magazine/" + post.slug}><h3>{post.title}</h3><p>{post.excerpt}</p><b>مطالعه ←</b></Link>)}</div></section>}
  </div>;
}
