"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { toman } from "@/lib/money";
import LegacyImportButton from "@/components/LegacyImportButton";

type AdminData = any;
type Settings = {
  storeName: string;
  storePhone: string;
  instagramUrl: string;
  baleUrl: string;
  whatsappUrl: string;
  warehouseAddress: string;
  storeAddress: string;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  paymentReady: boolean;
  paymentProvider?: string;
};

const NAV = [
  ["dashboard", "مرکز فرمان", "⌂"],
  ["inventory", "انبار و بسته‌بندی", "▦"],
  ["sales", "فروش و بازاریابی", "◎"],
  ["procurement", "بازرگانی و تأمین", "⇄"],
  ["finance", "مالی و حسابداری", "◫"],
  ["logistics", "لجستیک", "➜"],
  ["b2b", "فروش B2B", "◇"],
  ["analytics", "گزارش‌های مدیریتی", "◒"],
  ["operations", "مرکز عملیات", "⚙"],
  ["products", "محصولات فروشگاه", "□"],
  ["orders", "سفارش‌ها", "≡"],
  ["content", "محتوا و مجله", "✎"],
  ["settings", "تنظیمات", "⋯"],
] as const;

function fa(value: number | string) {
  return Number(value || 0).toLocaleString("fa-IR");
}

function date(value?: string | Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fa-IR");
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    PENDING: "در انتظار", PROCESSING: "در پردازش", SHIPPED: "ارسال شده", COMPLETED: "تکمیل شده", CANCELED: "لغو شده",
    UNPAID: "پرداخت نشده", PAID: "پرداخت شده", FAILED: "ناموفق", REFUNDED: "برگشت وجه",
    draft: "پیش‌نویس", approved: "تأیید شده", ordered: "سفارش داده شده", part_received: "دریافت ناقص", received: "دریافت کامل",
    open: "باز", active: "فعال", pending: "در انتظار", running: "در حال اجرا", wait_retry: "انتظار تلاش مجدد",
    completed: "تکمیل شده", failed: "ناموفق", cancelled: "لغو شده", resolved: "حل شده",
    ready: "آماده", booked: "رزرو حمل", shipped: "ارسال شده", delivered: "تحویل شده",
  };
  return labels[value] || value || "—";
}

async function jsonApi(url: string, method: string, body: any) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "عملیات انجام نشد.");
  return data;
}

function ErpForm({ action, children, label = "ثبت", onDone }: { action: string; children: ReactNode; label?: string; onDone?: () => void }) {
  const [state, setState] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("در حال ثبت…");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      await jsonApi("/api/admin/erp", "POST", { action, ...values });
      setState("ثبت شد");
      onDone?.();
      window.setTimeout(() => location.reload(), 450);
    } catch (error) {
      setState(error instanceof Error ? error.message : "خطا");
    }
  }
  return <form className="erp-form" onSubmit={submit}>{children}<div className="erp-form-actions"><button className="btn btn-primary btn-sm">{label}</button>{state && <small>{state}</small>}</div></form>;
}

function ModuleHeader({ kicker, title, text, actions }: { kicker: string; title: string; text: string; actions?: ReactNode }) {
  return <header className="erp-module-header">
    <div><span>{kicker}</span><h1>{title}</h1><p>{text}</p></div>
    {actions && <div className="erp-module-actions">{actions}</div>}
  </header>;
}

function Metric({ label, value, hint, tone = "" }: { label: string; value: string | number; hint?: string; tone?: string }) {
  return <div className={"erp-metric " + tone}><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

function Panel({ title, text, children, wide = false }: { title: string; text?: string; children: ReactNode; wide?: boolean }) {
  return <section className={"erp-panel " + (wide ? "erp-panel-wide" : "")}><header><div><h2>{title}</h2>{text && <p>{text}</p>}</div></header>{children}</section>;
}

function Table({ heads, children }: { heads: string[]; children: ReactNode }) {
  return <div className="erp-table-wrap"><table className="erp-table"><thead><tr>{heads.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function Empty({ children = "هنوز داده‌ای ثبت نشده است." }: { children?: ReactNode }) {
  return <div className="erp-empty">{children}</div>;
}

function ProductEditor({ product, categories }: { product: any; categories: any[] }) {
  const [status, setStatus] = useState("");
  const [image, setImage] = useState(product.image || "");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setStatus("در حال ذخیره…");
    try {
      await jsonApi("/api/admin/products/" + product.id, "PATCH", {
        ...Object.fromEntries(fd.entries()),
        image,
        active: fd.get("active") === "on",
        featured: fd.get("featured") === "on",
        allowBackorder: fd.get("allowBackorder") === "on",
      });
      setStatus("ذخیره شد");
      window.setTimeout(() => location.reload(), 400);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "خطا");
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    setStatus("در حال بارگذاری تصویر…");
    const fd = new FormData(); fd.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await response.json();
    if (!response.ok) { setStatus(data.error || "آپلود نشد"); return; }
    setImage(data.url); setStatus("تصویر آماده است؛ ذخیره را بزن");
  }

  return <details className="erp-record">
    <summary>
      <div><strong>{product.name}</strong><span>{product.category?.name || "بدون دسته"} · {product.kind === "PACK" ? "پک" : "محصول"}</span></div>
      <div><b>{product.price ? toman(product.price) : "بدون قیمت"}</b><span>موجودی {fa(product.stock)}</span></div>
    </summary>
    <form className="erp-record-form" onSubmit={save}>
      <div className="form-grid">
        <label>نام<input name="name" defaultValue={product.name} required /></label>
        <label>اسلاگ<input name="slug" dir="ltr" defaultValue={product.slug} required /></label>
        <label>نوع<select name="kind" defaultValue={product.kind}><option value="PRODUCT">محصول</option><option value="PACK">پک</option></select></label>
        <label>دسته<select name="categoryId" defaultValue={product.categoryId || ""}><option value="">بدون دسته</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>قیمت تومان<input name="price" type="number" min="0" defaultValue={product.price} /></label>
        <label>قیمت قبل از تخفیف<input name="compareAt" type="number" min="0" defaultValue={product.compareAt || ""} /></label>
        <label>موجودی کل<input name="stock" type="number" min="0" defaultValue={product.stock} /></label>
        <label>وضعیت انبار<select name="stockStatus" defaultValue={product.stockStatus || ""}><option value="">خودکار</option><option value="instock">موجود</option><option value="outofstock">ناموجود</option><option value="onbackorder">پیش‌سفارش</option></select></label>
        <label>وزن گرم<input name="weightGrams" type="number" min="0" defaultValue={product.weightGrams || ""} /></label>
        <label>مبدأ<input name="origin" defaultValue={product.origin || ""} /></label>
        <label className="span-2">توضیح کوتاه<textarea name="shortDescription" rows={2} defaultValue={product.shortDescription} /></label>
        <label className="span-2">توضیح کامل<textarea name="description" rows={5} defaultValue={product.description} /></label>
        <label>کاربرد<input name="usage" defaultValue={product.usage || ""} /></label>
        <label>تصویر<input value={image} onChange={(e) => setImage(e.target.value)} dir="ltr" /></label>
        <label className="span-2">بارگذاری تصویر<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0])} /></label>
        <label className="span-2">اطلاعات کیفیت<textarea name="quality" rows={3} defaultValue={product.quality || ""} /></label>
        <label className="span-2">تعهد کیفیت / به شرط پخت<textarea name="guarantee" rows={3} defaultValue={product.guarantee || ""} /></label>
        <label>عنوان SEO<input name="seoTitle" defaultValue={product.seoTitle || ""} /></label>
        <label>توضیح SEO<input name="seoDescription" defaultValue={product.seoDescription || ""} /></label>
      </div>
      <div className="erp-checks"><label><input type="checkbox" name="active" defaultChecked={product.active} /> فعال</label><label><input type="checkbox" name="featured" defaultChecked={product.featured} /> ویژه</label><label><input type="checkbox" name="allowBackorder" defaultChecked={product.allowBackorder} /> پیش‌سفارش مجاز</label></div>
      <div className="erp-form-actions"><button className="btn btn-primary btn-sm">ذخیره</button><small>{status}</small></div>
    </form>
  </details>;
}

