import { readFile } from "fs/promises";
import { db } from "@/lib/db";
import { importLegacyCommerceSql } from "@/lib/legacy-commerce-import";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: tsx scripts/import-legacy-commerce.ts /path/to/legacy.sql");
  const sql = await readFile(file, "utf8");
  const result = await importLegacyCommerceSql(sql);
  console.log("LEGACY_IMPORT_RESULT=" + JSON.stringify(result));
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error("LEGACY_IMPORT_FAILED", error);
    await db.$disconnect();
    process.exit(1);
  });
