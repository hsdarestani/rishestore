"use client";

import { FormEvent, useState } from "react";
import { toman } from "@/lib/money";

type Category = { id: string; name: string; slug: string };
type Product = {
  id: string; slug: string; name: string; kind: string; shortDescription: string; description: string;
  price: number; compareAt: number | null; weightGrams: number | null; stock: number; origin: string | null;
  usage: string | null; quality: string | null; guarantee: string | null; image: string | null;
  featured: boolean; active: boolean; categoryId: string | null;
};
type Order = { id: string; code: string; customerName: string; phone: string; status: string; paymentStatus: string; total: number; createdAt: string };
type Page = { id: string; slug: string; title: string; kicker: string | null; excerpt: string | null; content: string };
type Post = { id: string; slug: string; title: string; excerpt: string; content: string; keywords: string | null; published: boolean; healthDisclaimer: boolean };
type FAQ = { id: string; question: string; answer: string; sort: number };

async function api(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "عملیات انجام نشد.");
  return data;
}

function values(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries());
}

function checked(form: HTMLFormElement, name: string) {
  const input = form.elements.namedItem(name);
  return input instanceof HTMLInputElement ? input.checked : false;
}

function ProductEditor({ product, categories }: { product: Product; categories: Category[] }) {
  const [status, setStatus] = useState("");
  const [image, setImage] = useState(product.image || "");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("در حال ذخیره…");
    const form = event.currentTarget;
    const data = values(form);
    try {
      await api("/api/admin/products/" + product.id, "PATCH", {
        ...data,
        image,
        active: checked(form, "active"),
        featured: checked(form, "featured"),
      });
      setStatus("ذخیره شد");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "خطا");
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    setStatus("در حال بارگذاری تصویر…");
    const fd = new FormData();
    fd.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "آپلود نشد");
      return;
    }
    setImage(data.url);
    setStatus("تصویر آماده است؛ ذخیره را بزن");
  }

  return (
    <details className="admin-item">
      <summary>
        <span>{product.name}</span>
        <span>{product.price > 0 ? toman(product.price) : "بدون قیمت"} · موجودی {product.stock.toLocaleString("fa-IR")} · {product.active ? "فعال" : "غیرفعال"}</span>
      </summary>
      <form onSubmit={save} className="admin-form">
        <div className="form-grid">
          <label>نام<input name="name" defaultValue={product.name} required /></label>
          <label>اسلاگ<input name="slug" defaultValue={product.slug} required dir="ltr" /></label>
          <label>نوع<select name="kind" defaultValue={product.kind}><option value="PRODUCT">محصول</option><option value="PACK">پک</option></select></label>
          <label>دسته<select name="categoryId" defaultValue={product.categoryId || ""}><option value="">بدون دسته</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>قیمت تومان<input name="price" type="number" min="0" defaultValue={product.price} /></label>
          <label>قیمت قبل از تخفیف<input name="compareAt" type="number" min="0" defaultValue={product.compareAt || ""} /></label>
          <label>موجودی<input name="stock" type="number" min="0" defaultValue={product.stock} /></label>
          <label>وزن گرم<input name="weightGrams" type="number" min="0" defaultValue={product.weightGrams || ""} /></label>
          <label>مبدأ<input name="origin" defaultValue={product.origin || ""} /></label>
          <label>کاربرد<input name="usage" defaultValue={product.usage || ""} /></label>
          <label className="span-2">توضیح کوتاه<textarea name="shortDescription" rows={2} defaultValue={product.shortDescription} /></label>
          <label className="span-2">توضیح کامل<textarea name="description" rows={5} defaultValue={product.description} /></label>
          <label className="span-2">اطلاعات کیفیت<textarea name="quality" rows={3} defaultValue={product.quality || ""} /></label>
          <label className="span-2">تعهد کیفیت / به شرط پخت<textarea name="guarantee" rows={3} defaultValue={product.guarantee || ""} /></label>
          <label className="span-2">آدرس تصویر<input value={image} onChange={(e) => setImage(e.target.value)} dir="ltr" /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0])} /></label>
        </div>
        <div className="check-row">
          <label><input type="checkbox" name="active" defaultChecked={product.active} /> فعال</label>
          <label><input type="checkbox" name="featured" defaultChecked={product.featured} /> ویژه</label>
        </div>
        <div className="admin-actions"><button className="btn btn-primary">ذخیره محصول</button><span>{status}</span></div>
      </form>
    </details>
  );
}

