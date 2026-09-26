"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";

const nav = [
  ["/shop", "فروشگاه"],
  ["/packs", "پک‌ها"],
  ["/why-rishe", "چرا ریشه؟"],
  ["/magazine", "مجله"],
  ["/about", "درباره ریشه"],
];

export default function Header({ storeName = "ریشه" }: { storeName?: string }) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="top-note">انتخاب روشن‌تر، خرید ساده‌تر، اطلاعات شفاف‌تر</div>
      <div className="header-main container">
        <Link href="/" className="brand" aria-label="صفحه اصلی ریشه">
          <span className="brand-mark" aria-hidden>ر</span>
          <span><strong>{storeName}</strong><small>فروشگاه محصولات ایرانی</small></span>
        </Link>

        <nav className={open ? "main-nav is-open" : "main-nav"} aria-label="منوی اصلی">
          {nav.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
          <Link href="/contact" onClick={() => setOpen(false)}>تماس</Link>
        </nav>

        <div className="header-actions">
          <form action="/shop" className="header-search">
            <input name="q" type="search" placeholder="جستجوی محصول…" aria-label="جستجوی محصول" />
          </form>
          <Link className="icon-link" href="/account" aria-label="حساب کاربری">حساب</Link>
          <Link className="cart-link" href="/cart" aria-label={"سبد خرید، " + count + " کالا"}>
            سبد
            {count > 0 && <span>{count.toLocaleString("fa-IR")}</span>}
          </Link>
          <button className="menu-toggle" type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="باز کردن منو">
            <i></i><i></i><i></i>
          </button>
        </div>
      </div>
    </header>
  );
}
