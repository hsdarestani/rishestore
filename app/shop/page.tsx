import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "فروشگاه", description: "همه محصولات ریشه؛ حبوبات، برنج، چای، عسل، غلات و چاشنی‌ها." };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const category = (params.category || "").trim();
  const [categories, products] = await Promise.all([
    db.category.findMany({ orderBy: { sort: "asc" } }),
    db.product.findMany({
      where: {
        active: true,
        kind: "PRODUCT",
        ...(category ? { category: { slug: category } } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { shortDescription: { contains: q, mode: "insensitive" } }, { usage: { contains: q, mode: "insensitive" } }] } : {}),
      },
      include: { category: true },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  return <div className="page-shell container">
    <header className="page-hero shop-hero"><span className="eyebrow">فروشگاه ریشه</span><h1>محصول را پیدا کن، اطلاعاتش را ببین، بعد بخر.</h1><p>دسته‌بندی ساده، جستجوی مستقیم و صفحه محصولی که اطلاعات خرید را یک‌جا نشان می‌دهد.</p>
      <form className="shop-search"><input type="search" name="q" defaultValue={q} placeholder="مثلاً عدس، چای ایرانی یا برنج…" /><button className="btn btn-primary">جستجو</button></form>
    </header>
    <div className="category-pills"><Link className={!category ? "active" : ""} href="/shop">همه</Link>{categories.map((cat) => <Link className={category === cat.slug ? "active" : ""} key={cat.id} href={"/shop?category=" + cat.slug}>{cat.name}</Link>)}</div>
    <div className="results-head"><strong>{products.length.toLocaleString("fa-IR")} محصول</strong>{q && <span>نتیجه برای «{q}»</span>}</div>
    {products.length ? <div className="product-grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <div className="empty-state"><h2>محصولی پیدا نشد</h2><p>عبارت دیگری جستجو کن یا یکی از دسته‌ها را انتخاب کن.</p></div>}
  </div>;
}
