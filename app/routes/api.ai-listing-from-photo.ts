import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { generateListingFromPhoto } from "~/lib/vision-ai.server";
import { getUserTier } from "~/lib/tier-limits.server";
import { canUseAiFeature } from "~/lib/tier-limits";

/**
 * POST /api/ai-listing-from-photo
 *
 * Accepts { imageUrl: string } and returns an AI-generated listing suggestion
 * with title, description, category, and estimated value.
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Auth gate
  const { user } = await requireAuth(request);

  // Tier check — AI auto-fill requires Plus or above
  const tier = await getUserTier(user.id);
  if (!canUseAiFeature(tier, "ai_description")) {
    return Response.json(
      { error: "ai_tier_restricted" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
      return Response.json(
        { error: "imageUrl is required" },
        { status: 400 },
      );
    }

    const suggestion = await generateListingFromPhoto(imageUrl.trim());
    return Response.json(suggestion);
  } catch (error) {
    console.error("[ai-listing-from-photo] Error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI auto-fill failed. Please try again or fill in the details manually.",
      },
      { status: 500 },
    );
  }
}
