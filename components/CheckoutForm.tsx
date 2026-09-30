"use client";

import { FormEvent, useMemo, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { toman } from "@/lib/money";
import { IRAN_LOCATIONS, IRAN_PROVINCES, OTHER_CITY } from "@/lib/iranLocations";

type UserSeed = { name?: string | null; phone?: string | null; email?: string | null } | null;
type Config = { shippingFlatRate: number; freeShippingThreshold: number; paymentReady: boolean };
type Quote = { subtotal: number; discount: number; shippingCost: number; total: number; promotionCode?: string | null };
type AddressSeed = {
  id: string;
  title: string;
  province: string;
  city: string;
  address: string;
  postalCode?: string | null;
};

function knownCity(province: string, city: string) {
  return Boolean(city && IRAN_LOCATIONS[province]?.includes(city));
}

export default function CheckoutForm({
  user,
  config,
  addresses = [],
}: {
  user: UserSeed;
  config: Config;
  addresses?: AddressSeed[];
}) {
  const { items, total: subtotal, clear, hydrated } = useCart();
  const initialAddress = addresses[0] || null;
  const initialProvince = initialAddress?.province || "";
  const initialCity = initialAddress?.city || "";

  const [busy, setBusy] = useState(false);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [error, setError] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);

  const [selectedAddressId, setSelectedAddressId] = useState(initialAddress?.id || "");
  const [province, setProvince] = useState(initialProvince);
  const [cityChoice, setCityChoice] = useState(
    initialCity ? (knownCity(initialProvince, initialCity) ? initialCity : OTHER_CITY) : ""
  );
  const [customCity, setCustomCity] = useState(
    initialCity && !knownCity(initialProvince, initialCity) ? initialCity : ""
  );
  const [address, setAddress] = useState(initialAddress?.address || "");
  const [postalCode, setPostalCode] = useState(initialAddress?.postalCode || "");

  const cityValue = cityChoice === OTHER_CITY ? customCity.trim() : cityChoice;
  const cities = province ? IRAN_LOCATIONS[province] || [] : [];

  const fallbackShipping = useMemo(() => {
    if (config.freeShippingThreshold > 0 && subtotal >= config.freeShippingThreshold) return 0;
    return config.shippingFlatRate;
  }, [subtotal, config]);

  const effective = quote || {
    subtotal,
    discount: 0,
    shippingCost: fallbackShipping,
    total: subtotal + fallbackShipping,
    promotionCode: null,
  };

  function chooseSavedAddress(id: string) {
    setSelectedAddressId(id);
    const selected = addresses.find((item) => item.id === id);
    if (!selected) {
      setProvince("");
      setCityChoice("");
      setCustomCity("");
      setAddress("");
      setPostalCode("");
      return;
    }
    setProvince(selected.province);
    if (knownCity(selected.province, selected.city)) {
      setCityChoice(selected.city);
      setCustomCity("");
    } else {
      setCityChoice(OTHER_CITY);
      setCustomCity(selected.city);
    }
    setAddress(selected.address);
    setPostalCode(selected.postalCode || "");
  }

  function changeProvince(nextProvince: string) {
    setProvince(nextProvince);
    setSelectedAddressId("");
    setCityChoice("");
    setCustomCity("");
  }

  async function applyPromotion() {
    setError("");
    setPromoMessage("");
    const code = promotionCode.trim();
    if (!code) {
      setQuote(null);
      setPromoMessage("کد تخفیف پاک شد.");
      return;
    }
    setQuoteBusy(true);
    try {
      const response = await fetch("/api/orders/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          promotionCode: code,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "کد تخفیف اعمال نشد.");
      setQuote(data);
      setPromotionCode(data.promotionCode || code);
      setPromoMessage(data.discount > 0 ? "کد تخفیف اعمال شد." : "این کد برای سبد فعلی تخفیفی ایجاد نکرد.");
    } catch (e) {
      setQuote(null);
      setError(e instanceof Error ? e.message : "کد تخفیف اعمال نشد.");
    } finally {
      setQuoteBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!items.length) return setError("سبد خرید خالی است.");
    if (!province || !cityValue) return setError("استان و شهر را انتخاب کنید.");
    if (!config.paymentReady) return setError("پرداخت آنلاین موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.");

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
          province,
          city: cityValue,
          address: form.get("address"),
          postalCode: form.get("postalCode"),
          notes: form.get("notes"),
          promotionCode: promotionCode.trim() || null,
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
    <form className="checkout-grid checkout-easy" onSubmit={submit}>
      <section className="panel form-panel checkout-form-panel">
        <div className="section-heading checkout-heading">
          <span>اطلاعات ارسال</span>
          <h1>تقریباً تمام شد</h1>
          <p>فقط مشخصات دریافت‌کننده و آدرس تحویل را وارد کنید.</p>
        </div>

        {addresses.length > 0 && (
          <div className="checkout-saved-address">
            <label htmlFor="savedAddress">آدرس‌های ذخیره‌شده</label>
            <select id="savedAddress" value={selectedAddressId} onChange={(e) => chooseSavedAddress(e.target.value)}>
              {addresses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title || "آدرس من"} · {item.city}
                </option>
              ))}
              <option value="">＋ آدرس جدید</option>
            </select>
            <small>با انتخاب آدرس، استان، شهر و نشانی به‌صورت خودکار پر می‌شود.</small>
          </div>
        )}

        <div className="checkout-section">
          <div className="checkout-section-title">
            <b>۱</b>
            <div><strong>دریافت‌کننده</strong><span>برای هماهنگی تحویل</span></div>
          </div>
          <div className="form-grid checkout-contact-grid">
            <label>نام و نام خانوادگی<input required name="customerName" defaultValue={user?.name || ""} autoComplete="name" /></label>
            <label>شماره موبایل<input required name="phone" defaultValue={user?.phone || ""} inputMode="tel" autoComplete="tel" placeholder="09xxxxxxxxx" /></label>
          </div>
        </div>

        <div className="checkout-section">
          <div className="checkout-section-title">
            <b>۲</b>
            <div><strong>آدرس تحویل</strong><span>استان و شهر را انتخاب کنید</span></div>
          </div>

          <div className="form-grid checkout-location-grid">
            <label>
              استان
              <select required value={province} onChange={(e) => changeProvince(e.target.value)}>
                <option value="">انتخاب استان</option>
                {IRAN_PROVINCES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label>
              شهر
              <select
                required
                value={cityChoice}
                disabled={!province}
                onChange={(e) => {
                  setCityChoice(e.target.value);
                  setSelectedAddressId("");
                  if (e.target.value !== OTHER_CITY) setCustomCity("");
                }}
              >
                <option value="">{province ? "انتخاب شهر" : "اول استان را انتخاب کنید"}</option>
                {cities.map((item) => <option key={item} value={item}>{item}</option>)}
                {province && <option value={OTHER_CITY}>شهر دیگر…</option>}
              </select>
            </label>

            {cityChoice === OTHER_CITY && (
              <label className="span-2 checkout-custom-city">
                نام شهر
                <input
                  required
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="نام شهر را بنویسید"
                />
              </label>
            )}

            <label className="span-2">
              آدرس دقیق
              <textarea
                required
                name="address"
                rows={3}
                value={address}
                onChange={(e) => { setAddress(e.target.value); setSelectedAddressId(""); }}
                placeholder="مثلاً خیابان، کوچه، پلاک و واحد"
                autoComplete="street-address"
              />
            </label>
          </div>
        </div>

        <details className="checkout-optional">
          <summary>
            <div><strong>اطلاعات اختیاری</strong><span>ایمیل، کدپستی و توضیحات سفارش</span></div>
            <b>＋</b>
          </summary>
          <div className="form-grid checkout-optional-grid">
            <label>ایمیل<input name="email" defaultValue={user?.email || ""} type="email" autoComplete="email" placeholder="اختیاری" /></label>
            <label>کدپستی<input name="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} inputMode="numeric" placeholder="اختیاری" /></label>
            <label className="span-2">توضیحات سفارش<textarea name="notes" rows={2} placeholder="مثلاً ساعت مناسب برای تحویل" /></label>
          </div>
        </details>
      </section>

      <aside className="panel order-summary">
        <h2>خلاصه سفارش</h2>
        <div className="summary-lines">
          {items.map((item) => <div key={item.productId}><span>{item.name} × {item.quantity.toLocaleString("fa-IR")}</span><strong>{toman(item.price * item.quantity)}</strong></div>)}
        </div>

        <div className="checkout-promo">
          <label htmlFor="promotionCode">کد تخفیف</label>
          <div><input id="promotionCode" value={promotionCode} onChange={(e) => { setPromotionCode(e.target.value); setQuote(null); setPromoMessage(""); }} placeholder="کد تخفیف" /><button type="button" onClick={applyPromotion} disabled={quoteBusy}>{quoteBusy ? "…" : "اعمال"}</button></div>
          {promoMessage && <small>{promoMessage}</small>}
        </div>

        <div className="summary-totals">
          <div><span>جمع کالاها</span><strong>{toman(effective.subtotal)}</strong></div>
          {effective.discount > 0 && <div className="discount-line"><span>تخفیف</span><strong>− {toman(effective.discount)}</strong></div>}
          <div><span>ارسال</span><strong>{effective.shippingCost === 0 ? "رایگان" : toman(effective.shippingCost)}</strong></div>
          <div className="grand"><span>مبلغ پرداخت</span><strong>{toman(effective.total)}</strong></div>
        </div>
        {!config.paymentReady && <p className="alert warning">پرداخت آنلاین موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.</p>}
        {error && <p className="alert error">{error}</p>}
        <button className="btn btn-primary btn-wide" disabled={busy || !config.paymentReady}>{busy ? "در حال اتصال به زیبال…" : "تأیید و پرداخت با زیبال"}</button>
        <small className="muted">پس از تأیید، به صفحه امن درگاه زیبال منتقل می‌شوید.</small>
      </aside>
    </form>
  );
}
