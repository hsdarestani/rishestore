import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";

const allowed = new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"]]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await requireAdmin())) return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "فایل پیدا نشد." }, { status: 400 });
    const ext = allowed.get(file.type);
    if (!ext || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "فقط JPG، PNG یا WebP تا ۵ مگابایت مجاز است." }, { status: 400 });
    const name = Date.now().toString(36) + "-" + randomBytes(5).toString("hex") + "." + ext;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ ok: true, url: "/uploads/" + name });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "بارگذاری تصویر انجام نشد." }, { status: 500 });
  }
}
