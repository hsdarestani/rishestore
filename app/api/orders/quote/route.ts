import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "فروش اینترنتی از طریق باسلام انجام می‌شود." }, { status: 410 });
}
