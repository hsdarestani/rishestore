import { PrismaClient, ProductKind } from "@prisma/client";
import { readFileSync } from "fs";
import { gunzipSync } from "zlib";
import path from "path";

const db = new PrismaClient();

const categories = [
  { slug: "legumes", name: "حبوبات", description: "نخود، لوبیا، عدس، لپه و باقالی؛ با اطلاعات روشن درباره کاربرد، وزن و کیفیت.", sort: 1 },
  { slug: "rice", name: "برنج", description: "برنج ایرانی برای مصرف روزانه و انتخاب آگاهانه‌تر.", sort: 2 },
  { slug: "tea", name: "چای", description: "چای ایرانی و گیلانی با تمرکز بر عطر، رنگ و تجربه دم‌آوری.", sort: 3 },
  { slug: "honey", name: "عسل", description: "عسل طبیعی با توضیح شفاف درباره محصول و نگهداری.", sort: 4 },
  { slug: "grains-seasonings", name: "غلات و چاشنی‌ها", description: "غلات، پرک‌ها و چاشنی‌های ساده برای آشپزخانه روزمره.", sort: 5 },
];

const legacyMap: Record<string, { slug: string; category: string }> = {
  "113": { slug: "natural-honey", category: "honey" },
  "124": { slug: "iranian-chickpeas", category: "legumes" },
  "139": { slug: "pinto-beans", category: "legumes" },
  "147": { slug: "large-lentils", category: "legumes" },
  "210": { slug: "rice-hashemi", category: "rice" },
  "228": { slug: "local-lentils", category: "legumes" },
  "249": { slug: "popcorn-corn", category: "grains-seasonings" },
  "251": { slug: "gilan-tea", category: "tea" },
  "255": { slug: "red-beans", category: "legumes" },
  "256": { slug: "iranian-split-peas", category: "legumes" },
  "258": { slug: "dry-broad-beans", category: "legumes" },
  "421": { slug: "gilan-tea-with-stem", category: "tea" },
  "422": { slug: "dried-mint", category: "grains-seasonings" },
  "423": { slug: "oat-flakes", category: "grains-seasonings" },
  "424": { slug: "wheat-flakes", category: "grains-seasonings" },
};


const liveCatalogState: Record<string, { price: number; stock: number; name: string; weightGrams: number }> = {
  "113": { price: 1190000, stock: 233, name: "عسل درجه ۱ محلی", weightGrams: 1000 },
  "124": { price: 349000, stock: 228, name: "نخود درشت ۲ خان کرمانشاهی (به شرط پخت)", weightGrams: 900 },
  "139": { price: 510000, stock: 208, name: "لوبیا چیتی درجه ۱ زنجان (به شرط پخت)", weightGrams: 900 },
  "147": { price: 298000, stock: 0, name: "عدس درجه ۱ محلی درشت (به شرط پخت)", weightGrams: 900 },
  "210": { price: 500000, stock: 211, name: "برنج هاشمی اصل یکدست (به شرط پخت)", weightGrams: 1000 },
  "228": { price: 309000, stock: 211, name: "عدس درجه ۱ محلی ریز (به شرط پخت)", weightGrams: 900 },
  "249": { price: 363000, stock: 221, name: "ذرت پاپکورن (به شرط پخت)", weightGrams: 900 },
  "251": { price: 273000, stock: 203, name: "چای گیلان (به شرط دم)", weightGrams: 250 },
  "255": { price: 369000, stock: 202, name: "لوبیا قرمز (به شرط پخت)", weightGrams: 900 },
  "256": { price: 359000, stock: 207, name: "لپه آذرشهر (به شرط پخت)", weightGrams: 900 },
  "258": { price: 220000, stock: 202, name: "باقالی ممتاز (به شرط پخت)", weightGrams: 900 },
  "421": { price: 132000, stock: 203, name: "چای چوبدار گیلان (به شرط دم)", weightGrams: 250 },
  "422": { price: 135000, stock: 215, name: "نعنا خشک", weightGrams: 75 },
  "423": { price: 79000, stock: 219, name: "پرک جو", weightGrams: 250 },
  "424": { price: 69000, stock: 700, name: "پرک گندم", weightGrams: 250 },
};

