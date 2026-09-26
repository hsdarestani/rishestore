import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStoreConfig } from "@/lib/settings";
import AdminPanel from "@/components/AdminPanel";
import LegacyImportButton from "@/components/LegacyImportButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const [products, categories, orders, pages, posts, faqs, settings] = await Promise.all([
    db.product.findMany({ orderBy: [{ kind: "asc" }, { updatedAt: "desc" }] }),
    db.category.findMany({ orderBy: { sort: "asc" } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.page.findMany({ orderBy: { title: "asc" } }),
    db.post.findMany({ orderBy: { updatedAt: "desc" } }),
    db.faq.findMany({ orderBy: { sort: "asc" } }),
    getStoreConfig(),
  ]);

  const serializedOrders = orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() }));
  return <div className="admin-page container"><LegacyImportButton /><AdminPanel products={products} categories={categories} orders={serializedOrders} pages={pages} posts={posts} faqs={faqs} settings={settings} /></div>;
}
