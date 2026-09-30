import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ConfirmationResendForm, LoginOtpVerificationForm } from "@/components/email-verification-form";
import { decryptEmailOtpChallenge, emailOtpCookieName } from "@/lib/auth-email-otp";
import { getPendingConfirmationEmail } from "@/lib/auth-verification";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false, follow: false } };

function Brand() {
  return <Link className="brand" href="/"><span className="brand-mark">S</span><span>school<span className="brand-pay">pay</span></span></Link>;
}

function AuthSteps({ active }: { active: "confirm" | "otp" }) {
  return <ol className="auth-steps" aria-label="Account access steps">
    <li className={active === "confirm" ? "active" : "complete"}><span>1</span><div><strong>Confirm email</strong><small>Activate your account</small></div></li>
    <li className={active === "otp" ? "complete" : "upcoming"}><span>2</span><div><strong>Log in</strong><small>Use your password</small></div></li>
    <li className={active === "otp" ? "active" : "upcoming"}><span>3</span><div><strong>Enter code</strong><small>Verify your sign-in</small></div></li>
  </ol>;
}

export default async function LoginVerification({ searchParams }: { searchParams: Promise<{ step?: string; sent?: string; error?: string }> }) {
  const params = await searchParams;
  const isOtp = params.step === "otp";

  if (isOtp) {
    const cookieStore = await cookies();
    const pending = decryptEmailOtpChallenge(cookieStore.get(emailOtpCookieName())?.value);
    return <main className="auth-page">
      <aside className="auth-aside"><Brand /><div className="auth-message"><span className="eyebrow">One more step</span><h1>Confirm it’s you.</h1><p>After your password is accepted, we email a separate one-time code. Enter it to finish signing in securely.</p><div className="auth-image-card"><strong>Your account stays protected.</strong><p>Sign-in codes expire after 10 minutes and can only be used once.</p></div></div><span className="auth-legal">SchoolPay · Parent tools for school information</span></aside>
      <section className="auth-main"><div className="auth-box"><Brand /><span className="eyebrow">Step 3 of 3 · Sign-in verification</span><h2>Check your email</h2>{pending ? <><p>We sent a six-digit sign-in code to <strong className="auth-inline-email">{pending.email}</strong>. Enter it below to continue to your account.</p><AuthSteps active="otp" /><LoginOtpVerificationForm email={pending.email} /></> : <><p>Your sign-in code expired or is no longer available. Log in again to request a new one.</p><Link className="button button-primary button-full" href="/login">Back to log in</Link></>}</div></section>
    </main>;
  }

  const email = await getPendingConfirmationEmail() ?? "";
  return <main className="auth-page">
    <aside className="auth-aside"><Brand /><div className="auth-message"><span className="eyebrow">Verify your email</span><h1>One quick step to create your account.</h1><p>Open the confirmation link we sent. It verifies your address and returns you to the SchoolPay login page.</p><div className="auth-image-card"><strong>Then sign in securely.</strong><p>Use your email and password, then enter the one-time code we send you.</p></div></div><span className="auth-legal">SchoolPay · Parent tools for school information</span></aside>
    <section className="auth-main"><div className="auth-box"><Brand /><span className="eyebrow">Step 1 of 3 · Account setup</span><h2>Check your email</h2><p>{params.sent === "1" ? "Your signup is almost complete. Open the confirmation link in your email. After it verifies your address, it will bring you back here to log in." : "Open the confirmation link in your email to verify your address. You’ll return to the login page afterward."}</p><AuthSteps active="confirm" />{params.error === "link" && <p className="form-message error" role="alert">This confirmation link is invalid or expired. Request a new email below.</p>}<div className="auth-resend-panel"><strong>Didn’t get the email?</strong><p>Check your spam folder, or request another confirmation link.</p><ConfirmationResendForm email={email} /></div><p className="auth-switch"><Link href="/login">Back to log in</Link></p></div></section>
  </main>;
}
