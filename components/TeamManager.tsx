"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const LABELS: Record<string,string> = {
  "admin.access":"ورود به پنل",
  "inventory.write":"انبار و تولید",
  "sales.write":"فروش",
  "crm.write":"CRM و تخفیف",
  "events.write":"فروش ایونت",
  "procurement.write":"تأمین",
  "finance.write":"مالی و خزانه",
  "b2b.write":"B2B",
  "logistics.write":"لجستیک",
  "tax.write":"سامانه مودیان",
  "analytics.write":"گزارش و تحلیل",
  "operations.write":"عملیات و Backup",
  "catalog.write":"محصولات",
  "orders.write":"سفارش‌ها",
  "content.write":"محتوا",
  "media.write":"آپلود رسانه",
};

async function api(method:string, body:any){
  const r=await fetch("/api/admin/team",{method,headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const x=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(x.error||"عملیات انجام نشد.");
  return x;
}

function normalize(raw:any):string[]{
  if(Array.isArray(raw)) return raw.map(String);
  if(raw&&typeof raw==="object") return Object.entries(raw).filter(([,v])=>Boolean(v)).map(([k])=>k);
  return [];
}

export default function TeamManager({staff,capabilities}:{staff:any[];capabilities:string[]}){
  const [message,setMessage]=useState("");

  async function create(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("در حال ساخت…");
    const fd=new FormData(e.currentTarget);
    try{
      await api("POST",{
        name:fd.get("name"),phone:fd.get("phone"),email:fd.get("email"),password:fd.get("password"),
        permissions:capabilities.filter(c=>fd.get("perm:"+c)==="on"),
      });
      setMessage("ساخته شد");setTimeout(()=>location.reload(),400);
    }catch(err){setMessage(err instanceof Error?err.message:"خطا");}
  }

  return <div className="rishe-erp-app">
    <aside className="rishe-erp-sidebar">
      <div className="erp-brand"><img src="/brand/logo.png" alt="ریشه"/><div><strong>کاربران و دسترسی</strong><span>فقط مدیر اصلی</span></div></div>
      <nav><Link className="team-nav-link" href="/admin">پنل اصلی</Link><Link className="team-nav-link" href="/admin/advanced">عملیات پیشرفته</Link></nav>
    </aside>
    <main className="rishe-erp-main">
      <div className="rishe-erp-topbar"><div><strong>تیم و سطح دسترسی</strong><span>دسترسی‌ها در سمت سرور هم enforce می‌شوند</span></div></div>
      <div className="erp-page">
        <header className="erp-module-header"><div><span>Access Control</span><h1>عضو تیم جدید</h1><p>به هر کاربر فقط ماژول‌هایی را بده که واقعاً لازم دارد.</p></div></header>
        <section className="erp-panel">
          <form className="erp-form" onSubmit={create}>
            <div className="form-grid"><label>نام<input name="name" required/></label><label>موبایل<input name="phone" required placeholder="09xxxxxxxxx"/></label><label>ایمیل<input name="email" type="email"/></label><label>رمز اولیه<input name="password" type="password" minLength={8} required/></label></div>
            <div className="permission-grid">{capabilities.map(c=><label key={c}><input type="checkbox" name={"perm:"+c} defaultChecked={c==="admin.access"}/><span>{LABELS[c]||c}</span></label>)}</div>
            <div className="erp-form-actions"><button className="btn btn-primary btn-sm">ساخت کاربر تیم</button><small>{message}</small></div>
          </form>
        </section>

        <h2 className="erp-section-title">اعضای تیم</h2>
        {staff.length?staff.map(user=><StaffCard key={user.id} user={user} capabilities={capabilities}/>):<div className="erp-empty">هنوز کاربر تیم ساخته نشده است.</div>}
      </div>
    </main>
  </div>
}

function StaffCard({user,capabilities}:{user:any;capabilities:string[]}){
  const current=normalize(user.permissions);
  const [msg,setMsg]=useState("");
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMsg("در حال ذخیره…");
    const fd=new FormData(e.currentTarget);
    try{
      await api("PATCH",{id:user.id,name:fd.get("name"),password:fd.get("password"),permissions:capabilities.filter(c=>fd.get("perm:"+c)==="on")});
      setMsg("ذخیره شد");setTimeout(()=>location.reload(),350);
    }catch(err){setMsg(err instanceof Error?err.message:"خطا");}
  }
  return <details className="erp-record"><summary><div><strong>{user.name}</strong><span>{user.phone} · {user.email||"بدون ایمیل"}</span></div><b>{current.length.toLocaleString("fa-IR")} دسترسی</b></summary>
    <form className="erp-record-form" onSubmit={save}>
      <div className="form-grid"><label>نام<input name="name" defaultValue={user.name}/></label><label>رمز جدید<input name="password" type="password" minLength={8} placeholder="برای عدم تغییر خالی بگذار"/></label></div>
      <div className="permission-grid">{capabilities.map(c=><label key={c}><input type="checkbox" name={"perm:"+c} defaultChecked={current.includes(c)}/><span>{LABELS[c]||c}</span></label>)}</div>
      <div className="erp-form-actions"><button className="btn btn-primary btn-sm">ذخیره دسترسی</button><button type="button" className="btn btn-ghost btn-sm" onClick={()=>confirm("دسترسی این کاربر لغو شود؟")&&api("DELETE",{id:user.id}).then(()=>location.reload())}>لغو دسترسی تیم</button><small>{msg}</small></div>
    </form>
  </details>
}
