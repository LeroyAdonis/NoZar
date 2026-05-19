import crypto from "node:crypto";

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
