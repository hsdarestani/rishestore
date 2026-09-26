import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, featured, packs, posts, reviews] = await Promise.all([
    db.category.findMany({ orderBy: { sort: "asc" }, take: 5 }),
    db.product.findMany({ where: { active: true, kind: "PRODUCT" }, include: { category: true }, orderBy: [{ featured: "desc" }, { updatedAt: "desc" }], take: 6 }),
    db.product.findMany({ where: { active: true, kind: "PACK" }, include: { category: true }, take: 3 }),
    db.post.findMany({ where: { published: true }, orderBy: { updatedAt: "desc" }, take: 3 }),
    db.review.findMany({ where: { approved: true }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">روایت محصول، قبل از خرید</span>
            <h1>روایت اصالت،<br/><em>مستقیم از مزرعه پدری</em></h1>
            <p>ما در «ریشه» کیفیت را فدای ظاهر نمی‌کنیم. هر محصول، پیش از رسیدن به دست شما، در آشپزخانه ما پخته و سنجیده می‌شود تا طعم واقعی و بی‌آلایش محصول به سفره برسد.</p>
            <div className="hero-actions"><Link className="btn btn-primary" href="/shop">خرید محصولات</Link><Link className="btn btn-ghost" href="/why-rishe">چرا ریشه؟</Link></div>
            <div className="trust-strip"><span>اطلاعات شفاف محصول</span><span>تست پخت و بررسی کیفیت</span><span>مسیر خرید کوتاه</span></div>
          </div>
          <div className="hero-art" aria-label="محصولات ریشه">
            <div className="hero-bowl hero-rice"><b>برنج</b></div>
            <div className="hero-bowl hero-legume"><b>حبوبات</b></div>
            <div className="hero-jar"><b>عسل</b></div>
            <div className="hero-cup"><b>چای</b></div>
            <div className="hero-note">به شرط پخت؛ جزئیات هر محصول را قبل از خرید ببینید.</div>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading row-heading"><div><span>از اینجا شروع کنید</span><h2>دسته‌بندی محصولات</h2></div><Link href="/shop">مشاهده همه محصولات ←</Link></div>
        <div className="category-grid">
          {categories.map((cat, index) => <Link key={cat.id} href={"/category/" + cat.slug} className={"category-card category-" + (index + 1)}><span className="category-index">۰{index + 1}</span><div><h3>{cat.name}</h3><p>{cat.description}</p></div><b>مشاهده محصولات</b></Link>)}
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-heading row-heading"><div><span>انتخاب‌های فروشگاه</span><h2>محصولات ریشه</h2><p>قیمت و موجودی فقط زمانی برای خرید فعال می‌شود که در پنل مدیریت تأیید شده باشد.</p></div><Link href="/shop">رفتن به فروشگاه ←</Link></div>
          {featured.length ? <div className="product-grid">{featured.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <div className="empty-state">محصولات در حال انتقال به فروشگاه جدید هستند.</div>}
        </div>
      </section>

      <section className="section container">
        <div className="why-grid">
          <div className="section-heading"><span>چرا ریشه؟</span><h2>اعتماد باید در اطلاعات محصول دیده شود.</h2><p>روایت برند حفظ شده، اما تصمیم خرید روی اطلاعات کاربردی بنا می‌شود.</p><Link className="btn btn-secondary" href="/why-rishe">داستان و روش انتخاب ریشه</Link></div>
          <div className="trust-cards">
            <article><i>۱</i><h3>تست کیفیت</h3><p>اطلاعات بررسی و نتیجه پخت هر سری می‌تواند در همان صفحه محصول ثبت شود.</p></article>
            <article><i>۲</i><h3>اطلاعات شفاف</h3><p>وزن، قیمت، موجودی، کاربرد و مبدأ در یک صفحه؛ بدون جست‌وجو بین چند بخش.</p></article>
            <article><i>۳</i><h3>به شرط پخت</h3><p>وعده کیفیت فقط وقتی معنا دارد که شرایطش قبل از خرید روشن باشد.</p></article>
          </div>
        </div>
      </section>

      {packs.length > 0 && <section className="section section-dark"><div className="container"><div className="section-heading light"><span>پک‌ها</span><h2>چند انتخاب کنار هم، یک خرید ساده‌تر.</h2></div><div className="product-grid">{packs.map((p) => <ProductCard key={p.id} product={p} />)}</div><Link className="btn btn-light" href="/packs">همه پک‌ها</Link></div></section>}

      <section className="section container story-band"><div><span className="eyebrow">داستان کوتاه ریشه</span><h2>محصول اول، روایت بعد.</h2></div><p>ریشه می‌خواهد تجربه خرید را از «دیدن یک ویترین» به «شناختن محصول و بعد خرید» تبدیل کند. مجله، راهنماهای کیفیت و توضیحات محصول همه به همین مسیر وصل‌اند.</p><Link href="/about">بیشتر درباره ریشه ←</Link></section>

      {reviews.length > 0 && <section className="section container"><div className="section-heading"><span>تجربه مشتریان</span><h2>نظرهای ثبت‌شده</h2></div><div className="review-grid">{reviews.map((r) => <blockquote key={r.id}><div>{"★".repeat(Math.max(1, Math.min(5, r.rating)))}</div><p>{r.text}</p><cite>{r.name}</cite></blockquote>)}</div></section>}

      <section className="section container">
        <div className="section-heading row-heading"><div><span>مجله ریشه</span><h2>راهنماهایی که به خرید کمک می‌کنند.</h2></div><Link href="/magazine">همه مطالب ←</Link></div>
        <div className="article-grid">{posts.map((post) => <Link key={post.id} href={"/magazine/" + post.slug} className="article-card"><span>راهنمای ریشه</span><h3>{post.title}</h3><p>{post.excerpt}</p><b>مطالعه مطلب ←</b></Link>)}</div>
      </section>

      <section className="section container final-cta"><div><span className="eyebrow">آماده انتخابی؟</span><h2>از دسته‌بندی شروع کن.</h2><p>محصول را پیدا کن، اطلاعاتش را بخوان و بعد تصمیم بگیر.</p></div><Link className="btn btn-primary" href="/shop">ورود به فروشگاه</Link></section>
    </>
  );
}
