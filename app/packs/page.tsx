import type { Metadata } from "next";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پک‌های پیشنهادی",
  description: "پک‌های پیشنهادی ریشه با ترکیب‌های آماده، قیمت ویژه و محصولات اصیل ایرانی.",
};

export default async function PacksPage() {
  const packs = await db.product.findMany({
    where: { active: true, kind: "PACK" },
    include: { category: true },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
  });

  return <div className="page-shell container">
    <header className="page-hero">
      <span className="eyebrow">پک‌های پیشنهادی ریشه</span>
      <h1>ترکیب‌های آماده برای آشپزی اصیل، صبحانه سالم و خرید راحت‌تر</h1>
      <p>هر پک از محصولات اصلی فروشگاه ساخته شده و قیمت قبلی و قیمت ویژه آن شفاف کنار هم نمایش داده می‌شود.</p>
    </header>

    <div className="results-head">
      <strong>{packs.length.toLocaleString("fa-IR")} پک</strong>
      <span>قیمت‌ها به تومان</span>
    </div>

    {packs.length
      ? <div className="product-grid">{packs.map((pack) => <ProductCard key={pack.id} product={pack} />)}</div>
      : <div className="empty-state"><h2>پک‌ها در حال آماده‌سازی هستند</h2><p>به‌زودی ترکیب‌های پیشنهادی ریشه اینجا نمایش داده می‌شوند.</p></div>}
  </div>;
}
