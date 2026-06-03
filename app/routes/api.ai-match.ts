import type { ActionFunctionArgs } from "react-router";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "~/lib/db.server";
import { listings, profiles } from "~/lib/schema";
import { requireAuth } from "~/lib/auth.server";
import { findMatches } from "~/lib/ai-matching.server";
import { getUserTier } from "~/lib/tier-limits.server";
import { canUseAiFeature } from "~/lib/tier-limits";
import { resolveRegion, MVP_REGIONS } from "~/lib/regions";

/**
 * POST /api/ai-match
 *
 * Runs AI matching for the authenticated user, returning matched listing IDs
 * and swap scores as JSON (for mobile use).
 *
 * Cache: 5-minute TTL per user (shared with web home.tsx in-memory cache).
 */

type CacheEntry = {
  matchedIds: number[];
  swapScores: Record<number, number>;
  expiresAt: number;
};
const aiMatchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { user } = await requireAuth(request);

  // Tier check
  const tier = await getUserTier(user.id);
  if (!canUseAiFeature(tier, "ai_matching")) {
    return Response.json(
      { error: "ai_tier_restricted" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const regionParam = url.searchParams.get("region");

  const [regionProfile] = await db
    .select({ province: profiles.province })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const currentRegion = resolveRegion(regionParam, regionProfile?.province);
  const regionConfig = MVP_REGIONS[currentRegion];

  // Check cache
  const cached = aiMatchCache.get(user.id);
  if (cached && Date.now() < cached.expiresAt) {
    return Response.json({
      matchedIds: cached.matchedIds,
      swapScores: cached.swapScores,
      cached: true,
    });
  }

  // Get user's own listings
  const userListings = await db
    .select({
      title: listings.title,
      description: listings.description,
      seekingDescription: listings.seekingDescription,
      category: listings.category,
      estimatedValueZar: listings.estimatedValueZar,
    })
    .from(listings)
    .where(and(eq(listings.userId, user.id), eq(listings.status, "active")));

  if (userListings.length === 0) {
    return Response.json({ error: "no_listings" });
  }

  // Get region-scoped other listings
  const otherListings = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      seekingDescription: listings.seekingDescription,
      category: listings.category,
      type: listings.type,
      estimatedValueZar: listings.estimatedValueZar,
    })
    .from(listings)
    .innerJoin(profiles, eq(listings.userId, profiles.userId))
    .where(
      and(
        ne(listings.userId, user.id),
        eq(listings.status, "active"),
        eq(profiles.province, regionConfig.province),
      ),
    )
    .limit(50);

  if (otherListings.length === 0) {
    return Response.json({
      matchedIds: [],
      swapScores: {},
      _debug: "no_other_listings_in_province",
      _debugProvince: regionConfig.province,
    });
  }

  try {
    const result = await findMatches(
      user.id,
      userListings.map((l) => ({
        title: l.title,
        description: l.description,
        seekingDescription: l.seekingDescription,
        category: l.category,
      })),
      otherListings.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        seekingDescription: l.seekingDescription,
        category: l.category,
      })),
    );

    const swapScores: Record<number, number> = {};
    for (const [id, score] of result.scores) {
      swapScores[id] = Math.round(score * 100);
    }

    aiMatchCache.set(user.id, {
      matchedIds: result.matchedIds,
      swapScores,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return Response.json({
      matchedIds: result.matchedIds,
      swapScores,
      _debug: result.matchedIds.length === 0 ? "ai_match_found_none" : "ok",
      _debugCandidates: otherListings.length,
    });
  } catch (error) {
    return Response.json(
      { error: "AI matching unavailable — try again later" },
      { status: 500 },
    );
  }
}
