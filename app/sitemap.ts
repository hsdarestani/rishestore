import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://rishe.store").replace(/\/$/, "");
  const [products, categories, posts, pages] = await Promise.all([
    db.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ select: { slug: true } }),
    db.post.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    db.page.findMany({ select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: base + "/shop", changeFrequency: "daily", priority: 0.9 },
    { url: base + "/packs", changeFrequency: "weekly", priority: 0.8 },
    { url: base + "/magazine", changeFrequency: "weekly", priority: 0.7 },
    { url: base + "/faq", changeFrequency: "monthly", priority: 0.5 },
    ...products.map((p) => ({ url: base + "/product/" + p.slug, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...categories.map((c) => ({ url: base + "/category/" + c.slug, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...posts.map((p) => ({ url: base + "/magazine/" + p.slug, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...pages.map((p) => ({ url: base + "/" + p.slug, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
