"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});

  return <form action={formAction} className="auth-form">
    <p className="auth-form-intro">
      {mode === "register"
        ? "We’ll email you a confirmation link. After confirming your address, return here to log in with your password and verify with a one-time code."
        : "Enter your email and password. We’ll send a one-time code to your email before finishing sign-in."}
    </p>
    {mode === "register" && <label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>}
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={10} maxLength={128} /></label>
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    {state.success && <p className="form-message success" role="status">{state.success}</p>}
    <Button className="button-full" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}</Button>
    <p className="auth-switch">{mode === "login" ? "New to SchoolPay? " : "Already have an account? "}<Link href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Create an account" : "Log in"}</Link></p>
  </form>;
}
