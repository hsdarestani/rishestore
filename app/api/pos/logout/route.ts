import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";
import { clearPosSession } from "@/lib/pos-auth";
export async function POST(request:Request){assertSameOrigin(request);await clearPosSession();return NextResponse.json({ok:true});}
