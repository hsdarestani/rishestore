"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { CartIcon } from "@/components/Icons";

type ProductInput = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image?: string | null;
  weightGrams?: number | null;
  stock: number;
  allowBackorder?: boolean;
};

export default function AddToCartButton({ product, compact = false }: { product: ProductInput; compact?: boolean }) {
  const { add, items, setQuantity, remove } = useCart();
  const [added, setAdded] = useState(false);
  const available = product.price > 0 && (product.stock > 0 || product.allowBackorder);
  const current = items.find((item) => item.productId === product.id);
  const quantity = current?.quantity || 0;

  if (!available) return <button type="button" className={"btn disabled " + (compact ? "btn-sm" : "")} disabled>فعلاً ناموجود</button>;

  function addOne() {
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      weightGrams: product.weightGrams,
      stock: product.allowBackorder ? Math.max(product.stock, 99) : product.stock,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  if (compact) {
    return <button type="button" className="btn btn-primary btn-sm" onClick={addOne}>
      <CartIcon size={17} />
      <span>{quantity > 0 ? quantity.toLocaleString("fa-IR") + " عدد در سبد · افزودن یکی" : added ? "به سبد اضافه شد" : "افزودن به سبد"}</span>
    </button>;
  }

  if (quantity > 0) {
    return <div className="product-cart-control">
      <div className="product-cart-qty">
        <button type="button" aria-label="کم کردن" onClick={() => quantity <= 1 ? remove(product.id) : setQuantity(product.id, quantity - 1)}>−</button>
        <strong>{quantity.toLocaleString("fa-IR")} عدد در سبد</strong>
        <button type="button" aria-label="اضافه کردن" onClick={addOne}>+</button>
      </div>
      <Link className="btn btn-primary" href="/cart"><CartIcon size={20} />دیدن سبد و ادامه خرید</Link>
    </div>;
  }

  return <button type="button" className="btn btn-primary" onClick={addOne}>
    <CartIcon size={20} />
    <span>{product.stock > 0 ? "افزودن به سبد" : "پیش‌سفارش"}</span>
  </button>;
}