export default function AdminPanel(props: {
  products: Product[]; categories: Category[]; orders: Order[]; pages: Page[]; posts: Post[]; faqs: FAQ[];
  settings: { storeName: string; storePhone: string; instagramUrl: string; shippingFlatRate: number; freeShippingThreshold: number; paymentReady: boolean };
}) {
  const [tab, setTab] = useState("overview");
  const [notice, setNotice] = useState("");

  async function genericSubmit(event: FormEvent<HTMLFormElement>, url: string, method = "PATCH", extra: Record<string, unknown> = {}) {
    event.preventDefault();
    setNotice("در حال ذخیره…");
    try {
      await api(url, method, { ...values(event.currentTarget), ...extra });
      setNotice("ذخیره شد");
      setTimeout(() => location.reload(), 500);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "خطا");
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <h2>مدیریت ریشه</h2>
        {[["overview","خلاصه"],["products","محصولات"],["orders","سفارش‌ها"],["content","محتوا"],["settings","تنظیمات"]].map(([key,label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}
        <a href="/" target="_blank">مشاهده سایت ↗</a>
      </aside>

      <section className="admin-main">
        {notice && <div className="admin-notice">{notice}</div>}

        {tab === "overview" && <>
          <div className="section-heading"><span>داشبورد</span><h1>فروشگاه دست خودتان است.</h1></div>
          <div className="stats-grid">
            <div><b>{props.products.length.toLocaleString("fa-IR")}</b><span>محصول و پک</span></div>
            <div><b>{props.orders.length.toLocaleString("fa-IR")}</b><span>سفارش اخیر</span></div>
            <div><b>{props.posts.length.toLocaleString("fa-IR")}</b><span>مطلب مجله</span></div>
            <div><b>{props.settings.paymentReady ? "فعال" : "نیاز به تنظیم"}</b><span>درگاه پرداخت</span></div>
          </div>
          <div className="panel"><h3>برای آماده فروش شدن</h3><p>قیمت، موجودی، وزن و عکس محصولات انتقالی را تکمیل کن. محصولی که قیمت یا موجودی ندارد روی سایت دیده می‌شود اما قابل افزودن به سبد نیست؛ بنابراین قیمت اشتباه به مشتری نشان داده نمی‌شود.</p></div>
        </>}

        {tab === "products" && <>
          <div className="section-heading"><span>کاتالوگ</span><h1>محصولات و پک‌ها</h1></div>
          <details className="admin-item create-item">
            <summary>+ محصول جدید</summary>
            <form className="admin-form" onSubmit={(e) => genericSubmit(e, "/api/admin/products", "POST", { active: true, featured: false })}>
              <div className="form-grid">
                <label>نام<input name="name" required /></label>
                <label>اسلاگ انگلیسی<input name="slug" required dir="ltr" /></label>
                <label>نوع<select name="kind"><option value="PRODUCT">محصول</option><option value="PACK">پک</option></select></label>
                <label>دسته<select name="categoryId"><option value="">بدون دسته</option>{props.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label>قیمت تومان<input name="price" type="number" min="0" defaultValue="0" /></label>
                <label>موجودی<input name="stock" type="number" min="0" defaultValue="0" /></label>
                <label className="span-2">توضیح کوتاه<textarea name="shortDescription" required /></label>
                <label className="span-2">توضیح کامل<textarea name="description" required /></label>
              </div>
              <button className="btn btn-primary">ساخت محصول</button>
            </form>
          </details>
          {props.products.map((p) => <ProductEditor key={p.id} product={p} categories={props.categories} />)}
        </>}

        {tab === "orders" && <>
          <div className="section-heading"><span>فروش</span><h1>سفارش‌ها</h1></div>
          <div className="admin-orders">
            {props.orders.map((order) => <form key={order.id} onSubmit={(e) => genericSubmit(e, "/api/admin/orders/" + order.id)} className="admin-order">
              <div><strong>{order.code}</strong><span>{order.customerName} · {order.phone}</span><small>{new Date(order.createdAt).toLocaleString("fa-IR")}</small></div>
              <b>{toman(order.total)}</b>
              <label>وضعیت<select name="status" defaultValue={order.status}><option value="PENDING">در انتظار</option><option value="PROCESSING">در حال پردازش</option><option value="SHIPPED">ارسال‌شده</option><option value="COMPLETED">تکمیل‌شده</option><option value="CANCELED">لغوشده</option></select></label>
              <span className={"payment-badge " + order.paymentStatus.toLowerCase()}>{order.paymentStatus}</span>
              <button className="btn btn-sm btn-secondary">ذخیره</button>
            </form>)}
          </div>
        </>}

        {tab === "content" && <>
          <div className="section-heading"><span>محتوا</span><h1>صفحات، مجله و FAQ</h1></div>
          <h2 className="admin-subtitle">صفحات اصلی</h2>
          {props.pages.map((page) => <details className="admin-item" key={page.id}>
            <summary>{page.title}</summary>
            <form className="admin-form" onSubmit={(e) => genericSubmit(e, "/api/admin/content", "PATCH", { kind: "page", id: page.id })}>
              <div className="form-grid">
                <label>عنوان<input name="title" defaultValue={page.title} /></label>
                <label>کیکر<input name="kicker" defaultValue={page.kicker || ""} /></label>
                <label className="span-2">خلاصه<textarea name="excerpt" defaultValue={page.excerpt || ""} /></label>
                <label className="span-2">متن<textarea name="content" rows={9} defaultValue={page.content} /></label>
              </div>
              <button className="btn btn-primary">ذخیره صفحه</button>
            </form>
          </details>)}

          <h2 className="admin-subtitle">مطالب مجله</h2>
          {props.posts.map((post) => <details className="admin-item" key={post.id}>
            <summary>{post.title}</summary>
            <form className="admin-form" onSubmit={(e) => {
              const form = e.currentTarget;
              return genericSubmit(e, "/api/admin/content", "PATCH", {
                kind: "post",
                id: post.id,
                published: checked(form, "published"),
                healthDisclaimer: checked(form, "healthDisclaimer"),
              });
            }}>
              <div className="form-grid">
                <label>عنوان<input name="title" defaultValue={post.title} /></label>
                <label>کلیدواژه‌ها<input name="keywords" defaultValue={post.keywords || ""} /></label>
                <label className="span-2">خلاصه<textarea name="excerpt" defaultValue={post.excerpt} /></label>
                <label className="span-2">متن<textarea name="content" rows={10} defaultValue={post.content} /></label>
              </div>
              <div className="check-row">
                <label><input type="checkbox" name="published" defaultChecked={post.published} /> منتشر</label>
                <label><input type="checkbox" name="healthDisclaimer" defaultChecked={post.healthDisclaimer} /> هشدار سلامت</label>
              </div>
              <button className="btn btn-primary">ذخیره مطلب</button>
            </form>
          </details>)}

          <h2 className="admin-subtitle">سوالات متداول</h2>
          {props.faqs.map((faq) => <form className="admin-form admin-item" key={faq.id} onSubmit={(e) => genericSubmit(e, "/api/admin/content", "PATCH", { kind: "faq", id: faq.id })}>
            <label>سوال<input name="question" defaultValue={faq.question} /></label>
            <label>پاسخ<textarea name="answer" rows={3} defaultValue={faq.answer} /></label>
            <label>ترتیب<input name="sort" type="number" defaultValue={faq.sort} /></label>
            <button className="btn btn-secondary btn-sm">ذخیره FAQ</button>
          </form>)}
        </>}

        {tab === "settings" && <>
          <div className="section-heading"><span>تنظیمات</span><h1>فروش، ارسال و پرداخت</h1></div>
          <form className="admin-form panel" onSubmit={(e) => genericSubmit(e, "/api/admin/settings")}>
            <div className="form-grid">
              <label>نام فروشگاه<input name="storeName" defaultValue={props.settings.storeName} /></label>
              <label>شماره تماس<input name="storePhone" defaultValue={props.settings.storePhone} /></label>
              <label className="span-2">اینستاگرام<input name="instagramUrl" defaultValue={props.settings.instagramUrl} dir="ltr" /></label>
              <label>هزینه ثابت ارسال، تومان<input name="shippingFlatRate" type="number" min="0" defaultValue={props.settings.shippingFlatRate} /></label>
              <label>ارسال رایگان از مبلغ، تومان<input name="freeShippingThreshold" type="number" min="0" defaultValue={props.settings.freeShippingThreshold} /></label>
              <label className="span-2">کلید API نکست‌پی<input name="nextpayApiKey" placeholder={props.settings.paymentReady ? "کلید ثبت شده؛ برای تغییر، مقدار جدید وارد کنید" : "کلید API را وارد کنید"} /></label>
            </div>
            <button className="btn btn-primary">ذخیره تنظیمات</button>
          </form>
        </>}
      </section>
    </div>
  );
}
