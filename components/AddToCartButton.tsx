"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";

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
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const available = product.price > 0 && (product.stock > 0 || product.allowBackorder);

  if (!available) return <button className={"btn disabled " + (compact ? "btn-sm" : "")} disabled>فعلاً ناموجود</button>;

  return (
    <button
      className={"btn btn-primary " + (compact ? "btn-sm" : "")}
      onClick={() => {
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
        window.setTimeout(() => setAdded(false), 1400);
      }}
    >
      {added ? "به سبد اضافه شد" : product.stock > 0 ? "افزودن به سبد" : "پیش‌سفارش"}
    </button>
  );
}
