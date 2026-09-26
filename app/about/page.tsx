import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "درباره ما",
  description: "داستان ریشه؛ تامین مستقیم از اقلیم‌های ایران، تست پخت پیش از عرضه و حمایت از تولیدکننده محلی.",
};

const values = [
  { title: "تامین مستقیم از اقلیم", text: "بدون واسطه‌های تجاری، مستقیماً از کشاورزان و زنبوردارانِ معتمد محلی در سراسر ایران خرید می‌کنیم." },
  { title: "تضمین در اتاق پخت", text: "زیبایی ظاهری برای ما کافی نیست. کیفیت هر محصول پیش از بسته‌بندی در شرایط واقعیِ پخت سنجیده می‌شود." },
  { title: "حمایت از تولیدکننده", text: "با حذف دلالان، سود واقعی به دست کشاورز می‌رسد تا انگیزه برای تولید محصول اصیل و باکیفیت حفظ شود." },
  { title: "بازگشت بی‌قید و شرط", text: "ما به دست‌چین‌های خود ایمان داریم. اگر محصول در قابلمه‌ی شما کیفیت لازم را نداشت، با احترام پس گرفته می‌شود." },
];

export default function AboutPage() {
  return <div className="about-page">
    <section className="about-hero">
      <div className="container about-hero-inner">
        <span className="eyebrow">داستان ما</span>
        <h1>همه‌مان آخرش به<br/><em>ریشه‌مان برمی‌گردیم</em></h1>
        <blockquote>«هر کسی کو دور ماند از اصل خویش<br/>باز جوید روزگار وصل خویش»</blockquote>
      </div>
    </section>

    <section className="section container about-story">
      <div className="about-story-copy">
        <span className="section-kicker">کار ما در «ریشه»</span>
        <p>کار ما در «ریشه»، الهام گرفته از همین یک بیتِ ساده اما عمیق است. با گذر زمان و غرق شدن در شلوغی‌های زندگی شهری و هیاهوی تکنولوژی، گاهی فراموش می‌کنیم که چه اصالت، فرهنگ و طعم‌های بی‌نظیری در اقلیم‌های بکر سرزمینمان نهفته است.</p>
        <p>ما باور داریم که غذا تنها یک نیاز روزمره نیست؛ بلکه رشته‌ای نامرئی است که می‌تواند با سینه به سینه نقل شدن داستان‌ها، حال و هوای اصیل ایرانی را دوباره در خانه‌های ما زنده کند.</p>
        <p>به همین بهانه، ما سفری را آغاز کردیم. سفری برای یافتن بهترین دست‌رنج‌های کشاورزانِ این آب و خاک. ما محصولات خوراکی را مستقیماً از قلبِ اقلیم‌های مختلف ایران تامین می‌کنیم؛ جایی که آب، خاک و آفتاب، بهترین نسخه از یک دانه را پرورش داده‌اند.</p>
        <p>در «ریشه»، ما ظاهر زیبای محصولات را فدای کیفیت باطنی آن‌ها نمی‌کنیم. هر محصول پیش از رسیدن به دست شما، باید از آزمونِ سخت‌گیرانه پخت ما سربلند بیرون بیاید.</p>
        <p>هدف ما در ریشه روشن است: تامین باکیفیت‌ترین محصول ایرانی برای سفره‌های شما، حمایت مستقیم از کشاورزان و تولیدکنندگان محلی، و در نهایت... بازگشتِ دوباره به اصل و ریشه‌ی خودمان.</p>
      </div>
      <aside className="about-visual">
        <img src="/brand/hero.png" alt="محصولات و روایت ریشه" />
        <div><strong>کیفیت، به شرط پخت</strong><span>روایت اصالت، مستقیم از مزرعه پدری</span></div>
      </aside>
    </section>

    <section className="section section-tint">
      <div className="container">
        <div className="section-heading"><span>ارزش‌های بنیادین ریشه</span><h2>چهار اصل که از محصول جدا نیستند.</h2></div>
        <div className="about-values">{values.map((value, index) => <article key={value.title}><i>{String(index + 1).padStart(2, "0")}</i><h3>{value.title}</h3><p>{value.text}</p></article>)}</div>
      </div>
    </section>

    <section className="section container about-cta">
      <div><span className="eyebrow">از روایت تا قابلمه</span><h2>عیار محصول را در صفحه خودش ببین.</h2><p>شناسنامه، روایت تامین، نتیجه تست، قیمت و موجودی هر محصول در فروشگاه جدید کنار هم قرار گرفته‌اند.</p></div>
      <Link className="btn btn-primary" href="/shop">مشاهده محصولات</Link>
    </section>
  </div>;
}
