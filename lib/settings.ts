import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

function key() {
  const secret = process.env.APP_SECRET || "";
  return createHash("sha256").update(secret).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["enc1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decrypt(value: string) {
  if (!value.startsWith("enc1.")) return value;
  const [, ivRaw, tagRaw, dataRaw] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64url")), decipher.final()]).toString("utf8");
}

export async function getSetting(name: string, fallback = "") {
  const item = await db.setting.findUnique({ where: { key: name } });
  return item ? item.value : fallback;
}

export async function getSecretSetting(name: string) {
  const value = await getSetting(name);
  return value ? decrypt(value) : "";
}

export async function setSetting(name: string, value: string, sensitive = false) {
  const stored = sensitive && value ? encrypt(value) : value;
  return db.setting.upsert({ where: { key: name }, create: { key: name, value: stored }, update: { value: stored } });
}

export async function getStoreConfig() {
  const rows = await db.setting.findMany();
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const shippingFlatRate = Number(map.shippingFlatRate || 0);
  const freeShippingThreshold = Number(map.freeShippingThreshold || 0);
  return {
    storeName: map.storeName || "ریشه",
    storePhone: map.storePhone || "",
    instagramUrl: map.instagramUrl || "",
    shippingFlatRate: Number.isFinite(shippingFlatRate) ? shippingFlatRate : 0,
    freeShippingThreshold: Number.isFinite(freeShippingThreshold) ? freeShippingThreshold : 0,
    paymentReady: Boolean(map.nextpayApiKey),
  };
}
