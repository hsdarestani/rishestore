"use client";

import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import SafeProductImage from "@/components/SafeProductImage";
import { toman } from "@/lib/money";
import { ScaleIcon, SparklesIcon, TagIcon } from "@/components/Icons";

type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  price: number;
  compareAt?: number | null;
  stock: number;
  kind?: "PRODUCT" | "PACK";
  allowBackorder?: boolean;
  image?: string | null;
  weightGrams?: number | null;
  category?: { name: string; slug: string } | null;
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  const hasDiscount = Boolean(product.compareAt && product.compareAt > product.price);

  return (
    <article className="product-card">
      <Link href={"/product/" + product.slug} className="product-media">
        {product.image
          ? <SafeProductImage src={product.image} alt={product.name} fallback={product.kind === "PACK" ? "تصویر این پک به‌زودی اضافه می‌شود" : "تصویر محصول به‌زودی اضافه می‌شود"} />
          : product.kind === "PACK"
            ? <span className="product-fallback pack-fallback"><SparklesIcon size={42} /><small>پک ریشه</small></span>
            : <span className="product-fallback">{product.name.slice(0, 1)}</span>}
        {product.kind === "PACK" ? <em>پک پیشنهادی</em> : product.category && <em>{product.category.name}</em>}
        {product.stock <= 0 && product.allowBackorder && <span className="backorder-badge">قابل پیش‌سفارش</span>}
      </Link>
      <div className="product-body">
        <Link href={"/product/" + product.slug}><h3>{product.name}</h3></Link>
        <p>{product.shortDescription}</p>
        <div className="product-meta">
          <div className="product-price">
            <TagIcon size={17} />
            <div>
              {hasDiscount && <del>{toman(product.compareAt!)}</del>}
              <strong>{product.price > 0 ? toman(product.price) : "قیمت در حال به‌روزرسانی"}</strong>
            </div>
          </div>
          {product.weightGrams ? <span><ScaleIcon size={16} />{product.weightGrams.toLocaleString("fa-IR")} گرم</span> : null}
        </div>
        <AddToCartButton compact product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.image,
          weightGrams: product.weightGrams,
          stock: product.stock,
          allowBackorder: product.allowBackorder,
        }} />
      </div>
    </article>
  );
}
