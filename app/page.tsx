import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";
import { ArrowLeftIcon, ShieldIcon, SparklesIcon, TruckIcon } from "@/components/Icons";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return String(value || "").trim();
}

export default async function HomePage() {
  const [categories, products, packs, posts, reviews] = await Promise.all([
    db.category.findMany({ orderBy: { sort: "asc" }, take: 5 }),
    db.product.findMany({
      where: { active: true, kind: "PRODUCT" },
      include: { category: true },
      orderBy: [{ legacyProductId: "asc" }, { updatedAt: "desc" }],
    }),
    db.product.findMany({ where: { active: true, kind: "PACK" }, include: { category: true }, orderBy: [{ featured: "desc" }, { updatedAt: "desc" }], take: 6 }),
    db.post.findMany({ where: { published: true }, orderBy: { updatedAt: "desc" }, take: 6 }),
    db.review.findMany({ where: { approved: true }, orderBy: { createdAt: "asc" }, take: 9 }),
  ]);

  const showcase = products.filter((p) => [113,124,139,210,249,251,258,255,256,228,147].includes(p.legacyProductId || 0));
  const leadProducts = showcase.length ? showcase : products.slice(0, 11);

  return (
    <>
      <section className="hero home-legacy-hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">کیفیت، به شرط پخت</span>
            <h1>روایتِ اصالت،<br/><em>مستقیم از مزرعه پدری</em></h1>
            <p>ما در «ریشه»، کیفیت را فدای ظاهر نمی‌کنیم. هر محصول پیش از رسیدن به دست شما، در آشپزخانه ما پخته و سنجیده می‌شود تا طعم واقعی و بی‌آلایش محصولات را به سفره بیاورید.</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/shop"><SparklesIcon size={19} />خرید پک‌ها و محصولات پیشنهادی</Link>
              <Link className="btn btn-ghost" href="/about"><ArrowLeftIcon size={18} />روایت دست‌چین‌ها را بخوانید</Link>
            </div>
            <div className="trust-strip">
              <span><ShieldIcon size={17} />تضمین کیفیت</span>
              <span><SparklesIcon size={17} />تست پخت قبل از عرضه</span>
              <span><TruckIcon size={17} />ارسال سریع کرج و تهران</span>
            </div>
          </div>

          <div className="hero-art hero-photo">
            <img className="hero-main-photo" src="/brand/hero.png" alt="محصولات دست‌چین ریشه" />
            <div className="hero-product-stack" aria-hidden>
              <img src="/brand/products/legacy-124.png" alt="" />
              <img src="/brand/products/legacy-251.png" alt="" />
              <img src="/brand/products/legacy-113.jpg" alt="" />
            </div>
            <div className="hero-note">به شرط پخت؛ اگر راضی نبودی، پس می‌گیریم</div>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading row-heading">
          <div>
            <span>دسترسی مستقیم و شفاف</span>
            <h2>ویترین حبوبات و دست‌چین‌های ریشه</h2>
            <p>قیمت روز، وزن بسته‌بندی و شناسنامه هر محصول را بررسی کنید و با کلیک روی هر کدام، داستان زمین و عیار پخت آن را بخوانید.</p>
          </div>
          <Link href="/shop">همه محصولات ←</Link>
        </div>
        <div className="category-grid">
          {categories.map((cat, index) => <Link key={cat.id} href={"/category/" + cat.slug} className={"category-card category-" + (index + 1)}>
            <span className="category-index">۰{index + 1}</span>
            <div><h3>{cat.name}</h3><p>{cat.description}</p></div>
            <b>مشاهده محصولات</b>
          </Link>)}
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-heading row-heading">
            <div>
              <span>قیمت و موجودی واقعی</span>
              <h2>محصولات ریشه</h2>
              <p>قیمت، موجودی و اطلاعات هر محصول از همان کاتالوگ عملیاتی فروشگاه خوانده می‌شود.</p>
            </div>
            <Link href="/shop">رفتن به فروشگاه ←</Link>
          </div>
          <div className="product-grid">{leadProducts.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </div>
      </section>

      <section className="section container home-philosophy">
        <div className="home-poem">
          <span className="eyebrow">فلسفه ریشه</span>
          <blockquote>«هر کسی کو دور ماند از اصل خویش<br/>باز جوید روزگار وصل خویش.»</blockquote>
          <p>در غوغای زندگی شهری، عطر گندمزار و طعم کوهستان فراموش شده است. «ریشه» پلی است به اقلیم‌های پاک ایران. ما به دنبال بازگرداندن پیوند شما با خاک هستیم؛ محصولاتی که از فیلتر سخت‌گیرانه تست‌های کیفی و پختِ ما عبور کرده‌اند تا دوباره به اصل خودمان وصل شویم.</p>
        </div>
        <div className="trust-cards">
          <article><i>۱</i><h3>تست پخت</h3><p>هر محصول قبل از عرضه در شرایط واقعی آشپزخانه سنجیده می‌شود.</p></article>
          <article><i>۲</i><h3>قیمت شفاف</h3><p>قیمت، وزن و موجودی همان‌جا کنار محصول دیده می‌شود.</p></article>
          <article><i>۳</i><h3>انتخاب اصیل</h3><p>تأمین از اقلیم‌های مشخص و انتخاب بر اساس کیفیت واقعی، نه صرفاً ظاهر.</p></article>
        </div>
      </section>

      <section className="section home-stories">
        <div className="container">
          <div className="section-heading">
            <span>دست‌چین‌های امسال</span>
            <h2>روایت محصولات ما</h2>
            <p>هر محصول فقط یک کالا نیست؛ داستان خاک، تامین، تست کیفیت و عیار پخت خودش را دارد.</p>
          </div>
          <div className="home-story-grid">
            {leadProducts.map((product, index) => {
              const legacy = product.legacyContent as any;
              const hero = legacy?.hero || {};
              return <Link key={product.id} href={"/product/" + product.slug} className="home-story-card">
                <span className="home-story-index">۱۱ / {String(index + 1).padStart(2, "0")}</span>
                <div className="home-story-image">{product.image ? <img src={product.image} alt={product.name} /> : <div className="product-fallback">ر</div>}</div>
                <div className="home-story-copy">
                  <h3>{text(hero.display_title) || product.name}</h3>
                  <strong>{product.price > 0 ? product.price.toLocaleString("fa-IR") + " تومان" : "قیمت در حال بروزرسانی"}</strong>
                  {text(hero.myth) && <p className="home-story-myth">{hero.myth}</p>}
                  {text(hero.story) && <p><b>روایت تامین:</b> {hero.story}</p>}
                  <span className="home-story-buy">مشاهده و خرید <ArrowLeftIcon size={17} /></span>
                </div>
              </Link>;
            })}
          </div>
        </div>
      </section>

      {packs.length > 0 && <section className="section section-dark"><div className="container"><div className="section-heading light"><span>پک‌ها</span><h2>چند انتخاب کنار هم، یک خرید ساده‌تر.</h2></div><div className="product-grid">{packs.map((p) => <ProductCard key={p.id} product={p} />)}</div><Link className="btn btn-light" href="/packs">همه پک‌ها</Link></div></section>}

      <section className="section container">
        <div className="section-heading"><span>اعتماد شما عیار ماست</span><h2>تجربه خریداران ریشه</h2><p>روایت کسانی که با تکیه بر «شرط پخت ریشه» اصالت را به سفره‌هایشان برگرداندند.</p></div>
        {reviews.length ? <div className="review-grid home-reviews">{reviews.map((r) => <blockquote key={r.id}><div>{"★".repeat(Math.max(1, Math.min(5, r.rating)))}</div><p>«{r.text}»</p><cite>{r.name}</cite></blockquote>)}</div> : null}
      </section>

      <section className="section container">
        <div className="section-heading row-heading"><div><span>مجله ریشه</span><h2>همه روایت‌ها و راهنماهای بلاگ</h2></div><Link href="/magazine">همه مطالب ←</Link></div>
        <div className="article-grid">{posts.map((post) => <Link key={post.id} href={"/magazine/" + post.slug} className="article-card"><span>مجله ریشه</span><h3>{post.title}</h3><p>{post.excerpt}</p><b>خواندن مطلب ←</b></Link>)}</div>
      </section>

      <section className="section container final-cta">
        <div><span className="eyebrow">اول از محصولات پیشنهادی شروع کن</span><h2>محصولاتی که عیار پختشان در ریشه تست شده است.</h2><p>برای خرید اول، محصولاتی را انتخاب کن که هم پرمصرف‌اند، هم کیفیت پختشان در ریشه تست شده است.</p></div>
        <Link className="btn btn-primary" href="/shop">رفتن به ویترین محصولات</Link>
      </section>
    </>
  );
}
