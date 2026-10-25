import Link from "next/link";
import { basalamHref } from "@/lib/basalam-links";
export default function CartPage() {
  return <div className="page-shell container"><div className="empty-state">
    <h1>خرید از باسلام</h1>
    <p>سبد خرید و ثبت سفارش مستقیم در سایت ریشه بسته شده است. برای دیدن محصولات و ثبت سفارش به غرفه ریشه در باسلام بروید.</p>
    <Link className="btn btn-primary" href={basalamHref()}>رفتن به باسلام</Link>
    <Link className="btn btn-secondary" href="/order-tracking">پیگیری سفارش‌های قبلی سایت</Link>
  </div></div>;
}
