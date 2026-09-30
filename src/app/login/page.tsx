import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ confirmed?: string; password?: string }> }) {
  const params = await searchParams;

  return <main className="auth-page">
    <aside className="auth-aside">
      <Link className="brand" href="/"><span className="brand-mark">S</span><span>school<span className="brand-pay">pay</span></span></Link>
      <div className="auth-message"><span className="eyebrow">Welcome back</span><h1>Every school year is another step forward.</h1><p>Sign in to continue your SchoolPay journey. Your family&apos;s school-fee information stays private.</p><div className="auth-image-card"><strong>Your school details, organized.</strong><p>Keep child profiles and tuition invoices together in your parent account.</p></div></div>
      <span className="auth-legal">SchoolPay · Parent tools for school information</span>
    </aside>
    <section className="auth-main"><div className="auth-box">
      <Link className="brand" href="/"><span className="brand-mark">S</span><span>school<span className="brand-pay">pay</span></span></Link>
      <h2>Welcome back</h2>
      <p>Log in to your SchoolPay account.</p>
      {params.confirmed === "1" && <p className="form-message success" role="status">Email confirmed. Sign in to receive your verification code.</p>}
      {params.password === "updated" && <p className="form-message success" role="status">Password updated. Sign in with your new password.</p>}
      <AuthForm mode="login" />
      <p className="auth-switch"><Link href="/forgot-password">Forgot your password?</Link></p>
      <p className="auth-legal">By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy notice</Link>.</p>
    </div></section>
  </main>;
}
