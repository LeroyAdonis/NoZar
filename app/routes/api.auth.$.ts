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

async function handleAuthRequest(request: Request) {
  try {
    return await auth.handler(request);
  } catch (error) {
    if (isEmailPasswordSignInRequest(request) && isTransientDbError(error)) {
      return Response.json(
        {
          code: "AUTH_SERVICE_UNAVAILABLE",
          message: SAFE_AUTH_SIGNIN_MESSAGE,
        },
        { status: 503 },
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
