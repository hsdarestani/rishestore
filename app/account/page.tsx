import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toman, normalizePhone } from "@/lib/money";

export const dynamic = "force-dynamic";

function statusFa(value:string){
  const map:Record<string,string>={PENDING:"در انتظار",PROCESSING:"در حال پردازش",SHIPPED:"ارسال شده",COMPLETED:"تکمیل شده",CANCELED:"لغو شده",UNPAID:"پرداخت نشده",PAID:"پرداخت شده",FAILED:"ناموفق",REFUNDED:"برگشت وجه"};
  return map[value]||value;
}

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="page-shell container"><div className="empty-state"><h1>حساب کاربری</h1><p>برای دیدن سفارش‌ها، آدرس‌ها و امتیازها وارد شو.</p><Link className="btn btn-primary" href="/login">ورود یا ثبت‌نام</Link></div></div>;

  const phone=normalizePhone(user.phone);
  const customer=await db.customer.findUnique({where:{mobileNormalized:phone}});
  const [orders,addresses,loyalty]=await Promise.all([
    db.order.findMany({
      where:{OR:[{userId:user.id},{phone}]},
      include:{items:true,shipments:true},
      orderBy:{createdAt:"desc"},
      take:100,
    }),
    db.address.findMany({where:{userId:user.id},orderBy:{updatedAt:"desc"}}),
    customer?db.loyaltyEntry.findMany({where:{customerId:customer.id},orderBy:{createdAt:"desc"},take:100}):Promise.resolve([]),
  ]);
  const points=loyalty.reduce((sum,x)=>sum+x.points,0);

  return <div className="page-shell container">
    <header className="account-head">
      <div><span className="eyebrow">حساب ریشه</span><h1>{user.name}</h1><p>{user.phone}{user.email?" · "+user.email:""}</p></div>
      <div className="hero-actions">{user.role === "ADMIN" && <Link className="btn btn-secondary" href="/admin">پنل مدیریت</Link>}<form action="/api/auth/logout" method="post"><button className="btn btn-ghost">خروج</button></form></div>
    </header>

    <section className="account-metrics">
      <article><span>امتیاز وفاداری</span><strong>{points.toLocaleString("fa-IR")}</strong><small>بر اساس خرید و اصلاحات ثبت‌شده</small></article>
      <article><span>تعداد سفارش</span><strong>{orders.length.toLocaleString("fa-IR")}</strong><small>سفارش‌های همین موبایل و حساب</small></article>
      <article><span>آدرس ذخیره‌شده</span><strong>{addresses.length.toLocaleString("fa-IR")}</strong><small>برای خریدهای بعدی</small></article>
    </section>

    <section className="section">
      <div className="section-heading row-heading"><div><span>سفارش‌ها</span><h2>تاریخچه خرید</h2></div><Link href="/order-tracking">پیگیری سفارش ←</Link></div>
      {orders.length ? <div className="orders-list">{orders.map((order) => <article key={order.id}>
        <div><strong>{order.code}</strong><span>{order.createdAt.toLocaleDateString("fa-IR")}</span></div>
        <div><span>{order.items.length.toLocaleString("fa-IR")} قلم</span><span>{statusFa(order.status)}</span><span>{statusFa(order.paymentStatus)}</span><b>{toman(order.total)}</b></div>
        {order.discount>0&&<small>تخفیف: {toman(order.discount)}</small>}
        {order.shipments?.[0]?.trackingCode&&<small>کد رهگیری: {order.shipments[0].trackingCode}</small>}
      </article>)}</div> : <div className="empty-state small">هنوز سفارشی با این حساب ثبت نشده است.</div>}
    </section>

    <section className="section account-grid">
      <div className="panel"><div className="section-heading"><span>آدرس‌ها</span><h2>نشانی‌های ذخیره‌شده</h2></div>{addresses.length?<div className="address-list">{addresses.map(a=><article key={a.id}><strong>{a.title}</strong><p>{a.province}، {a.city}، {a.address}</p>{a.postalCode&&<span>کدپستی {a.postalCode}</span>}</article>)}</div>:<div className="empty-state small">هنوز آدرسی ذخیره نشده است.</div>}</div>
      <div className="panel"><div className="section-heading"><span>وفاداری</span><h2>گردش امتیاز</h2></div>{loyalty.length?<div className="loyalty-list">{loyalty.slice(0,15).map(x=><div key={x.id}><span>{x.reason||"تغییر امتیاز"}</span><b className={x.points>=0?"plus":"minus"}>{x.points>=0?"+":""}{x.points.toLocaleString("fa-IR")}</b><small>{x.createdAt.toLocaleDateString("fa-IR")}</small></div>)}</div>:<div className="empty-state small">هنوز امتیازی ثبت نشده است.</div>}</div>
    </section>
  </div>;
}
