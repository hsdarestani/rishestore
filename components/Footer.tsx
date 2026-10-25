import Link from "next/link";
import { basalamHref } from "@/lib/basalam-links";

export default function Footer({phone,instagram,bale,whatsapp,warehouseAddress,storeAddress}: {
  phone?:string;instagram?:string;bale?:string;whatsapp?:string;warehouseAddress?:string;storeAddress?:string;
}) {
  return <footer className="site-footer">
    <div className="container footer-grid">
      <div className="footer-brand"><Link href="/" className="footer-logo-link" aria-label="ریشه"><img className="footer-logo" src="/brand/logo.png" alt="ریشه" loading="lazy" decoding="async"/></Link><p className="footer-slogan">مستقیم از مزرعه پدری</p></div>
      <div><h3>محصولات</h3><Link href="/shop">همه محصولات</Link><Link href="/packs">پک‌های پیشنهادی</Link><Link href="/category/legumes">حبوبات</Link><Link href="/category/tea">چای</Link><Link href="/category/honey">عسل</Link></div>
      <div><h3>خرید از باسلام</h3><Link href={basalamHref()}>غرفه ریشه در باسلام</Link><Link href="/faq">سوالات متداول</Link><Link href="/shipping">راهنمای ارسال</Link><Link href="/returns">رسیدگی به سفارش</Link><Link href="/order-tracking">پیگیری سفارش‌های قبلی سایت</Link><Link href="/contact">تماس با ریشه</Link></div>
      <div className="footer-contact"><h3>پشتیبانی و ارتباط</h3><div className="footer-contact-actions">
        {phone&&<a href={"tel:"+phone}><strong>تماس</strong><span>{phone}</span></a>}
        {whatsapp&&<a href={whatsapp} target="_blank" rel="noreferrer"><strong>واتس‌اپ</strong><span>پیام مستقیم</span></a>}
        {bale&&<a href={bale} target="_blank" rel="noreferrer"><strong>بله</strong><span>پیام‌رسان ریشه</span></a>}
        {instagram&&<a href={instagram} target="_blank" rel="noreferrer"><strong>اینستاگرام</strong><span>صفحه ریشه</span></a>}
      </div>
      {storeAddress&&<p className="footer-address"><b>آدرس فروشگاه</b>{storeAddress}</p>}
      {warehouseAddress&&<p className="footer-address"><b>آدرس انبار</b>{warehouseAddress}</p>}
      <a className="enamad" target="_blank" rel="noopener noreferrer" href="https://trustseal.enamad.ir/?id=718940&Code=HnYtqBsGorK2EiyzF4qalMLSKNHgTRfn"><img src="https://trustseal.enamad.ir/logo.aspx?id=718940&Code=HnYtqBsGorK2EiyzF4qalMLSKNHgTRfn" alt="نماد اعتماد الکترونیکی فروشگاه ریشه" loading="lazy"/><span>نماد اعتماد الکترونیکی</span></a>
      </div>
    </div>
    <div className="container footer-bottom"><span>© ۲۰۲۶ تمامی حقوق این وب‌سایت متعلق به فروشگاه <strong>ریشه</strong> است.</span><span>مستقیم از مزرعه پدری</span></div>
  </footer>;
}
