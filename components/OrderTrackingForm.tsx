"use client";

import {FormEvent,useState} from "react";
import {toman} from "@/lib/money";

export default function OrderTrackingForm(){
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError("");setData(null);
    const fd=new FormData(e.currentTarget);
    try{
      const r=await fetch("/api/order-tracking",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(Object.fromEntries(fd.entries()))});
      const x=await r.json();
      if(!r.ok) throw new Error(x.error||"پیدا نشد");
      setData(x.order);
    }catch(err){setError(err instanceof Error?err.message:"خطا");}
    finally{setBusy(false);}
  }
  return <div className="tracking-layout">
    <form className="panel tracking-form" onSubmit={submit}>
      <div className="section-heading"><span>پیگیری سفارش</span><h1>سفارشت کجاست؟</h1><p>کد سفارش و همان شماره موبایلی که هنگام خرید وارد کردی را بنویس.</p></div>
      <label>کد سفارش<input name="code" required dir="ltr" placeholder="R-..."/></label>
      <label>شماره موبایل<input name="phone" required inputMode="tel" placeholder="09xxxxxxxxx"/></label>
      {error&&<p className="alert error">{error}</p>}
      <button className="btn btn-primary btn-wide" disabled={busy}>{busy?"در حال بررسی…":"پیگیری سفارش"}</button>
    </form>
    {data&&<section className="panel tracking-result">
      <div className="tracking-head"><div><span>سفارش</span><strong>{data.code}</strong></div><b>{toman(data.total)}</b></div>
      <div className="tracking-badges"><span>{data.paymentStatus}</span><span>{data.status}</span><span>{data.city}</span></div>
      <div className="tracking-items">{data.items.map((i:any,idx:number)=><div key={idx}><span>{i.name} × {i.quantity.toLocaleString("fa-IR")}</span><strong>{toman(i.total)}</strong></div>)}</div>
      {data.shipments?.map((s:any)=><div className="tracking-shipment" key={s.code}><strong>مرسوله {s.code}</strong><span>وضعیت: {s.status}</span>{s.trackingCode&&<span>کد رهگیری: {s.trackingCode}</span>}</div>)}
      {data.events?.length>0&&<div className="tracking-timeline">{data.events.map((e:any,idx:number)=><article key={idx}><i></i><div><strong>{e.status}</strong><p>{e.message||e.location||""}</p><small>{new Date(e.occurredAt).toLocaleString("fa-IR")}</small></div></article>)}</div>}
    </section>}
  </div>
}
