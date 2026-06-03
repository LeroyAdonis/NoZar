import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { redirect } from "react-router";
import { db } from "./db.server";
import * as schema from "./schema";

// ─── Base URL Resolution ─────────────────────
/**
 * Resolves the base URL for Better Auth.
 *
 * Better Auth uses this to construct the OAuth callback URL:
 *   {baseURL}/api/auth/callback/google
 *
 * That URL must match exactly what is registered in the Google Cloud Console
 * as an "Authorized redirect URI".
 *
 * Priority:
 *   1. BETTER_AUTH_URL env var (explicit, always wins)
 *   2. VERCEL_PROJECT_PRODUCTION_URL (Vercel production domain, e.g. www.nozar.co.za)
 *   3. VERCEL_URL (Vercel deployment URL)
 *   4. http://localhost:5173 in development (Vite default)
 *   5. undefined (Better Auth will infer from the request — last resort)
 */
function resolveBaseURL(): string | undefined {
  // 1. Explicit env var — always wins
  const explicit = process.env.BETTER_AUTH_URL;
  if (explicit) return explicit;

  // 2. Vercel production URL (the custom domain like www.nozar.co.za)
  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prodUrl) return `https://${prodUrl}`;

  // 3. Vercel deployment URL (works on preview deploys too)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  // 4. Production fallback — both nozar.co.za and www.nozar.co.za go here
  // after Vercel's 308 redirect, so this is the canonical URL.
  if (process.env.NODE_ENV === "production") {
    return "https://www.nozar.co.za";
  }

  // 5. Dev fallback
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[auth] BETTER_AUTH_URL is not set — falling back to http://localhost:5173. " +
        "Add BETTER_AUTH_URL=http://localhost:5173 to .env.local to silence this warning.",
    );
    return "http://localhost:5173";
  }

  // 5. Last resort — Better Auth will infer from request headers
  console.error(
    "[auth] BETTER_AUTH_URL / VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL are all unset. " +
      "OAuth callbacks may resolve incorrectly. Set BETTER_AUTH_URL as a Vercel env var.",
  );
  return undefined;
}

// ─── Reset Password Email Template ─────────────────────

