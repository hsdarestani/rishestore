"use client";

import { useState } from "react";

export default function LegacyImportButton() {
  const [busy, setBusy] = useState(false);
  const [dbBusy, setDbBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dbMessage, setDbMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function runCatalog() {
    if (!window.confirm("محصولات و عکس‌های قابل دسترس از rishe.store به فروشگاه جدید منتقل شوند؟ اطلاعات پنل جدید بدون دلیل پاک نمی‌شود.")) return;
    setBusy(true);
    setMessage("در حال انتقال کاتالوگ و تصاویر…");
    try {
      const response = await fetch("/api/admin/import-legacy", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "انتقال انجام نشد.");
      const result = data.result;
      setMessage("انجام شد: " + result.fetched + " محصول خوانده شد، " + result.created + " ساخته شد، " + result.updated + " بروزرسانی شد و " + result.images + " تصویر محلی شد.");
      window.setTimeout(() => location.reload(), 1400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "انتقال انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function runDatabase() {
    if (!file) {
      setDbMessage("فایل SQL دیتابیس قدیمی را انتخاب کنید.");
      return;
    }
    if (!window.confirm("کاربران، مشتریان، سفارش‌ها، اقلام سفارش، آدرس‌ها و فروش‌های ایونت از این فایل با دیتابیس جدید ادغام شوند؟ داده‌های موجود حذف نمی‌شوند.")) return;

    setDbBusy(true);
    setDbMessage("در حال خواندن و ادغام دیتابیس قدیمی… این مرحله ممکن است کمی طول بکشد.");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/admin/import-legacy", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "انتقال دیتابیس انجام نشد.");
      const result = data.result || {};
      setDbMessage(
        "انجام شد: " +
        Number(result.usersCreated || 0).toLocaleString("fa-IR") + " حساب جدید، " +
        Number(result.customersCreated || 0).toLocaleString("fa-IR") + " مشتری جدید، " +
        Number(result.ordersCreated || 0).toLocaleString("fa-IR") + " سفارش و " +
        Number(result.orderItemsCreated || 0).toLocaleString("fa-IR") + " قلم سفارش منتقل شد. " +
        Number(result.eventSalesSkippedTest || 0).toLocaleString("fa-IR") + " فروش آزمایشی قدیمی نادیده گرفته شد."
      );
      window.setTimeout(() => location.reload(), 1800);
    } catch (error) {
      setDbMessage(error instanceof Error ? error.message : "انتقال دیتابیس انجام نشد.");
    } finally {
      setDbBusy(false);
    }
  }

  return (
    <div className="legacy-import-stack">
      <div className="panel legacy-import">
        <div>
          <h3>انتقال کاتالوگ از فروشگاه قبلی</h3>
          <p>نام، توضیحات، قیمت، دسته‌بندی و تصاویر محصولات را از فروشگاه قبلی می‌خواند. این انتقال اطلاعات موجود را بی‌دلیل پاک نمی‌کند.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={runCatalog} disabled={busy}>{busy ? "در حال انتقال…" : "انتقال محصولات فعلی"}</button>
        {message && <small>{message}</small>}
      </div>

      <div className="panel legacy-import">
        <div>
          <h3>ادغام دیتابیس قدیمی ریشه</h3>
          <p>فایل SQL بکاپ WordPress و WooCommerce را مستقیم روی سرور پردازش می‌کند و فقط داده‌های لازم کسب‌وکار شامل کاربران، مشتریان، سفارش‌ها، آدرس‌ها و فروش‌های ایونت را وارد PostgreSQL جدید می‌کند. رمزهای قدیمی و تنظیمات محرمانه افزونه‌ها وارد نمی‌شوند.</p>
          <p>رکوردهای تکراری با شماره موبایل و شناسه سفارش ادغام می‌شوند و دو فروش قدیمی با نام «تست» که به سفارش واقعی وصل نبودند وارد گزارش فروش نمی‌شوند.</p>
        </div>
        <input type="file" accept=".sql,text/plain,application/sql" onChange={(event)=>setFile(event.target.files?.[0] || null)} />
        <button type="button" className="btn btn-primary" onClick={runDatabase} disabled={dbBusy || !file}>{dbBusy ? "در حال ادغام دیتابیس…" : "ادغام کاربران و سفارش‌ها"}</button>
        {file && <small>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</small>}
        {dbMessage && <small>{dbMessage}</small>}
      </div>
    </div>
  );
}
