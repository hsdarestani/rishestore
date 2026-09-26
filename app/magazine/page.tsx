import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "مجله ریشه", description: "راهنمای خرید، نگهداری، پخت و تشخیص کیفیت محصولات ریشه." };

export default async function MagazinePage() {
  const posts = await db.post.findMany({ where: { published: true }, orderBy: { updatedAt: "desc" } });
  return <div className="page-shell container"><header className="page-hero"><span className="eyebrow">مجله ریشه</span><h1>محتوا برای انتخاب بهتر، نه فقط برای کلیک.</h1><p>راهنمای خرید، نگهداری و کیفیت به محصول و تصمیم خرید متصل است.</p></header><div className="article-grid large">{posts.map((post) => <Link className="article-card" key={post.id} href={"/magazine/" + post.slug}><span>{post.updatedAt.toLocaleDateString("fa-IR")}</span><h2>{post.title}</h2><p>{post.excerpt}</p><b>مطالعه مطلب ←</b></Link>)}</div></div>;
}
