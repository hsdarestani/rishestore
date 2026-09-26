"use client";

import { FormEvent, useMemo, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { toman } from "@/lib/money";

type UserSeed = { name?: string | null; phone?: string | null; email?: string | null } | null;
type Config = { shippingFlatRate: number; freeShippingThreshold: number; paymentReady: boolean };

export default function CheckoutForm({ user, config }: { user: UserSeed; config: Config }) {
  const { items, total: subtotal, clear, hydrated } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shipping = useMemo(() => {
    if (config.freeShippingThreshold > 0 && subtotal >= config.freeShippingThreshold) return 0;
    return config.shippingFlatRate;
  }, [subtotal, config]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!items.length) return setError("سبد خرید خالی است.");
    if (!config.paymentReady) return setError("درگاه زیبال هنوز روی سرور فعال نشده است.");

    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: form.get("customerName"),
          phone: form.get("phone"),
          email: form.get("email"),
          province: form.get("province"),
          city: form.get("city"),
          address: form.get("address"),
          postalCode: form.get("postalCode"),
          notes: form.get("notes"),
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        }),
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.error || "ثبت سفارش انجام نشد.");

      const paymentResponse = await fetch("/api/payment/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: orderData.orderId }),
      });
      const paymentData = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(paymentData.error || "اتصال به زیبال انجام نشد.");

      sessionStorage.setItem("rishe_last_order", orderData.code);
      clear();
      window.location.href = paymentData.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطای غیرمنتظره");
      setBusy(false);
    }
  }

  if (!hydrated) return <div className="panel">در حال خواندن سبد خرید…</div>;
  if (!items.length) return <div className="empty-state"><h2>سبد خرید خالی است</h2><a className="btn btn-primary" href="/shop">رفتن به فروشگاه</a></div>;

  return (
    <form className="checkout-grid" onSubmit={submit}>
      <section className="panel form-panel">
        <div className="section-heading"><span>اطلاعات دریافت‌کننده</span><h1>تسویه‌حساب</h1><p>فقط اطلاعات لازم برای ارسال و پرداخت را وارد کنید.</p></div>
        <div className="form-grid">
          <label>نام و نام خانوادگی<input required name="customerName" defaultValue={user?.name || ""} autoComplete="name" /></label>
          <label>شماره موبایل<input required name="phone" defaultValue={user?.phone || ""} inputMode="tel" autoComplete="tel" placeholder="09xxxxxxxxx" /></label>
          <label>ایمیل، اختیاری<input name="email" defaultValue={user?.email || ""} type="email" autoComplete="email" /></label>
          <label>استان<input required name="province" /></label>
          <label>شهر<input required name="city" /></label>
          <label className="span-2">آدرس دقیق<textarea required name="address" rows={4} /></label>
          <label>کدپستی، اختیاری<input name="postalCode" inputMode="numeric" /></label>
          <label className="span-2">توضیحات سفارش، اختیاری<textarea name="notes" rows={3} /></label>
        </div>
      </section>

      <aside className="panel order-summary">
        <h2>خلاصه سفارش</h2>
        <div className="summary-lines">
          {items.map((item) => <div key={item.productId}><span>{item.name} × {item.quantity.toLocaleString("fa-IR")}</span><strong>{toman(item.price * item.quantity)}</strong></div>)}
        </div>
        <div className="summary-totals">
          <div><span>جمع کالاها</span><strong>{toman(subtotal)}</strong></div>
          <div><span>ارسال</span><strong>{shipping === 0 ? "رایگان" : toman(shipping)}</strong></div>
          <div className="grand"><span>مبلغ پرداخت</span><strong>{toman(subtotal + shipping)}</strong></div>
        </div>
        {!config.paymentReady && <p className="alert warning">متغیر امن ZIBAL_MERCHANT روی سرور پیدا نشد؛ پرداخت تا زمان تنظیم آن غیرفعال است.</p>}
        {error && <p className="alert error">{error}</p>}
        <button className="btn btn-primary btn-wide" disabled={busy || !config.paymentReady}>{busy ? "در حال اتصال به زیبال…" : "تأیید و پرداخت با زیبال"}</button>
        <small className="muted">پس از تأیید، به صفحه امن درگاه زیبال منتقل می‌شوید.</small>
      </aside>
    </form>
  );
}
