"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toman } from "@/lib/money";

type Product = { id:string; name:string; price:number; stock:number; image?:string|null; weightGrams?:number|null };
type EventInfo = { id:string; name:string; location?:string|null };
type Cart = Record<string, number>;
type QueuedSale = {
  clientUuid:string;
  items:Array<{productId:string;quantity:number}>;
  customerName?:string;
  mobile?:string;
  paymentType:string;
  discount:number;
  occurredAt:string;
  status?:"pending"|"syncing"|"error";
  error?:string;
};

function queueKey(eventId:string){ return "rishe_pos_queue_v1:"+eventId; }
function readQueue(eventId:string):QueuedSale[]{
  try{return JSON.parse(localStorage.getItem(queueKey(eventId))||"[]")}catch{return[]}
}
function saveQueue(eventId:string,queue:QueuedSale[]){ localStorage.setItem(queueKey(eventId),JSON.stringify(queue)); }

export default function PosClient({
  authorized,
  event,
  products=[],
  deviceName,
  message,
}:{authorized:boolean;event?:EventInfo;products?:Product[];deviceName?:string;message?:string}){
  const [loginError,setLoginError]=useState(message||"");
  const [cart,setCart]=useState<Cart>({});
  const [queue,setQueue]=useState<QueuedSale[]>([]);
  const [syncMessage,setSyncMessage]=useState("");
  const [online,setOnline]=useState(true);
  const [query,setQuery]=useState("");

  useEffect(()=>{
    setOnline(navigator.onLine);
    const on=()=>{setOnline(true); if(event) syncQueue(event.id)};
    const off=()=>setOnline(false);
    window.addEventListener("online",on);window.addEventListener("offline",off);
    if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>undefined);
    if(event){const q=readQueue(event.id);setQueue(q);if(navigator.onLine&&q.length)syncQueue(event.id);}
    return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off)};
  },[event?.id]);

  async function login(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setLoginError("");
    const fd=new FormData(e.currentTarget);
    const r=await fetch("/api/pos/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:fd.get("token")})});
    const x=await r.json().catch(()=>({}));
    if(!r.ok){setLoginError(x.error||"ورود انجام نشد.");return}
    location.reload();
  }

  function add(id:string,delta:number){
    setCart(prev=>{
      const next={...prev};
      const current=next[id]||0;
      const product=products.find(p=>p.id===id);
      const max=product?.stock??0;
      const value=Math.max(0,Math.min(max,current+delta));
      if(value<=0)delete next[id];else next[id]=value;
      return next;
    });
  }

  const filtered=useMemo(()=>products.filter(p=>!query.trim()||p.name.includes(query.trim())),[products,query]);
  const cartLines=useMemo(()=>Object.entries(cart).map(([id,quantity])=>({product:products.find(p=>p.id===id)!,quantity})).filter(x=>x.product),[cart,products]);
  const subtotal=cartLines.reduce((s,x)=>s+x.product.price*x.quantity,0);

  async function sendSale(sale:QueuedSale){
    const r=await fetch("/api/pos/sales",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(sale)});
    const x=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(x.error||"Sync ناموفق");
    return x;
  }

  async function syncQueue(eventId:string){
    if(!navigator.onLine)return;
    let current=readQueue(eventId);
    if(!current.length)return;
    setSyncMessage("در حال همگام‌سازی فروش‌های آفلاین…");
    const remaining:QueuedSale[]=[];
    for(let i=0;i<current.length;i++){
      const sale=current[i];
      try{await sendSale({...sale,status:undefined,error:undefined});}
      catch(err){
        const message=err instanceof Error?err.message:"خطای Sync";
        remaining.push({...sale,status:"error",error:message});
        if(!navigator.onLine){
          remaining.push(...current.slice(i+1));
          break;
        }
      }
    }
    saveQueue(eventId,remaining);setQueue(remaining);
    setSyncMessage(remaining.length?remaining.length.toLocaleString("fa-IR")+" فروش هنوز در صف است.":"همه فروش‌ها همگام شد.");
  }

  async function checkout(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!event||!cartLines.length)return;
    const fd=new FormData(e.currentTarget);
    const sale:QueuedSale={
      clientUuid:crypto.randomUUID(),
      items:cartLines.map(x=>({productId:x.product.id,quantity:x.quantity})),
      customerName:String(fd.get("customerName")||"").trim()||undefined,
      mobile:String(fd.get("mobile")||"").trim()||undefined,
      paymentType:String(fd.get("paymentType")||"card"),
      discount:Math.max(0,Math.min(subtotal,Math.trunc(Number(fd.get("discount"))||0))),
      occurredAt:new Date().toISOString(),
      status:"pending",
    };
    const next=[...readQueue(event.id),sale];
    saveQueue(event.id,next);setQueue(next);setCart({});
    (e.currentTarget as HTMLFormElement).reset();
    setSyncMessage(online?"فروش ثبت شد؛ در حال Sync…":"فروش آفلاین ذخیره شد و پس از اتصال Sync می‌شود.");
    if(navigator.onLine)await syncQueue(event.id);
  }

  async function logout(){
    await fetch("/api/pos/logout",{method:"POST"});
    location.reload();
  }

  if(!authorized||!event){
    return <main className="pos-login-shell">
      <section className="pos-login-card">
        <img src="/brand/logo.png" alt="ریشه"/>
        <span>Event POS</span><h1>ورود دستگاه فروش</h1>
        <p>کدی که از پنل مدیریت برای این دستگاه ساخته شده را وارد کنید.</p>
        <form onSubmit={login}><input name="token" dir="ltr" autoComplete="off" placeholder="RPOS_..." required/><button>ورود به صندوق</button></form>
        {loginError&&<div className="alert error">{loginError}</div>}
      </section>
    </main>
  }

  return <main className="pos-shell">
    <header className="pos-topbar">
      <div><img src="/brand/logo.png" alt="ریشه"/><div><strong>{event.name}</strong><span>{deviceName}{event.location?" · "+event.location:""}</span></div></div>
      <div className="pos-status"><span className={online?"online":"offline"}></span>{online?"آنلاین":"آفلاین"} · صف {queue.length.toLocaleString("fa-IR")}<button onClick={logout}>خروج</button></div>
    </header>

    <div className="pos-layout">
      <section className="pos-products">
        <div className="pos-search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجوی محصول…"/><button onClick={()=>event&&syncQueue(event.id)}>Sync صف</button></div>
        <div className="pos-product-grid">
          {filtered.map(p=><article key={p.id} className={p.stock<=0?"soldout":""}>
            <div className="pos-product-img">{p.image?<img src={p.image} alt={p.name}/>:<span>ر</span>}</div>
            <div><h3>{p.name}</h3><strong>{toman(p.price)}</strong><small>{p.stock>0?"موجودی "+p.stock.toLocaleString("fa-IR"):"ناموجود"}</small></div>
            <div className="pos-qty"><button disabled={!(cart[p.id]>0)} onClick={()=>add(p.id,-1)}>−</button><b>{(cart[p.id]||0).toLocaleString("fa-IR")}</b><button disabled={p.stock<=0||(cart[p.id]||0)>=p.stock} onClick={()=>add(p.id,1)}>+</button></div>
          </article>)}
        </div>
      </section>

      <aside className="pos-cart">
        <h2>سبد فروش</h2>
        <div className="pos-cart-lines">{cartLines.length?cartLines.map(x=><div key={x.product.id}><span>{x.product.name} × {x.quantity.toLocaleString("fa-IR")}</span><strong>{toman(x.product.price*x.quantity)}</strong></div>):<p>محصولی انتخاب نشده.</p>}</div>
        <div className="pos-total"><span>جمع</span><strong>{toman(subtotal)}</strong></div>
        <form onSubmit={checkout}>
          <label>نام مشتری اختیاری<input name="customerName"/></label>
          <label>موبایل اختیاری<input name="mobile" inputMode="tel"/></label>
          <label>روش پرداخت<select name="paymentType"><option value="card">کارت</option><option value="cash">نقد</option><option value="gateway">درگاه</option></select></label>
          <label>تخفیف تومان<input name="discount" type="number" min="0" max={subtotal}/></label>
          <button className="pos-pay" disabled={!cartLines.length}>ثبت فروش {toman(subtotal)}</button>
        </form>
        {syncMessage&&<div className="pos-sync-message">{syncMessage}</div>}
        {queue.some(x=>x.status==="error")&&<div className="pos-errors">{queue.filter(x=>x.status==="error").map(x=><div key={x.clientUuid}><b>Sync نشد</b><span>{x.error}</span><small>{x.clientUuid}</small></div>)}</div>}
      </aside>
    </div>
  </main>;
}
