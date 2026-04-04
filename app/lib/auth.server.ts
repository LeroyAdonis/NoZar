import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { redirect } from "react-router";
import { db } from "./db.server";
import * as schema from "./schema";

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
 *   2. http://localhost:3000 in development (safe default, avoids a silent misconfiguration)
 *   3. undefined in production (Better Auth will attempt to infer from the request,
 *      but this is unreliable — always set BETTER_AUTH_URL in production env vars)
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

  // Production with no BETTER_AUTH_URL: log a hard error so it shows up in
  // deployment logs, then let Better Auth try to infer it.
  console.error(
    "[auth] BETTER_AUTH_URL is not set in production. " +
      "Google OAuth callback URLs will be wrong and sign-in will fail. " +
      "Set BETTER_AUTH_URL to the canonical public URL of this deployment.",
  );
  return undefined;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema,
  }),
  emailAndPassword: {
    enabled: true,
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
