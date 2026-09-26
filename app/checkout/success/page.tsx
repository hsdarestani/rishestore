import Link from "next/link";
import { db } from "@/lib/db";
import { toman } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string; status?: string }> }) {
  const { order: code, status } = await searchParams;
  const order = code ? await db.order.findUnique({ where: { code } }) : null;
  const paid = order?.paymentStatus === "PAID" || status === "paid";
  return <div className="page-shell container"><div className={"result-card " + (paid ? "success" : "pending")}><span className="result-icon">{paid ? "✓" : "!"}</span><h1>{paid ? "پرداخت با موفقیت تأیید شد" : "وضعیت پرداخت نیاز به بررسی دارد"}</h1>{order ? <><p>کد سفارش: <strong>{order.code}</strong></p><p>مبلغ سفارش: <strong>{toman(order.total)}</strong></p><p>وضعیت سفارش: <strong>{order.status}</strong></p></> : <p>اطلاعات سفارش پیدا نشد.</p>}<div className="hero-actions"><Link className="btn btn-primary" href="/account">حساب کاربری</Link><Link className="btn btn-ghost" href="/order-tracking">پیگیری سفارش</Link></div></div></div>;
}
