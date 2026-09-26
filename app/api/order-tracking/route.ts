import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/auth";
import { normalizePhone } from "@/lib/money";

export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    const body=await request.json();
    const code=String(body.code||"").trim().toUpperCase();
    const phone=normalizePhone(String(body.phone||""));
    if(!code||!phone) return NextResponse.json({error:"کد سفارش و موبایل لازم است."},{status:400});
    const order=await db.order.findFirst({where:{code,phone},include:{items:true,shipments:true}});
    if(!order) return NextResponse.json({error:"سفارشی با این اطلاعات پیدا نشد."},{status:404});
    const shipmentIds=order.shipments.map(x=>x.id);
    const events=shipmentIds.length?await db.shipmentTrackingEvent.findMany({where:{shipmentId:{in:shipmentIds}},orderBy:{occurredAt:"asc"}}):[];
    return NextResponse.json({
      ok:true,
      order:{
        code:order.code,status:order.status,paymentStatus:order.paymentStatus,total:order.total,
        createdAt:order.createdAt,city:order.city,
        items:order.items.map(i=>({name:i.productName,quantity:i.quantity,total:i.total})),
        shipments:order.shipments.map(s=>({code:s.code,status:s.status,trackingCode:s.trackingCode,carrierId:s.carrierId,shippedAt:s.shippedAt,deliveredAt:s.deliveredAt})),
        events:events.map(e=>({status:e.status,location:e.location,message:e.message,occurredAt:e.occurredAt})),
      }
    });
  }catch(error){console.error(error);return NextResponse.json({error:"پیگیری سفارش انجام نشد."},{status:500});}
}
