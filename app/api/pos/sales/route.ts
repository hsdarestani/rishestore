import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";
import { getPosSession } from "@/lib/pos-auth";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/money";

async function consume(tx:any,warehouseId:string,productId:string,quantity:number,refId:string){
  let remaining=quantity;
  const batches=await tx.inventoryBatch.findMany({where:{warehouseId,productId,quantity:{gt:0}},orderBy:[{expiresAt:"asc"},{receivedAt:"asc"},{id:"asc"}]});
  let cost=0;
  for(const batch of batches){
    if(remaining<=0)break;
    const available=Math.max(0,batch.quantity-batch.reserved);
    if(available<=0)continue;
    const take=Math.min(remaining,available);
    await tx.inventoryBatch.update({where:{id:batch.id},data:{quantity:{decrement:take}}});
    await tx.inventoryMovement.create({data:{warehouseId,productId,type:"event_sale",quantity:-take,unitCost:batch.unitCost,referenceType:"event_sale",referenceId:refId}});
    remaining-=take;cost+=take*batch.unitCost;
  }
  if(remaining>0)throw new Error("OUT_OF_STOCK");
  await tx.product.update({where:{id:productId},data:{stock:{decrement:quantity}}});
  return cost;
}

export async function POST(request:Request){
  try{
    assertSameOrigin(request);
    const session=await getPosSession();
    if(!session)return NextResponse.json({error:"نشست دستگاه معتبر نیست."},{status:401});
    const event=await db.eventSaleEvent.findUnique({where:{id:session.eventId}});
    if(!event||event.status!=="active")return NextResponse.json({error:"ایونت فعال نیست."},{status:409});

    const body=await request.json();
    const clientUuid=String(body.clientUuid||"").trim();
    const rawItems=Array.isArray(body.items)?body.items:[];
    if(!clientUuid||!rawItems.length)return NextResponse.json({error:"فروش معتبر نیست."},{status:400});
    const duplicate=await db.eventSale.findUnique({where:{clientUuid}});
    if(duplicate)return NextResponse.json({ok:true,duplicate:true,saleId:duplicate.id,total:duplicate.total});

    const normalized=rawItems.slice(0,50).map((x:any)=>({productId:String(x.productId||""),quantity:Math.max(1,Math.min(100,Math.trunc(Number(x.quantity)||1)))})).filter((x:any)=>x.productId);
    const ids=[...new Set(normalized.map((x:any)=>x.productId))];
    const [products,prices]=await Promise.all([
      db.product.findMany({where:{id:{in:ids},active:true}}),
      db.channelPrice.findMany({where:{productId:{in:ids},channel:"event",active:true},orderBy:{updatedAt:"desc"}}),
    ]);
    const pmap=new Map(products.map(p=>[p.id,p]));
    const priceMap=new Map<string,number>();
    for(const row of prices)if(!priceMap.has(row.productId))priceMap.set(row.productId,row.price);
    if(products.length!==ids.length)return NextResponse.json({error:"یکی از محصولات دیگر فعال نیست."},{status:409});

    const lines=normalized.map((line:any)=>{
      const product=pmap.get(line.productId)!;
      const unitPrice=priceMap.get(product.id)??product.price;
      return {...line,product,unitPrice,total:unitPrice*line.quantity};
    });
    const subtotal=lines.reduce((s:number,x:any)=>s+x.total,0);
    const discount=Math.min(subtotal,Math.max(0,Math.trunc(Number(body.discount)||0)));
    const total=subtotal-discount;
    const mobileRaw=String(body.mobile||"").trim();
    const mobile=mobileRaw?normalizePhone(mobileRaw):null;

    const sale=await db.$transaction(async tx=>{
      let customerId:string|null=null;
      if(mobile){
        const customer=await tx.customer.upsert({
          where:{mobileNormalized:mobile},
          create:{customerKey:"mobile:"+mobile,mobileNormalized:mobile,name:String(body.customerName||"").trim()||null,sourceCode:"event",firstPurchase:new Date(),lastPurchase:new Date()},
          update:{name:String(body.customerName||"").trim()||undefined,sourceCode:"event",lastPurchase:new Date()},
        });
        customerId=customer.id;
      }
      const created=await tx.eventSale.create({data:{publicId:randomUUID(),clientUuid,eventId:event.id,sellerUserId:session.sellerUserId,customerId,customerName:String(body.customerName||"").trim()||null,mobile,paymentType:String(body.paymentType||"card"),subtotal,discount,total,occurredAt:body.occurredAt?new Date(String(body.occurredAt)):new Date(),metadata:{deviceName:session.deviceName||null}}});
      for(const line of lines){
        if(event.warehouseId)await consume(tx,event.warehouseId,line.product.id,line.quantity,created.id);
        await tx.eventSaleLine.create({data:{eventSaleId:created.id,productId:line.product.id,quantity:line.quantity,unitPrice:line.unitPrice,total:line.total}});
        await tx.analyticsEvent.create({data:{eventKey:"event_sale:"+created.id+":"+line.product.id,eventType:"event_sale",customerId,productId:line.product.id,salesChannel:"event",sourceCode:event.name,amount:line.total,quantity:line.quantity,correlationId:randomUUID(),occurredAt:created.occurredAt}});
      }
      return created;
    });

    return NextResponse.json({ok:true,saleId:sale.id,total:sale.total});
  }catch(error){
    console.error(error);
    const message=error instanceof Error?error.message:"";
    if(message==="OUT_OF_STOCK")return NextResponse.json({error:"موجودی یکی از کالاها کافی نیست. موجودی را تازه کن."},{status:409});
    return NextResponse.json({error:"ثبت فروش ایونت انجام نشد."},{status:500});
  }
}
