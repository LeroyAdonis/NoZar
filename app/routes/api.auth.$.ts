import type { Route } from "./+types/api.auth.$";
import {
  auth,
  isTransientDbError,
  SAFE_AUTH_SIGNIN_MESSAGE,
} from "~/lib/auth.server";

function isEmailPasswordSignInRequest(request: Request): boolean {
  if (request.method !== "POST") {
    return false;
  }

  const { pathname } = new URL(request.url);
  return pathname.endsWith("/sign-in/email");
}

/**
 * Returns true for any request that is part of the social (OAuth) flow:
 * - POST /api/auth/sign-in/social  — initiates the OAuth redirect
 * - GET  /api/auth/callback/:provider — handles the provider callback
 *
 * Errors on these paths must never surface as HTTP 500 because the user
 * has no way to recover from a raw error page mid-OAuth flow. We redirect
 * to /login with a query param so the UI can show a friendly message.
 */
function isSocialAuthRequest(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return (
    pathname.endsWith("/sign-in/social") ||
    /\/callback\/\w+$/.test(pathname)
  );
}

async function handleAuthRequest(request: Request) {
  try {
    return await auth.handler(request);
  } catch (error) {
    // Transient DB error during email/password sign-in — return 503 JSON so
    // the client-side form can show a retry message without crashing.
    if (isEmailPasswordSignInRequest(request) && isTransientDbError(error)) {
      return Response.json(
        {
          code: "AUTH_SERVICE_UNAVAILABLE",
          message: SAFE_AUTH_SIGNIN_MESSAGE,
        },
        { status: 503 },
      );
    }

    // Any error during the social (OAuth) flow — redirect to the login page
    // with an error flag so the UI can show a user-friendly message.
    // Logging here is intentional: this surfaces misconfigurations (wrong
    // BETTER_AUTH_URL, invalid Google credentials, etc.) in server logs
    // without leaking details to the browser.
    if (isSocialAuthRequest(request)) {
      console.error("[auth] Social OAuth error:", error);
      return Response.redirect(
        new URL("/login?error=oauth_error", request.url),
        302,
      );
    }

    throw error;
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  return handleAuthRequest(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleAuthRequest(request);
}
