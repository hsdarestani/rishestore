import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm, RegisterForm } from "@/components/AuthForms";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/account");
  return <div className="page-shell container">
    <header className="page-hero compact">
      <span className="eyebrow">حساب ریشه</span>
      <h1>ورود یا ثبت نام با شماره موبایل</h1>
      <p>کد تایید با پیامک ارسال می‌شود و برای ورود نیازی به رمز عبور ندارید. حساب‌های منتقل شده از فروشگاه قبلی هم با همان شماره موبایل قابل ورود هستند.</p>
    </header>
    <div className="auth-grid"><LoginForm/><RegisterForm/></div>
  </div>;
}
