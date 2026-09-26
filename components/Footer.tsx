import Link from "next/link";

export default function Footer({ phone, instagram, bale }: { phone?: string; instagram?: string; bale?: string }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link href="/" className="footer-logo-link" aria-label="فروشگاه ریشه">
            <img className="footer-logo" src="/brand/logo.png" alt="فروشگاه ریشه" />
          </Link>
          <p className="footer-slogan">کیفیت، به شرط پخت</p>
          <p>روایت اصالت، مستقیم از مزرعه پدری؛ محصولات دست‌چین با تست کیفیت و پخت پیش از عرضه.</p>
        </div>

        <div>
          <h3>فروشگاه</h3>
          <Link href="/shop">همه محصولات</Link>
          <Link href="/category/legumes">حبوبات</Link>
          <Link href="/category/rice">برنج</Link>
          <Link href="/category/tea">چای</Link>
          <Link href="/category/honey">عسل</Link>
        </div>

        <div>
          <h3>راهنمای خرید</h3>
          <Link href="/faq">سوالات متداول</Link>
          <Link href="/shipping">ارسال</Link>
          <Link href="/returns">بررسی و بازگشت</Link>
          <Link href="/order-tracking">پیگیری سفارش</Link>
          <Link href="/about">درباره ما</Link>
        </div>

        <div>
          <h3>راه‌های ارتباطی</h3>
          {phone && <a href={"tel:" + phone}>{phone}</a>}
          {bale && <a href={bale} target="_blank" rel="noreferrer">پیام‌رسان بله</a>}
          {instagram && <a href={instagram} target="_blank" rel="noreferrer">اینستاگرام</a>}
          <p className="footer-address">آدرس انبار:<br/>کرج، محمدشهر، بلوار دشت بهشت</p>
          <a className="enamad" target="_blank" rel="noopener noreferrer" href="https://trustseal.enamad.ir/?id=718940&Code=HnYtqBsGorK2EiyzF4qalMLSKNHgTRfn">
            <img src="https://trustseal.enamad.ir/logo.aspx?id=718940&Code=HnYtqBsGorK2EiyzF4qalMLSKNHgTRfn" alt="نماد اعتماد الکترونیکی فروشگاه ریشه" />
            <span>نماد اعتماد الکترونیکی</span>
          </a>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>تمامی حقوق این وب‌سایت متعلق به فروشگاه <strong>ریشه</strong> است.</span>
        <span>کیفیت، به شرط پخت</span>
      </div>
    </footer>
  );
}
