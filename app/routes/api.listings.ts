import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { and, desc, eq, inArray, ne, ilike, or } from "drizzle-orm";
import { db } from "~/lib/db.server";
import { listings, listingImages, profiles, users } from "~/lib/schema";
import { requireAuth, getOptionalSession } from "~/lib/auth.server";
import { haversineKm, formatDistance } from "~/lib/utils";
import { getListingUsage } from "~/lib/tier-limits.server";
import { resolveRegion, MVP_REGIONS } from "~/lib/regions";
import { sanitizeImageUrl, validateImageUrl } from "~/lib/media-validation.server";

/**
 * GET /api/listings — Returns active listings as JSON (for mobile feed)
 * POST /api/listings — Creates a new listing from JSON body (for mobile add)
 */

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const searchQuery = url.searchParams.get("q");
  const scope = url.searchParams.get("scope") ?? "local";

  // Optional auth — if authenticated, exclude own listings and compute distance
  const session = await getOptionalSession(request);
  const userId = session?.user?.id;

  // Resolve user profile for region + distance if authenticated
  let userProfile: { lat: number | null; lng: number | null; province: string | null } | null = null;
  if (userId) {
    const [profile] = await db
      .select({ lat: profiles.lat, lng: profiles.lng, province: profiles.province })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    userProfile = profile ?? null;
  }

  const currentRegion = resolveRegion(null, userProfile?.province);
  const regionConfig = MVP_REGIONS[currentRegion];

  const searchFilter = searchQuery
    ? or(
        ilike(listings.title, `%${searchQuery}%`),
        ilike(listings.description, `%${searchQuery}%`),
      )
    : undefined;

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      seekingDescription: listings.seekingDescription,
      category: listings.category,
      type: listings.type,
      estimatedValueZar: listings.estimatedValueZar,
      condition: listings.condition,
      createdAt: listings.createdAt,
      lat: listings.lat,
      lng: listings.lng,
      userName: users.name,
      isVerified: users.emailVerified,
    })
    .from(listings)
    .innerJoin(users, eq(listings.userId, users.id))
    .innerJoin(profiles, eq(listings.userId, profiles.userId))
    .where(
      and(
        eq(listings.status, "active"),
        scope === "national"
          ? undefined
          : eq(profiles.province, regionConfig.province),
        userId ? ne(listings.userId, userId) : undefined,
        searchFilter,
      ),
    )
    .orderBy(desc(listings.createdAt))
    .limit(50);

  const listingIds = rows.map((r) => r.id);
  const images = listingIds.length > 0
    ? await db
        .select({ listingId: listingImages.listingId, url: listingImages.url })
        .from(listingImages)
        .where(inArray(listingImages.listingId, listingIds))
        .orderBy(listingImages.order)
    : [];

  // First image per listing
  const imageMap = new Map<number, string>();
  for (const img of images) {
    if (!imageMap.has(img.listingId)) {
      imageMap.set(img.listingId, img.url);
    }
  }

  const items = rows
    .filter((r) => !category || category === "All" || r.category === category)
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      seekingDescription: r.seekingDescription,
      category: r.category,
      type: r.type,
      estimatedValueZar: r.estimatedValueZar,
      condition: r.condition,
      createdAt: r.createdAt.toISOString(),
      distance:
        userProfile?.lat != null && userProfile?.lng != null && r.lat != null && r.lng != null
          ? formatDistance(haversineKm(userProfile.lat, userProfile.lng, r.lat, r.lng))
          : null,
      userName: r.userName,
      isVerified: r.isVerified,
      imageUrl: imageMap.get(r.id) ?? null,
    }));

  return Response.json({ listings: items, region: currentRegion });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { user } = await requireAuth(request);

  // Tier limit check
  const usage = await getListingUsage(user.id);
  if (usage.atLimit) {
    return Response.json(
      { error: "listing_limit_exceeded", message: "You've reached your active listing limit. Upgrade to NoZar Plus to list more." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { title, description, type, category, estimatedValueZar, condition, seekingDescription, imageUrls } = body;

  // Validate required fields
  const errors: Record<string, string> = {};
  if (!title?.trim()) errors.title = "Title is required";
  if (!description?.trim()) errors.description = "Description is required";
  if (!category?.trim()) errors.category = "Category is required";
  if (!type || !["item", "service"].includes(type)) errors.type = "Type must be 'item' or 'service'";

  // Validate image URLs if provided
  const validImageUrls: string[] = [];
  if (Array.isArray(imageUrls)) {
    for (const raw of imageUrls) {
      if (!raw || typeof raw !== "string") continue;
      const sanitized = sanitizeImageUrl(raw);
      const result = validateImageUrl(sanitized);
      if (result.valid) {
        validImageUrls.push(sanitized);
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 });
  }

  const [inserted] = await db
    .insert(listings)
    .values({
      userId: user.id,
      title: title.trim(),
      description: description.trim(),
      type,
      category,
      estimatedValueZar: estimatedValueZar ? parseInt(estimatedValueZar, 10) : null,
      condition: type === "service" ? null : (condition || null),
      seekingDescription: seekingDescription?.trim() || null,
      status: "active",
    })
    .returning({ id: listings.id });

  // Insert image records
  if (validImageUrls.length > 0) {
    await db.insert(listingImages).values(
      validImageUrls.map((url, order) => ({
        listingId: inserted.id,
        url,
        order,
      })),
    );
  }

  return Response.json({ id: inserted.id, success: true });
}
