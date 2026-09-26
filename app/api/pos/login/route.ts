import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { setPosSession } from "@/lib/pos-auth";

export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    const body=await request.json();
    const token=String(body.token||"").trim();
    if(token.length<20) return NextResponse.json({error:"کد دستگاه معتبر نیست."},{status:400});
    const tokenHash=createHash("sha256").update(token).digest("hex");
    const session=await db.eventDeviceSession.findUnique({where:{tokenHash}});
    if(!session||session.revokedAt||session.expiresAt<=new Date()) return NextResponse.json({error:"کد دستگاه منقضی یا غیرفعال است."},{status:401});
    const event=await db.eventSaleEvent.findUnique({where:{id:session.eventId}});
    if(!event||event.status!=="active") return NextResponse.json({error:"این ایونت فعال نیست."},{status:409});
    await setPosSession(session.id,session.expiresAt);
    return NextResponse.json({ok:true,eventName:event.name});
  }catch(error){console.error(error);return NextResponse.json({error:"ورود دستگاه انجام نشد."},{status:500});}
}
