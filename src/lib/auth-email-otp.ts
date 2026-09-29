import "server-only";

import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, randomInt } from "node:crypto";
import nodemailer from "nodemailer";
import { z } from "zod";

const COOKIE_NAME = "schoolpay_email_otp";
const OTP_TTL_SECONDS = 10 * 60;

const challengePayloadSchema = z.object({
  version: z.literal(1),
  challengeId: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email().max(254),
  accessToken: z.string().min(20).max(8192),
  refreshToken: z.string().min(20).max(4096),
  expiresAt: z.number().int()
});

export type EmailOtpChallengePayload = z.infer<typeof challengePayloadSchema>;

function deriveKey(purpose: string) {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret || secret.length < 32) throw new Error("Email OTP server configuration is incomplete.");
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret), Buffer.from("schoolpay-auth"), Buffer.from(purpose), 32));
}

type EmailOtpConfig =
  | { provider: "smtp"; host: string; port: 465 | 587; user: string; password: string; from: string }
  | { provider: "resend"; apiKey: string; from: string };

export function getEmailOtpConfig(): EmailOtpConfig | null {
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  const host = process.env.AUTH_SMTP_HOST?.trim();
  const rawPort = process.env.AUTH_SMTP_PORT?.trim();
  const user = process.env.AUTH_SMTP_USER?.trim();
  const password = process.env.AUTH_SMTP_PASS?.trim();
  const port = rawPort === "465" ? 465 : rawPort === "587" ? 587 : null;
  const smtpIsPartiallyConfigured = Boolean(host || rawPort || user || password);

  if (smtpIsPartiallyConfigured) {
    if (!host || !port || !user || !password || !from) return null;
    return { provider: "smtp", host, port, user, password, from };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || !from) return null;
  return { provider: "resend", apiKey, from };
}

export function generateEmailOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function digestEmailOtp(code: string) {
  return createHmac("sha256", deriveKey("otp-digest-v1")).update(code).digest("hex");
}

export function encryptEmailOtpChallenge(payload: EmailOtpChallengePayload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("challenge-cookie-v1"), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptEmailOtpChallenge(value: string | undefined): EmailOtpChallengePayload | null {
  if (!value || value.length > 16_384) return null;
  try {
    const [version, ivValue, tagValue, bodyValue, extra] = value.split(".");
    if (version !== "v1" || !ivValue || !tagValue || !bodyValue || extra !== undefined) return null;
    const iv = Buffer.from(ivValue, "base64url");
    const tag = Buffer.from(tagValue, "base64url");
    const body = Buffer.from(bodyValue, "base64url");
    if (iv.length !== 12 || tag.length !== 16 || body.length === 0) return null;
    const decipher = createDecipheriv("aes-256-gcm", deriveKey("challenge-cookie-v1"), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
    const parsed = challengePayloadSchema.safeParse(JSON.parse(plaintext));
    if (!parsed.success || parsed.data.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function emailOtpCookieName() {
  return COOKIE_NAME;
}

export function emailOtpCookieMaxAge() {
  return OTP_TTL_SECONDS;
}

export async function sendEmailOtp(to: string, code: string) {
  const config = getEmailOtpConfig();
  if (!config) return false;

  const text = `Your SchoolPay verification code is ${code}. It expires in 10 minutes. If you didn't request this code, you can ignore this email.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#183249"><p style="font-size:16px">Use this code to finish signing in to SchoolPay:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">${code}</p><p>This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p></div>`;

  if (config.provider === "smtp") {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      requireTLS: config.port === 587,
      auth: { user: config.user, pass: config.password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      disableFileAccess: true,
      disableUrlAccess: true
    });
    try {
      const result = await transport.sendMail({
        from: config.from,
        to,
        subject: "Your SchoolPay sign-in code",
        text,
        html
      });
      return result.accepted.some((address) => address.toLowerCase() === to.toLowerCase());
    } finally {
      transport.close();
    }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from: config.from,
      to: [to],
      subject: "Your SchoolPay sign-in code",
      text,
      html
    })
  });
  return response.ok;
}
