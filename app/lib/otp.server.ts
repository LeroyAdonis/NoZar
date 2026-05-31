/**
 * Africa's Talking OTP — SMS-based phone verification.
 *
 * Storage: reuses Better Auth's `verifications` table.
 *   identifier = "phone_otp:<E.164 number>"  (prefix avoids collision with email flows)
 *   value      = 6-digit code
 *   expiresAt  = now + 10 min
 *
 * AT docs: https://developers.africastalking.com/docs/sms/sending
 */

import { randomInt } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "./db.server";
import { verifications } from "./schema";

// ─── Config ────────────────────────────────────────────────────

const SANDBOX = process.env.AFRICASTALKING_SANDBOX === "true";
const AT_BASE = SANDBOX
  ? "https://api.sandbox.africastalking.com"
  : "https://api.africastalking.com";

// Prefix keeps our OTP records isolated from Better Auth email identifiers.
const OTP_PREFIX = "phone_otp:";

// ─── Public helpers ─────────────────────────────────────────────

export function isOtpConfigured(): boolean {
  return !!(
    process.env.AFRICASTALKING_API_KEY &&
    process.env.AFRICASTALKING_USERNAME
  );
}

/**
 * Normalise a South African phone number to E.164 (+27XXXXXXXXX).
 * Accepts: 0XXXXXXXXX, 27XXXXXXXXX, +27XXXXXXXXX.
 * Returns null if the number cannot be recognised.
 */
export function normalizeZaPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  // Already prefixed without leading +
  if (digits.startsWith("27") && digits.length === 11) {
    return `+${digits}`;
  }
  // Local format 0XX
  if (digits.startsWith("0") && digits.length === 10) {
    return `+27${digits.slice(1)}`;
  }
  // Passed in as +27 (raw.startsWith is the guard; digits gives 27...)
  if (raw.startsWith("+27") && digits.length === 11) {
    return `+${digits}`;
  }
  return null;
}

// ─── OTP core ───────────────────────────────────────────────────

/** Generate a random 6-digit numeric OTP using a CSPRNG. */
function generateCode(): string {
  return String(randomInt(100000, 999999));
}

/**
 * Generate, store, and send an OTP to the given E.164 phone number.
 *
 * If AT credentials are not configured the code is stored but not sent —
 * useful during local development (the code is printed to the server log).
 *
 * Returns { code } so callers can log it in non-production environments.
 */
export async function sendOtp(phone: string): Promise<{ code: string }> {
  const code = generateCode();
  const identifier = `${OTP_PREFIX}${phone}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 min TTL

  // Remove any previous OTP for this number (prevents stale code reuse).
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

  // Send via Africa's Talking SMS API when credentials are available.
  if (isOtpConfigured()) {
    const apiKey = process.env.AFRICASTALKING_API_KEY!;
    const username = process.env.AFRICASTALKING_USERNAME!;
    const message = `Your NoZar verification code is ${code}. It expires in 10 minutes.`;
    const body = new URLSearchParams({ username, to: phone, message });

    // Try apiKey header first, fall back to Bearer token (both supported by AT)
    const res = await fetch(`${AT_BASE}/version1/messaging`, {
      method: "POST",
      headers: {
        apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      // Try Bearer auth as fallback (newer AT auth format)
      const bearerRes = await fetch(`${AT_BASE}/version1/messaging`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      if (!bearerRes.ok) {
        const text1 = await res.text();
        const text2 = await bearerRes.text();
        throw new Error(
          `Africa's Talking SMS failed. apiKey header: ${res.status} ${text1}. ` +
            `Bearer fallback: ${bearerRes.status} ${text2}.`,
        );
      }
    }
  } else {
    console.warn(
      "[otp] Africa's Talking not configured — OTP stored but NOT sent. " +
        `Code for ${phone}: ${code}. ` +
        "Set AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME in Vercel env vars.",
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

  // Consume the token — prevents replay attacks.
  await db.delete(verifications).where(eq(verifications.id, record.id));

  return true;
}
