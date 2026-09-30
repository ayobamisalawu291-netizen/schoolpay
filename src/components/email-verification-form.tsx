"use client";

import { useActionState } from "react";
import { cancelPendingEmailOtp, resendLoginEmailOtp, resendSignupConfirmation, verifyLoginEmailOtp, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function LoginOtpVerificationForm({ email }: { email: string }) {
  const [state, verifyAction, verifyPending] = useActionState<AuthState, FormData>(verifyLoginEmailOtp, {});
  const [resendState, resendAction, resendPending] = useActionState<AuthState, FormData>(resendLoginEmailOtp, {});

  return <div className="auth-verify-forms">
    <form action={verifyAction} className="auth-form">
      <label>Email verification code<input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required minLength={6} maxLength={6} /></label>
      {state.error && <p className="form-message error" role="alert">{state.error}</p>}
      <Button className="button-full" disabled={verifyPending}>{verifyPending ? "Verifying…" : "Verify and log in"}</Button>
    </form>
    <form action={resendAction} className="auth-form auth-otp-resend">
      {resendState.error && <p className="form-message error" role="alert">{resendState.error}</p>}
      {resendState.success && <p className="form-message success" role="status">{resendState.success}</p>}
      <Button className="button-full" disabled={resendPending}>{resendPending ? "Sending…" : "Resend sign-in code"}</Button>
    </form>
    <form action={cancelPendingEmailOtp}>
      <button type="submit" className="auth-text-button">Use a different email</button>
    </form>
    <p className="auth-verify-email">Code sent to <strong>{email}</strong>.</p>
  </div>;
}

export function ConfirmationResendForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resendSignupConfirmation, {});

  return <form action={action} className="auth-form auth-resend-form">
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={email} /></label>
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    {state.success && <p className="form-message success" role="status">{state.success}</p>}
    <Button className="button-full" disabled={pending}>{pending ? "Sending…" : "Resend confirmation email"}</Button>
  </form>;
}
