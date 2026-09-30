"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createSupabaseJsClient, type Session, type User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/roles";
import { createVerifiedSessionCookie, verifiedSessionCookieMaxAge, verifiedSessionCookieName } from "@/lib/auth-assurance";
import { getPendingConfirmationEmail, setPendingConfirmationEmail } from "@/lib/auth-verification";
import {
  decryptEmailOtpChallenge,
  digestEmailOtp,
  emailOtpCookieMaxAge,
  emailOtpCookieName,
  encryptEmailOtpChallenge,
  generateEmailOtp,
  getEmailOtpConfig,
  sendEmailOtp
} from "@/lib/auth-email-otp";

const credentials = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128)
});

export type AuthState = { error?: string; success?: string; otpRequired?: boolean };

function createPasswordProbe() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
}

function createOtpAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
}

async function setPendingOtpCookie(payload: Parameters<typeof encryptEmailOtpChallenge>[0]) {
  const cookieStore = await cookies();
  cookieStore.set(emailOtpCookieName(), encryptEmailOtpChallenge(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: emailOtpCookieMaxAge()
  });
}

async function startEmailOtp(user: User, session: Session): Promise<AuthState> {
  const emailConfig = getEmailOtpConfig();
  const admin = createOtpAdminClient();
  if (!emailConfig || !admin || !user.email) {
    return { error: "We could not sign you in right now. Please try again later." };
  }

  const code = generateEmailOtp();
  const { data: challengeId, error } = await admin.rpc("begin_email_otp_challenge", {
    p_user_id: user.id,
    p_code_digest: digestEmailOtp(code)
  });
  if (error) {
    if (error.message.includes("otp_rate_limited")) {
      return { error: "We could not sign you in right now. Please try again later." };
    }
    return { error: "We couldn't start email verification. Please try signing in again." };
  }
  if (typeof challengeId !== "string") return { error: "We couldn't start email verification. Please try signing in again." };

  try {
    const sent = await sendEmailOtp(user.email, code);
    if (!sent) {
      await admin.rpc("cancel_email_otp_challenge", { p_challenge_id: challengeId });
      return { error: "We could not sign you in right now. Please try again later." };
    }
  } catch {
    await admin.rpc("cancel_email_otp_challenge", { p_challenge_id: challengeId });
    return { error: "We could not sign you in right now. Please try again later." };
  }

  await setPendingOtpCookie({
    version: 1,
    challengeId,
    userId: user.id,
    email: user.email,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + emailOtpCookieMaxAge()
  });
  return { success: `We sent a one-time code to ${user.email}.`, otpRequired: true };
}

function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return process.env.NODE_ENV === "production" ? null : "http://localhost:3000";
  try {
    const url = new URL(configured);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function destinationForRole(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>) {
  const { data: jwtData } = await supabase.auth.getClaims();
  const claims = jwtData?.claims;
  if (!claims?.sub) return "/forbidden";
  const { data: schoolMemberships } = await supabase.from("school_members").select("school_id").eq("user_id", claims.sub).limit(1);
  if (schoolMemberships?.length) return "/school/dashboard";
  const { data } = await supabase.from("profiles").select("role").eq("id", claims.sub).maybeSingle();
  const role = data?.role as AppRole | undefined;
  if (role === "parent") return "/parent/dashboard";
  if (role && ["school_owner", "school_admin", "school_finance", "school_staff"].includes(role)) return "/school/dashboard";
  if (role && ["operations", "platform_admin", "super_admin"].includes(role)) return "/admin";
  return "/forbidden";
}

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password (at least 10 characters)." };
  const supabase = createPasswordProbe();
  if (!supabase) return { error: "Authentication is not configured yet. Please try again later." };
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error?.code === "email_not_confirmed") {
    await setPendingConfirmationEmail(parsed.data.email);
    redirect("/login/verify?step=confirmation");
  }
  if (error) return { error: "We could not sign you in. Check your details and try again." };
  if (!data.user || !data.session) return { error: "We could not sign you in. Check your details and try again." };
  if (!createOtpAdminClient() || !getEmailOtpConfig()) {
    return { error: "Email verification is not configured yet. Please try again later." };
  }
  const result = await startEmailOtp(data.user, data.session);
  if (result.otpRequired) redirect("/login/verify?step=otp");
  return result;
}

export async function verifyLoginEmailOtp(_state: AuthState, formData: FormData): Promise<AuthState> {
  const code = z.string().regex(/^\d{6}$/).safeParse(formData.get("code"));
  if (!code.success) return { error: "Enter the six-digit code from your email.", otpRequired: true };
  const cookieStore = await cookies();
  const pending = decryptEmailOtpChallenge(cookieStore.get(emailOtpCookieName())?.value);
  if (!pending) {
    cookieStore.delete(emailOtpCookieName());
    return { error: "Your sign-in code expired. Sign in again to request a new one." };
  }
  const admin = createOtpAdminClient();
  if (!admin) return { error: "Email verification is not configured yet. Please contact support.", otpRequired: true };

  const { data: verified, error } = await admin.rpc("verify_email_otp_challenge", {
    p_challenge_id: pending.challengeId,
    p_code_digest: digestEmailOtp(code.data)
  });
  if (error || verified !== true) {
    return { error: "That code is invalid or expired. Check your email and try again.", otpRequired: true };
  }

  const supabase = await createClient();
  if (!supabase) {
    cookieStore.delete(emailOtpCookieName());
    return { error: "Authentication is not configured yet. Please try again later." };
  }
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: pending.accessToken,
    refresh_token: pending.refreshToken
  });
  if (sessionError) {
    cookieStore.delete(emailOtpCookieName());
    return { error: "Your sign-in expired. Sign in again to request a new code." };
  }

  const { data: claimData } = await supabase.auth.getClaims();
  const proof = createVerifiedSessionCookie(claimData?.claims?.sub, claimData?.claims?.session_id);
  if (!proof) {
    await supabase.auth.signOut({ scope: "local" });
    cookieStore.delete(emailOtpCookieName());
    return { error: "We couldn't finish your sign-in. Please try again." };
  }
  cookieStore.set(verifiedSessionCookieName(), proof, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: verifiedSessionCookieMaxAge()
  });

  cookieStore.delete(emailOtpCookieName());
  redirect(await destinationForRole(supabase));
}

