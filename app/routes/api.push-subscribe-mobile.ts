import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { expoPushTokens } from "~/lib/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/push-subscribe-mobile
 *
 * Registers an Expo push token for the authenticated user.
 *
 * Body: { token: string, platform: "android" | "ios" }
 * Returns: { ok: true }
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { user } = await requireAuth(request);
  const body = await request.json();
  const { token, platform } = body;

  if (!token || typeof token !== "string" || !token.trim()) {
    return Response.json({ error: "token is required" }, { status: 400 });
  }

  const validPlatforms = ["android", "ios"];
  const plat = platform && validPlatforms.includes(platform) ? platform : "android";

  await db
    .insert(expoPushTokens)
    .values({
      userId: user.id,
      token: token.trim(),
      platform: plat,
    })
    .onConflictDoUpdate({
      target: expoPushTokens.token,
      set: {
        userId: user.id,
        platform: plat,
        updatedAt: new Date(),
      },
    });

  return Response.json({ ok: true });
}