export default function AdminPanel({ data, settings }: { data: AdminData; settings: Settings }) {
  const [tab, setTab] = useState<string>("dashboard");
  const [notice, setNotice] = useState("");

  const paidOrders = useMemo(() => (data.orders || []).filter((o: any) => o.paymentStatus === "PAID"), [data.orders]);
  const websitePaidOrders = useMemo(() => paidOrders.filter((o: any) => o.salesChannel !== "event"), [paidOrders]);
  const eventPaidOrders = useMemo(() => paidOrders.filter((o: any) => o.salesChannel === "event"), [paidOrders]);
  const salesTotal = useMemo(() => paidOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0) + (data.manualSales || []).reduce((sum: number, s: any) => sum + Number(s.total || 0), 0), [paidOrders, data.manualSales]);
  const lowStock = useMemo(() => (data.products || []).filter((p: any) => p.active && p.stock <= 5), [data.products]);

  async function quick(url: string, method: string, body: any) {
    setNotice("در حال ذخیره…");
    try {
      await jsonApi(url, method, body);
      setNotice("ذخیره شد");
      window.setTimeout(() => location.reload(), 450);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "خطا");
    }
  }

  const productOptions = (data.products || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>);
  const warehouseOptions = (data.warehouses || []).map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>);

  return <div className="rishe-erp-app">
    <aside className="rishe-erp-sidebar">
      <div className="erp-brand">
        <img src="/brand/logo.png" alt="ریشه" />
        <div><strong>سیستم عملیاتی ریشه</strong><span>پنل مدیریت مستقل</span></div>
      </div>
      <nav>
        {NAV.map(([key, label, icon]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
          <i>{icon}</i><span>{label}</span>
        </button>)}
      </nav>
      <div className="erp-sidebar-bottom">
        <a href="/admin/advanced">عملیات پیشرفته و ERP کامل →</a>
        <a href="/admin/team">کاربران و سطح دسترسی</a>
        <a href="/" target="_blank">مشاهده فروشگاه ↗</a>
        <a href="/account">حساب مدیر</a>
      </div>
    </aside>

    <main className="rishe-erp-main">
      <div className="rishe-erp-topbar">
        <div><strong>{NAV.find((n) => n[0] === tab)?.[1]}</strong><span>ریشه ۲ · فروشگاه و ERP یکپارچه</span></div>
        <div className="erp-health"><span className={settings.paymentReady ? "ok" : "bad"}></span>زیبال {settings.paymentReady ? "متصل" : "تنظیم نشده"}</div>
      </div>
      {notice && <div className="admin-notice">{notice}</div>}

      {tab === "dashboard" && <div className="erp-page">
        <ModuleHeader kicker="مرکز فرمان ریشه" title="تصویر امروز کسب‌وکار" text="فروش، موجودی، تأمین، ارسال و خطاهای عملیاتی از یک نمای واحد." />
        <div className="erp-metrics-grid">
          <Metric label="فروش ثبت‌شده" value={toman(salesTotal)} hint="سایت + فروش حضوری" />
          <Metric label="سفارش پرداخت‌شده" value={fa(paidOrders.length)} />
          <Metric label="محصول کم‌موجودی" value={fa(lowStock.length)} tone={lowStock.length ? "warn" : ""} />
          <Metric label="ارسال باز" value={fa((data.shipments || []).filter((s:any)=>!["delivered","cancelled"].includes(s.status)).length)} />
          <Metric label="خرید باز" value={fa((data.purchaseOrders || []).filter((p:any)=>!["received","cancelled"].includes(p.status)).length)} />
          <Metric label="رخداد باز" value={fa((data.incidents || []).filter((i:any)=>i.status !== "resolved").length)} tone={(data.incidents || []).some((i:any)=>i.status !== "resolved") ? "danger" : ""} />
        </div>

        <div className="erp-grid-2">
          <Panel title="کارهای منتظر اقدام" text="مواردی که امروز بهتر است بررسی شوند.">
            <div className="erp-action-list">
              {lowStock.slice(0,5).map((p:any)=><button key={p.id} onClick={()=>setTab("inventory")}><span>موجودی پایین</span><strong>{p.name}</strong><b>{fa(p.stock)}</b></button>)}
              {(data.purchaseOrders || []).filter((p:any)=>p.status==="draft").slice(0,4).map((p:any)=><button key={p.id} onClick={()=>setTab("procurement")}><span>خرید نیازمند تأیید</span><strong>{p.code}</strong><b>{p.supplier?.name}</b></button>)}
              {(data.shipments || []).filter((s:any)=>["draft","ready"].includes(s.status)).slice(0,4).map((s:any)=><button key={s.id} onClick={()=>setTab("logistics")}><span>ارسال نیازمند اقدام</span><strong>{s.code}</strong><b>{s.recipientName}</b></button>)}
              {!lowStock.length && !(data.purchaseOrders || []).some((p:any)=>p.status==="draft") && !(data.shipments || []).some((s:any)=>["draft","ready"].includes(s.status)) && <Empty>کار فوری ثبت‌شده‌ای وجود ندارد.</Empty>}
            </div>
          </Panel>
          <Panel title="وضعیت اتصال‌ها">
            <div className="erp-connection-list">
              <div><span className={settings.paymentReady ? "ok" : "bad"}></span><strong>درگاه زیبال</strong><b>{settings.paymentReady ? "فعال" : "نیاز به ZIBAL_MERCHANT"}</b></div>
              <div><span className="ok"></span><strong>PostgreSQL</strong><b>متصل</b></div>
              <div><span className="ok"></span><strong>فروشگاه مستقل</strong><b>فعال</b></div>
              <div><span className="ok"></span><strong>دارایی‌های برند</strong><b>محلی روی سرور</b></div>
            </div>
          </Panel>
        </div>

        <Panel title="آخرین سفارش‌ها" wide>
          <Table heads={["کد","مشتری","پرداخت","وضعیت","مبلغ","تاریخ"]}>
            {(data.orders || []).slice(0,8).map((o:any)=><tr key={o.id}><td><b>{o.code}</b></td><td>{o.customerName}</td><td><span className={"erp-status "+o.paymentStatus.toLowerCase()}>{statusLabel(o.paymentStatus)}</span></td><td>{statusLabel(o.status)}</td><td>{toman(o.total)}</td><td>{date(o.createdAt)}</td></tr>)}
          </Table>
        </Panel>
      </div>}

      {tab === "inventory" && <div className="erp-page">
        <ModuleHeader kicker="عملیات روزمره" title="انبار و بسته‌بندی" text="موجودی چندانباره، ورود کالا، انتقال، بچ‌ها، فرمول بسته‌بندی و اجرای تولید." />
        <div className="erp-metrics-grid">
          <Metric label="انبار فعال" value={fa((data.warehouses || []).length)} />
          <Metric label="بچ موجودی" value={fa((data.inventoryBatches || []).length)} />
          <Metric label="موجودی کل" value={fa((data.inventoryBatches || []).reduce((s:number,b:any)=>s+b.quantity,0))} />
          <Metric label="فرمول تولید" value={fa((data.boms || []).length)} />
        </div>

        <div className="erp-grid-2">
          <Panel title="تعریف انبار">
            <ErpForm action="warehouse.create"><div className="form-grid"><label>نام انبار<input name="name" required /></label><label>کد<input name="code" placeholder="اختیاری" /></label><label className="span-2">آدرس<input name="address" /></label></div></ErpForm>
          </Panel>
          <Panel title="ورود موجودی">
            <ErpForm action="inventory.receive"><div className="form-grid"><label>انبار<select name="warehouseId" required><option value="">انتخاب</option>{warehouseOptions}</select></label><label>محصول<select name="productId" required><option value="">انتخاب</option>{productOptions}</select></label><label>تعداد<input name="quantity" type="number" min="1" required /></label><label>بهای واحد تومان<input name="unitCost" type="number" min="0" /></label><label>کد بچ<input name="batchCode" /></label><label>یادداشت<input name="notes" /></label></div></ErpForm>
          </Panel>
          <Panel title="انتقال بین انبارها">
            <ErpForm action="inventory.transfer"><div className="form-grid"><label>از انبار<select name="fromWarehouseId" required><option value="">انتخاب</option>{warehouseOptions}</select></label><label>به انبار<select name="toWarehouseId" required><option value="">انتخاب</option>{warehouseOptions}</select></label><label>محصول<select name="productId" required><option value="">انتخاب</option>{productOptions}</select></label><label>تعداد<input name="quantity" type="number" min="1" required /></label></div></ErpForm>
          </Panel>
          <Panel title="فرمول بسته‌بندی / BOM">
            <ErpForm action="bom.create"><div className="form-grid"><label>محصول خروجی<select name="productId" required><option value="">انتخاب</option>{productOptions}</select></label><label>مقدار خروجی<input name="outputQuantity" type="number" min="1" defaultValue="1" /></label><label>ماده اولیه<select name="materialProductId" required><option value="">انتخاب</option>{productOptions}</select></label><label>مقدار مصرف<input name="materialQuantity" type="number" min="1" required /></label><label>ضایعات basis point<input name="wasteBps" type="number" min="0" defaultValue="0" /></label><label>یادداشت<input name="notes" /></label></div></ErpForm>
          </Panel>
          <Panel title="اجرای بسته‌بندی / تولید">
            <ErpForm action="production.run"><div className="form-grid"><label>فرمول<select name="bomId" required><option value="">انتخاب</option>{(data.boms||[]).map((b:any)=><option key={b.id} value={b.id}>{b.code} · {b.product?.name}</option>)}</select></label><label>انبار<select name="warehouseId" required><option value="">انتخاب</option>{warehouseOptions}</select></label><label>تعداد خروجی<input name="quantity" type="number" min="1" required /></label><label>هزینه کار<input name="laborCost" type="number" min="0" /></label><label>هزینه ضایعات<input name="wasteCost" type="number" min="0" /></label><label>یادداشت<input name="notes" /></label></div></ErpForm>
          </Panel>
        </div>

        <Panel title="موجودی لحظه‌ای انبارها" wide>
          {(data.inventoryBatches || []).length ? <Table heads={["انبار","محصول","بچ","موجودی","رزرو","بهای واحد","ورود"]}>
            {(data.inventoryBatches || []).map((b:any)=><tr key={b.id}><td>{b.warehouse?.name}</td><td><b>{b.product?.name}</b></td><td>{b.batchCode}</td><td>{fa(b.quantity)}</td><td>{fa(b.reserved)}</td><td>{toman(b.unitCost)}</td><td>{date(b.receivedAt)}</td></tr>)}
          </Table> : <Empty />}
        </Panel>
      </div>}

      {tab === "sales" && <div className="erp-page">
        <ModuleHeader kicker="همه کانال‌ها" title="فروش و بازاریابی" text="فروش سایت، ایونت و فروش حضوری همراه با دیتابیس مشتری و گزارش یکپارچه." />
        <div className="erp-metrics-grid">
          <Metric label="فروش سایت" value={toman(websitePaidOrders.reduce((s:number,o:any)=>s+o.total,0))} />
          <Metric label="فروش ایونت و حضوری" value={toman(eventPaidOrders.reduce((s:number,o:any)=>s+o.total,0) + (data.manualSales||[]).reduce((s:number,o:any)=>s+o.total,0))} />
          <Metric label="مشتری ثبت‌شده" value={fa((data.customers||[]).length)} />
          <Metric label="تعداد سفارش" value={fa((data.orders||[]).length + (data.manualSales||[]).length)} />
        </div>
        <div className="erp-grid-2">
          <Panel title="ثبت فروش حضوری / ایونت" text="فروش آفلاین مستقیماً موجودی را کم می‌کند.">
            <ErpForm action="manual-sale.create"><div className="form-grid"><label>کانال<select name="channel"><option value="event">ایونت</option><option value="shop">دکان</option><option value="phone">تلفنی</option><option value="b2b">B2B</option></select></label><label>نام ایونت<input name="eventName" /></label><label>انبار<select name="warehouseId"><option value="">بدون انبار</option>{warehouseOptions}</select></label><label>محصول<select name="productId" required><option value="">انتخاب</option>{productOptions}</select></label><label>تعداد<input name="quantity" type="number" min="1" required /></label><label>قیمت واحد<input name="unitPrice" type="number" min="0" /></label><label>نام مشتری<input name="customerName" /></label><label>موبایل<input name="phone" /></label><label>فروشنده<input name="seller" /></label><label>روش پرداخت<select name="paymentType"><option value="cash">نقد</option><option value="card">کارت</option><option value="gateway">درگاه</option></select></label></div></ErpForm>
          </Panel>
          <Panel title="آخرین مشتریان">
            {(data.customers||[]).length ? <div className="erp-mini-list">{(data.customers||[]).slice(0,10).map((u:any)=><div key={u.id}><strong>{u.name}</strong><span>{u.phone}</span><b>{fa(u._count?.orders || 0)} سفارش</b></div>)}</div> : <Empty />}
          </Panel>
        </div>
        <Panel title="فروش همه کانال‌ها" wide>
          <Table heads={["مرجع","کانال","مشتری","وضعیت","مبلغ","تاریخ"]}>
            {(data.orders||[]).slice(0,30).map((o:any)=><tr key={"o"+o.id}><td>{o.code}</td><td>{o.salesChannel === "event" ? "ایونت" : o.salesChannel === "phone" ? "تلفنی" : "وب‌سایت"}</td><td>{o.customerName}</td><td>{statusLabel(o.paymentStatus)}</td><td>{toman(o.total)}</td><td>{date(o.createdAt)}</td></tr>)}
            {(data.manualSales||[]).slice(0,30).map((o:any)=><tr key={"m"+o.id}><td>{o.code}</td><td>{o.channel}</td><td>{o.customerName || "حضوری"}</td><td>{statusLabel(o.status)}</td><td>{toman(o.total)}</td><td>{date(o.createdAt)}</td></tr>)}
          </Table>
        </Panel>
      </div>}

      {tab === "procurement" && <div className="erp-page">
        <ModuleHeader kicker="تأمین و خرید" title="بازرگانی و تأمین" text="تأمین‌کننده، سفارش خرید، هزینه خرید، دریافت و وضعیت تأمین." />
        <div className="erp-grid-2">
          <Panel title="تأمین‌کننده جدید">
            <ErpForm action="supplier.create"><div className="form-grid"><label>نام<input name="name" required /></label><label>کد<input name="code" /></label><label>موبایل<input name="phone" /></label><label>ایمیل<input name="email" /></label><label>شناسه مالیاتی<input name="taxId" /></label><label>آدرس<input name="address" /></label></div></ErpForm>
          </Panel>
          <Panel title="سفارش خرید">
            <ErpForm action="purchase.create"><div className="form-grid"><label>تأمین‌کننده<select name="supplierId" required><option value="">انتخاب</option>{(data.suppliers||[]).map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>محصول<select name="productId" required><option value="">انتخاب</option>{productOptions}</select></label><label>تعداد<input name="quantity" type="number" min="1" required /></label><label>قیمت واحد<input name="unitPrice" type="number" min="0" required /></label><label className="span-2">یادداشت<input name="notes" /></label></div></ErpForm>
          </Panel>
        </div>
        <Panel title="سفارش‌های خرید" wide>
          {(data.purchaseOrders||[]).length ? <Table heads={["کد","تأمین‌کننده","اقلام","وضعیت","مبلغ","تاریخ","عملیات"]}>
            {(data.purchaseOrders||[]).map((p:any)=><tr key={p.id}><td><b>{p.code}</b></td><td>{p.supplier?.name}</td><td>{fa(p.items?.length||0)}</td><td>{statusLabel(p.status)}</td><td>{toman(p.total)}</td><td>{date(p.createdAt)}</td><td><select defaultValue={p.status} onChange={(e)=>quick("/api/admin/erp","POST",{action:"purchase.status",id:p.id,status:e.target.value})}><option value="draft">پیش‌نویس</option><option value="approved">تأیید</option><option value="ordered">سفارش شده</option><option value="part_received">دریافت ناقص</option><option value="received">دریافت کامل</option><option value="cancelled">لغو</option></select></td></tr>)}
          </Table> : <Empty />}
        </Panel>
      </div>}

      {tab === "finance" && <div className="erp-page">
        <ModuleHeader kicker="مالی ریشه" title="مالی و حسابداری" text="کدینگ حساب‌ها، اسناد دوطرفه، خزانه، بانک و آماده‌سازی سامانه مودیان." />
        <div className="erp-metrics-grid">
          <Metric label="حساب معین/تفصیلی" value={fa((data.accountingAccounts||[]).length)} />
          <Metric label="سند مالی" value={fa((data.vouchers||[]).length)} />
          <Metric label="حساب خزانه" value={fa((data.treasuryAccounts||[]).length)} />
          <Metric label="تراکنش خزانه" value={fa((data.treasuryTransactions||[]).length)} />
        </div>
        <div className="erp-grid-2">
          <Panel title="تعریف حساب">
            <ErpForm action="account.create"><div className="form-grid"><label>کد حساب<input name="code" required /></label><label>نام حساب<input name="name" required /></label><label>نوع<select name="type"><option value="asset">دارایی</option><option value="liability">بدهی</option><option value="equity">حقوق مالکانه</option><option value="revenue">درآمد</option><option value="expense">هزینه</option></select></label><label>سطح<input name="level" type="number" min="1" max="4" defaultValue="1" /></label></div></ErpForm>
          </Panel>
          <Panel title="ثبت سند مالی">
            <ErpForm action="voucher.create"><div className="form-grid"><label>بدهکار<select name="debitAccountId" required><option value="">انتخاب</option>{(data.accountingAccounts||[]).map((a:any)=><option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></label><label>بستانکار<select name="creditAccountId" required><option value="">انتخاب</option>{(data.accountingAccounts||[]).map((a:any)=><option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></label><label>مبلغ تومان<input name="amount" type="number" min="1" required /></label><label>وضعیت<select name="status"><option value="draft">پیش‌نویس</option><option value="posted">قطعی</option></select></label><label className="span-2">شرح<input name="description" /></label></div></ErpForm>
          </Panel>
          <Panel title="حساب خزانه">
            <ErpForm action="treasury.account.create"><div className="form-grid"><label>نام حساب<input name="name" required /></label><label>نوع<select name="type"><option value="bank">بانک</option><option value="cash">صندوق</option><option value="pos">کارتخوان</option><option value="gateway">درگاه</option></select></label><label>شبا<input name="iban" /></label><label>شماره کارت<input name="cardNumber" /></label></div></ErpForm>
          </Panel>
          <Panel title="ثبت تراکنش خزانه">
            <ErpForm action="treasury.transaction.create"><div className="form-grid"><label>حساب<select name="accountId" required><option value="">انتخاب</option>{(data.treasuryAccounts||[]).map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>جهت<select name="direction"><option value="credit">ورودی</option><option value="debit">خروجی</option></select></label><label>مبلغ<input name="amount" type="number" min="1" required /></label><label>شناسه خارجی<input name="externalId" /></label><label className="span-2">شرح<input name="description" /></label></div></ErpForm>
          </Panel>
          <Panel title="سامانه مودیان">
            <ErpForm action="tax.profile.create"><div className="form-grid"><label>نام پروفایل<input name="name" required /></label><label>شناسه مالیاتی<input name="taxId" required /></label><label>شناسه حافظه<input name="memoryId" /></label></div></ErpForm>
            <div className="erp-note">کلید خصوصی و ارسال واقعی صورتحساب تا زمان ورود امن Credentialهای سازمانی غیرفعال می‌ماند؛ داده حساس داخل فرم عمومی نمایش داده نمی‌شود.</div>
          </Panel>
        </div>
        <Panel title="آخرین اسناد" wide>
          {(data.vouchers||[]).length ? <Table heads={["شماره","شرح","وضعیت","بدهکار","بستانکار","تاریخ"]}>{(data.vouchers||[]).map((v:any)=><tr key={v.id}><td>{v.code}</td><td>{v.description||"—"}</td><td>{statusLabel(v.status)}</td><td>{toman(v.totalDebit)}</td><td>{toman(v.totalCredit)}</td><td>{date(v.date)}</td></tr>)}</Table> : <Empty />}
        </Panel>
      </div>}

      {tab === "logistics" && <div className="erp-page">
        <ModuleHeader kicker="ارسال و تحویل" title="لجستیک" text="شرکت حمل، آماده‌سازی، رهگیری، هزینه برآوردی و هزینه واقعی مرسوله." />
        <div className="erp-grid-2">
          <Panel title="شرکت حمل جدید"><ErpForm action="carrier.create"><div className="form-grid"><label>نام<input name="name" required /></label><label>کد<input name="code" /></label></div></ErpForm></Panel>
          <Panel title="مرسوله جدید"><ErpForm action="shipment.create"><div className="form-grid"><label>سفارش سایت<select name="orderId"><option value="">بدون سفارش</option>{(data.orders||[]).map((o:any)=><option key={o.id} value={o.id}>{o.code} · {o.customerName}</option>)}</select></label><label>شرکت حمل<select name="carrierId"><option value="">انتخاب</option>{(data.carriers||[]).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>گیرنده<input name="recipientName" /></label><label>موبایل<input name="phone" /></label><label className="span-2">آدرس<input name="address" /></label><label>هزینه برآوردی<input name="cost" type="number" min="0" /></label></div></ErpForm></Panel>
        </div>
        <Panel title="مرسوله‌ها" wide>
          {(data.shipments||[]).length ? <Table heads={["کد","گیرنده","شرکت","وضعیت","رهگیری","هزینه","عملیات"]}>{(data.shipments||[]).map((s:any)=><tr key={s.id}><td>{s.code}</td><td>{s.recipientName}</td><td>{s.carrier?.name||"—"}</td><td>{statusLabel(s.status)}</td><td>{s.trackingCode||"—"}</td><td>{toman(s.actualCost ?? s.cost)}</td><td><select defaultValue={s.status} onChange={(e)=>quick("/api/admin/erp","POST",{action:"shipment.status",id:s.id,status:e.target.value})}><option value="draft">پیش‌نویس</option><option value="ready">آماده</option><option value="booked">رزرو حمل</option><option value="shipped">ارسال</option><option value="delivered">تحویل</option><option value="cancelled">لغو</option></select></td></tr>)}</Table> : <Empty />}
        </Panel>
      </div>}

      {tab === "b2b" && <div className="erp-page">
        <ModuleHeader kicker="فروش سازمانی" title="فروش B2B" text="حساب طرف تجاری، سقف اعتبار، امانی، کمیسیون و تسویه." />
        <div className="erp-grid-2">
          <Panel title="طرف تجاری جدید"><ErpForm action="b2b.account.create"><div className="form-grid"><label>نام<input name="name" required /></label><label>کد<input name="code" /></label><label>موبایل<input name="phone" /></label><label>ایمیل<input name="email" /></label><label>سقف اعتبار<input name="creditLimit" type="number" min="0" /></label><label>کمیسیون basis point<input name="commissionBps" type="number" min="0" /></label></div></ErpForm></Panel>
          <Panel title="ارسال امانی"><ErpForm action="consignment.create"><div className="form-grid"><label>طرف تجاری<select name="b2bAccountId" required><option value="">انتخاب</option>{(data.b2bAccounts||[]).map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>محصول<select name="productId" required><option value="">انتخاب</option>{productOptions}</select></label><label>تعداد<input name="quantity" type="number" min="1" required /></label><label>قیمت واحد<input name="unitPrice" type="number" min="0" required /></label><label className="span-2">یادداشت<input name="notes" /></label></div></ErpForm></Panel>
        </div>
        <Panel title="حساب‌های B2B" wide>{(data.b2bAccounts||[]).length ? <Table heads={["کد","نام","تماس","اعتبار","مانده","کمیسیون","وضعیت"]}>{(data.b2bAccounts||[]).map((a:any)=><tr key={a.id}><td>{a.code}</td><td><b>{a.name}</b></td><td>{a.phone||"—"}</td><td>{toman(a.creditLimit)}</td><td>{toman(a.balance)}</td><td>{(a.commissionBps/100).toLocaleString("fa-IR")}%</td><td>{statusLabel(a.status)}</td></tr>)}</Table> : <Empty />}</Panel>
      </div>}

      {tab === "analytics" && <div className="erp-page">
        <ModuleHeader kicker="هوش مدیریتی" title="گزارش‌های مدیریتی" text="نمای اجرایی فروش، موجودی، مشتری، مالی و اهداف قابل‌اندازه‌گیری." />
        <div className="erp-metrics-grid">
          <Metric label="فروش کل" value={toman(salesTotal)} />
          <Metric label="میانگین سفارش سایت" value={paidOrders.length ? toman(Math.round(paidOrders.reduce((s:number,o:any)=>s+o.total,0)/paidOrders.length)) : toman(0)} />
          <Metric label="موجودی کالا" value={fa((data.products||[]).reduce((s:number,p:any)=>s+p.stock,0))} />
          <Metric label="مشتری" value={fa((data.customers||[]).length)} />
        </div>
        <div className="erp-grid-2">
          <Panel title="هدف جدید"><ErpForm action="goal.create"><div className="form-grid"><label>نام هدف<input name="name" required /></label><label>شاخص<select name="metric"><option value="sales">فروش</option><option value="orders">تعداد سفارش</option><option value="customers">مشتری جدید</option><option value="gross_margin">حاشیه سود</option></select></label><label>مقدار هدف<input name="target" type="number" min="0" required /></label><label>کانال<input name="salesChannel" /></label><label>از تاریخ<input name="periodStart" type="date" required /></label><label>تا تاریخ<input name="periodEnd" type="date" required /></label></div></ErpForm></Panel>
          <Panel title="اهداف فعال">{(data.goals||[]).length ? <div className="erp-mini-list">{(data.goals||[]).map((g:any)=><div key={g.id}><strong>{g.name}</strong><span>{g.metric} · {date(g.periodStart)} تا {date(g.periodEnd)}</span><b>{fa(g.target)}</b></div>)}</div> : <Empty />}</Panel>
        </div>
        <Panel title="محصولات نیازمند توجه" wide>{lowStock.length ? <Table heads={["محصول","دسته","موجودی","قیمت","وضعیت"]}>{lowStock.map((p:any)=><tr key={p.id}><td><b>{p.name}</b></td><td>{p.category?.name||"—"}</td><td>{fa(p.stock)}</td><td>{p.price?toman(p.price):"—"}</td><td><span className="erp-status failed">کم‌موجودی</span></td></tr>)}</Table> : <Empty>کمبود موجودی ثبت نشده است.</Empty>}</Panel>
      </div>}

      {tab === "operations" && <div className="erp-page">
        <ModuleHeader kicker="مرکز کنترل عملیات" title="سلامت و پردازش پس‌زمینه" text="صف عملیات، تلاش مجدد، رخدادها، Audit Log و وضعیت سرویس‌ها." />
        <div className="erp-metrics-grid">
          <Metric label="کار در صف" value={fa((data.jobs||[]).filter((j:any)=>["pending","running","wait_retry"].includes(j.status)).length)} />
          <Metric label="کار ناموفق" value={fa((data.jobs||[]).filter((j:any)=>j.status==="failed").length)} />
          <Metric label="رخداد باز" value={fa((data.incidents||[]).filter((i:any)=>i.status!=="resolved").length)} />
          <Metric label="Audit" value={fa((data.auditLogs||[]).length)} />
        </div>
        <div className="erp-grid-2">
          <Panel title="افزودن کار به صف"><ErpForm action="job.create"><div className="form-grid"><label>نوع کار<input name="type" required placeholder="مثلاً logistics_tracking" /></label><label>شناسه مرجع<input name="aggregateId" /></label><label className="span-2">کلید idempotency<input name="idempotencyKey" placeholder="اگر خالی باشد خودکار ساخته می‌شود" /></label></div></ErpForm></Panel>
          <Panel title="سلامت سرویس‌ها"><div className="erp-connection-list"><div><span className="ok"></span><strong>Application</strong><b>Healthy</b></div><div><span className="ok"></span><strong>Database</strong><b>Healthy</b></div><div><span className={settings.paymentReady?"ok":"bad"}></span><strong>Zibal</strong><b>{settings.paymentReady?"Configured":"Missing merchant"}</b></div></div></Panel>
        </div>
        <Panel title="صف عملیات" wide>{(data.jobs||[]).length ? <Table heads={["نوع","مرجع","وضعیت","تلاش","اجرای بعد","خطا","عملیات"]}>{(data.jobs||[]).map((j:any)=><tr key={j.id}><td>{j.type}</td><td>{j.aggregateId||"—"}</td><td>{statusLabel(j.status)}</td><td>{fa(j.attempts)} / {fa(j.maxAttempts)}</td><td>{j.nextRunAt?date(j.nextRunAt):"—"}</td><td className="erp-ellipsis">{j.lastError||"—"}</td><td>{j.status==="failed"&&<button className="erp-link-button" onClick={()=>quick("/api/admin/erp","POST",{action:"job.retry",id:j.id})}>تلاش مجدد</button>}</td></tr>)}</Table> : <Empty />}</Panel>
        <Panel title="رویدادهای نظارتی" wide>{(data.auditLogs||[]).length ? <Table heads={["زمان","عملیات","نوع رکورد","شناسه","کاربر","Correlation ID"]}>{(data.auditLogs||[]).map((a:any)=><tr key={a.id}><td>{new Date(a.createdAt).toLocaleString("fa-IR")}</td><td>{a.action}</td><td>{a.entityType}</td><td>{a.entityId||"—"}</td><td>{a.user?.name||"سیستم"}</td><td className="erp-code">{a.correlationId}</td></tr>)}</Table> : <Empty />}</Panel>
      </div>}

      {tab === "products" && <div className="erp-page">
        <ModuleHeader kicker="کاتالوگ فروشگاه" title="محصولات و پک‌ها" text="تصویر، قیمت، موجودی، دسته، مبدأ، توضیحات و اطلاعات کیفیت هر محصول." />
        <details className="erp-record erp-create-record"><summary><strong>+ محصول جدید</strong></summary><form className="erp-record-form" onSubmit={async(e)=>{e.preventDefault();const fd=new FormData(e.currentTarget);await quick("/api/admin/products","POST",{...Object.fromEntries(fd.entries()),active:true,featured:false});}}><div className="form-grid"><label>نام<input name="name" required /></label><label>اسلاگ انگلیسی<input name="slug" required dir="ltr" /></label><label>نوع<select name="kind"><option value="PRODUCT">محصول</option><option value="PACK">پک</option></select></label><label>دسته<select name="categoryId"><option value="">بدون دسته</option>{(data.categories||[]).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>قیمت<input name="price" type="number" min="0" /></label><label>قیمت قبل از تخفیف<input name="compareAt" type="number" min="0" /></label><label>موجودی<input name="stock" type="number" min="0" /></label><label>وزن گرم<input name="weightGrams" type="number" min="0" /></label><label className="span-2">توضیح کوتاه<textarea name="shortDescription" required /></label><label className="span-2">توضیح کامل<textarea name="description" required /></label></div><button className="btn btn-primary btn-sm">ساخت محصول</button></form></details>
        {(data.products||[]).map((p:any)=><ProductEditor key={p.id} product={p} categories={data.categories||[]} />)}
      </div>}

      {tab === "orders" && <div className="erp-page">
        <ModuleHeader kicker="همه کانال‌ها" title="سفارش‌ها" text="سفارش‌های سایت و ایونت با مشتری، پرداخت و وضعیت پردازش در یک لیست." />
        <Panel title="سفارش‌ها" wide>
          <Table heads={["کد","کانال","مشتری","موبایل","پرداخت","وضعیت","مبلغ","تاریخ","تغییر وضعیت"]}>
            {(data.orders||[]).map((o:any)=><tr key={o.id}><td><b>{o.code}</b></td><td>{o.salesChannel === "event" ? "ایونت" : o.salesChannel === "phone" ? "تلفنی" : "وب‌سایت"}</td><td>{o.customerName}</td><td>{o.phone}</td><td><span className={"erp-status "+o.paymentStatus.toLowerCase()}>{statusLabel(o.paymentStatus)}</span></td><td>{statusLabel(o.status)}</td><td>{toman(o.total)}</td><td>{date(o.createdAt)}</td><td><select defaultValue={o.status} onChange={(e)=>quick("/api/admin/orders/"+o.id,"PATCH",{status:e.target.value})}><option value="PENDING">در انتظار</option><option value="PROCESSING">پردازش</option><option value="SHIPPED">ارسال</option><option value="COMPLETED">تکمیل</option><option value="CANCELED">لغو</option></select></td></tr>)}
          </Table>
        </Panel>
      </div>}

      {tab === "content" && <div className="erp-page">
        <ModuleHeader kicker="مدیریت محتوا" title="صفحات، مجله و سوالات متداول" text="محتوای عمومی سایت بدون نیاز به WordPress از همین پنل ویرایش می‌شود." />
        <div className="erp-grid-2">
          <Panel title="صفحه جدید">
            <form className="erp-form" onSubmit={async(e)=>{e.preventDefault();await quick("/api/admin/content","POST",{kind:"page",...Object.fromEntries(new FormData(e.currentTarget).entries())});}}>
              <div className="form-grid"><label>عنوان<input name="title" required/></label><label>اسلاگ<input name="slug" dir="ltr" required/></label><label>کیکر<input name="kicker"/></label><label>عنوان SEO<input name="seoTitle"/></label><label className="span-2">خلاصه<textarea name="excerpt"/></label><label className="span-2">توضیح SEO<textarea name="seoDescription"/></label><label className="span-2">متن<textarea name="content" rows={6} required/></label></div>
              <div className="erp-form-actions"><button className="btn btn-primary btn-sm">ساخت صفحه</button></div>
            </form>
          </Panel>
          <Panel title="مطلب جدید مجله">
            <form className="erp-form" onSubmit={async(e)=>{e.preventDefault();const fd=new FormData(e.currentTarget);await quick("/api/admin/content","POST",{kind:"post",...Object.fromEntries(fd.entries()),published:fd.get("published")==="on",healthDisclaimer:fd.get("healthDisclaimer")==="on"});}}>
              <div className="form-grid"><label>عنوان<input name="title" required/></label><label>اسلاگ<input name="slug" dir="ltr" required/></label><label>کلیدواژه<input name="keywords"/></label><label>تصویر<input name="image" dir="ltr"/></label><label className="span-2">خلاصه<textarea name="excerpt" required/></label><label className="span-2">متن<textarea name="content" rows={6} required/></label></div>
              <div className="erp-checks"><label><input type="checkbox" name="published" defaultChecked/> منتشر</label><label><input type="checkbox" name="healthDisclaimer"/> هشدار سلامت</label></div>
              <div className="erp-form-actions"><button className="btn btn-primary btn-sm">ساخت مطلب</button></div>
            </form>
          </Panel>
          <Panel title="FAQ جدید">
            <form className="erp-form" onSubmit={async(e)=>{e.preventDefault();await quick("/api/admin/content","POST",{kind:"faq",...Object.fromEntries(new FormData(e.currentTarget).entries())});}}>
              <div className="form-grid"><label className="span-2">سوال<input name="question" required/></label><label className="span-2">پاسخ<textarea name="answer" rows={4} required/></label><label>ترتیب<input name="sort" type="number" defaultValue="100"/></label></div>
              <div className="erp-form-actions"><button className="btn btn-primary btn-sm">ساخت FAQ</button></div>
            </form>
          </Panel>
        </div>
        <h2 className="erp-section-title">صفحات اصلی</h2>
        {(data.pages||[]).map((page:any)=><details className="erp-record" key={page.id}><summary><strong>{page.title}</strong><span>/{page.slug}</span></summary><form className="erp-record-form" onSubmit={async(e)=>{e.preventDefault();await quick("/api/admin/content","PATCH",{kind:"page",id:page.id,...Object.fromEntries(new FormData(e.currentTarget).entries())});}}><div className="form-grid"><label>عنوان<input name="title" defaultValue={page.title}/></label><label>کیکر<input name="kicker" defaultValue={page.kicker||""}/></label><label className="span-2">خلاصه<textarea name="excerpt" defaultValue={page.excerpt||""}/></label><label>عنوان SEO<input name="seoTitle" defaultValue={page.seoTitle||""}/></label><label>توضیح SEO<input name="seoDescription" defaultValue={page.seoDescription||""}/></label><label className="span-2">متن<textarea name="content" rows={9} defaultValue={page.content}/></label></div><div className="erp-form-actions"><button className="btn btn-primary btn-sm">ذخیره صفحه</button><button type="button" className="btn btn-secondary btn-sm" onClick={()=>confirm("این صفحه حذف شود؟")&&quick("/api/admin/content","DELETE",{kind:"page",id:page.id})}>حذف</button></div></form></details>)}
        <h2 className="erp-section-title">مجله</h2>
        {(data.posts||[]).map((post:any)=><details className="erp-record" key={post.id}><summary><strong>{post.title}</strong><span>{post.published?"منتشر":"پیش‌نویس"}</span></summary><form className="erp-record-form" onSubmit={async(e)=>{e.preventDefault();const fd=new FormData(e.currentTarget);await quick("/api/admin/content","PATCH",{kind:"post",id:post.id,...Object.fromEntries(fd.entries()),published:fd.get("published")==="on",healthDisclaimer:fd.get("healthDisclaimer")==="on"});}}><div className="form-grid"><label>عنوان<input name="title" defaultValue={post.title}/></label><label>کلیدواژه<input name="keywords" defaultValue={post.keywords||""}/></label><label>تصویر<input name="image" dir="ltr" defaultValue={post.image||""}/></label><label className="span-2">خلاصه<textarea name="excerpt" defaultValue={post.excerpt}/></label><label className="span-2">متن<textarea name="content" rows={10} defaultValue={post.content}/></label></div><div className="erp-checks"><label><input type="checkbox" name="published" defaultChecked={post.published}/> منتشر</label><label><input type="checkbox" name="healthDisclaimer" defaultChecked={post.healthDisclaimer}/> هشدار سلامت</label></div><div className="erp-form-actions"><button className="btn btn-primary btn-sm">ذخیره مطلب</button><button type="button" className="btn btn-secondary btn-sm" onClick={()=>confirm("این مطلب حذف شود؟")&&quick("/api/admin/content","DELETE",{kind:"post",id:post.id})}>حذف</button></div></form></details>)}
        <h2 className="erp-section-title">FAQ</h2>
        {(data.faqs||[]).map((faq:any)=><form className="erp-inline-card" key={faq.id} onSubmit={async(e)=>{e.preventDefault();await quick("/api/admin/content","PATCH",{kind:"faq",id:faq.id,...Object.fromEntries(new FormData(e.currentTarget).entries())});}}><label>سوال<input name="question" defaultValue={faq.question}/></label><label>پاسخ<textarea name="answer" rows={3} defaultValue={faq.answer}/></label><label>ترتیب<input name="sort" type="number" defaultValue={faq.sort}/></label><div className="erp-form-actions"><button className="btn btn-secondary btn-sm">ذخیره</button><button type="button" className="btn btn-secondary btn-sm" onClick={()=>confirm("این FAQ حذف شود؟")&&quick("/api/admin/content","DELETE",{kind:"faq",id:faq.id})}>حذف</button></div></form>)}
      </div>}

      {tab === "settings" && <div className="erp-page">
        <ModuleHeader kicker="تنظیمات سیستم" title="فروشگاه، پرداخت و انتقال" text="تنظیمات عمومی، وضعیت زیبال و ابزار انتقال از فروشگاه قبلی." />
        <div className="erp-grid-2">
          <Panel title="تنظیمات فروشگاه">
            <form className="erp-form" onSubmit={async(e)=>{e.preventDefault();await quick("/api/admin/settings","PATCH",Object.fromEntries(new FormData(e.currentTarget).entries()));}}>
              <div className="form-grid"><label>نام فروشگاه<input name="storeName" defaultValue={settings.storeName}/></label><label>شماره تماس<input name="storePhone" defaultValue={settings.storePhone}/></label><label className="span-2">اینستاگرام<input name="instagramUrl" defaultValue={settings.instagramUrl} dir="ltr"/></label><label className="span-2">لینک بله<input name="baleUrl" defaultValue={settings.baleUrl} dir="ltr"/></label><label className="span-2">لینک واتس‌اپ<input name="whatsappUrl" defaultValue={settings.whatsappUrl} dir="ltr"/></label><label className="span-2">آدرس فروشگاه<input name="storeAddress" defaultValue={settings.storeAddress}/></label><label className="span-2">آدرس انبار<input name="warehouseAddress" defaultValue={settings.warehouseAddress}/></label><label>هزینه ثابت ارسال<input name="shippingFlatRate" type="number" min="0" defaultValue={settings.shippingFlatRate}/></label><label>ارسال رایگان از<input name="freeShippingThreshold" type="number" min="0" defaultValue={settings.freeShippingThreshold}/></label></div>
              <div className="erp-form-actions"><button className="btn btn-primary btn-sm">ذخیره تنظیمات</button></div>
            </form>
          </Panel>
          <Panel title="پرداخت زیبال">
            <div className="erp-payment-card"><span className={settings.paymentReady?"ok":"bad"}></span><div><strong>{settings.paymentReady?"زیبال فعال است":"زیبال فعال نیست"}</strong><p>Merchant از متغیر امن <code>ZIBAL_MERCHANT</code> روی سرور خوانده می‌شود و داخل پنل یا دیتابیس نمایش داده نمی‌شود.</p></div></div>
          </Panel>
        </div>
        <LegacyImportButton />
      </div>}
    </main>
  </div>;
}
