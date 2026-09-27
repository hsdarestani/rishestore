"use client";

import { FormEvent, useState } from "react";

async function api(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "عملیات انجام نشد.") as Error & { needsProfile?: boolean };
    error.needsProfile = Boolean(data.needsProfile);
    throw error;
  }
  return data;
}

export function LoginForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      await api("/api/auth/otp/request", { phone });
      setSent(true);
      setMessage("کد تایید به شماره شما ارسال شد.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارسال کد انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await api("/api/auth/otp/verify", { phone, code });
      window.location.href = result.redirect || "/account";
    } catch (e) {
      setError(e instanceof Error ? e.message : "ورود انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={sent ? verify : send} className="auth-form">
    <h2>ورود با پیامک</h2>
    <p>شماره موبایل حساب را وارد کنید. رمز عبور لازم نیست.</p>
    <label>شماره موبایل<input required value={phone} onChange={(e)=>setPhone(e.target.value)} inputMode="tel" placeholder="09xxxxxxxxx" disabled={sent} /></label>
    {sent && <label>کد تایید<input required value={code} onChange={(e)=>setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={4} placeholder="کد ۴ رقمی" /></label>}
    {message && <p className="alert success">{message}</p>}
    {error && <p className="alert error">{error}</p>}
    <button className="btn btn-primary btn-wide" disabled={busy}>{busy ? "در حال انجام…" : sent ? "تایید و ورود" : "ارسال کد ورود"}</button>
    {sent && <button type="button" className="btn btn-ghost btn-wide" onClick={()=>{setSent(false);setCode("");setMessage("");setError("");}} disabled={busy}>تغییر شماره یا ارسال دوباره</button>}
  </form>;
}

export function RegisterForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) { setError("نام و نام خانوادگی را وارد کنید."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      await api("/api/auth/otp/request", { phone });
      setSent(true);
      setMessage("کد تایید برای ساخت حساب ارسال شد.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارسال کد انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await api("/api/auth/otp/verify", { name, phone, email, code });
      window.location.href = result.redirect || "/account";
    } catch (e) {
      setError(e instanceof Error ? e.message : "ثبت نام انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={sent ? verify : send} className="auth-form">
    <h2>ثبت نام پیامکی</h2>
    <label>نام و نام خانوادگی<input required value={name} onChange={(e)=>setName(e.target.value)} disabled={sent} /></label>
    <label>شماره موبایل<input required value={phone} onChange={(e)=>setPhone(e.target.value)} inputMode="tel" placeholder="09xxxxxxxxx" disabled={sent} /></label>
    <label>ایمیل، اختیاری<input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" disabled={sent} /></label>
    {sent && <label>کد تایید<input required value={code} onChange={(e)=>setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={4} placeholder="کد ۴ رقمی" /></label>}
    {message && <p className="alert success">{message}</p>}
    {error && <p className="alert error">{error}</p>}
    <button className="btn btn-secondary btn-wide" disabled={busy}>{busy ? "در حال انجام…" : sent ? "تایید و ساخت حساب" : "ارسال کد ثبت نام"}</button>
    {sent && <button type="button" className="btn btn-ghost btn-wide" onClick={()=>{setSent(false);setCode("");setMessage("");setError("");}} disabled={busy}>ویرایش اطلاعات یا ارسال دوباره</button>}
  </form>;
}
