import { access } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const EXPECTED_LEGACY_IDS = [113,124,139,147,210,228,249,251,255,256,258,421,422,423,424];

async function exists(publicPath: string | null) {
  if (!publicPath || !publicPath.startsWith("/")) return false;
  try {
    await access(path.join(process.cwd(), "public", publicPath.replace(/^\/+/, "")));
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const [products, about, faqCount] = await Promise.all([
      db.product.findMany({
        where: { legacyProductId: { in: EXPECTED_LEGACY_IDS } },
        select: { legacyProductId: true, name: true, price: true, stock: true, weightGrams: true, image: true, active: true },
      }),
      db.page.findUnique({ where: { slug: "about" }, select: { id: true, content: true } }),
      db.faq.count(),
    ]);

    const found = new Set(products.map((p) => p.legacyProductId).filter((id): id is number => typeof id === "number"));
    const missingIds = EXPECTED_LEGACY_IDS.filter((id) => !found.has(id));
    const invalidCatalog = products
      .filter((p) => !p.name.trim() || p.price <= 0 || !p.weightGrams || !p.image || !p.active)
      .map((p) => p.legacyProductId);

    const missingImageIds: number[] = [];
    for (const product of products) {
      if (!(await exists(product.image))) {
        if (typeof product.legacyProductId === "number") missingImageIds.push(product.legacyProductId);
      }
    }

    const checks = {
      database: true,
      catalogCount: products.length,
      expectedCatalogCount: EXPECTED_LEGACY_IDS.length,
      missingIds,
      invalidCatalog,
      missingImageIds,
      aboutPage: Boolean(about?.content?.trim()),
      faqCount,
      zibalConfigured: Boolean(String(process.env.ZIBAL_MERCHANT || "").trim()),
    };

    const ok =
      missingIds.length === 0 &&
      invalidCatalog.length === 0 &&
      missingImageIds.length === 0 &&
      checks.aboutPage &&
      faqCount > 0 &&
      checks.zibalConfigured;

    return NextResponse.json({ ok, service: "rishestore-readiness", checks }, { status: ok ? 200 : 503 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, service: "rishestore-readiness" }, { status: 503 });
  }
}
