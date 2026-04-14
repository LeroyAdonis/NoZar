import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
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
 *   2. http://localhost:5173 in development (Vite default)
 *   3. undefined in production (Better Auth will attempt to infer from the request)
 */
function resolveBaseURL(): string | undefined {
  const url = process.env.BETTER_AUTH_URL;
  if (url) return url;

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[auth] BETTER_AUTH_URL is not set — falling back to http://localhost:5173. " +
        "Add BETTER_AUTH_URL=http://localhost:5173 to .env.local to silence this warning.",
    );
    return "http://localhost:5173";
  }

  console.error(
    "[auth] BETTER_AUTH_URL is not set in production. " +
      "Google OAuth callback URLs will be wrong and sign-in will fail. " +
      "Set BETTER_AUTH_URL to the canonical public URL of this deployment.",
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
</head>
<body style="margin:0;padding:0;background-color:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-0.03em;color:#10b981;margin:0;">NoZar</h1>
    </div>
    <div style="background:#0f172a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;">
      <h2 style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 16px 0;">Reset Your Password</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Hey ${escapeHtml(name)}, we received a request to reset your password.
        This link expires in 1 hour.
      </p>
      <div style="text-align:center;">
        <a href="${escapeHtml(url)}"
          style="display:inline-block;background:#10b981;color:#030712;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;
          text-decoration:none;padding:14px 32px;border-radius:12px;">
          Reset Password
        </a>
      </div>
      <p style="color:#475569;font-size:12px;line-height:1.6;margin:24px 0 0 0;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    <p style="color:#475569;font-size:11px;text-align:center;margin-top:24px;">
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
    .replace(/"/g, "&quot;");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: {
      ...schema,
      users: schema.users,
    },
  }),
  user: {
    additionalFields: {
      referralCode: {
        type: "string",
        fieldName: "referral_code",
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Don't await — prevent timing attacks; serverless platforms
      // need waitUntil or similar to ensure delivery.
      void resend.emails.send({
        from: "NoZar <noreply@nozar.app>",
        to: user.email,
        subject: "Reset Your NoZar Password",
        html: getResetPasswordEmailHtml(url, user.name),
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
  return (
    msg.includes("fetch failed") ||
    msg.includes("Error connecting to database") ||
    msg.includes("FAILED_TO_GET_SESSION")
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
