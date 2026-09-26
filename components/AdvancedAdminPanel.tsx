"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { toman } from "@/lib/money";

type Props = { data: any };

const TABS = [
  ["crm","CRM و بازاریابی"],
  ["events","فروش ایونت"],
  ["procurement","دریافت و تأمین"],
  ["finance","حسابداری پیشرفته"],
  ["treasury","تطبیق خزانه"],
  ["b2b","B2B و امانی"],
  ["logistics","لجستیک پیشرفته"],
  ["tax","سامانه مودیان"],
  ["analytics","تحلیل و هشدار"],
  ["recovery","پشتیبان و تنظیمات"],
] as const;

function fa(v: any){ return Number(v || 0).toLocaleString("fa-IR"); }
function d(v: any){ return v ? new Date(v).toLocaleString("fa-IR") : "—"; }

async function api(body:any){
  const r=await fetch("/api/admin/advanced",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const x=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(x.error||"عملیات انجام نشد.");
  return x;
}

function Box({title,text,children}:{title:string;text?:string;children:ReactNode}){
  return <section className="erp-panel"><header><div><h2>{title}</h2>{text&&<p>{text}</p>}</div></header>{children}</section>;
}
function Form({action,label="ثبت",children}:{action:string;label?:string;children:ReactNode}){
  const [msg,setMsg]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setMsg("در حال ثبت…");
    try{await api({action,...Object.fromEntries(new FormData(e.currentTarget).entries())});setMsg("ثبت شد");setTimeout(()=>location.reload(),450)}
    catch(err){setMsg(err instanceof Error?err.message:"خطا")}
  }
  return <form className="erp-form" onSubmit={submit}>{children}<div className="erp-form-actions"><button className="btn btn-primary btn-sm">{label}</button>{msg&&<small>{msg}</small>}</div></form>
}
function Table({heads,children}:{heads:string[];children:ReactNode}){
  return <div className="erp-table-wrap"><table className="erp-table"><thead><tr>{heads.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}
function Empty(){return <div className="erp-empty">هنوز رکوردی ثبت نشده است.</div>}

function DeviceTokenCreator({events,devices}:{events:any[];devices:any[]}){
  const [token,setToken]=useState("");
  const [message,setMessage]=useState("");
  async function create(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("در حال ساخت…");setToken("");
    const fd=new FormData(e.currentTarget);
    try{
      const x=await api({action:"event.device.create",...Object.fromEntries(fd.entries())});
      setToken(x.result?.token||"");setMessage("کد ساخته شد. فقط همین بار نمایش داده می‌شود.");
      setTimeout(()=>{ if(!x.result?.token) location.reload(); },300);
    }catch(err){setMessage(err instanceof Error?err.message:"خطا")}
  }
  return <div>
    <form className="erp-form" onSubmit={create}>
      <div className="form-grid">
        <label>ایونت<select name="eventId" required><option value="">انتخاب</option>{events.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>نام دستگاه<input name="deviceName" placeholder="مثلاً صندوق ۱"/></label>
        <label>اعتبار روز<input name="days" type="number" min="1" max="365" defaultValue="30"/></label>
      </div>
      <div className="erp-form-actions"><button className="btn btn-primary btn-sm">ساخت کد دستگاه</button><small>{message}</small></div>
    </form>
    {token&&<div className="device-token"><span>کد ورود دستگاه</span><code>{token}</code><button type="button" onClick={()=>navigator.clipboard.writeText(token)}>کپی</button><p>این کد خام در دیتابیس ذخیره نمی‌شود. بعد از بستن صفحه قابل بازیابی نیست.</p></div>}
    {devices.length>0&&<div className="erp-mini-list device-list">{devices.map(x=><div key={x.id}><strong>{x.deviceName||"دستگاه فروش"}</strong><span>{x.revokedAt?"لغو شده":new Date(x.expiresAt)<new Date()?"منقضی":"فعال"} · آخرین اتصال {d(x.lastSeenAt)}</span><b>{x.revokedAt?"—":<button className="erp-link-button" onClick={()=>confirm("دسترسی این دستگاه لغو شود؟")&&api({action:"event.device.revoke",id:x.id}).then(()=>location.reload())}>لغو</button>}</b></div>)}</div>}
  </div>
}

export default function AdvancedAdminPanel({data}:Props){
  const [tab,setTab]=useState<string>("crm");
  const customerBalance=useMemo(()=>{
    const map=new Map<string,number>();
    for(const x of data.loyalty||[]) map.set(x.customerId,(map.get(x.customerId)||0)+Number(x.points||0));
    return map;
  },[data.loyalty]);

  const trialBalance=useMemo(()=>{
    const map=new Map<string,{code:string;name:string;debit:number;credit:number}>();
    for(const account of data.accountingAccounts||[]) map.set(account.id,{code:account.code,name:account.name,debit:0,credit:0});
    for(const voucher of data.vouchers||[]){
      if(voucher.status!=="posted") continue;
      for(const line of voucher.lines||[]){
        const row=map.get(line.accountId);
        if(row){row.debit+=Number(line.debit||0);row.credit+=Number(line.credit||0);}
      }
    }
    return [...map.values()].map(x=>({...x,balance:x.debit-x.credit})).filter(x=>x.debit||x.credit);
  },[data.accountingAccounts,data.vouchers]);

  const accountOptions=(data.accountingAccounts||[]).map((a:any)=><option key={a.id} value={a.id}>{a.code} · {a.name}</option>);
  const productOptions=(data.products||[]).map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>);
  const warehouseOptions=(data.warehouses||[]).map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>);
  const treasuryOptions=(data.treasuryAccounts||[]).map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>);

  return <div className="rishe-erp-app">
    <aside className="rishe-erp-sidebar">
      <div className="erp-brand"><img src="/brand/logo.png" alt="ریشه"/><div><strong>عملیات پیشرفته</strong><span>ریشه ۲</span></div></div>
      <nav>
        {TABS.map(([key,label])=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}><i>•</i><span>{label}</span></button>)}
      </nav>
      <div className="erp-sidebar-bottom"><Link href="/admin">← پنل اصلی</Link><Link href="/">مشاهده فروشگاه</Link></div>
    </aside>

    <main className="rishe-erp-main">
      <div className="rishe-erp-topbar"><div><strong>{TABS.find(x=>x[0]===tab)?.[1]}</strong><span>کنترل عملیاتی و ماژول‌های منتقل‌شده از ریشه قدیم</span></div><Link className="btn btn-secondary btn-sm" href="/admin">پنل اصلی</Link></div>

      {tab==="crm"&&<div className="erp-page">
        <header className="erp-module-header"><div><span>CRM</span><h1>مشتری، قیمت کانالی، تخفیف و وفاداری</h1><p>قیمت‌های کانالی، کد تخفیف، سقف استفاده و Ledger امتیاز مشتری.</p></div></header>
        <div className="erp-grid-2">
          <Box title="کد تخفیف جدید">
            <Form action="promotion.create"><div className="form-grid">
              <label>نام<input name="name" required/></label><label>کد<input name="code" dir="ltr"/></label>
              <label>نوع<select name="type"><option value="percent">درصدی basis point</option><option value="fixed">مبلغ ثابت</option></select></label>
              <label>مقدار<input name="value" type="number" min="1" required/></label>
              <label>حداقل سبد<input name="minSubtotal" type="number" min="0"/></label><label>کانال<input name="channel" placeholder="website / event"/></label>
              <label>سقف کل<input name="maxUses" type="number" min="1"/></label><label>سقف هر مشتری<input name="perCustomer" type="number" min="1"/></label>
              <label>شروع<input name="startsAt" type="datetime-local"/></label><label>پایان<input name="endsAt" type="datetime-local"/></label>
            </div></Form>
          </Box>
          <Box title="قیمت مخصوص کانال">
            <Form action="channel-price.set"><div className="form-grid">
              <label>محصول<select name="productId" required><option value="">انتخاب</option>{productOptions}</select></label>
              <label>کانال<input name="channel" defaultValue="website" required/></label>
              <label>قیمت تومان<input name="price" type="number" min="1" required/></label>
              <label>بهای تمام‌شده اختیاری<input name="cost" type="number" min="0"/></label>
            </div></Form>
          </Box>
          <Box title="اصلاح امتیاز مشتری">
            <Form action="loyalty.adjust"><div className="form-grid">
              <label>مشتری<select name="customerId" required><option value="">انتخاب</option>{(data.customers||[]).map((c:any)=><option key={c.id} value={c.id}>{c.name||c.mobileNormalized} · {c.mobileNormalized||""}</option>)}</select></label>
              <label>امتیاز<input name="points" type="number" required placeholder="مثبت یا منفی"/></label>
              <label className="span-2">علت<input name="reason"/></label>
            </div></Form>
          </Box>
          <Box title="وضعیت وفاداری">
            {(data.customers||[]).length?<div className="erp-mini-list">{(data.customers||[]).slice(0,30).map((c:any)=><div key={c.id}><strong>{c.name||"بدون نام"}</strong><span>{c.mobileNormalized||c.email||"—"}</span><b>{fa(customerBalance.get(c.id)||0)} امتیاز</b></div>)}</div>:<Empty/>}
          </Box>
        </div>
        <Box title="پروموشن‌ها">{(data.promotions||[]).length?<Table heads={["کد","نام","نوع","مقدار","کانال","فعال","شروع","پایان"]}>{data.promotions.map((p:any)=><tr key={p.id}><td>{p.code||"—"}</td><td>{p.name}</td><td>{p.type}</td><td>{p.type==="percent"?(p.value/100).toLocaleString("fa-IR")+"%":toman(p.value)}</td><td>{p.channel||"همه"}</td><td>{p.active?"بله":"خیر"}</td><td>{d(p.startsAt)}</td><td>{d(p.endsAt)}</td></tr>)}</Table>:<Empty/>}</Box>
      </div>}

      {tab==="events"&&<div className="erp-page">
        <header className="erp-module-header"><div><span>Event POS</span><h1>فروش ایونت و حضوری</h1><p>هر فروش دارای Client UUID و ثبت idempotent است و در صورت اتصال انبار، موجودی واقعی را کم می‌کند.</p></div></header>
        <div className="erp-grid-2">
          <Box title="ایونت جدید"><Form action="event.create"><div className="form-grid">
            <label>نام<input name="name" required/></label><label>محل<input name="location"/></label>
            <label>انبار<select name="warehouseId"><option value="">بدون اتصال انبار</option>{warehouseOptions}</select></label>
            <label>شروع<input name="startsAt" type="datetime-local"/></label><label>پایان<input name="endsAt" type="datetime-local"/></label>
          </div></Form></Box>
          <Box title="دستگاه‌های POS" text="برای هر موبایل یا تبلت یک کد مستقل بساز. فروش آفلاین روی دستگاه صف می‌شود و بعد Sync می‌شود."><DeviceTokenCreator events={data.events||[]} devices={data.eventDevices||[]}/><a className="btn btn-secondary btn-sm" href="/pos" target="_blank">باز کردن POS ↗</a></Box>
          <Box title="ثبت فروش ایونت"><Form action="event.sale"><div className="form-grid">
            <label>ایونت<select name="eventId" required><option value="">انتخاب</option>{(data.events||[]).map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label>محصول<select name="productId" required><option value="">انتخاب</option>{productOptions}</select></label>
            <label>تعداد<input name="quantity" type="number" min="1" required/></label><label>قیمت واحد<input name="unitPrice" type="number" min="0"/></label>
            <label>تخفیف<input name="discount" type="number" min="0"/></label><label>روش پرداخت<select name="paymentType"><option value="card">کارت</option><option value="cash">نقد</option><option value="gateway">درگاه</option></select></label>
            <label>نام مشتری<input name="customerName"/></label><label>موبایل<input name="mobile"/></label>
            <label className="span-2">Client UUID<input name="clientUuid" dir="ltr" placeholder="در حالت آفلاین از دستگاه ارسال می‌شود"/></label>
          </div></Form></Box>
        </div>
        <Box title="آخرین فروش‌های ایونت">{(data.eventSales||[]).length?<Table heads={["شناسه","ایونت","مشتری","موبایل","پرداخت","مبلغ","زمان"]}>{data.eventSales.map((s:any)=><tr key={s.id}><td className="erp-code">{s.clientUuid}</td><td>{s.eventId}</td><td>{s.customerName||"حضوری"}</td><td>{s.mobile||"—"}</td><td>{s.paymentType||"—"}</td><td>{toman(s.total)}</td><td>{d(s.occurredAt)}</td></tr>)}</Table>:<Empty/>}</Box>
      </div>}

      {tab==="procurement"&&<div className="erp-page">
        <header className="erp-module-header"><div><span>Procurement</span><h1>دریافت مرحله‌ای، Landed Cost و حساب تأمین‌کننده</h1><p>دریافت جزئی سفارش خرید، ورود بچ، تخصیص هزینه جانبی و Ledger بدهی.</p></div></header>
        <div className="erp-grid-2">
          <Box title="دریافت از سفارش خرید"><Form action="purchase.receive"><div className="form-grid">
            <label>سفارش خرید<select name="purchaseOrderId" required><option value="">انتخاب</option>{(data.purchaseOrders||[]).map((p:any)=><option key={p.id} value={p.id}>{p.code} · {p.supplier?.name}</option>)}</select></label>
            <label>ردیف سفارش<select name="purchaseOrderItemId" required><option value="">انتخاب</option>{(data.purchaseOrders||[]).flatMap((p:any)=>p.items.map((i:any)=><option key={i.id} value={i.id}>{p.code} · {i.product?.name} · مانده {fa(i.quantity-i.receivedQty)}</option>))}</select></label>
            <label>انبار<select name="warehouseId" required><option value="">انتخاب</option>{warehouseOptions}</select></label>
            <label>تعداد دریافتی<input name="quantity" type="number" min="1" required/></label>
            <label>هزینه جانبی<input name="landedCost" type="number" min="0"/></label><label>نوع هزینه<input name="landedCostType" placeholder="shipping / insurance / customs"/></label>
            <label>سررسید<input name="dueDate" type="date"/></label><label>یادداشت<input name="note"/></label>
          </div></Form></Box>
          <Box title="پرداخت به تأمین‌کننده"><Form action="purchase.pay"><div className="form-grid">
            <label>تأمین‌کننده<select name="supplierId" required><option value="">انتخاب</option>{(data.suppliers||[]).map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label>سفارش خرید<select name="purchaseOrderId"><option value="">اختیاری</option>{(data.purchaseOrders||[]).map((p:any)=><option key={p.id} value={p.id}>{p.code}</option>)}</select></label>
            <label>حساب خزانه<select name="treasuryAccountId" required><option value="">انتخاب</option>{treasuryOptions}</select></label>
            <label>مبلغ<input name="amount" type="number" min="1" required/></label>
            <label className="span-2">یادداشت<input name="note"/></label>
          </div></Form></Box>
        </div>
        <Box title="رسیدهای خرید">{(data.purchaseReceipts||[]).length?<Table heads={["کد","سفارش","تأمین‌کننده","انبار","اصل خرید","هزینه جانبی","کل","تاریخ"]}>{data.purchaseReceipts.map((x:any)=><tr key={x.id}><td>{x.code}</td><td>{x.purchaseOrderId}</td><td>{x.supplierId}</td><td>{x.warehouseId}</td><td>{toman(x.subtotal)}</td><td>{toman(x.landedCost)}</td><td>{toman(x.total)}</td><td>{d(x.receivedAt)}</td></tr>)}</Table>:<Empty/>}</Box>
      </div>}

      {tab==="finance"&&<div className="erp-page">
        <header className="erp-module-header"><div><span>Accounting</span><h1>اسناد، قطعی‌سازی و تراز آزمایشی</h1><p>اسناد پیش‌نویس پیش از قطعی‌شدن کنترل تراز می‌شوند. سند قطعی حذف یا ویرایش نمی‌شود و فقط با سند معکوس برمی‌گردد.</p></div></header>
        <div className="erp-grid-2">
          <Box title="ساخت سند دوطرفه">
            <Form action="voucher.create"><div className="form-grid">
              <label>حساب بدهکار<select name="debitAccountId" required><option value="">انتخاب</option>{accountOptions}</select></label>
              <label>حساب بستانکار<select name="creditAccountId" required><option value="">انتخاب</option>{accountOptions}</select></label>
              <label>مبلغ تومان<input name="amount" type="number" min="1" required/></label>
              <label>شرح<input name="description"/></label>
              <input type="hidden" name="status" value="draft"/>
            </div></Form>
          </Box>
          <Box title="قواعد ثبت مالی">
            <div className="erp-note">پیش‌نویس قابل بررسی است. قطعی‌سازی فقط وقتی انجام می‌شود که بدهکار و بستانکار برابر باشند. برای اصلاح سند قطعی، سیستم سند معکوس جدید می‌سازد و تاریخچه اصلی باقی می‌ماند.</div>
          </Box>
        </div>
        <Box title="اسناد مالی">
          {(data.vouchers||[]).length?<Table heads={["شماره","شرح","وضعیت","بدهکار","بستانکار","تاریخ","عملیات"]}>
            {data.vouchers.map((v:any)=><tr key={v.id}><td>{v.code}</td><td>{v.description||"—"}</td><td>{v.status}</td><td>{toman(v.totalDebit)}</td><td>{toman(v.totalCredit)}</td><td>{d(v.date)}</td><td>{v.status!=="posted"?<button className="erp-link-button" onClick={()=>api({action:"voucher.post",id:v.id}).then(()=>location.reload())}>قطعی کن</button>:<button className="erp-link-button" onClick={()=>{const reason=prompt("علت برگشت سند چیست؟")||"";api({action:"voucher.reverse",id:v.id,reason}).then(()=>location.reload())}}>سند معکوس</button>}</td></tr>)}
          </Table>:<Empty/>}
        </Box>
        <Box title="تراز آزمایشی">
          {trialBalance.length?<Table heads={["کد","حساب","گردش بدهکار","گردش بستانکار","مانده بدهکار","مانده بستانکار"]}>
            {trialBalance.map((x:any)=><tr key={x.code}><td>{x.code}</td><td>{x.name}</td><td>{toman(x.debit)}</td><td>{toman(x.credit)}</td><td>{x.balance>0?toman(x.balance):"—"}</td><td>{x.balance<0?toman(Math.abs(x.balance)):"—"}</td></tr>)}
          </Table>:<Empty/>}
        </Box>
      </div>}

      {tab==="treasury"&&<div className="erp-page">
        <header className="erp-module-header"><div><span>Treasury</span><h1>درگاه، تطبیق و تسویه</h1><p>Provider، تراکنش خزانه، Match و Settlement در یک Ledger قابل ردیابی.</p></div></header>
        <div className="erp-grid-2">
          <Box title="Provider جدید"><Form action="treasury.provider.create"><div className="form-grid">
            <label>نام<input name="name" required/></label><label>کد<input name="code"/></label>
            <label>Adapter<input name="adapter" defaultValue="manual"/></label><label>حساب خزانه<select name="treasuryAccountId"><option value="">اختیاری</option>{treasuryOptions}</select></label>
          </div></Form></Box>
          <Box title="تطبیق تراکنش"><Form action="treasury.match"><div className="form-grid">
            <label>تراکنش<select name="transactionId" required><option value="">انتخاب</option>{(data.treasuryTransactions||[]).map((x:any)=><option key={x.id} value={x.id}>{toman(x.amount)} · {x.description||x.externalId}</option>)}</select></label>
            <label>نوع<select name="matchType"><option value="order">سفارش</option><option value="purchase">خرید</option><option value="expense">هزینه</option><option value="b2b">B2B</option></select></label>
            <label>شناسه رکورد<input name="entityId" required dir="ltr"/></label><label>مبلغ<input name="amount" type="number" min="1" required/></label>
          </div></Form></Box>
          <Box title="ثبت Settlement"><Form action="treasury.settlement"><div className="form-grid">
            <label>Provider<select name="providerId"><option value="">بدون Provider</option>{(data.treasuryProviders||[]).map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label>حساب خزانه<select name="treasuryAccountId" required><option value="">انتخاب</option>{treasuryOptions}</select></label>
            <label>مبلغ<input name="amount" type="number" min="1" required/></label><label>کارمزد<input name="fee" type="number" min="0"/></label>
            <label>شناسه تسویه<input name="externalSettlementId"/></label><label>تاریخ<input name="settledAt" type="datetime-local"/></label>
          </div></Form></Box>
        </div>
        <Box title="Matchها">{(data.treasuryMatches||[]).length?<Table heads={["تراکنش","نوع","شناسه رکورد","مبلغ","تاریخ"]}>{data.treasuryMatches.map((x:any)=><tr key={x.id}><td>{x.transactionId}</td><td>{x.matchType}</td><td>{x.entityId}</td><td>{toman(x.amount)}</td><td>{d(x.createdAt)}</td></tr>)}</Table>:<Empty/>}</Box>
      </div>}

      {tab==="b2b"&&<div className="erp-page">
        <header className="erp-module-header"><div><span>B2B</span><h1>ارسال امانی، گزارش فروش و تسویه</h1><p>موجودی هنگام Dispatch از انبار مبدا خارج می‌شود؛ فروش نماینده Receivable می‌سازد و تسویه مانده را کاهش می‌دهد.</p></div></header>
        <div className="erp-grid-2">
          <Box title="Dispatch امانی"><Form action="b2b.dispatch"><div className="form-grid">
            <label>طرف تجاری<select name="accountId" required><option value="">انتخاب</option>{(data.b2bAccounts||[]).map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label>انبار مبدا<select name="warehouseId" required><option value="">انتخاب</option>{warehouseOptions}</select></label>
            <label>محصول<select name="productId" required><option value="">انتخاب</option>{productOptions}</select></label>
            <label>تعداد<input name="quantity" type="number" min="1" required/></label><label>قیمت واحد<input name="unitPrice" type="number" min="0"/></label>
            <label>Idempotency<input name="idempotencyKey" dir="ltr"/></label>
          </div></Form></Box>
          <Box title="برگشت کالا"><Form action="b2b.return"><div className="form-grid">
            <label>Dispatch<select name="dispatchId" required><option value="">انتخاب</option>{(data.b2bDispatches||[]).map((x:any)=><option key={x.id} value={x.id}>{x.code}</option>)}</select></label>
            <label>محصول<select name="productId" required><option value="">انتخاب</option>{productOptions}</select></label>
            <label>تعداد<input name="quantity" type="number" min="1" required/></label><label>Idempotency<input name="idempotencyKey" dir="ltr"/></label>
          </div></Form></Box>
          <Box title="گزارش فروش نماینده"><Form action="b2b.sales-report"><div className="form-grid">
            <label>طرف تجاری<select name="accountId" required><option value="">انتخاب</option>{(data.b2bAccounts||[]).map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label>محصول<select name="productId" required><option value="">انتخاب</option>{productOptions}</select></label>
            <label>تعداد<input name="quantity" type="number" min="1" required/></label><label>قیمت واحد<input name="unitPrice" type="number" min="1" required/></label>
            <label>مرجع خارجی<input name="externalReference"/></label><label>سررسید<input name="dueDate" type="date"/></label>
          </div></Form></Box>
          <Box title="تسویه B2B"><Form action="b2b.settle"><div className="form-grid">
            <label>طرف تجاری<select name="accountId" required><option value="">انتخاب</option>{(data.b2bAccounts||[]).map((x:any)=><option key={x.id} value={x.id}>{x.name} · مانده {toman(x.balance)}</option>)}</select></label>
            <label>حساب خزانه<select name="treasuryAccountId" required><option value="">انتخاب</option>{treasuryOptions}</select></label>
            <label>مبلغ<input name="amount" type="number" min="1" required/></label><label>یادداشت<input name="note"/></label>
          </div></Form></Box>
        </div>
        <Box title="گزارش‌های فروش B2B">{(data.b2bReports||[]).length?<Table heads={["کد","طرف تجاری","فروش","کمیسیون","دریافتنی","تاریخ"]}>{data.b2bReports.map((x:any)=><tr key={x.id}><td>{x.code}</td><td>{x.accountId}</td><td>{toman(x.subtotal)}</td><td>{toman(x.commission)}</td><td>{toman(x.receivable)}</td><td>{d(x.reportedAt)}</td></tr>)}</Table>:<Empty/>}</Box>
      </div>}

      {tab==="logistics"&&<div className="erp-page">
        <header className="erp-module-header"><div><span>Logistics</span><h1>رهگیری، هزینه و تسویه حمل</h1><p>تاریخچه وضعیت، هزینه واقعی و پرداخت شرکت حمل بدون پاک کردن تاریخچه قبلی.</p></div></header>
        <div className="erp-grid-2">
          <Box title="ثبت رویداد رهگیری"><Form action="shipment.tracking"><div className="form-grid">
            <label>مرسوله<select name="shipmentId" required><option value="">انتخاب</option>{(data.shipments||[]).map((x:any)=><option key={x.id} value={x.id}>{x.code} · {x.recipientName}</option>)}</select></label>
            <label>وضعیت<select name="status"><option value="ready">آماده</option><option value="booked">رزرو حمل</option><option value="shipped">ارسال</option><option value="delivered">تحویل</option><option value="exception">استثنا</option></select></label>
            <label>کد رهگیری<input name="trackingCode"/></label><label>محل<input name="location"/></label>
            <label className="span-2">پیام<input name="message"/></label>
          </div></Form></Box>
          <Box title="هزینه حمل"><Form action="shipment.cost"><div className="form-grid">
            <label>مرسوله<select name="shipmentId" required><option value="">انتخاب</option>{(data.shipments||[]).map((x:any)=><option key={x.id} value={x.id}>{x.code}</option>)}</select></label>
            <label>نوع هزینه<input name="costType" defaultValue="carrier"/></label><label>مبلغ<input name="amount" type="number" min="1" required/></label><label>شماره صورتحساب<input name="invoiceReference"/></label>
          </div></Form></Box>
          <Box title="تسویه شرکت حمل"><Form action="shipment.settle"><div className="form-grid">
            <label>مرسوله<select name="shipmentId" required><option value="">انتخاب</option>{(data.shipments||[]).map((x:any)=><option key={x.id} value={x.id}>{x.code}</option>)}</select></label>
            <label>حساب خزانه<select name="treasuryAccountId" required><option value="">انتخاب</option>{treasuryOptions}</select></label>
            <label>مبلغ<input name="amount" type="number" min="1" required/></label>
          </div></Form></Box>
        </div>
        <Box title="آخرین رویدادهای رهگیری">{(data.tracking||[]).length?<Table heads={["مرسوله","وضعیت","محل","پیام","زمان"]}>{data.tracking.map((x:any)=><tr key={x.id}><td>{x.shipmentId}</td><td>{x.status}</td><td>{x.location||"—"}</td><td>{x.message||"—"}</td><td>{d(x.occurredAt)}</td></tr>)}</Table>:<Empty/>}</Box>
      </div>}

      {tab==="tax"&&<div className="erp-page">
        <header className="erp-module-header"><div><span>Tax</span><h1>آماده‌سازی سامانه مودیان</h1><p>Mapping محصول، ساخت صورتحساب Freeze شده، تاریخچه وضعیت و صف ارسال. ارسال واقعی فقط با Credential معتبر مالیاتی فعال می‌شود.</p></div></header>
        <div className="erp-grid-2">
          <Box title="Mapping محصول"><Form action="tax.map-product"><div className="form-grid">
            <label>پروفایل<select name="profileId" required><option value="">انتخاب</option>{(data.taxProfiles||[]).map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label>محصول<select name="productId" required><option value="">انتخاب</option>{productOptions}</select></label>
            <label>شناسه کالا/خدمت<input name="taxProductId" required/></label><label>واحد<input name="unitCode"/></label>
            <label>VAT basis point<input name="vatRateBps" type="number" min="0" max="10000"/></label><label>عنوان<input name="title"/></label>
          </div></Form></Box>
          <Box title="ساخت صورتحساب از سفارش"><Form action="tax.invoice.create"><div className="form-grid">
            <label>پروفایل<select name="profileId" required><option value="">انتخاب</option>{(data.taxProfiles||[]).map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label>سفارش<select name="orderId" required><option value="">انتخاب</option>{(data.taxInvoices||[]).length>=0&&(data as any).orders?.map?.((x:any)=><option key={x.id} value={x.id}>{x.code}</option>)}</select></label>
            <label className="span-2">شماره صورتحساب اختیاری<input name="number"/></label>
          </div></Form></Box>
        </div>
        <Box title="صورتحساب‌ها">{(data.taxInvoices||[]).length?<Table heads={["شماره","سفارش","پروفایل","وضعیت","مبلغ","Hash","عملیات"]}>{data.taxInvoices.map((x:any)=><tr key={x.id}><td>{x.number}</td><td>{x.order?.code||"—"}</td><td>{x.profile?.name||x.profileId}</td><td>{x.status}</td><td>{toman(x.total)}</td><td className="erp-code">{x.payloadHash?.slice(0,12)||"—"}</td><td><button className="erp-link-button" onClick={()=>api({action:"tax.invoice.transition",id:x.id,status:"queued"}).then(()=>location.reload())}>صف ارسال</button>{" · "}<button className="erp-link-button" onClick={()=>api({action:"tax.invoice.transition",id:x.id,status:"cancelled"}).then(()=>location.reload())}>ابطال</button></td></tr>)}</Table>:<Empty/>}</Box>
      </div>}

      {tab==="analytics"&&<div className="erp-page">
        <header className="erp-module-header"><div><span>Analytics</span><h1>منبع، کمپین، قیمت و هشدار</h1><p>Attribution و Price History به صورت append-only ذخیره می‌شوند تا گزارش مدیریتی قابل بازسازی باشد.</p></div></header>
        <div className="erp-grid-2">
          <Box title="منبع جدید"><Form action="analytics.source.create"><div className="form-grid"><label>نام<input name="name" required/></label><label>کد<input name="code"/></label><label>کانال<input name="channel"/></label></div></Form></Box>
          <Box title="کمپین جدید"><Form action="analytics.campaign.create"><div className="form-grid">
            <label>نام<input name="name" required/></label><label>منبع<select name="sourceId"><option value="">بدون منبع</option>{(data.analyticsSources||[]).map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label>کانال<input name="channel"/></label><label>شروع<input name="startsAt" type="datetime-local"/></label><label>پایان<input name="endsAt" type="datetime-local"/></label>
          </div></Form></Box>
        </div>
        <Box title="تاریخچه قیمت">{(data.priceHistory||[]).length?<Table heads={["محصول","کانال","قیمت","بها","از","تا"]}>{data.priceHistory.map((x:any)=><tr key={x.id}><td>{x.productId}</td><td>{x.channel}</td><td>{toman(x.price)}</td><td>{x.cost!=null?toman(x.cost):"—"}</td><td>{d(x.effectiveFrom)}</td><td>{d(x.effectiveTo)}</td></tr>)}</Table>:<Empty/>}</Box>
        <Box title="هشدارهای مدیریتی">{(data.alerts||[]).length?<Table heads={["شدت","قانون","عنوان","پیام","وضعیت","آخرین مشاهده","عملیات"]}>{data.alerts.map((x:any)=><tr key={x.id}><td>{x.severity}</td><td>{x.ruleCode}</td><td>{x.title}</td><td>{x.message}</td><td>{x.status}</td><td>{d(x.lastSeenAt)}</td><td>{x.status!=="resolved"&&<button className="erp-link-button" onClick={()=>api({action:"analytics.alert.resolve",id:x.id}).then(()=>location.reload())}>حل شد</button>}</td></tr>)}</Table>:<Empty/>}</Box>
      </div>}

      {tab==="recovery"&&<div className="erp-page">
        <header className="erp-module-header"><div><span>Recovery</span><h1>Snapshot و Backup</h1><p>Snapshot تنظیمات بدون Secret ذخیره می‌شود. Backup دیتابیس از طریق Job عملیاتی درخواست می‌شود.</p></div></header>
        <div className="erp-grid-2">
          <Box title="Snapshot تنظیمات"><Form action="config.snapshot" label="ساخت Snapshot"><p className="erp-note">توکن، Merchant، Password و Secret داخل Snapshot وارد نمی‌شوند.</p></Form></Box>
          <Box title="Backup دیتابیس"><Form action="backup.request" label="درخواست Backup"><p className="erp-note">درخواست با Idempotency ساعتی وارد صف عملیات می‌شود تا Worker سرور آن را اجرا کند.</p></Form></Box>
        </div>
        <Box title="Snapshotهای موجود">{(data.snapshots||[]).length?<Table heads={["Checksum","سازنده","زمان"]}>{data.snapshots.map((x:any)=><tr key={x.id}><td className="erp-code">{x.checksum}</td><td>{x.createdBy||"سیستم"}</td><td>{d(x.createdAt)}</td></tr>)}</Table>:<Empty/>}</Box>
        <Box title="Backupهای ثبت‌شده">{(data.backups||[]).length?<Table heads={["فایل","Checksum","حجم","وضعیت","تأیید","زمان"]}>{data.backups.map((x:any)=><tr key={x.id}><td>{x.filename}</td><td className="erp-code">{x.checksum}</td><td>{fa(x.sizeBytes)} byte</td><td>{x.status}</td><td>{d(x.verifiedAt)}</td><td>{d(x.createdAt)}</td></tr>)}</Table>:<Empty/>}</Box>
      </div>}
    </main>
  </div>;
}
