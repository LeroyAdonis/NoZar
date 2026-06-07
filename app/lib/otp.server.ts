/**
 * OTP — SMS-based phone verification.
 *
 * Sending priority: Brevo SMS > Africa's Talking SMS > console log (dev mode).
 *
 * Storage: reuses Better Auth's `verifications` table.
 *   identifier = "phone_otp:<E.164 number>"  (prefix avoids collision with email flows)
 *   value      = 6-digit code
 *   expiresAt  = now + 10 min
 */

import { randomInt } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "./db.server";
import { verifications } from "./schema";
import { brevo } from "./brevo.server";

// ─── Config ────────────────────────────────────────────────────

const OTP_PREFIX = "phone_otp:";

const SANDBOX = process.env.AFRICASTALKING_SANDBOX === "true";
const AT_BASE = SANDBOX
  ? "https://api.sandbox.africastalking.com"
  : "https://api.africastalking.com";

// ─── Public helpers ─────────────────────────────────────────────

export function isOtpConfigured(): boolean {
  return !!(
    (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim() !== "") ||
    (process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME)
  );
}

/**
 * Normalise a South African phone number to E.164 (+27XXXXXXXXX).
 * Accepts: 0XXXXXXXXX, 27XXXXXXXXX, +27XXXXXXXXX.
 * Returns null if the number cannot be recognised.
 */
export function normalizeZaPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("27") && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+27${digits.slice(1)}`;
  }
  if (raw.startsWith("+27") && digits.length === 11) {
    return `+${digits}`;
  }
  return null;
}

// ─── OTP senders ────────────────────────────────────────────────

/** Send SMS via Brevo. Returns true on success. */
async function tryBrevoSms(phone: string, code: string): Promise<boolean> {
  const msg = `Your NoZar verification code is ${code}. It expires in 10 minutes.`;
  const result = await brevo.sendSms(phone, msg);
  return result.success;
}

/** Send SMS via Africa's Talking. Returns true on success. */
async function tryATSms(phone: string, code: string): Promise<boolean> {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;
  if (!apiKey || !username) return false;

  const message = `Your NoZar verification code is ${code}. It expires in 10 minutes.`;
  const body = new URLSearchParams({ username, to: phone, message });

  // Try apiKey header first
  const res = await fetch(`${AT_BASE}/version1/messaging`, {
    method: "POST",
    headers: {
      apiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (res.ok) return true;

  // Fallback to Bearer auth
  const bearerRes = await fetch(`${AT_BASE}/version1/messaging`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  return bearerRes.ok;
}

// ─── OTP core ───────────────────────────────────────────────────

/** Generate a random 6-digit numeric OTP using a CSPRNG. */
function generateCode(): string {
  return String(randomInt(100000, 999999));
}

/**
 * Generate, store, and send an OTP to the given E.164 phone number.
 *
 * Priority: Brevo SMS > Africa's Talking SMS > console log.
 *
 * Returns { code } so callers can log it in non-production environments.
 */
export async function sendOtp(phone: string): Promise<{ code: string }> {
  const code = generateCode();
  const identifier = `${OTP_PREFIX}${phone}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  // Remove any previous OTP for this number.
  await db.delete(verifications).where(eq(verifications.identifier, identifier));

  // Persist the new OTP.
  await db.insert(verifications).values({
    id: crypto.randomUUID(),
    identifier,
    value: code,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  // Try Brevo first, then AT, then log.
  if (await tryBrevoSms(phone, code)) {
    console.log(`[otp] sent via Brevo → ${phone}`);
  } else if (await tryATSms(phone, code)) {
    console.log(`[otp] sent via Africa's Talking → ${phone}`);
  } else {
    console.warn(
      "[otp] No SMS provider configured — OTP stored but NOT sent. " +
        `Code for ${phone}: ${code}. ` +
        "Set BREVO_API_KEY or AFRICASTALKING_API_KEY/AFRICASTALKING_USERNAME.",
    );
  }

  return { code };
}

/**
 * Verify a code against the stored OTP.
 * Deletes the record on success (one-time use).
 * Returns true if the code matches and has not expired.
 */
export async function verifyOtp(
  phone: string,
  code: string,
): Promise<boolean> {
  const identifier = `${OTP_PREFIX}${phone}`;
  const now = new Date();

  const [record] = await db
    .select()
    .from(verifications)
    .where(
      and(
        eq(verifications.identifier, identifier),
        eq(verifications.value, code),
        gt(verifications.expiresAt, now),
      ),
    )
    .limit(1);

  if (!record) return false;

  await db.delete(verifications).where(eq(verifications.id, record.id));
  return true;
}
