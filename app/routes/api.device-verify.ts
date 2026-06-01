/**
 * POST /api/device-verify
 *
 * Unauthenticated endpoint. Two actions:
 *
 *   action: "sendOtp"   — normalises SA phone, calls sendOtp, returns { sent: true }
 *   action: "verifyOtp" — validates OTP, issues a short-lived bypass token stored
 *                         in the Better Auth verifications table under the key
 *                         "device_bypass:{uuid}". Returns { bypassToken: uuid }.
 *                         The token is consumed (deleted) by the databaseHooks.user.create.before
 *                         hook in auth.server.ts.
 *
 * Bypass token TTL: 5 minutes.
 */
import type { Route } from "./+types/api.device-verify";
import { db } from "~/lib/db.server";
import { verifications } from "~/lib/schema";
import { sendOtp, verifyOtp, normalizeZaPhone } from "~/lib/otp.server";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action: actionType, phone, code } = body;

  // ── sendOtp ──────────────────────────────────────────────────────
  if (actionType === "sendOtp") {
    const normalized = normalizeZaPhone(String(phone ?? ""));
    if (!normalized) {
      return Response.json(
        { error: "Invalid SA phone number. Use format: 082 123 4567" },
        { status: 400 },
      );
    }
    try {
      await sendOtp(normalized);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[device-verify] sendOtp failed:", msg);
      return Response.json(
        { error: "Could not send verification code. Please try again." },
        { status: 500 },
      );
    }
    return Response.json({ sent: true });
  }

  // ── verifyOtp → issue bypass token ───────────────────────────────
  if (actionType === "verifyOtp") {
    const normalized = normalizeZaPhone(String(phone ?? ""));
    if (!normalized) {
      return Response.json(
        { error: "Invalid SA phone number" },
        { status: 400 },
      );
    }
    const codeStr = String(code ?? "").trim();
    if (!codeStr || !/^\d{6}$/.test(codeStr)) {
      return Response.json({ error: "Enter a 6-digit code" }, { status: 400 });
    }

    const isValid = await verifyOtp(normalized, codeStr);
    if (!isValid) {
      return Response.json(
        { error: "Invalid or expired code. Request a new one." },
        { status: 400 },
      );
    }

    // Issue a one-time bypass token (5-min TTL)
    const token = crypto.randomUUID();
    const now = new Date();
    await db.insert(verifications).values({
      id: crypto.randomUUID(),
      identifier: `device_bypass:${token}`,
      value: "verified",
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    });

    return Response.json({ bypassToken: token });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