const homepageReviews = [
  ["مریم حسینی", "برنج هاشمی و عدس ریز رو سفارش دادم. عطر برنج موقع پخت کل ساختمون رو برداشت. عدس هم پوستش جدا نشد و عدس‌پلو فوق‌العاده شد."],
  ["علی رضاپور", "نخود ۲خان رو برای رستوران سنتی‌مون تهیه کردیم. پختش عالیه و مشتری‌ها متوجه تغییر کیفیت دیزی‌ها شدن. عیار محصول کاملاً مشخصه."],
  ["سارا احمدی", "ذرت خام واقعا به شرط پخت بود. یک دانه هم ته قابلمه نسوخت یا بسته نموند! بچه‌ها خیلی دوست دارن و خوشحالم که محصول تمیزی دستمون رسید."],
  ["رضا مهدوی", "لوبیا چیتی زنجان غلظت و لعاب عجیبی به قرمه داد. اصلاً دیرپز نبود و کاملاً مشخصه که تازه است و توی انبار نمونده. خریدش رو توصیه می‌کنم."],
  ["زهرا سلطانی", "باقالی درجه ۱ رو برای باقالی‌پلو عید خریدم. کاملاً همگون پخت و هیچ‌کدوم سفت نموندن. طعم خامه‌ای و فوق‌العاده‌ای داشت."],
  ["امید صادقی", "چای شمال ریشه طعم چای اصیل قدیما رو میده. عاری از اسانس‌های تند شیمیاییه و بعد از دم کشیدن طولانی تلخ نمیشه. رنگش یاقوتی و عالیه."],
  ["نرگس کمالی", "عدس درشت رو دیشب پختم. یکدستی ظاهرش توی دیس عالی بود و پوستش جدا نشد. عیار و ارزش خرید بالایی داره. حتماً باز هم تمدید می‌کنم."],
  ["حسین مرادی", "لپه آذرشهر ریشه توی قیمه مجلسی ما عالی جواب داد. در کمتر از ۴۰ دقیقه مغزپخت شد و لعاب بسیار خوبی به خورش داد. تشکر از تیم ریشه."],
  ["فاطمه دهقان", "بسته‌بندی مینیمال و تمیز، ارسال سریع و از همه مهم‌تر کیفیت واقعی حبوبات. عسل هم واقعاً غلیظ و معطر بود. صداقتتون تو کار ارزشمنده."],
] as const;

function legacyData(): Record<string, any> {
  const file = path.join(process.cwd(), "data", "product-content.json.gz");
  try {
    return JSON.parse(gunzipSync(readFileSync(file)).toString("utf8"));
  } catch (error) {
    console.warn("Legacy catalog snapshot could not be read; keeping existing database catalog.", error);
    return {};
  }
}

function localImage(id: string, url: string) {
  if (!url) return null;
  const match = url.match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
  const ext = (match?.[1] || "jpg").toLowerCase();
  return "/brand/products/legacy-" + id + "." + ext;
}

