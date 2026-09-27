"use client";

import { FormEvent, useState } from "react";

type ApiError = Error & { blacklist?: boolean; needsProfile?: boolean };

async function api(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "عملیات انجام نشد.") as ApiError;
    error.blacklist = Boolean(data.blacklist);
    error.needsProfile = Boolean(data.needsProfile);
    throw error;
  }
  return data;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="auth-field"><span>{label}</span>{children}</label>;
}

export function AuthExperience() {
  const [screen, setScreen] = useState<"login" | "register">("login");
  const [loginMethod, setLoginMethod] = useState<"sms" | "password">("sms");
  const [registerMethod, setRegisterMethod] = useState<"sms" | "password">("sms");

  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loginSent, setLoginSent] = useState(false);

  const [registerName, setRegisterName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [registerSent, setRegisterSent] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function resetFeedback() {
    setError("");
    setMessage("");
  }

  function switchScreen(next: "login" | "register") {
    setScreen(next);
    resetFeedback();
  }

  async function sendLoginCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); resetFeedback();
    try {
      await api("/api/auth/otp/request", { phone: loginPhone });
      setLoginSent(true);
      setMessage("کد تایید ارسال شد.");
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      if (err.blacklist) setLoginMethod("password");
    } finally {
      setBusy(false);
    }
  }

  async function verifyLoginCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); resetFeedback();
    try {
      const result = await api("/api/auth/otp/verify", { phone: loginPhone, code: loginCode });
      window.location.href = result.redirect || "/account";
    } catch (e) {
      setError(e instanceof Error ? e.message : "ورود انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function passwordLogin(event: FormEvent) {
    event.preventDefault();
    setBusy(true); resetFeedback();
    try {
      const result = await api("/api/auth/login", { phone: loginPhone, password: loginPassword });
      window.location.href = result.redirect || "/account";
    } catch (e) {
      setError(e instanceof Error ? e.message : "ورود انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function sendRegisterCode(event: FormEvent) {
    event.preventDefault();
    if (registerName.trim().length < 2) {
      setError("نام و نام خانوادگی را کامل وارد کنید.");
      return;
    }
    setBusy(true); resetFeedback();
    try {
      await api("/api/auth/otp/request", { phone: registerPhone });
      setRegisterSent(true);
      setMessage("کد تایید برای ساخت حساب ارسال شد.");
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      if (err.blacklist) setRegisterMethod("password");
    } finally {
      setBusy(false);
    }
  }

  async function verifyRegisterCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); resetFeedback();
    try {
      const result = await api("/api/auth/otp/verify", {
        name: registerName,
        phone: registerPhone,
        email: registerEmail,
        code: registerCode,
      });
      window.location.href = result.redirect || "/account";
    } catch (e) {
      setError(e instanceof Error ? e.message : "ثبت نام انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function passwordRegister(event: FormEvent) {
    event.preventDefault();
    setBusy(true); resetFeedback();
    try {
      await api("/api/auth/register", {
        name: registerName,
        phone: registerPhone,
        email: registerEmail,
        password: registerPassword,
      });
      window.location.href = "/account";
    } catch (e) {
      setError(e instanceof Error ? e.message : "ثبت نام انجام نشد.");
    } finally {
      setBusy(false);
    }
  }

  const loginForm = loginMethod === "sms"
    ? <form className="auth-form auth-form-modern" onSubmit={loginSent ? verifyLoginCode : sendLoginCode}>
        <div className="auth-form-head"><span>ورود سریع</span><h2>خوش آمدید</h2><p>با شماره موبایل وارد حساب ریشه شوید.</p></div>
        <Field label="شماره موبایل">
          <input required value={loginPhone} onChange={(e)=>setLoginPhone(e.target.value)} inputMode="tel" placeholder="09xxxxxxxxx" disabled={loginSent} />
        </Field>
        {loginSent && <Field label="کد تایید">
          <input required value={loginCode} onChange={(e)=>setLoginCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={4} placeholder="کد ۴ رقمی" />
        </Field>}
        {message && <p className="alert success">{message}</p>}
        {error && <p className="alert error">{error}</p>}
        <button className="btn btn-primary btn-wide auth-submit" disabled={busy}>{busy ? "در حال انجام…" : loginSent ? "تایید و ورود" : "ارسال کد ورود"}</button>
        {loginSent && <button type="button" className="auth-text-button" onClick={()=>{setLoginSent(false);setLoginCode("");resetFeedback();}} disabled={busy}>تغییر شماره یا دریافت کد جدید</button>}
      </form>
    : <form className="auth-form auth-form-modern" onSubmit={passwordLogin}>
        <div className="auth-form-head"><span>ورود کلاسیک</span><h2>ورود با رمز عبور</h2><p>اگر برای حسابتان رمز دارید، مستقیم وارد شوید.</p></div>
        <Field label="شماره موبایل"><input required value={loginPhone} onChange={(e)=>setLoginPhone(e.target.value)} inputMode="tel" placeholder="09xxxxxxxxx" /></Field>
        <Field label="رمز عبور"><input required value={loginPassword} onChange={(e)=>setLoginPassword(e.target.value)} type="password" autoComplete="current-password" /></Field>
        {error && <p className="alert error">{error}</p>}
        <button className="btn btn-primary btn-wide auth-submit" disabled={busy}>{busy ? "در حال ورود…" : "ورود با رمز عبور"}</button>
      </form>;

  const registerForm = registerMethod === "sms"
    ? <form className="auth-form auth-form-modern" onSubmit={registerSent ? verifyRegisterCode : sendRegisterCode}>
        <div className="auth-form-head"><span>حساب جدید</span><h2>عضویت در ریشه</h2><p>اطلاعات اصلی را وارد کنید تا حساب شما ساخته شود.</p></div>
        <Field label="نام و نام خانوادگی"><input required value={registerName} onChange={(e)=>setRegisterName(e.target.value)} disabled={registerSent} /></Field>
        <Field label="شماره موبایل"><input required value={registerPhone} onChange={(e)=>setRegisterPhone(e.target.value)} inputMode="tel" placeholder="09xxxxxxxxx" disabled={registerSent} /></Field>
        <Field label="ایمیل اختیاری"><input value={registerEmail} onChange={(e)=>setRegisterEmail(e.target.value)} type="email" disabled={registerSent} /></Field>
        {registerSent && <Field label="کد تایید"><input required value={registerCode} onChange={(e)=>setRegisterCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={4} placeholder="کد ۴ رقمی" /></Field>}
        {message && <p className="alert success">{message}</p>}
        {error && <p className="alert error">{error}</p>}
        <button className="btn btn-secondary btn-wide auth-submit" disabled={busy}>{busy ? "در حال انجام…" : registerSent ? "تایید و ساخت حساب" : "ارسال کد ثبت نام"}</button>
        {registerSent && <button type="button" className="auth-text-button" onClick={()=>{setRegisterSent(false);setRegisterCode("");resetFeedback();}} disabled={busy}>ویرایش اطلاعات</button>}
      </form>
    : <form className="auth-form auth-form-modern" onSubmit={passwordRegister}>
        <div className="auth-form-head"><span>بدون پیامک</span><h2>ثبت نام با رمز عبور</h2><p>اگر دریافت پیامک برای شماره شما محدود است، می‌توانید با رمز حساب بسازید.</p></div>
        <Field label="نام و نام خانوادگی"><input required value={registerName} onChange={(e)=>setRegisterName(e.target.value)} /></Field>
        <Field label="شماره موبایل"><input required value={registerPhone} onChange={(e)=>setRegisterPhone(e.target.value)} inputMode="tel" placeholder="09xxxxxxxxx" /></Field>
        <Field label="ایمیل اختیاری"><input value={registerEmail} onChange={(e)=>setRegisterEmail(e.target.value)} type="email" /></Field>
        <Field label="رمز عبور"><input required minLength={8} value={registerPassword} onChange={(e)=>setRegisterPassword(e.target.value)} type="password" autoComplete="new-password" placeholder="حداقل ۸ کاراکتر" /></Field>
        {error && <p className="alert error">{error}</p>}
        <button className="btn btn-secondary btn-wide auth-submit" disabled={busy}>{busy ? "در حال ساخت…" : "ساخت حساب با رمز عبور"}</button>
      </form>;

  return <section className="auth-experience">
    <div className="auth-story">
      <div className="auth-story-orb auth-story-orb-one" />
      <div className="auth-story-orb auth-story-orb-two" />
      <div className="auth-story-copy">
        <span className="auth-story-kicker">حساب ریشه</span>
        <h1>خریدهای شما،<br/>یکجا و همیشه در دسترس.</h1>
        <p>سفارش‌های قبلی، آدرس‌ها و وضعیت خریدها در یک حساب ساده و امن نگهداری می‌شوند.</p>
        <div className="auth-story-points">
          <div><b>01</b><span>ورود با پیامک یا رمز عبور</span></div>
          <div><b>02</b><span>دسترسی به سابقه سفارش‌ها</span></div>
          <div><b>03</b><span>حساب‌های قدیمی با همان شماره موبایل</span></div>
        </div>
      </div>
      <div className="auth-story-word">ریشه</div>
    </div>

    <div className="auth-card-wrap">
      <div className="auth-tabs">
        <button type="button" className={screen === "login" ? "active" : ""} onClick={()=>switchScreen("login")}>ورود</button>
        <button type="button" className={screen === "register" ? "active" : ""} onClick={()=>switchScreen("register")}>ثبت نام</button>
      </div>

      {screen === "login" && <>
        <div className="auth-methods">
          <button type="button" className={loginMethod === "sms" ? "active" : ""} onClick={()=>{setLoginMethod("sms");resetFeedback();}}>پیامک</button>
          <button type="button" className={loginMethod === "password" ? "active" : ""} onClick={()=>{setLoginMethod("password");resetFeedback();}}>رمز عبور</button>
        </div>
        {loginForm}
      </>}

      {screen === "register" && <>
        <div className="auth-methods">
          <button type="button" className={registerMethod === "sms" ? "active" : ""} onClick={()=>{setRegisterMethod("sms");resetFeedback();}}>پیامک</button>
          <button type="button" className={registerMethod === "password" ? "active" : ""} onClick={()=>{setRegisterMethod("password");resetFeedback();}}>رمز عبور</button>
        </div>
        {registerForm}
      </>}

      <p className="auth-privacy">با ادامه، قوانین فروشگاه و حریم خصوصی ریشه را می‌پذیرید.</p>
    </div>
  </section>;
}

export function LoginForm() {
  return <AuthExperience />;
}

export function RegisterForm() {
  return null;
}
