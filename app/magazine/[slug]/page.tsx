import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.post.findUnique({ where: { slug } });
  return post ? { title: post.title, description: post.excerpt } : {};
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await db.post.findUnique({ where: { slug } });
  if (!post || !post.published) notFound();
  const paragraphs = post.content.split(/\n\n+/);
  const schema = { "@context": "https://schema.org", "@type": "Article", headline: post.title, datePublished: post.createdAt.toISOString(), dateModified: post.updatedAt.toISOString(), publisher: { "@type": "Organization", name: "ریشه" } };
  return <div className="page-shell article-page container"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><nav className="breadcrumbs"><Link href="/">خانه</Link><span>/</span><Link href="/magazine">مجله</Link></nav><header><span className="eyebrow">مجله ریشه</span><h1>{post.title}</h1><p className="lead">{post.excerpt}</p><div className="article-dates">انتشار {post.createdAt.toLocaleDateString("fa-IR")} · آخرین بروزرسانی {post.updatedAt.toLocaleDateString("fa-IR")}</div></header>{post.healthDisclaimer && <div className="alert warning">این مطلب برای آگاهی عمومی است و جایگزین توصیه پزشک یا متخصص سلامت نیست.</div>}<article className="prose">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</article><div className="article-footer"><Link className="btn btn-primary" href="/shop">مشاهده محصولات</Link><Link className="btn btn-ghost" href="/magazine">بازگشت به مجله</Link></div></div>;
}
