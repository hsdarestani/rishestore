"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import {
  BookIcon,
  CartIcon,
  CloseIcon,
  GridIcon,
  HomeIcon,
  InfoIcon,
  MenuIcon,
  PhoneIcon,
  SearchIcon,
  ShieldIcon,
  SparklesIcon,
  UserIcon,
} from "@/components/Icons";

const nav = [
  { href: "/shop", label: "فروشگاه", Icon: GridIcon },
  { href: "/packs", label: "پک‌ها", Icon: SparklesIcon },
  { href: "/why-rishe", label: "چرا ریشه؟", Icon: ShieldIcon },
  { href: "/magazine", label: "مجله", Icon: BookIcon },
  { href: "/about", label: "درباره ریشه", Icon: InfoIcon },
  { href: "/contact", label: "تماس", Icon: PhoneIcon },
];

export default function Header({ storeName = "ریشه" }: { storeName?: string }) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  function closePanels() {
    setOpen(false);
    setSearchOpen(false);
  }

  return (
    <header className="site-header">
      <div className="top-note">
        <ShieldIcon size={15} />
        <span>کیفیت، به شرط پخت</span>
      </div>

      <div className="header-main container">
        <Link href="/" className="brand brand-image" aria-label="صفحه اصلی فروشگاه ریشه" onClick={closePanels}>
          <img className="brand-logo" src="/brand/logo.png" alt={storeName} />
        </Link>

        <nav className={open ? "main-nav is-open" : "main-nav"} aria-label="منوی اصلی">
          <Link href="/" className="mobile-home-link" onClick={closePanels}>
            <HomeIcon size={20} /><span>خانه</span>
          </Link>
          {nav.map(({ href, label, Icon }) => (
            <Link key={href} href={href} onClick={closePanels}>
              <Icon size={19} /><span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <form action="/shop" className="header-search">
            <SearchIcon size={18} />
            <input name="q" type="search" placeholder="جستجوی محصول…" aria-label="جستجوی محصول" />
          </form>

          <button
            className="header-icon-button mobile-search-toggle"
            type="button"
            onClick={() => { setSearchOpen((v) => !v); setOpen(false); }}
            aria-expanded={searchOpen}
            aria-label="جستجو"
          >
            {searchOpen ? <CloseIcon size={22} /> : <SearchIcon size={22} />}
          </button>

          <Link className="header-icon-button account-link" href="/account" aria-label="حساب کاربری">
            <UserIcon size={22} />
            <span>حساب</span>
          </Link>

          <Link className="header-icon-button cart-link" href="/cart" aria-label={"سبد خرید، " + count + " کالا"}>
            <CartIcon size={22} />
            <span className="action-label">سبد</span>
            {count > 0 && <b className="cart-count">{count.toLocaleString("fa-IR")}</b>}
          </Link>

          <button
            className="header-icon-button menu-toggle"
            type="button"
            onClick={() => { setOpen((v) => !v); setSearchOpen(false); }}
            aria-expanded={open}
            aria-label={open ? "بستن منو" : "باز کردن منو"}
          >
            {open ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form action="/shop" className="mobile-search-panel container">
          <SearchIcon size={20} />
          <input name="q" type="search" autoFocus placeholder="دنبال چه محصولی هستید؟" aria-label="جستجوی محصول" />
          <button type="submit">جستجو</button>
        </form>
      )}
    </header>
  );
}
