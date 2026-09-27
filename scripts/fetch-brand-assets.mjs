import { gunzipSync } from "zlib";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import path from "path";

const out = path.join(process.cwd(), "public", "brand");
await mkdir(path.join(out, "fonts"), { recursive: true });
await mkdir(path.join(out, "products"), { recursive: true });

const legacyImageOverrides = {
  "147": "https://rishe.store/wp-content/uploads/2026/04/IMG_20260427_193354-300x300.jpg",
  "249": "https://rishe.store/wp-content/uploads/2026/05/ذرت-1-300x300.png",
  "422": "https://rishe.store/wp-content/uploads/2026/05/نعنا-خشک-1-1-600x600.png",
  "423": "https://rishe.store/wp-content/uploads/2026/05/پرک-گندم-1-1-600x600.png",
  "424": "https://rishe.store/wp-content/uploads/2026/05/پرک-جو-1-1-600x600.png",
};

async function exists(file) {
  try { return (await stat(file)).size > 0; } catch { return false; }
}

async function fetchFile(url, target) {
  if (!url || await exists(target)) return false;
  try {
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "Mozilla/5.0 RisheMigration" } });
    if (!response.ok) return false;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) return false;
    await writeFile(target, buffer);
    return true;
  } catch (error) {
    console.warn("asset fetch failed", url, String(error));
    return false;
  }
}

async function fetchFirst(urls, target) {
  if (await exists(target)) return true;
  for (const url of urls.filter(Boolean)) {
    if (await fetchFile(url, target)) return true;
  }
  return false;
}

await fetchFile("https://rishe.store/wp-content/uploads/2026/08/Asset-5@300x.png", path.join(out, "logo.png"));
await fetchFile("https://rishe.store/wp-content/uploads/2026/06/back-1.png", path.join(out, "hero.png"));
await fetchFile("https://rishe.store/wp-content/uploads/2026/08/danesh.ttf", path.join(out, "fonts", "danesh.ttf"));
await fetchFile("https://rishe.store/wp-content/uploads/2026/08/daneshbd.ttf", path.join(out, "fonts", "daneshbd.ttf"));
await fetchFile("https://rishe.store/wp-content/uploads/2026/08/SD-Golpayegani-Bold.ttf", path.join(out, "fonts", "golpayegani-bold.ttf"));
await fetchFile("https://rishe.store/wp-content/uploads/2026/08/SD-Golpayegani-Grunge.ttf", path.join(out, "fonts", "golpayegani-grunge.ttf"));

let data;
try {
  data = JSON.parse(await readFile(path.join(process.cwd(), "data", "product-content.json"), "utf8"));
} catch {
  const raw = gunzipSync(await readFile(path.join(process.cwd(), "data", "product-content.json.gz"))).toString("utf8");
  data = JSON.parse(raw);
}
for (const [id, item] of Object.entries(data)) {
  const originalUrl = item?.hero?.image_url || "";
  const preferredUrl = legacyImageOverrides[id] || originalUrl;
  if (preferredUrl) {
    const m = String(preferredUrl).match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
    const ext = (m?.[1] || "jpg").toLowerCase();
    await fetchFirst(
      [legacyImageOverrides[id], originalUrl],
      path.join(out, "products", "legacy-" + id + "." + ext),
    );
  }

  const narrative = item?.narrative?.image_url || "";
  if (narrative && narrative !== originalUrl) {
    const n = String(narrative).match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
    const ne = (n?.[1] || "jpg").toLowerCase();
    await fetchFile(narrative, path.join(out, "products", "legacy-" + id + "-story." + ne));
  }
}
