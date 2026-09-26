import { NextResponse } from "next/server";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";
import { importLegacyCatalog } from "@/lib/legacy-import";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
    }
    const result = await importLegacyCatalog();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error && error.message === "OLD_STORE_API_UNAVAILABLE"
      ? "API عمومی فروشگاه قبلی در دسترس نیست. می‌توان محصولات را از پنل جدید دستی یا با فایل خروجی منتقل کرد."
      : "انتقال کاتالوگ کامل نشد.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
