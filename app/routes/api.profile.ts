import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { eq, or, avg, count } from "drizzle-orm";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { profiles, users, trades, ratings, subscriptions } from "~/lib/schema";
import { sanitizeImageUrl, validateImageUrl } from "~/lib/media-validation.server";

/**
 * GET /api/profile — Returns user profile, tier info, and stats
 * POST /api/profile — Updates profile fields (displayName, bio, suburb, city, province, avatarUrl)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);

  // Fetch or upsert profile
  let [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  if (!profile) {
    const [created] = await db
      .insert(profiles)
      .values({
        userId: user.id,
        displayName: user.name || "NoZar User",
        avatarUrl: user.image ?? null,
      })
      .returning();
    profile = created;
  }

  // Subscription / tier
  const [sub] = await db
    .select({
      planCode: subscriptions.planCode,
      status: subscriptions.status,
      promoExpiresAt: subscriptions.promoExpiresAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  // Determine effective tier
  let planCode = "free";
  if (sub?.status === "active") planCode = sub.planCode ?? "free";
  else if (sub?.status === "promo" && sub.promoExpiresAt && sub.promoExpiresAt > new Date())
    planCode = "plus";

  // Stats
  const [tradeStats] = await db
    .select({ value: count() })
    .from(trades)
    .where(
      or(eq(trades.initiatorId, user.id), eq(trades.responderId, user.id)),
    );

  const [completedStats] = await db
    .select({ value: count() })
    .from(trades)
    .where(
      or(
        eq(trades.initiatorId, user.id),
        eq(trades.responderId, user.id),
      ),
      eq(trades.status, "completed"),
    );

  const [ratingStats] = await db
    .select({ value: avg(ratings.score) })
    .from(ratings)
    .where(eq(ratings.rateeId, user.id));

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    },
    profile: {
      displayName: profile.displayName,
      bio: profile.bio,
      suburb: profile.suburb,
      city: profile.city,
      province: profile.province,
      avatarUrl: profile.avatarUrl,
      phone: profile.phone,
      phoneVerified: profile.phoneVerified,
      searchRadiusKm: profile.searchRadiusKm,
    },
    tier: {
      planCode,
      status: sub?.status ?? "free",
      promoExpiresAt: sub?.promoExpiresAt ?? null,
    },
    stats: {
      totalTrades: tradeStats?.value ?? 0,
      completedTrades: completedStats?.value ?? 0,
      avgRating: ratingStats?.value ? Math.round(Number(ratingStats.value) * 10) / 10 : null,
    },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { user } = await requireAuth(request);
  const body = await request.json();

  const updateData: Record<string, any> = {};

  // Allowed fields
  if (body.displayName !== undefined) {
    if (typeof body.displayName !== "string" || !body.displayName.trim()) {
      return Response.json({ error: "Display name is required" }, { status: 400 });
    }
    updateData.displayName = body.displayName.trim();
  }
  if (body.bio !== undefined) updateData.bio = body.bio;
  if (body.suburb !== undefined) updateData.suburb = body.suburb;
  if (body.city !== undefined) updateData.city = body.city;
  if (body.province !== undefined) updateData.province = body.province;
  if (body.searchRadiusKm !== undefined) updateData.searchRadiusKm = body.searchRadiusKm;

  // Validate avatar URL
  if (body.avatarUrl !== undefined) {
    if (body.avatarUrl === null || body.avatarUrl === "") {
      updateData.avatarUrl = null;
    } else {
      const sanitized = sanitizeImageUrl(body.avatarUrl);
      const result = validateImageUrl(sanitized);
      if (!result.valid) {
        return Response.json(
          { error: result.error ?? "Invalid image URL" },
          { status: 400 },
        );
      }
      updateData.avatarUrl = sanitized;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  await db
    .update(profiles)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(profiles.userId, user.id));

  return Response.json({ updated: true, fields: Object.keys(updateData) });
}
