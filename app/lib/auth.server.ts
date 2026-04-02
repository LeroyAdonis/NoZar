import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { redirect } from "react-router";
import { db } from "./db.server";
import * as schema from "./schema";

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
  baseURL: process.env.BETTER_AUTH_URL,
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
