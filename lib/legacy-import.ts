import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { db } from "@/lib/db";

const LEGACY_ORIGIN = "https://rishe.store";

function plain(value: unknown) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toToman(prices: any) {
  const raw = Number(prices?.price);
  const minor = Number(prices?.currency_minor_unit || 0);
  const code = String(prices?.currency_code || "").toUpperCase();
  if (!Number.isFinite(raw)) return 0;
  const major = raw / Math.pow(10, Number.isFinite(minor) ? minor : 0);
  if (code === "IRR") return Math.max(0, Math.round(major / 10));
  if (code === "IRT") return Math.max(0, Math.round(major));
  return 0;
}

async function downloadImage(url: string, productSlug: string) {
  try {
    const source = new URL(url);
    if (!["http:", "https:"].includes(source.protocol)) return null;
    const response = await fetch(source, { signal: AbortSignal.timeout(15000), redirect: "follow" });
    if (!response.ok) return null;
    const type = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const extension = type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : type === "image/webp" ? "webp" : null;
    if (!extension) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 12 * 1024 * 1024) return null;
    const fingerprint = createHash("sha1").update(url).digest("hex").slice(0, 10);
    const filename = "legacy-" + productSlug.replace(/[^a-z0-9-]/gi, "-") + "-" + fingerprint + "." + extension;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);
    return "/uploads/" + filename;
  } catch {
    return null;
  }
}

async function fetchProducts() {
  const all: any[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = LEGACY_ORIGIN + "/wp-json/wc/store/v1/products?per_page=100&page=" + page;
    const response = await fetch(url, {
      headers: { "user-agent": "RisheStoreMigration/1.0" },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!response.ok) {
      if (page === 1) throw new Error("OLD_STORE_API_UNAVAILABLE");
      break;
    }
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < 100) break;
  }
  return all;
}

export async function importLegacyCatalog() {
  const products = await fetchProducts();
  let created = 0;
  let updated = 0;
  let images = 0;
  let exactStocks = 0;

  for (const item of products) {
    const name = plain(item.name);
    const slug = String(item.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!name || !slug) continue;

    const legacyCategory = Array.isArray(item.categories) && item.categories[0] ? item.categories[0] : null;
    let categoryId: string | null = null;
    if (legacyCategory?.name) {
      const categorySlug = String(legacyCategory.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || "legacy-" + String(legacyCategory.id || Date.now());
      const category = await db.category.upsert({
        where: { slug: categorySlug },
        create: { slug: categorySlug, name: plain(legacyCategory.name), description: "دسته منتقل‌شده از فروشگاه قبلی ریشه." },
        update: { name: plain(legacyCategory.name) },
      });
      categoryId = category.id;
    }

    const existing = await db.product.findUnique({ where: { slug } });
    const remoteImage = Array.isArray(item.images) && item.images[0]?.src ? String(item.images[0].src) : "";
    let image = existing?.image || null;
    if (!image && remoteImage) {
      const local = await downloadImage(remoteImage, slug);
      if (local) { image = local; images++; }
    }

    const price = toToman(item.prices);
    const stockQuantity = typeof item.stock_quantity === "number" ? Math.max(0, Math.trunc(item.stock_quantity)) : null;
    const stock = stockQuantity ?? existing?.stock ?? 0;
    if (stockQuantity !== null) exactStocks++;

    const description = plain(item.description) || plain(item.short_description) || "اطلاعات این محصول از فروشگاه قبلی ریشه منتقل شده است.";
    const shortDescription = plain(item.short_description) || description.slice(0, 220);
    const looksLikePack = /پک|pack/i.test(name) || (legacyCategory && /پک|pack/i.test(String(legacyCategory.name || "")));

    if (existing) {
      await db.product.update({
        where: { id: existing.id },
        data: {
          name,
          kind: looksLikePack ? "PACK" : existing.kind,
          shortDescription,
          description,
          categoryId: categoryId || existing.categoryId,
          price: price > 0 ? price : existing.price,
          stock,
          image,
          featured: Boolean(item.is_featured ?? existing.featured),
        },
      });
      updated++;
    } else {
      await db.product.create({
        data: {
          name,
          slug,
          kind: looksLikePack ? "PACK" : "PRODUCT",
          shortDescription,
          description,
          categoryId,
          price,
          stock,
          image,
          featured: Boolean(item.is_featured),
          active: true,
        },
      });
      created++;
    }
  }

  return { fetched: products.length, created, updated, images, exactStocks };
}
