import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import { toman } from "@/lib/money";
import { ScaleIcon, TagIcon } from "@/components/Icons";

type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  price: number;
  stock: number;
  allowBackorder?: boolean;
  image?: string | null;
  weightGrams?: number | null;
  category?: { name: string; slug: string } | null;
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <article className="product-card">
      <Link href={"/product/" + product.slug} className="product-media">
        {product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <span className="product-fallback">{product.name.slice(0, 1)}</span>}
        {product.category && <em>{product.category.name}</em>}
        {product.stock <= 0 && product.allowBackorder && <span className="backorder-badge">قابل پیش‌سفارش</span>}
      </Link>
      <div className="product-body">
        <Link href={"/product/" + product.slug}><h3>{product.name}</h3></Link>
        <p>{product.shortDescription}</p>
        <div className="product-meta">
          <strong><TagIcon size={17} />{product.price > 0 ? toman(product.price) : "قیمت در حال به‌روزرسانی"}</strong>
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
