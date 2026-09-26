"use client";

import { FormEvent, useState } from "react";
import { toman } from "@/lib/money";

type TrackResult = { code: string; status: string; paymentStatus: string; total: number; createdAt: string } | null;

export default function TrackOrderForm() {
  const [result, setResult] = useState<TrackResult>(null);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setResult(null);
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams({ code: String(form.get("code") || ""), phone: String(form.get("phone") || "") });
    const response = await fetch("/api/track?" + params.toString(), { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "سفارش پیدا نشد.");
    setResult(data.order);
  }

  return <div className="tracking-box"><form onSubmit={submit} className="inline-form"><input required name="code" placeholder="کد سفارش، مثل R-..." /><input required name="phone" placeholder="شماره موبایل سفارش" inputMode="tel" /><button className="btn btn-primary">پیگیری</button></form>{error && <p className="alert error">{error}</p>}{result && <div className="track-result"><strong>سفارش {result.code}</strong><span>وضعیت سفارش: {result.status}</span><span>وضعیت پرداخت: {result.paymentStatus}</span><span>مبلغ: {toman(result.total)}</span><span>ثبت: {new Date(result.createdAt).toLocaleDateString("fa-IR")}</span></div>}</div>;
}
