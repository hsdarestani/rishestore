import { createDecipheriv, createHash, privateDecrypt, pbkdf2Sync, constants } from "crypto";
import { gunzipSync } from "zlib";
import { readFile } from "fs/promises";
import { db } from "@/lib/db";
import { importLegacyCommerceSql } from "@/lib/legacy-commerce-import";

const EXPECTED_SQL_SHA256 = "cdc3bdc3851db04624b19dd825a5b0a840d2ad9ce815e937fe72196d2ce7832f";
const MARKER_KEY = "legacyCommerceEncryptedImportCdc3bdc3851db046";
const PAYLOAD_PATH = "/app/data/legacy-commerce.payload.b64";
const KEY_PATH = "/app/data/legacy-commerce.key.enc.b64";
const PRIVATE_KEY_PATH = "/run/secrets/legacy-migration-private.pem";

async function main() {
  const already = await db.setting.findUnique({ where: { key: MARKER_KEY } });
  if (already) {
    console.log("LEGACY_ENCRYPTED_IMPORT_ALREADY_DONE");
    return;
  }

  let payloadText: string;
  let encryptedKeyText: string;
  let privateKey: string;
  try {
    [payloadText, encryptedKeyText, privateKey] = await Promise.all([
      readFile(PAYLOAD_PATH, "utf8"),
      readFile(KEY_PATH, "utf8"),
      readFile(PRIVATE_KEY_PATH, "utf8"),
    ]);
  } catch {
    console.log("LEGACY_ENCRYPTED_IMPORT_NOT_STAGED");
    return;
  }

  const passwordRaw = privateDecrypt(
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encryptedKeyText.trim(), "base64"),
  );
  const password = passwordRaw.toString("utf8").trim();

  const wrapped = Buffer.from(payloadText.trim(), "base64");
  if (wrapped.subarray(0, 8).toString("ascii") !== "Salted__") {
    throw new Error("LEGACY_PAYLOAD_FORMAT_INVALID");
  }

  const salt = wrapped.subarray(8, 16);
  const encrypted = wrapped.subarray(16);
  const derived = pbkdf2Sync(password, salt, 200000, 48, "sha256");
  const decipher = createDecipheriv("aes-256-cbc", derived.subarray(0, 32), derived.subarray(32, 48));
  const compressed = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const sqlBuffer = gunzipSync(compressed);

  const digest = createHash("sha256").update(sqlBuffer).digest("hex");
  if (digest !== EXPECTED_SQL_SHA256) {
    throw new Error("LEGACY_SQL_CHECKSUM_MISMATCH");
  }

  const result = await importLegacyCommerceSql(sqlBuffer.toString("utf8"));
  await db.setting.upsert({
    where: { key: MARKER_KEY },
    create: { key: MARKER_KEY, value: JSON.stringify({ digest, result, importedAt: new Date().toISOString() }) },
    update: { value: JSON.stringify({ digest, result, importedAt: new Date().toISOString() }) },
  });

  console.log("LEGACY_ENCRYPTED_IMPORT_RESULT=" + JSON.stringify(result));
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error("LEGACY_ENCRYPTED_IMPORT_FAILED", error);
    await db.$disconnect();
    process.exit(1);
  });
