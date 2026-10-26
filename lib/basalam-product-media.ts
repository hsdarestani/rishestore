/**
 * Canonical product media from the public Basalam rishestore catalog.
 * These image URLs were checked against the shop's product IDs on 2026-10-26.
 * The on-site database may still retain legacy photos; prefer these on the public storefront.
 * Never match by fuzzy titles: the exact slug/legacy ID identifies each product.
 */
export const BASALAM_PRODUCT_MEDIA: Readonly<Record<string, { id: number; image: string }>> = {
  "natural-honey": { id: 54654450, image: "https://statics.basalam.com/public-244/users/B6P771/09-01/7aaaab95-3046-4f55-830f-e4cb0ff98dbd.jpg_800X800X70.jpg" },
  "iranian-chickpeas": { id: 54654568, image: "https://statics.basalam.com/public-248/users/B6P771/09-11/MjiOssn7sIMQjePAvrQ2tUn9VHkoPmaJYydowSuNsNKVV1ULWD.png_512X512X70.png" },
  "pinto-beans": { id: 54654718, image: "https://statics.basalam.com/public-248/users/B6P771/09-11/O6uQWikb7kbPhsUj4knN1bXaDGyZPgcQ5TUD1gNPth3bCAj3Lu.png_512X512X70.png" },
  "large-lentils": { id: 54934676, image: "https://statics.basalam.com/public-235/users/B6P771/08-13/86b26ff2-d25b-449e-99db-79912029ce50.jpg_800X800X70.jpg" },
  "rice-hashemi": { id: 54653896, image: "https://statics.basalam.com/public-234/users/B6P771/08-11/05654fbb-bdec-4234-81e5-367a571e5631.jpg_800X800X70.jpg" },
  "local-lentils": { id: 54654427, image: "https://statics.basalam.com/public-248/users/B6P771/09-11/3xGnCStSNL6YusdGN8MwyQFBdG5wikQDaR6yCSmobfRVD1uim7.png_512X512X70.png" },
  "popcorn-corn": { id: 54653754, image: "https://statics.basalam.com/public-248/users/B6P771/09-11/ug3qBXtBCr3tqd6Y6P3qqj9X8m0eGPamFoR2olmyUcw9Yc2TNi.png_512X512X70.png" },
  "gilan-tea": { id: 54653794, image: "https://statics.basalam.com/public-248/users/B6P771/09-11/yZT8yHnnexBu8jPiBiSJg6sQAbhFiezmWHbDSAoHvbBuzQKNEe.png_512X512X70.png" },
  "red-beans": { id: 54654603, image: "https://statics.basalam.com/public-248/users/B6P771/09-11/ir4s5HkBvUJfOGpyJUKXlFhUwTQkNxeZXAIGc9bcMGBd0jBFQI.png_512X512X70.png" },
  "iranian-split-peas": { id: 54654655, image: "https://statics.basalam.com/public-248/users/B6P771/09-12/iNclQaukrRAlR0wHpTnnE3PlkbVjXsR0AWq4iITV4dyMnRudg5.png_512X512X70.png" },
  "dry-broad-beans": { id: 54202258, image: "https://statics.basalam.com/public-248/users/B6P771/09-12/d0232938-6d25-457e-b1a9-99d1f5d2d855.jpg_800X800X70.jpg" },
  "gilan-tea-with-stem": { id: 54906499, image: "https://statics.basalam.com/public-248/users/B6P771/09-11/yZT8yHnnexBu8jPiBiSJg6sQAbhFiezmWHbDSAoHvbBuzQKNEe.png_512X512X70.png" },
  "dried-mint": { id: 58467594, image: "https://statics.basalam.com/public-248/users/B6P771/09-11/oHrv0a9JvGKGxYcWzR9izD9CGlddwvOP4g1MtF0gnryNJO5zV5.png" },
  "oat-flakes": { id: 58495471, image: "https://statics.basalam.com/public-248/users/B6P771/09-11/E3haHHIgwRZRBMI5obQiNlAFhLUMoZnsR9OW2mVn1QrF1xCqHF.png" },
  "wheat-flakes": { id: 58495644, image: "https://statics.basalam.com/public-248/users/B6P771/09-11/WSIvcoy60AkmUn62EL6IEg75bcfprCaGfDE9nL1sckxFrqGt7W.png" },
};

const LEGACY_PRODUCT_SLUGS: Readonly<Record<number, string>> = {
  113: "natural-honey", 124: "iranian-chickpeas", 139: "pinto-beans",
  147: "large-lentils", 210: "rice-hashemi", 228: "local-lentils",
  249: "popcorn-corn", 251: "gilan-tea", 255: "red-beans",
  256: "iranian-split-peas", 258: "dry-broad-beans",
  421: "gilan-tea-with-stem", 422: "dried-mint",
  423: "oat-flakes", 424: "wheat-flakes",
};

type ProductKey = string | { slug: string; legacyProductId?: number | null; kind?: string | null };

export function basalamProductMedia(product: ProductKey | null | undefined) {
  if (!product) return null;
  if (typeof product === "string") return BASALAM_PRODUCT_MEDIA[product] || null;
  if (product.kind === "PACK") return null;
  const slug = (product.legacyProductId && LEGACY_PRODUCT_SLUGS[product.legacyProductId]) || product.slug;
  return BASALAM_PRODUCT_MEDIA[slug] || null;
}

export function basalamProductImage(product: ProductKey | null | undefined): string | null {
  return basalamProductMedia(product)?.image || null;
}
