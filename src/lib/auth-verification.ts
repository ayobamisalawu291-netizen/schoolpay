import "server-only";

import { cookies } from "next/headers";

const CONFIRMATION_EMAIL_COOKIE = "schoolpay_confirmation_email";
const CONFIRMATION_EMAIL_TTL_SECONDS = 30 * 60;

export async function setPendingConfirmationEmail(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(CONFIRMATION_EMAIL_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CONFIRMATION_EMAIL_TTL_SECONDS
  });
}

export async function getPendingConfirmationEmail() {
  return (await cookies()).get(CONFIRMATION_EMAIL_COOKIE)?.value ?? null;
}

export async function clearPendingConfirmationEmail() {
  (await cookies()).delete(CONFIRMATION_EMAIL_COOKIE);
}
