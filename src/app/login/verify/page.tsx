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

export default async function LoginVerification({ searchParams }: { searchParams: Promise<{ step?: string; sent?: string; error?: string }> }) {
  const params = await searchParams;
  const isOtp = params.step === "otp";

  if (isOtp) {
    const cookieStore = await cookies();
    const pending = decryptEmailOtpChallenge(cookieStore.get(emailOtpCookieName())?.value);
    return <main className="auth-page">
      <aside className="auth-aside"><Brand /><div className="auth-message"><span className="eyebrow">One more step</span><h1>Confirm it’s you.</h1><p>Enter the code we sent to your email to finish signing in securely.</p><div className="auth-image-card"><strong>Your account stays protected.</strong><p>Sign-in codes expire after 10 minutes and can only be used once.</p></div></div><span className="auth-legal">SchoolPay · Parent tools for school information</span></aside>
      <section className="auth-main"><div className="auth-box"><Brand /><h2>Check your email</h2>{pending ? <><p>We sent a six-digit sign-in code. Enter it below to continue.</p><LoginOtpVerificationForm email={pending.email} /></> : <><p>Your sign-in code expired or is no longer available. Log in again to request a new one.</p><Link className="button button-primary button-full" href="/login">Back to log in</Link></>}</div></section>
    </main>;
  }

  const email = await getPendingConfirmationEmail() ?? "";
  return <main className="auth-page">
    <aside className="auth-aside"><Brand /><div className="auth-message"><span className="eyebrow">Verify your email</span><h1>Check your inbox to continue.</h1><p>Confirm your email address to activate your SchoolPay account. If the message isn’t there, check your spam folder or request another below.</p><div className="auth-image-card"><strong>Keep your account yours.</strong><p>Email confirmation helps protect your SchoolPay information.</p></div></div><span className="auth-legal">SchoolPay · Parent tools for school information</span></aside>
    <section className="auth-main"><div className="auth-box"><Brand /><h2>Confirm your email</h2><p>{params.sent === "1" ? "We sent a confirmation link. Open it to verify your address, then return here to log in." : "Use the confirmation link in your email to verify your address."}</p>{params.error === "link" && <p className="form-message error" role="alert">This confirmation link is invalid or expired. Request a new email below.</p>}<ConfirmationResendForm email={email} /><p className="auth-switch"><Link href="/login">Back to log in</Link></p></div></section>
  </main>;
}
