import { db } from "@/lib/db";

/** Prevent an open redirect through user-configurable admin URLs. */
export function validBasalamUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (!(host === "basalam.com" || host.endsWith(".basalam.com") || host === "bslm.ir" || host.endsWith(".bslm.ir"))) return null;
    return url.toString();
  } catch { return null; }
}

export async function getBasalamDestination(productSlug?: string): Promise<string | null> {
  const rows = await db.setting.findMany({ where: { key: { in: ["basalamStoreUrl", "basalamProductUrls"] } } });
  const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
  if (productSlug) {
    try {
      const mapping: unknown = JSON.parse(settings.basalamProductUrls || "{}");
      if (mapping && typeof mapping === "object" && !Array.isArray(mapping)) {
        const candidate = (mapping as Record<string, unknown>)[productSlug];
        const url = validBasalamUrl(candidate);
        if (url) return url;
      }
    } catch { /* Fall back to the profile for missing or invalid product maps. */ }
  }
  return validBasalamUrl(settings.basalamStoreUrl);
}