const pages = [
  {
    slug: "why-rishe",
    title: "چرا ریشه؟",
    kicker: "انتخاب روشن‌تر",
    excerpt: "روایت اصالت، مستقیم از مزرعه پدری",
    content: "ما در «ریشه» کیفیت را فدای ظاهر نمی‌کنیم. هر محصول، پیش از رسیدن به دست شما، در آشپزخانه ما پخته و سنجیده می‌شود تا طعم واقعی و بی‌آلایش محصول به سفره برسد.\n\nدر نسخه جدید فروشگاه، این روایت فقط یک شعار نیست. وزن، قیمت، موجودی، مبدأ، کاربرد و توضیحات کیفیت هر محصول در همان صفحه خرید کنار هم قرار می‌گیرند تا تصمیم‌گیری ساده‌تر باشد.\n\n«به شرط پخت» بخشی از وعده کیفیت ریشه است. شرایط دقیق هر محصول در همان صفحه محصول نوشته می‌شود تا مشتری بداند چه چیزی را می‌خرد و در صورت مغایرت چطور موضوع را برای بررسی ثبت کند."
  },
  {
    slug: "about",
    title: "درباره ریشه",
    kicker: "داستان برند",
    excerpt: "ریشه از محصول شروع می‌کند؛ از شناختن، امتحان کردن و بعد عرضه کردن.",
    content: "ریشه فروشگاهی برای محصولات غذایی ایرانی است که تلاش می‌کند فاصله بین روایت برند و اطلاعات واقعی خرید را کم کند.\n\nما می‌خواهیم کاربر قبل از خرید بداند چه محصولی می‌گیرد، وزن و قیمت آن چیست، برای چه مصرفی مناسب است و چه اطلاعاتی از کیفیت و مبدأ آن در دسترس است.\n\nمجله ریشه هم برای همین ساخته شده: راهنماهای خرید، نگهداری، پخت و تشخیص کیفیت باید به صفحه محصول و تصمیم خرید کمک کنند، نه اینکه صرفاً محتوای جدا از فروشگاه باشند."
  },
  {
    slug: "shipping",
    title: "ارسال سفارش",
    kicker: "راهنمای خرید",
    excerpt: "هزینه نهایی ارسال پیش از پرداخت در تسویه‌حساب نمایش داده می‌شود.",
    content: "روش و هزینه ارسال از تنظیمات فروشگاه محاسبه می‌شود و پیش از پرداخت در خلاصه سفارش نمایش داده خواهد شد.\n\nاطلاعات آدرس را دقیق وارد کنید. اگر سفارش نیاز به هماهنگی خاصی داشته باشد، تیم ریشه از شماره تماس ثبت‌شده در سفارش استفاده می‌کند."
  },
  {
    slug: "returns",
    title: "بررسی و بازگشت سفارش",
    kicker: "پشتیبانی سفارش",
    excerpt: "اگر سفارشتان با اطلاعات اعلام‌شده تطابق نداشت، موضوع را با شماره سفارش ثبت کنید.",
    content: "برای بررسی یک سفارش، شماره سفارش، شماره تماس و شرح دقیق مسئله را آماده کنید.\n\nشرایط هر محصول و تعهدهای مرتبط با کیفیت در همان صفحه محصول قابل مشاهده است. نتیجه بررسی بر اساس اطلاعات سفارش و مشخصاتی انجام می‌شود که هنگام خرید برای محصول نمایش داده شده بود."
  },
  {
    slug: "contact",
    title: "تماس با ریشه",
    kicker: "پشتیبانی",
    excerpt: "برای سوال پیش از خرید یا پیگیری یک سفارش، از راه‌های ارتباطی ثبت‌شده در فروشگاه استفاده کنید.",
    content: "شماره تماس و شبکه‌های اجتماعی فروشگاه از پنل مدیریت قابل تنظیم هستند. برای موضوعات مربوط به سفارش، شماره سفارش را هم همراه پیام ارسال کنید تا بررسی سریع‌تر انجام شود."
  },
];

