"use client";

import { FormEvent, useState } from "react";
import { toman } from "@/lib/money";

function statusFa(value: string) {
  const labels: Record<string, string> = {
    PENDING: "در انتظار",
    PROCESSING: "در حال پردازش",
    SHIPPED: "ارسال شده",
    COMPLETED: "تکمیل شده",
    CANCELED: "لغو شده",
    UNPAID: "پرداخت نشده",
    PAID: "پرداخت شده",
    FAILED: "ناموفق",
    REFUNDED: "برگشت وجه",
    ready: "آماده‌سازی",
    booked: "تحویل به حمل",
    shipped: "ارسال شده",
    delivered: "تحویل شده",
    pending: "در انتظار",
    processing: "در حال پردازش",
    completed: "تکمیل شده",
    canceled: "لغو شده",
  };
  return labels[value] || value;
}

export default function OrderTrackingForm() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setData(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/order-tracking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "سفارش پیدا نشد.");
      setData(result.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "پیگیری سفارش انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="tracking-layout">
    <form className="panel tracking-form" onSubmit={submit}>
      <div className="section-heading">
        <span>پیگیری سفارش</span>
        <h1>سفارشت کجاست؟</h1>
        <p>کد سفارش و همان شماره موبایلی که هنگام خرید وارد کردی را بنویس.</p>
      </div>
      <label>کد سفارش<input name="code" required dir="ltr" placeholder="R-..." /></label>
      <label>شماره موبایل<input name="phone" required inputMode="tel" placeholder="09xxxxxxxxx" /></label>
      {error && <p className="alert error">{error}</p>}
      <button className="btn btn-primary btn-wide" disabled={busy}>{busy ? "در حال بررسی…" : "پیگیری سفارش"}</button>
    </form>

    {data && <section className="panel tracking-result">
      <div className="tracking-head">
        <div><span>سفارش</span><strong>{data.code}</strong></div>
        <b>{toman(data.total)}</b>
      </div>
      <div className="tracking-badges">
        <span>{statusFa(data.paymentStatus)}</span>
        <span>{statusFa(data.status)}</span>
        <span>{data.city}</span>
      </div>
      <div className="tracking-items">
        {data.items.map((item: any, index: number) => <div key={index}>
          <span>{item.name} × {item.quantity.toLocaleString("fa-IR")}</span>
          <strong>{toman(item.total)}</strong>
        </div>)}
      </div>
      {data.shipments?.map((shipment: any) => <div className="tracking-shipment" key={shipment.code}>
        <strong>مرسوله {shipment.code}</strong>
        <span>وضعیت: {statusFa(shipment.status)}</span>
        {shipment.trackingCode && <span>کد رهگیری: {shipment.trackingCode}</span>}
      </div>)}
      {data.events?.length > 0 && <div className="tracking-timeline">
        {data.events.map((item: any, index: number) => <article key={index}>
          <i></i>
          <div>
            <strong>{statusFa(item.status)}</strong>
            {(item.message || item.location) && <p>{item.message || item.location}</p>}
            <small>{new Date(item.occurredAt).toLocaleString("fa-IR")}</small>
          </div>
        </article>)}
      </div>}
    </section>}
  </div>;
}
