import crypto from "node:crypto";
import { promises as dns } from "node:dns";

/**
 * PHP-style URL encoding used by PayFast.
 * - Spaces become %20 (not +)
 * - Hex digits uppercase
 * - All reserved chars encoded
 */
function pfEncode(value: string): string {
  return encodeURIComponent(value).replace(/%[0-9a-f]{2}/g, (m) =>
    m.toUpperCase(),
  );
}

/**
 * Build a PayFast MD5 signature.
 *
 * Field order MUST match the order PayFast expects:
 *  - For outgoing form: the order specified in PayFast docs (merchant_id first, etc.)
 *  - For incoming ITN verification: the order fields were received in
 *
 * Empty-string values are excluded per PayFast convention.
 */
export function buildPayFastSignature(
  fields: Array<[string, string]>,
  passphrase: string,
): string {
  const parts = fields
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${pfEncode(v)}`);

  if (passphrase) {
    parts.push(`passphrase=${pfEncode(passphrase)}`);
  }

  const signatureString = parts.join("&");
  return crypto.createHash("md5").update(signatureString).digest("hex");
}

/**
 * Verify an inbound PayFast ITN signature against the merchant passphrase.
 *
 * Uses the field order as received from PayFast (URLSearchParams preserves
 * insertion order, matching the raw POST body order on Node 18+).
 */
export function verifyItnSignature(
  formData: URLSearchParams,
  passphrase: string,
): boolean {
  const provided = formData.get("signature");
  if (!provided) return false;

  const fields: Array<[string, string]> = [];
  for (const [key, value] of formData.entries()) {
    if (key === "signature") continue;
    fields.push([key, value]);
  }

  const expected = buildPayFastSignature(fields, passphrase);
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(provided, "utf8"),
    Buffer.from(expected, "utf8"),
  );
}

const PAYFAST_HOSTNAMES = [
  "www.payfast.co.za",
  "sandbox.payfast.co.za",
  "w1w.payfast.co.za",
  "w2w.payfast.co.za",
] as const;

let cachedIps: { ips: Set<string>; expiresAt: number } | null = null;
const IP_CACHE_TTL_MS = 60 * 60 * 1000;

async function refreshPayFastIps(): Promise<Set<string>> {
  const results = await Promise.all(
    PAYFAST_HOSTNAMES.map(async (host) => {
      try {
        return await dns.resolve4(host);
      } catch {
        return [] as string[];
      }
    }),
  );
  return new Set(results.flat());
}

export async function isPayFastSourceIp(ip: string): Promise<boolean> {
  const now = Date.now();
  if (!cachedIps || cachedIps.expiresAt < now) {
    cachedIps = {
      ips: await refreshPayFastIps(),
      expiresAt: now + IP_CACHE_TTL_MS,
    };
  }
  return cachedIps.ips.has(ip);
}

const PAYFAST_HOSTS = {
  live: "https://www.payfast.co.za",
  sandbox: "https://sandbox.payfast.co.za",
} as const;

function payFastHost(): string {
  return process.env.PAYFAST_MODE === "sandbox"
    ? PAYFAST_HOSTS.sandbox
    : PAYFAST_HOSTS.live;
}

/**
 * POST the ITN body back to PayFast to confirm it was actually sent by them.
 * PayFast responds with the literal string "VALID" or "INVALID".
 */
export async function validateItnWithPayFast(
  formData: URLSearchParams,
): Promise<boolean> {
  const body = formData.toString();
  const res = await fetch(`${payFastHost()}/eng/query/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return false;
  const text = (await res.text()).trim();
  return text === "VALID";
}

/**
 * Cancel an active PayFast subscription via the recurring billing API.
 * https://developers.payfast.co.za/docs#subscriptions
 */
export async function cancelSubscription(token: string): Promise<void> {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";
  if (!merchantId) throw new Error("PAYFAST_MERCHANT_ID not set");

  const timestamp = new Date().toISOString();
  const headers: Record<string, string> = {
    "merchant-id": merchantId,
    version: "v1",
    timestamp,
  };

  const fields: Array<[string, string]> = Object.entries(headers).sort(
    ([a], [b]) => a.localeCompare(b),
  ) as Array<[string, string]>;
  const signature = buildPayFastSignature(fields, passphrase);

  const res = await fetch(
    `https://api.payfast.co.za/subscriptions/${encodeURIComponent(token)}/cancel?testing=${process.env.PAYFAST_MODE === "sandbox" ? "true" : "false"}`,
    {
      method: "PUT",
      headers: { ...headers, signature },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayFast cancel failed: ${res.status} ${body}`);
  }
}