const posts = [
  { slug: "authenticity-quality-guide", title: "راهنمای تشخیص اصالت و کیفیت مواد غذایی", excerpt: "از ظاهر محصول تا نتیجه پخت؛ چه نشانه‌هایی برای یک انتخاب بهتر ارزش بررسی دارند؟", keywords: "اصالت,کیفیت,راهنمای خرید,تست پخت", content: "کیفیت مواد غذایی را نمی‌توان با یک نشانه واحد سنجید. ظاهر، بو، بافت، اطلاعات مبدأ، شرایط نگهداری و نتیجه پخت هرکدام بخشی از تصویر هستند.\n\nبرای خرید آنلاین، اطلاعات شفاف محصول اهمیت بیشتری پیدا می‌کند: وزن، موجودی، مبدأ در صورت امکان، کاربرد و توضیح کیفیت باید کنار قیمت دیده شوند.", healthDisclaimer: false },
  { slug: "iranian-rice-buying-guide", title: "راهنمای خرید برنج ایرانی", excerpt: "برای انتخاب برنج خوب، فقط به ظاهر دانه نگاه نکنید.", keywords: "برنج ایرانی,راهنمای خرید برنج,کیفیت برنج", content: "در خرید برنج، نام رقم تنها بخشی از تصمیم است. یکنواختی دانه، عطر، روش نگهداری و مهم‌تر از همه نتیجه پخت باید در کنار هم دیده شوند.", healthDisclaimer: false },
  { slug: "gilan-tea-guide", title: "راهنمای خرید و نگهداری چای ایرانی", excerpt: "چای خوب را با تجربه دم‌آوری و اطلاعات روشن محصول بشناسید.", keywords: "چای ایرانی,چای گیلان,راهنمای خرید چای", content: "رنگ بسیار تیره و سریع همیشه به‌معنای کیفیت بالاتر نیست. برای ارزیابی چای، عطر، طعم، زمان دم‌آوری و اطلاعات محصول را کنار هم ببینید.", healthDisclaimer: false },
  { slug: "natural-honey-guide", title: "راهنمای شناخت و نگهداری عسل", excerpt: "چرا یک نشانه واحد برای قضاوت درباره عسل کافی نیست؟", keywords: "عسل طبیعی,تشخیص عسل,نگهداری عسل", content: "برای تشخیص کیفیت عسل نباید فقط به شکرک‌زدن، رنگ یا غلظت تکیه کرد. ویژگی‌های عسل به منبع شهد و شرایط نگهداری وابسته‌اند.\n\nاین راهنما جایگزین توصیه پزشکی نیست.", healthDisclaimer: true },
  { slug: "legumes-storage-guide", title: "روش نگهداری حبوبات در خانه", excerpt: "چطور حبوبات را خشک، تمیز و دور از رطوبت نگه داریم.", keywords: "حبوبات,نگهداری,نخود,عدس,لوبیا", content: "حبوبات خشک را در ظرف تمیز و دربسته، دور از رطوبت و گرمای زیاد نگهداری کنید.", healthDisclaimer: false },
];

const faqs = [
  ["اطلاعات هر محصول را کجا ببینم؟", "وزن، قیمت، موجودی، روایت محصول، مشخصات، نتیجه تست، ضمانت و سوالات مرتبط در همان صفحه محصول نمایش داده می‌شود.", 1],
  ["«به شرط پخت» در ریشه یعنی چه؟", "این عبارت بخشی از وعده کیفیت ریشه است. جزئیات دقیق ضمانت هر محصول در صفحه همان محصول نوشته شده است.", 2],
  ["هزینه ارسال چطور مشخص می‌شود؟", "هزینه ارسال بر اساس تنظیمات فعال فروشگاه محاسبه می‌شود و پیش از پرداخت در خلاصه سفارش نمایش داده خواهد شد.", 3],
  ["پرداخت سفارش چگونه انجام می‌شود؟", "پرداخت آنلاین از درگاه زیبال انجام می‌شود. مبلغ نهایی پیش از انتقال به درگاه نمایش داده می‌شود.", 4],
  ["چطور سفارشم را پیگیری کنم؟", "در صفحه پیگیری سفارش، کد سفارش و همان شماره موبایلی را که هنگام خرید وارد کرده‌اید ثبت کنید.", 5],
];

