import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) return {};
  return { title: category.name, description: category.description || "محصولات ریشه" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug }, include: { products: { where: { active: true, kind: "PRODUCT" }, include: { category: true }, orderBy: { updatedAt: "desc" } } } });
  if (!category) notFound();
  return <div className="page-shell container"><header className="page-hero compact"><span className="eyebrow">دسته‌بندی</span><h1>{category.name}</h1><p>{category.description}</p></header>{category.products.length ? <div className="product-grid">{category.products.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <div className="empty-state">محصول فعال در این دسته هنوز ثبت نشده است.</div>}</div>;
}
