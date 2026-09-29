import "server-only";

import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "schoolpay_verified_session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signingKey() {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret || secret.length < 32) return null;
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret), Buffer.from("schoolpay-auth"), Buffer.from("verified-session-v1"), 32));
}

function signature(key: Buffer, userId: string, sessionId: string, expiresAt: number) {
  return createHmac("sha256", key).update(`${userId}:${sessionId}:${expiresAt}`).digest();
}

export function verifiedSessionCookieName() {
  return COOKIE_NAME;
}

export function verifiedSessionCookieMaxAge() {
  return COOKIE_MAX_AGE;
}

export function createVerifiedSessionCookie(userId: unknown, sessionId: unknown) {
  const key = signingKey();
  if (!key || typeof userId !== "string" || typeof sessionId !== "string" || !UUID.test(userId) || !UUID.test(sessionId)) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  return `v1.${expiresAt}.${signature(key, userId, sessionId, expiresAt).toString("base64url")}`;
}

export function isVerifiedSessionCookie(value: string | undefined, userId: unknown, sessionId: unknown) {
  const key = signingKey();
  if (!key || !value || value.length > 160 || typeof userId !== "string" || typeof sessionId !== "string" || !UUID.test(userId) || !UUID.test(sessionId)) return false;
  const [version, expiry, mac, extra] = value.split(".");
  if (version !== "v1" || !expiry || !/^[0-9]{10}$/.test(expiry) || !mac || extra !== undefined) return false;
  const expiresAt = Number(expiry);
  if (expiresAt <= Math.floor(Date.now() / 1000) || expiresAt > Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE) return false;
  const provided = Buffer.from(mac, "base64url");
  const expected = signature(key, userId, sessionId, expiresAt);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
