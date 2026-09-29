"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  cancelPendingEmailOtp,
  resendLoginEmailOtp,
  resendSignupConfirmation,
  signIn,
  signUp,
  verifyLoginEmailOtp,
  type AuthState
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  const [email, setEmail] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resendState, resendAction, resendPending] = useActionState<AuthState, FormData>(resendSignupConfirmation, {});
  const [otpState, verifyAction, otpPending] = useActionState<AuthState, FormData>(verifyLoginEmailOtp, {});
  const [otpResendState, otpResendAction, otpResendPending] = useActionState<AuthState, FormData>(resendLoginEmailOtp, {});
  const emailOtpStep = mode === "login" && Boolean(state.otpRequired || otpState.otpRequired || otpResendState.otpRequired);
  return (
    <>
      {emailOtpStep ? <section className="auth-otp-step" aria-labelledby="auth-otp-title">
        <h3 id="auth-otp-title">Check your email</h3>
        <p>We sent a six-digit sign-in code to <strong>{email || "your registered email address"}</strong>. The code expires in 10 minutes.</p>
        <form action={verifyAction} className="auth-form">
          <label>Email verification code<input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required minLength={6} maxLength={6} /></label>
          {otpState.error && <p className="form-message error" role="alert">{otpState.error}</p>}
          {otpState.success && <p className="form-message success" role="status">{otpState.success}</p>}
          <Button className="button-full" disabled={otpPending}>{otpPending ? "Verifying…" : "Verify and log in"}</Button>
        </form>
        <form action={otpResendAction} className="auth-form auth-otp-resend">
          {otpResendState.error && <p className="form-message error" role="alert">{otpResendState.error}</p>}
          {otpResendState.success && <p className="form-message success" role="status">{otpResendState.success}</p>}
          <Button className="button-full" disabled={otpResendPending}>{otpResendPending ? "Sending…" : "Resend sign-in code"}</Button>
        </form>
        <form action={cancelPendingEmailOtp}>
          <button type="submit" className="auth-text-button">Use a different email</button>
        </form>
      </section> : <form action={formAction} className="auth-form">
        {mode === "register" && <label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>}
        <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={10} maxLength={128} /></label>
        {state.error && <p className="form-message error" role="alert">{state.error}</p>}
        {state.success && <p className="form-message success" role="status">{state.success}</p>}
        <Button className="button-full" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</Button>
        <p className="auth-switch">{mode === "login" ? "New to SchoolPay? " : "Already have an account? "}<Link href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Create an account" : "Log in"}</Link></p>
      </form>}
      {mode === "login" && !emailOtpStep && <div className="auth-resend">
        <button type="button" className="auth-text-button" onClick={() => setShowResend((visible) => !visible)} aria-expanded={showResend}>
          {showResend ? "Hide confirmation email form" : "Didn't get your confirmation email?"}
        </button>
        {showResend && <form action={resendAction} className="auth-form auth-resend-form">
          <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          {resendState.error && <p className="form-message error" role="alert">{resendState.error}</p>}
          {resendState.success && <p className="form-message success" role="status">{resendState.success}</p>}
          <Button className="button-full" disabled={resendPending}>{resendPending ? "Please wait…" : "Resend confirmation email"}</Button>
        </form>}
      </div>}
    </>
  );
}
