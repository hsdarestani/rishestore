"use client";
import Link from "next/link";
import SafeProductImage from "@/components/SafeProductImage";
import { basalamProductImage } from "@/lib/basalam-product-media";
import { ScaleIcon, SparklesIcon } from "@/components/Icons";
import { basalamHref } from "@/lib/basalam-links";
type ProductCardData={id:string;slug:string;legacyProductId?:number|null;name:string;shortDescription:string;price:number;compareAt?:number|null;stock:number;kind?:"PRODUCT"|"PACK";allowBackorder?:boolean;image?:string|null;weightGrams?:number|null;category?:{name:string;slug:string}|null;};
export default function ProductCard({product}:{product:ProductCardData}) {
  const displayImage = basalamProductImage(product) || product.image;
  return <article className="product-card">
    <Link href={"/product/"+product.slug} className="product-media">
      {displayImage?<SafeProductImage src={displayImage} alt={product.name} fallback="تصویر محصول به‌زودی اضافه می‌شود"/>:<span className="product-fallback">{product.kind==="PACK"?"پک ریشه":product.name.slice(0,1)}</span>}
      {product.kind==="PACK"?<em>پک پیشنهادی</em>:product.category&&<em>{product.category.name}</em>}
    </Link>
    <div className="product-body">
      <Link href={"/product/"+product.slug}><h3>{product.name}</h3></Link>
      <p>{product.shortDescription}</p>
      <div className="product-meta"><div className="product-buy-channel">قیمت و موجودی روز در باسلام</div>{product.weightGrams?<span><ScaleIcon size={16}/>{product.weightGrams.toLocaleString("fa-IR")} گرم</span>:null}</div>
      <a className="btn btn-primary btn-sm" href={basalamHref(product.slug)}><SparklesIcon size={17}/>خرید از باسلام</a>
    </div>
  </article>;
}
