"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import SafeProductImage from "@/components/SafeProductImage";
import { toman } from "@/lib/money";

export default function CartPage() {
  const { items, total, remove, setQuantity, hydrated } = useCart();
  if (!hydrated) return <div className="page-shell container"><div className="panel">در حال خواندن سبد…</div></div>;
  if (!items.length) return <div className="page-shell container"><div className="empty-state"><h1>سبد خریدت خالی است</h1><p>از فروشگاه محصولی انتخاب کن و بعد برگرد.</p><Link className="btn btn-primary" href="/shop">مشاهده فروشگاه</Link></div></div>;

  return <div className="page-shell container">
    <header className="page-hero compact"><span className="eyebrow">سبد خرید</span><h1>انتخاب‌هایت را مرور کن</h1><p>{items.reduce((s,i)=>s+i.quantity,0).toLocaleString("fa-IR")} کالا در سبد داری.</p></header>
    <div className="cart-layout">
      <section className="cart-list">
        {items.map((item) => <article key={item.productId} className="cart-row">
          <Link href={"/product/" + item.slug} className="cart-thumb"><SafeProductImage src={item.image} alt={item.name} /></Link>
          <div className="cart-info"><Link href={"/product/" + item.slug}><h3>{item.name}</h3></Link>{item.weightGrams && <span>{item.weightGrams.toLocaleString("fa-IR")} گرم</span>}<strong>{toman(item.price)}</strong></div>
          <div className="quantity"><button type="button" aria-label="کم کردن" onClick={() => item.quantity <= 1 ? remove(item.productId) : setQuantity(item.productId, item.quantity - 1)}>−</button><span>{item.quantity.toLocaleString("fa-IR")}</span><button type="button" aria-label="اضافه کردن" onClick={() => setQuantity(item.productId, item.quantity + 1)}>+</button></div>
          <strong className="line-total">{toman(item.price * item.quantity)}</strong>
          <button type="button" className="remove remove-prominent" onClick={() => remove(item.productId)}>حذف از سبد</button>
        </article>)}
      </section>
      <aside className="panel cart-summary">
        <h2>جمع سبد</h2>
        <div><span>جمع کالاها</span><strong>{toman(total)}</strong></div>
        <p>هزینه ارسال در مرحله بعد و قبل از پرداخت نمایش داده می‌شود.</p>
        <div className="cart-summary-actions">
          <Link className="btn btn-primary btn-wide" href="/checkout">ادامه و ثبت اطلاعات ارسال</Link>
          <Link className="btn btn-secondary btn-wide" href="/shop">＋ ادامه خرید و افزودن محصول</Link>
        </div>
      </aside>
    </div>
  </div>;
}
