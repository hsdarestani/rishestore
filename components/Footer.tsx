import Link from "next/link";

export default function Footer({ phone, instagram }: { phone?: string; instagram?: string }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="brand"><span className="brand-mark">ر</span><span><strong>ریشه</strong><small>روایت اصالت، مستقیم از محصول</small></span></div>
          <p>فروشگاه ریشه برای خرید محصولاتی که اطلاعاتشان قبل از پرداخت روشن باشد: وزن، قیمت، موجودی، کاربرد و جزئیات کیفیت.</p>
        </div>
        <div><h3>فروشگاه</h3><Link href="/shop">همه محصولات</Link><Link href="/category/legumes">حبوبات</Link><Link href="/category/rice">برنج</Link><Link href="/category/tea">چای</Link><Link href="/category/honey">عسل</Link></div>
        <div><h3>راهنمای خرید</h3><Link href="/faq">سوالات متداول</Link><Link href="/shipping">ارسال</Link><Link href="/returns">بررسی و بازگشت</Link><Link href="/order-tracking">پیگیری سفارش</Link></div>
        <div><h3>ریشه</h3><Link href="/about">درباره ریشه</Link><Link href="/why-rishe">چرا ریشه؟</Link><Link href="/magazine">مجله</Link><Link href="/contact">تماس</Link>{phone && <a href={"tel:" + phone}>{phone}</a>}{instagram && <a href={instagram} target="_blank" rel="noreferrer">اینستاگرام</a>}</div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear().toLocaleString("fa-IR")} ریشه</span><span>طراحی و زیرساخت اختصاصی فروشگاه</span></div>
    </footer>
  );
}
