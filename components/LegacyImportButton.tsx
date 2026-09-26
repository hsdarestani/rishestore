"use client";

import { useState } from "react";

export default function LegacyImportButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    if (!window.confirm("محصولات و عکس‌های قابل دسترس از rishe.store به فروشگاه جدید منتقل شوند؟ اطلاعات پنل جدید بدون دلیل پاک نمی‌شود.")) return;
    setBusy(true);
    setMessage("در حال انتقال کاتالوگ و تصاویر…");
    try {
      const response = await fetch("/api/admin/import-legacy", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "انتقال انجام نشد.");
      const r = data.result;
      setMessage("انجام شد: " + r.fetched + " محصول خوانده شد، " + r.created + " ساخته شد، " + r.updated + " بروزرسانی شد و " + r.images + " تصویر محلی شد.");
      window.setTimeout(() => location.reload(), 1400);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "انتقال انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel legacy-import">
      <div>
        <h3>انتقال یک‌باره از فروشگاه فعلی</h3>
        <p>نام، توضیحات، قیمت قابل تشخیص، دسته‌بندی و تصاویر محصولات را از API عمومی WooCommerce فروشگاه قبلی می‌خواند و تصاویر را روی همین سرور ذخیره می‌کند. اگر موجودی عددی قابل دریافت نباشد، موجودی را جعل نمی‌کند و همان محصول تا تأیید در پنل قابل خرید نمی‌شود.</p>
      </div>
      <button type="button" className="btn btn-secondary" onClick={run} disabled={busy}>{busy ? "در حال انتقال…" : "انتقال محصولات فعلی"}</button>
      {message && <small>{message}</small>}
    </div>
  );
}
