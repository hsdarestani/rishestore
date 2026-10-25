import { NextRequest, NextResponse } from "next/server";
import { getBasalamDestination } from "@/lib/basalam";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("product") || "";
  const slug = /^[a-z0-9-]{1,140}$/.test(requested) ? requested : undefined;
  const destination = await getBasalamDestination(slug);
  if (!destination) return NextResponse.redirect(new URL("/shop?basalam=missing", request.url), { status: 307, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(destination, { status: 307, headers: { "Cache-Control": "no-store" } });
}
