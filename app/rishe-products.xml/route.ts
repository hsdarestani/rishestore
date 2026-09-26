import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://new.rishe.store").replace(/\/$/, "");
  const products = await db.product.findMany({
    where: { active: true, kind: "PRODUCT", price: { gt: 0 } },
    include: { category: true },
    orderBy: { legacyProductId: "asc" },
  });

  const items = products.map((p) => {
    const availability = p.stock > 0 ? "in stock" : p.allowBackorder ? "preorder" : "out of stock";
    return `
      <item>
        <g:id>${esc(p.legacyProductId || p.id)}</g:id>
        <title>${esc(p.name)}</title>
        <description>${esc(p.shortDescription || p.description)}</description>
        <link>${esc(base + "/product/" + p.slug)}</link>
        ${p.image ? `<g:image_link>${esc(p.image.startsWith("http") ? p.image : base + p.image)}</g:image_link>` : ""}
        <g:availability>${availability}</g:availability>
        <g:price>${Math.trunc(p.price * 10)} IRR</g:price>
        <g:brand>ریشه</g:brand>
        ${p.category ? `<g:product_type>${esc(p.category.name)}</g:product_type>` : ""}
        ${p.weightGrams ? `<g:shipping_weight>${p.weightGrams} g</g:shipping_weight>` : ""}
      </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>فروشگاه ریشه</title>
    <link>${esc(base)}</link>
    <description>فید محصولات فروشگاه ریشه</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
