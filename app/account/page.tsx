import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toman } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="page-shell container"><div className="empty-state"><h1>حساب کاربری</h1><p>برای دیدن سفارش‌های قبلی وارد شو.</p><Link className="btn btn-primary" href="/login">ورود یا ثبت‌نام</Link></div></div>;
  const orders = await db.order.findMany({ where: { userId: user.id }, include: { items: true }, orderBy: { createdAt: "desc" } });
  return <div className="page-shell container"><header className="account-head"><div><span className="eyebrow">حساب ریشه</span><h1>{user.name}</h1><p>{user.phone}</p></div><div className="hero-actions">{user.role === "ADMIN" && <Link className="btn btn-secondary" href="/admin">پنل مدیریت</Link>}<form action="/api/auth/logout" method="post"><button className="btn btn-ghost">خروج</button></form></div></header><section className="section"><div className="section-heading"><span>سفارش‌ها</span><h2>تاریخچه خرید</h2></div>{orders.length ? <div className="orders-list">{orders.map((order) => <article key={order.id}><div><strong>{order.code}</strong><span>{order.createdAt.toLocaleDateString("fa-IR")}</span></div><div><span>{order.items.length.toLocaleString("fa-IR")} قلم</span><span>{order.status}</span><span>{order.paymentStatus}</span><b>{toman(order.total)}</b></div></article>)}</div> : <div className="empty-state small">هنوز سفارشی با این حساب ثبت نشده است.</div>}</section></div>;
}
