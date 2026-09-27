import { NextResponse } from "next/server";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";
import { importLegacyCatalog } from "@/lib/legacy-import";
import { importLegacyCommerceSql } from "@/lib/legacy-commerce-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "فایل SQL را انتخاب کنید." }, { status: 400 });
      }
      if (file.size > 30 * 1024 * 1024) {
        return NextResponse.json({ error: "حجم فایل بیشتر از حد مجاز است." }, { status: 413 });
      }
      const sql = await file.text();
      const result = await importLegacyCommerceSql(sql);
      return NextResponse.json({ ok: true, mode: "commerce", result });
    }

    const result = await importLegacyCatalog();
    return NextResponse.json({ ok: true, mode: "catalog", result });
  } catch (error) {
    console.error(error);
    const code = error instanceof Error ? error.message : "";
    if (code === "OLD_STORE_API_UNAVAILABLE") {
      return NextResponse.json({ error: "API عمومی فروشگاه قبلی در دسترس نیست." }, { status: 502 });
    }
    if (code === "LEGACY_SQL_INVALID") {
      return NextResponse.json({ error: "این فایل SQL مربوط به دیتابیس فروشگاه ریشه نیست." }, { status: 400 });
    }
    return NextResponse.json({ error: "انتقال دیتابیس کامل نشد. جزئیات در لاگ سرور ثبت شد." }, { status: 500 });
  }
}
