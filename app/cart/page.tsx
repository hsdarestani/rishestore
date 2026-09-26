"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { toman } from "@/lib/money";

export default function CartPage() {
  const { items, total, remove, setQuantity, hydrated } = useCart();
  if (!hydrated) return <div className="page-shell container"><div className="panel">در حال خواندن سبد…</div></div>;
  if (!items.length) return <div className="page-shell container"><div className="empty-state"><h1>سبد خریدت خالی است</h1><p>از فروشگاه محصولی انتخاب کن و بعد برگرد.</p><Link className="btn btn-primary" href="/shop">مشاهده فروشگاه</Link></div></div>;

  return <div className="page-shell container"><header className="page-hero compact"><span className="eyebrow">سبد خرید</span><h1>سفارش را مرور کن.</h1></header><div className="cart-layout"><section className="cart-list">{items.map((item) => <article key={item.productId} className="cart-row"><Link href={"/product/" + item.slug} className="cart-thumb">{item.image ? <img src={item.image} alt="" /> : item.name.slice(0,1)}</Link><div className="cart-info"><Link href={"/product/" + item.slug}><h3>{item.name}</h3></Link>{item.weightGrams && <span>{item.weightGrams.toLocaleString("fa-IR")} گرم</span>}<strong>{toman(item.price)}</strong></div><div className="quantity"><button onClick={() => setQuantity(item.productId, item.quantity - 1)}>−</button><span>{item.quantity.toLocaleString("fa-IR")}</span><button onClick={() => setQuantity(item.productId, item.quantity + 1)}>+</button></div><strong className="line-total">{toman(item.price * item.quantity)}</strong><button className="remove" onClick={() => remove(item.productId)}>حذف</button></article>)}</section><aside className="panel cart-summary"><h2>جمع سبد</h2><div><span>جمع کالاها</span><strong>{toman(total)}</strong></div><p>هزینه ارسال در تسویه‌حساب بر اساس تنظیمات فروشگاه محاسبه می‌شود.</p><Link className="btn btn-primary btn-wide" href="/checkout">ادامه و تسویه‌حساب</Link><Link className="text-link" href="/shop">ادامه خرید</Link></aside></div></div>;
}
