"use client";

import { FormEvent, useState } from "react";

export default function SetupForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "راه‌اندازی انجام نشد."); setBusy(false); return; }
    window.location.href = "/admin";
  }

  return (
    <form className="setup-form panel" onSubmit={submit}>
      <div className="section-heading"><span>راه‌اندازی یک‌باره</span><h1>فروشگاه ریشه را تحویل بگیر</h1><p>این صفحه بعد از ساخت اولین مدیر غیرفعال می‌شود.</p></div>
      <div className="form-grid">
        <label>نام مدیر<input name="name" required /></label>
        <label>شماره موبایل مدیر<input name="phone" required inputMode="tel" placeholder="09xxxxxxxxx" /></label>
        <label className="span-2">رمز عبور مدیر<input name="password" required minLength={10} type="password" /></label>
        <label>هزینه ثابت ارسال، تومان<input name="shippingFlatRate" required type="number" min="0" defaultValue="0" /></label>
        <label>ارسال رایگان از مبلغ، تومان<input name="freeShippingThreshold" type="number" min="0" defaultValue="0" /></label>
        <label>شماره تماس فروشگاه<input name="storePhone" inputMode="tel" /></label>
        <label>آدرس اینستاگرام<input name="instagramUrl" placeholder="https://instagram.com/..." /></label>
        <label className="span-2">کلید API نکست‌پی<input name="nextpayApiKey" placeholder="می‌توانی بعداً هم وارد کنی" /></label>
      </div>
      {error && <p className="alert error">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? "در حال راه‌اندازی…" : "ایجاد مدیر و فعال‌سازی فروشگاه"}</button>
    </form>
  );
}
