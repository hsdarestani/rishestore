import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm, RegisterForm } from "@/components/AuthForms";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/account");
  return <div className="page-shell container"><header className="page-hero compact"><span className="eyebrow">حساب ریشه</span><h1>ورود یا ساخت حساب</h1><p>برای خرید مهمان اجباری به ساخت حساب نیست؛ حساب کاربری برای دیدن سفارش‌های قبلی مفید است.</p></header><div className="auth-grid"><LoginForm/><RegisterForm/></div></div>;
}
