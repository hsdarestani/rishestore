"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: data.get("phone"), password: data.get("password") }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "ورود انجام نشد."); setBusy(false); return; }
    window.location.href = result.redirect || "/account";
  }

  return <form onSubmit={submit} className="auth-form"><h2>ورود</h2><label>شماره موبایل<input required name="phone" inputMode="tel" placeholder="09xxxxxxxxx" /></label><label>رمز عبور<input required name="password" type="password" /></label>{error && <p className="alert error">{error}</p>}<button className="btn btn-primary btn-wide" disabled={busy}>{busy ? "در حال ورود…" : "ورود به حساب"}</button></form>;
}

export function RegisterForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: data.get("name"), phone: data.get("phone"), email: data.get("email"), password: data.get("password") }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "ثبت‌نام انجام نشد."); setBusy(false); return; }
    window.location.href = "/account";
  }

  return <form onSubmit={submit} className="auth-form"><h2>ساخت حساب</h2><label>نام و نام خانوادگی<input required name="name" /></label><label>شماره موبایل<input required name="phone" inputMode="tel" placeholder="09xxxxxxxxx" /></label><label>ایمیل، اختیاری<input name="email" type="email" /></label><label>رمز عبور<input required minLength={8} name="password" type="password" /></label>{error && <p className="alert error">{error}</p>}<button className="btn btn-secondary btn-wide" disabled={busy}>{busy ? "در حال ساخت…" : "ثبت‌نام"}</button></form>;
}
