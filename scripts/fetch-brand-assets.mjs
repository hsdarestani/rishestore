import { gunzipSync } from "zlib";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import path from "path";

const out = path.join(process.cwd(), "public", "brand");
await mkdir(path.join(out, "fonts"), { recursive: true });
await mkdir(path.join(out, "products"), { recursive: true });

async function exists(file) {
  try { return (await stat(file)).size > 0; } catch { return false; }
}

async function fetchFile(url, target) {
  if (!url || await exists(target)) return;
  try {
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "Mozilla/5.0 RisheMigration" } });
    if (!response.ok) return;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length) await writeFile(target, buffer);
  } catch (error) {
    console.warn("asset fetch failed", url, String(error));
  }
}

await fetchFile("https://rishe.store/wp-content/uploads/2026/08/Asset-5@300x.png", path.join(out, "logo.png"));
await fetchFile("https://rishe.store/wp-content/uploads/2026/06/back-1.png", path.join(out, "hero.png"));
await fetchFile("https://rishe.store/wp-content/uploads/2026/08/danesh.ttf", path.join(out, "fonts", "danesh.ttf"));
await fetchFile("https://rishe.store/wp-content/uploads/2026/08/daneshbd.ttf", path.join(out, "fonts", "daneshbd.ttf"));
await fetchFile("https://rishe.store/wp-content/uploads/2026/08/SD-Golpayegani-Bold.ttf", path.join(out, "fonts", "golpayegani-bold.ttf"));
await fetchFile("https://rishe.store/wp-content/uploads/2026/08/SD-Golpayegani-Grunge.ttf", path.join(out, "fonts", "golpayegani-grunge.ttf"));

const raw = gunzipSync(await readFile(path.join(process.cwd(), "data", "product-content.json.gz"))).toString("utf8");
const data = JSON.parse(raw);
for (const [id, item] of Object.entries(data)) {
  const url = item?.hero?.image_url || "";
  if (!url) continue;
  const m = String(url).match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
  const ext = (m?.[1] || "jpg").toLowerCase();
  await fetchFile(url, path.join(out, "products", "legacy-" + id + "." + ext));
  const narrative = item?.narrative?.image_url || "";
  if (narrative && narrative !== url) {
    const n = String(narrative).match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
    const ne = (n?.[1] || "jpg").toLowerCase();
    await fetchFile(narrative, path.join(out, "products", "legacy-" + id + "-story." + ne));
  }
}