export async function resendLoginEmailOtp(state: AuthState, formData: FormData): Promise<AuthState> {
  void state;
  void formData;
  const cookieStore = await cookies();
  const pending = decryptEmailOtpChallenge(cookieStore.get(emailOtpCookieName())?.value);
  if (!pending) {
    cookieStore.delete(emailOtpCookieName());
    return { error: "Your sign-in code expired. Sign in again to request a new one." };
  }
  const admin = createOtpAdminClient();
  if (!admin || !getEmailOtpConfig()) {
    return { error: "Email verification is not configured yet. Please contact support.", otpRequired: true };
  }

  const code = generateEmailOtp();
  const { data: challengeId, error } = await admin.rpc("begin_email_otp_challenge", {
    p_user_id: pending.userId,
    p_code_digest: digestEmailOtp(code)
  });
  if (error) {
    if (error.message.includes("otp_rate_limited")) {
      return { error: "A sign-in code was recently sent. Wait before requesting another.", otpRequired: true };
    }
    return { error: "We couldn't resend your code. Please try again later.", otpRequired: true };
  }
  if (typeof challengeId !== "string") return { error: "We couldn't resend your code. Please try again later.", otpRequired: true };

  try {
    const sent = await sendEmailOtp(pending.email, code);
    if (!sent) {
      await admin.rpc("cancel_email_otp_challenge", { p_challenge_id: challengeId });
      return { error: "We couldn't send a sign-in code. Please try again later.", otpRequired: true };
    }
  } catch {
    await admin.rpc("cancel_email_otp_challenge", { p_challenge_id: challengeId });
    return { error: "We couldn't send a sign-in code. Please try again later.", otpRequired: true };
  }

  await setPendingOtpCookie({ ...pending, challengeId, expiresAt: Math.floor(Date.now() / 1000) + emailOtpCookieMaxAge() });
  return { success: "A new sign-in code has been sent.", otpRequired: true };
}

export async function cancelPendingEmailOtp() {
  const cookieStore = await cookies();
  const pending = decryptEmailOtpChallenge(cookieStore.get(emailOtpCookieName())?.value);
  const admin = createOtpAdminClient();
  if (pending && admin) {
    try {
      await admin.rpc("cancel_email_otp_challenge", { p_challenge_id: pending.challengeId });
    } catch {
      // The local challenge cookie is still removed if database cleanup is unavailable.
    }
  }
  cookieStore.delete(emailOtpCookieName());
  redirect("/login");
}

export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.extend({ name: z.string().trim().min(2).max(120) }).safeParse({
    email: formData.get("email"), password: formData.get("password"), name: formData.get("name")
  });
  if (!parsed.success) return { error: "Add your name, a valid email, and a password with at least 10 characters." };
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication is not configured yet. Please try again later." };
  const siteUrl = getSiteUrl();
  if (!siteUrl) return { error: "Account verification is not configured yet. Please try again later." };
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.name }, emailRedirectTo: `${siteUrl}/auth/callback` }
  });
  if (error) return { error: "We could not create your account. Check your details or try signing in." };
  if (data.session) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Email confirmation is disabled in the Supabase project. Please contact support before creating an account." };
  }
  await setPendingConfirmationEmail(parsed.data.email);
  redirect("/login/verify?step=confirmation&sent=1");
}

export async function resendSignupConfirmation(_state: AuthState, formData: FormData): Promise<AuthState> {
  const emailValue = formData.get("email") || await getPendingConfirmationEmail();
  const email = z.string().trim().email().max(254).safeParse(emailValue);
  if (!email.success) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication is not configured yet. Please try again later." };
  const siteUrl = getSiteUrl();
  if (!siteUrl) return { error: "Email confirmation is not configured yet. Please try again later." };

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.data,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` }
  });
  if (error) return { error: "We couldn't request a new email right now. Check the address and try again later." };
  await setPendingConfirmationEmail(email.data);
  return { success: "If this address has an account waiting for confirmation, a new email is on its way." };
}

export async function requestPasswordReset(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = z.string().trim().email().max(254).safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication is not configured yet. Please try again later." };
  const siteUrl = getSiteUrl();
  if (!siteUrl) return { error: "Password reset is not configured yet. Please contact support." };
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${siteUrl}/auth/callback?next=/reset-password` });
  if (error) return { error: "We could not send a reset link. Try again later or contact support." };
  return { success: "If an account uses that address, a password reset link is on its way." };
}

export async function updatePassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const password = z.string().min(10).max(128).safeParse(formData.get("password"));
  if (!password.success) return { error: "Choose a password with at least 10 characters." };
  const supabase = await createClient();
  if (!supabase) return { error: "Authentication is not configured yet. Please try again later." };
  const { data: jwtData } = await supabase.auth.getClaims();
  const claims = jwtData?.claims;
  if (!claims) return { error: "Your reset link is invalid or has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: "We could not update your password. Request a new reset link and try again." };
  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(verifiedSessionCookieName());
  redirect("/login?password=updated");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(verifiedSessionCookieName());
  redirect("/login");
}
