"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { toman } from "@/lib/money";

export default function CartDock() {
  const pathname = usePathname();
  const { count, total, hydrated } = useCart();
  if (!hydrated || count <= 0) return null;
  if (pathname.startsWith("/cart") || pathname.startsWith("/checkout") || pathname.startsWith("/login") || pathname.startsWith("/admin") || pathname.startsWith("/pos")) return null;

  return <div className="cart-dock" role="status">
    <div><strong>{count.toLocaleString("fa-IR")} کالا در سبد</strong><span>{toman(total)}</span></div>
    <Link href="/cart">دیدن سبد و نهایی کردن</Link>
  </div>;
}
