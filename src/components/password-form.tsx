"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";
import { requestPasswordReset, updatePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function PasswordForm({ mode }: { mode: "request" | "update" }) {
  const action = mode === "request" ? requestPasswordReset : updatePassword;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  return <form action={formAction} className="auth-form">
    {mode === "request" ? <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254}/></label> : <label>New password<input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128}/></label>}
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    {state.success && <p className="form-message success" role="status">{state.success}</p>}
    <Button className="button-full" disabled={pending}>{pending ? "Please wait…" : mode === "request" ? "Send reset link" : "Update password"}</Button>
  </form>;
}