function getResetPasswordEmailHtml(url: string, name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    /* === Dark mode overrides ===
     * Email clients (Gmail, Outlook, Apple Mail) auto-invert colours on
     * dark-background emails, turning NoZar green (#10b981) into pink.
     * These overrides keep the NoZar brand colours intact. */
    :root { color-scheme: light dark; }

    /* Apple Mail / iOS Mail */
    @media (prefers-color-scheme: dark) {
      .nz-body  { background-color: #030712 !important; }
      .nz-card  { background-color: #0f172a !important; border-color: rgba(255,255,255,0.1) !important; }
      .nz-green { color: #10b981 !important; }
      .nz-btn   { background-color: #10b981 !important; color: #030712 !important; }
      .nz-white { color: #ffffff !important; }
      .nz-slate { color: #94a3b8 !important; }
      .nz-dim   { color: #475569 !important; }
    }

    /* Gmail dark mode */
    [data-ogsc] .nz-body  { background-color: #030712 !important; }
    [data-ogsc] .nz-card  { background-color: #0f172a !important; border-color: rgba(255,255,255,0.1) !important; }
    [data-ogsc] .nz-green { color: #10b981 !important; }
    [data-ogsc] .nz-btn   { background-color: #10b981 !important; color: #030712 !important; }
    [data-ogsc] .nz-white { color: #ffffff !important; }
    [data-ogsc] .nz-slate { color: #94a3b8 !important; }
    [data-ogsc] .nz-dim   { color: #475569 !important; }

    /* Outlook.com dark mode */
    [data-ogsb] .nz-body  { background-color: #030712 !important; }
    [data-ogsb] .nz-card  { background-color: #0f172a !important; border-color: rgba(255,255,255,0.1) !important; }
    [data-ogsb] .nz-green { color: #10b981 !important; }
    [data-ogsb] .nz-btn   { background-color: #10b981 !important; color: #030712 !important; }
    [data-ogsb] .nz-white { color: #ffffff !important; }
    [data-ogsb] .nz-slate { color: #94a3b8 !important; }
    [data-ogsb] .nz-dim   { color: #475569 !important; }

    /* Yahoo Mail dark mode */
    .yahoo-dark .nz-body  { background-color: #030712 !important; }
    .yahoo-dark .nz-card  { background-color: #0f172a !important; }
    .yahoo-dark .nz-green { color: #10b981 !important; }
    .yahoo-dark .nz-btn   { background-color: #10b981 !important; color: #030712 !important; }
    .yahoo-dark .nz-white { color: #ffffff !important; }
    .yahoo-dark .nz-slate { color: #94a3b8 !important; }
    .yahoo-dark .nz-dim   { color: #475569 !important; }
  </style>
</head>
<body class="nz-body" style="margin:0;padding:0;background-color:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 class="nz-green" style="font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-0.03em;color:#10b981;margin:0;">NoZar</h1>
    </div>
    <div class="nz-card" style="background:#0f172a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;">
      <h2 class="nz-white" style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 16px 0;">Reset Your Password</h2>
      <p class="nz-slate" style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Hey ${escapeHtml(name)}, we received a request to reset your password.
        This link expires in 1 hour.
      </p>
      <div style="text-align:center;">
        <a href="${escapeHtml(url)}" class="nz-btn"
          style="display:inline-block;background:#10b981;color:#030712;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;
          text-decoration:none;padding:14px 32px;border-radius:12px;">
          Reset Password
        </a>
      </div>
      <p class="nz-dim" style="color:#475569;font-size:12px;line-height:1.6;margin:24px 0 0 0;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    <p class="nz-dim" style="color:#475569;font-size:11px;text-align:center;margin-top:24px;">
      &copy; ${new Date().getFullYear()} NoZar. All rights reserved.
    </p>
  </div>
</body>
</html>`.trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Verification Email Template ────────────────────────────

function getVerificationEmailHtml(url: string, name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      .nz-body  { background-color: #030712 !important; }
      .nz-card  { background-color: #0f172a !important; border-color: rgba(255,255,255,0.1) !important; }
      .nz-green { color: #10b981 !important; }
      .nz-btn   { background-color: #10b981 !important; color: #030712 !important; }
      .nz-white { color: #ffffff !important; }
      .nz-slate { color: #94a3b8 !important; }
      .nz-dim   { color: #475569 !important; }
    }
    [data-ogsc] .nz-body  { background-color: #030712 !important; }
    [data-ogsc] .nz-card  { background-color: #0f172a !important; border-color: rgba(255,255,255,0.1) !important; }
    [data-ogsc] .nz-green { color: #10b981 !important; }
    [data-ogsc] .nz-btn   { background-color: #10b981 !important; color: #030712 !important; }
    [data-ogsc] .nz-white { color: #ffffff !important; }
    [data-ogsc] .nz-slate { color: #94a3b8 !important; }
    [data-ogsc] .nz-dim   { color: #475569 !important; }
    [data-ogsb] .nz-body  { background-color: #030712 !important; }
    [data-ogsb] .nz-card  { background-color: #0f172a !important; border-color: rgba(255,255,255,0.1) !important; }
    [data-ogsb] .nz-green { color: #10b981 !important; }
    [data-ogsb] .nz-btn   { background-color: #10b981 !important; color: #030712 !important; }
    [data-ogsb] .nz-white { color: #ffffff !important; }
    [data-ogsb] .nz-slate { color: #94a3b8 !important; }
    [data-ogsb] .nz-dim   { color: #475569 !important; }
    .yahoo-dark .nz-body  { background-color: #030712 !important; }
    .yahoo-dark .nz-card  { background-color: #0f172a !important; }
    .yahoo-dark .nz-green { color: #10b981 !important; }
    .yahoo-dark .nz-btn   { background-color: #10b981 !important; color: #030712 !important; }
    .yahoo-dark .nz-white { color: #ffffff !important; }
    .yahoo-dark .nz-slate { color: #94a3b8 !important; }
    .yahoo-dark .nz-dim   { color: #475569 !important; }
  </style>
</head>
<body class="nz-body" style="margin:0;padding:0;background-color:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 class="nz-green" style="font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-0.03em;color:#10b981;margin:0;">NoZar</h1>
    </div>
    <div class="nz-card" style="background:#0f172a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;">
      <h2 class="nz-white" style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 16px 0;">Verify Your Email</h2>
      <p class="nz-slate" style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Hey ${escapeHtml(name)}, thanks for joining NoZar! Please verify your email address to activate your account.
        This link expires in 24 hours.
      </p>
      <div style="text-align:center;">
        <a href="${escapeHtml(url)}" class="nz-btn"
          style="display:inline-block;background:#10b981;color:#030712;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;
          text-decoration:none;padding:14px 32px;border-radius:12px;">
          Verify Email
        </a>
      </div>
      <p class="nz-dim" style="color:#475569;font-size:12px;line-height:1.6;margin:24px 0 0 0;">
        If you didn't create a NoZar account, you can safely ignore this email.
      </p>
    </div>
    <p class="nz-dim" style="color:#475569;font-size:11px;text-align:center;margin-top:24px;">
      &copy; ${new Date().getFullYear()} NoZar. All rights reserved.
    </p>
  </div>
</body>
</html>`.trim();
}

export const auth = betterAuth({
  // D-09: Built-in TOTP 2FA plugin. Adds twoFactors table + users.twoFactorEnabled.
  // Better Auth encrypts the TOTP secret using BETTER_AUTH_SECRET (AES-256).
  plugins: [
    expo(),
    twoFactor({
      issuer: "NoZar",
    }),
  ],
  trustedOrigins: [
    "https://nozar.co.za",
    "https://www.nozar.co.za",
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: {
      ...schema,
      users: schema.users,
    },
  }),
  databaseHooks: {
    user: {
      create: {
        // D-03: Check fingerprint before user is persisted.
        // context.body carries extra signUp fields (fingerprintHash, deviceBypassToken).
        // For OAuth registrations context is null — fingerprint check is skipped here
        // and handled in the dashboard loader (D-06).
        before: async (_user, context) => {
          const body = (context as { body?: Record<string, unknown> } | null)?.body;
          const rawHash = body?.fingerprintHash;
          const fingerprintHash =
            typeof rawHash === "string" && /^[a-zA-Z0-9]{1,64}$/.test(rawHash)
              ? rawHash
              : null;

          // No fingerprint — allow (OAuth, no-JS, or first load). Skip check.
          if (!fingerprintHash) return;

          // D-05 bypass: if a valid one-time token is present, allow registration.
          const rawBypass = body?.deviceBypassToken;
          if (typeof rawBypass === "string" && rawBypass.length > 0) {
            const { verifications } = await import("./schema");
            const { eq, and, gt } = await import("drizzle-orm");
            const key = `device_bypass:${rawBypass}`;
            const [record] = await db
              .select()
              .from(verifications)
              .where(
                and(
                  eq(verifications.identifier, key),
                  gt(verifications.expiresAt, new Date()),
                ),
              )
              .limit(1);
            if (record) {
              // Consume the token (one-time use — prevents replay)
              await db.delete(verifications).where(eq(verifications.id, record.id));
              return; // Bypass granted
            }
            // Invalid or expired token — fall through to fingerprint check
          }

          // Query existing accounts for this fingerprint (limit 3 to detect hard-block)
          const { deviceFingerprints, trustProfiles } = await import("./schema");
          const { eq: eqDf, and: andDf, gte } = await import("drizzle-orm");
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

          const existing = await db
            .select({ userId: deviceFingerprints.userId })
            .from(deviceFingerprints)
            .where(
              andDf(
                eqDf(deviceFingerprints.fingerprintHash, fingerprintHash),
                gte(deviceFingerprints.firstSeenAt, thirtyDaysAgo),
              ),
            )
            .limit(3);

          if (existing.length === 0) return; // New device — allow

          const { APIError } = await import("better-auth");

          if (existing.length >= 2) {
            // D-07: Hard block — >2 accounts from same device in 30 days.
            // Flag existing accounts for admin review.
            const { eq: eqTp } = await import("drizzle-orm");
            await Promise.all(
              existing.map((e) =>
                db
                  .update(trustProfiles)
                  .set({ flagged: true, updatedAt: new Date() })
                  .where(eqTp(trustProfiles.userId, e.userId))
                  .catch(() => {}), // Trust profile may not exist yet
              ),
            );
            throw new APIError("FORBIDDEN", { message: "DEVICE_HARD_BLOCKED" });
          }

          // D-05: Soft block — duplicate fingerprint, phone OTP unlock available.
          throw new APIError("BAD_REQUEST", { message: "DEVICE_ALREADY_REGISTERED" });
        },

        after: async (user) => {
          const { users, profiles } = await import("./schema");
          const { eq } = await import("drizzle-orm");
          // Set referral code
          const code = randomBytes(4).toString("hex").toUpperCase();
          await db.update(users).set({ referralCode: code }).where(eq(users.id, user.id));
          // Create profile — pre-populate avatarUrl from Google OAuth image if available
          await db
            .insert(profiles)
            .values({
              userId: user.id,
              displayName: user.name || "NoZar User",
              avatarUrl: (user as { image?: string | null }).image ?? null,
            })
            .onConflictDoNothing();
        },
      },
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      // For unverified users: update the email directly, then send a new
      // verification email to the new address. This avoids a chicken-and-egg
      // problem where an unverified user can't access the dashboard to change
      // their email, but also can't verify because they typo'd the address.
      updateEmailWithoutVerification: true,
      // For verified users: send a confirmation email to the OLD address
      // before proceeding with the change. We reuse Resend for this.
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "NoZar <noreply@nozar.co.za>",
          to: user.email,
          subject: "Confirm Your Email Change — NoZar",
          html: getVerificationEmailHtml(url, user.name), // Reuse verify template
        }).catch((err: unknown) => {
          console.error(
            "[auth] sendChangeEmailConfirmation failed:",
            err instanceof Error ? err.message : err,
          );
        });
      },
    },
    additionalFields: {
      referralCode: {
        type: "string",
        fieldName: "referral_code",
      },
    },
  },
    emailAndPassword: {
    enabled: true,
    // Better Auth checks THIS requireEmailVerification for sign-up email
    // sending (via sendOnSignUp fallback) AND sign-in blocking in v1.6.11.
    // Do NOT move — it lives in emailAndPassword per Better Auth's internal
    // route checks (sign-up.mjs line 239, sign-in.mjs line 229).
    requireEmailVerification: true,
    async sendResetPassword({ user, url }) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Wrap in .catch so a Resend failure logs gracefully and doesn't
      // surface an internal error to the user during password-reset flow.
      const promise = resend.emails.send({
        from: "NoZar <noreply@nozar.co.za>",
        to: user.email,
        subject: "Reset Your NoZar Password",
        html: getResetPasswordEmailHtml(url, user.name),
      }).catch((err: unknown) => {
        console.error(
          "[auth] sendResetPassword failed:",
          err instanceof Error ? err.message : err,
        );
      });

      const wt = (globalThis as { waitUntil?: (p: Promise<unknown>) => void }).waitUntil;
      if (typeof wt === "function") {
        wt(promise);
      } else {
        await promise;
      }
    },
  },
  emailVerification: {
    // Send verification email immediately on sign-up.
    // Better Auth checks this FIRST (sign-up.mjs line 239), falling back
    // to emailAndPassword.requireEmailVerification only if unset.
    sendOnSignUp: true,
    // Block sign-in for users who have not yet verified their email address.
    // Better Auth defaults this to false; we must opt-in explicitly.
    requireEmailVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Skip email sending during Playwright E2E tests
      if (process.env.PLAYWRIGHT_TEST === "1") return;
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: "NoZar <noreply@nozar.co.za>",
        to: user.email,
        subject: "Verify Your NoZar Email",
        html: getVerificationEmailHtml(url, user.name),
      }).catch((err: unknown) => {
        console.error(
          "[auth] sendVerificationEmail failed:",
          err instanceof Error ? err.message : err,
        );
        return null;
      });
      if (result === null) {
        console.error("[auth] sendVerificationEmail: Resend returned null — check API key or Resend dashboard");
      }
    },
    // In E2E tests, auto-sign-in so registration flows work end-to-end
    // without needing a real verification email. Production requires verification.
    autoSignIn: process.env.PLAYWRIGHT_TEST === "1",
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  baseURL: resolveBaseURL(),
  secret: process.env.BETTER_AUTH_SECRET,
});

export const SAFE_AUTH_SIGNIN_MESSAGE =
  "Unable to sign in right now. Please try again in a moment.";

/**
 * Returns true if the error is a transient DB connectivity failure
 * (e.g. Neon free-tier cold start after auto-suspend).
 */
export function isTransientDbError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message + String((error as { cause?: unknown }).cause ?? "");
  // Better Auth wraps Neon connectivity errors as APIError with body.code = "FAILED_TO_GET_SESSION".
  // The message is "Failed to get session" (human-readable), so we must check body.code directly.
  const bodyCode =
    (error as { body?: { code?: string } }).body?.code ?? "";
  return (
    msg.includes("fetch failed") ||
    msg.includes("Error connecting to database") ||
    msg.includes("FAILED_TO_GET_SESSION") ||
    bodyCode === "FAILED_TO_GET_SESSION"
  );
}

/**
 * Require authentication in a loader/action.
 * Returns { user, session } if authenticated.
 * Throws redirect("/login") if not.
 * Retries once on transient DB errors (e.g. Neon cold start).
 */
export async function requireAuth(request: Request) {
  let session;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    // Wait for Neon compute to finish waking up, then retry once.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    session = await auth.api.getSession({ headers: request.headers });
  }

  if (!session) {
    throw redirect("/login");
  }

  return session;
}

/**
 * Optional auth check — returns session or null.
 * Use for pages that show different content based on auth state (e.g., landing page).
 * Retries once on transient DB errors (e.g. Neon cold start).
 */
export async function getOptionalSession(request: Request) {
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      return await auth.api.getSession({ headers: request.headers });
    } catch {
      // After retry, return null so the page still renders (unauthenticated).
      return null;
    }
  }
}