async function main() {
  const categoryMap = new Map<string, string>();
  for (const category of categories) {
    const row = await db.category.upsert({ where: { slug: category.slug }, create: category, update: {} });
    categoryMap.set(category.slug, row.id);
  }

  const snapshotImported = await db.setting.findUnique({ where: { key: "legacyProductSnapshotImported" } });
  const legacy = legacyData();

  for (const [id, content] of Object.entries(legacy)) {
    const map = legacyMap[id];
    if (!map) continue;
    const hero = content.hero || {};
    const woo = content.woo_snapshot || {};
    const price = Math.max(0, Math.trunc(Number(woo.price || woo.regular_price || 0)));
    const stock = Math.max(0, Math.trunc(Number(woo.stock || 0)));
    const weightGrams = Math.max(0, Math.round(Number(woo.weight || 0) * 1000)) || null;
    const name = String(hero.display_title || "").trim() || "محصول ریشه " + id;
    const image = localImage(id, String(hero.image_url || ""));
    const categoryId = categoryMap.get(map.category) || null;
    const description = String(hero.story || "").trim() || String(hero.myth || "").trim() || name;
    const allowBackorder = String(woo.stock_status || "") === "onbackorder";

    let product = await db.product.findFirst({ where: { OR: [{ legacyProductId: Number(id) }, { slug: map.slug }] } });
    if (!product) {
      product = await db.product.create({
        data: {
          legacyProductId: Number(id),
          slug: map.slug,
          name,
          shortDescription: String(hero.myth || description).slice(0, 500),
          description,
          price,
          stock,
          stockStatus: String(woo.stock_status || ""),
          allowBackorder,
          sourceUrl: String(content.source_url || "") || null,
          legacyContent: content,
          weightGrams,
          image,
          categoryId,
          active: true,
        },
      });
    } else {
      product = await db.product.update({
        where: { id: product.id },
        data: {
          legacyProductId: Number(id),
          name,
          categoryId,
          sourceUrl: String(content.source_url || "") || null,
          legacyContent: content,
          shortDescription: product.shortDescription || String(hero.myth || description).slice(0, 500),
          description: product.description || description,
          image: product.image || image,
          weightGrams: product.weightGrams || weightGrams,
          ...(snapshotImported ? {} : {
            price,
            stock,
            stockStatus: String(woo.stock_status || ""),
            allowBackorder,
          }),
        },
      });
    }
  }

  if (!snapshotImported && Object.keys(legacy).length > 0) {
    await db.setting.create({ data: { key: "legacyProductSnapshotImported", value: new Date().toISOString() } });
  }

  const liveStateMarker = await db.setting.findUnique({ where: { key: "catalogSnapshot20260926" } });
  if (!liveStateMarker) {
    for (const [legacyId, state] of Object.entries(liveCatalogState)) {
      await db.product.updateMany({
        where: { legacyProductId: Number(legacyId) },
        data: {
          name: state.name,
          price: state.price,
          stock: state.stock,
          weightGrams: state.weightGrams,
          stockStatus: state.stock > 0 ? "instock" : "outofstock",
        },
      });
    }
    await db.setting.create({ data: { key: "catalogSnapshot20260926", value: new Date().toISOString() } });
  }

  // Reconcile the exact public catalog supplied for the standalone rebuild.
  // This marker intentionally runs once on existing production databases too.
  const exactCatalogMarker = await db.setting.findUnique({ where: { key: "catalogSnapshot20260927ExactV2" } });
  if (!exactCatalogMarker) {
    for (const [legacyId, state] of Object.entries(liveCatalogState)) {
      await db.product.updateMany({
        where: { legacyProductId: Number(legacyId) },
        data: {
          name: state.name,
          price: state.price,
          stock: state.stock,
          weightGrams: state.weightGrams,
          stockStatus: state.stock > 0 ? "instock" : "outofstock",
        },
      });
    }
    await db.setting.create({ data: { key: "catalogSnapshot20260927ExactV2", value: new Date().toISOString() } });
  }

  await db.product.updateMany({ where: { slug: "red-lentils", legacyProductId: null }, data: { active: false } }).catch(() => undefined);

  const mainWarehouse = await db.warehouse.upsert({
    where: { code: "MAIN" },
    create: { code: "MAIN", name: "انبار اصلی ریشه", address: "کرج، محمدشهر، بلوار دشت بهشت" },
    update: {},
  });

  for (const product of await db.product.findMany({ where: { legacyProductId: { not: null } } })) {
    const existing = await db.inventoryBatch.findFirst({ where: { warehouseId: mainWarehouse.id, productId: product.id } });
    if (!existing && product.stock > 0) {
      await db.inventoryBatch.create({
        data: {
          warehouseId: mainWarehouse.id,
          productId: product.id,
          batchCode: "LEGACY-" + product.legacyProductId,
          quantity: product.stock,
          unitCost: 0,
          notes: "موجودی منتقل‌شده از فروشگاه قبلی",
        },
      });
      await db.inventoryMovement.create({
        data: {
          warehouseId: mainWarehouse.id,
          productId: product.id,
          type: "opening_balance",
          quantity: product.stock,
          unitCost: 0,
          referenceType: "legacy_snapshot",
          referenceId: String(product.legacyProductId),
        },
      });
    }
  }

  for (const page of pages) await db.page.upsert({ where: { slug: page.slug }, create: page, update: {} });

  const exactContentMarker = await db.setting.findUnique({ where: { key: "exactPublicContentV1" } });
  if (!exactContentMarker) {
    await db.page.update({
      where: { slug: "about" },
      data: {
        title: "درباره ما",
        kicker: "داستان ما",
        excerpt: "همه‌مان آخرش به ریشه‌مان برمی‌گردیم.",
        content: "«هر کسی کو دور ماند از اصل خویش، باز جوید روزگار وصل خویش»\n\nکار ما در «ریشه»، الهام گرفته از همین یک بیتِ ساده اما عمیق است. با گذر زمان و غرق شدن در شلوغی‌های زندگی شهری و هیاهوی تکنولوژی، گاهی فراموش می‌کنیم که چه اصالت، فرهنگ و طعم‌های بی‌نظیری در اقلیم‌های بکر سرزمینمان نهفته است.\n\nما باور داریم که غذا تنها یک نیاز روزمره نیست؛ بلکه رشته‌ای نامرئی است که می‌تواند با سینه به سینه نقل شدن داستان‌ها، حال و هوای اصیل ایرانی را دوباره در خانه‌های ما زنده کند.\n\nبه همین بهانه، ما سفری را آغاز کردیم. سفری برای یافتن بهترین دست‌رنج‌های کشاورزانِ این آب و خاک. ما محصولات خوراکی را مستقیماً از قلبِ اقلیم‌های مختلف ایران تامین می‌کنیم؛ جایی که آب، خاک و آفتاب، بهترین نسخه از یک دانه را پرورش داده‌اند.\n\nدر «ریشه»، ما ظاهر زیبای محصولات را فدای کیفیت باطنی آن‌ها نمی‌کنیم. هر محصول پیش از رسیدن به دست شما، باید از آزمونِ سخت‌گیرانه پخت ما سربلند بیرون بیاید.\n\nهدف ما در ریشه روشن است: تامین باکیفیت‌ترین محصول ایرانی برای سفره‌های شما، حمایت مستقیم از کشاورزان و تولیدکنندگان محلی، و در نهایت... بازگشتِ دوباره به اصل و ریشه‌ی خودمان.",
      },
    });

    for (const [name, reviewText] of homepageReviews) {
      const exists = await db.review.findFirst({ where: { name, text: reviewText } });
      if (!exists) await db.review.create({ data: { name, text: reviewText, rating: 5, approved: true } });
    }

    await db.setting.upsert({ where: { key: "storePhone" }, create: { key: "storePhone", value: "09910938033" }, update: { value: "09910938033" } });
    await db.setting.upsert({ where: { key: "baleUrl" }, create: { key: "baleUrl", value: "https://ble.ir/rishe_store" }, update: { value: "https://ble.ir/rishe_store" } });
    await db.setting.create({ data: { key: "exactPublicContentV1", value: new Date().toISOString() } });
  }
  for (const post of posts) await db.post.upsert({ where: { slug: post.slug }, create: post, update: {} });
  for (const [question, answer, sort] of faqs) {
    await db.faq.upsert({ where: { question: String(question) }, create: { question: String(question), answer: String(answer), sort: Number(sort) }, update: {} });
  }

  for (const [key, value] of Object.entries({
    storeName: "ریشه",
    storePhone: "",
    instagramUrl: "",
    shippingFlatRate: "0",
    freeShippingThreshold: "0",
  })) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  await db.treasuryProvider.upsert({
    where: { code: "zibal" },
    create: { publicId: "provider-zibal", code: "zibal", name: "زیبال", adapter: "zibal", active: true },
    update: { active: true },
  });
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
