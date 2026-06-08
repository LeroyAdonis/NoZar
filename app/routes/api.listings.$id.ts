import type { LoaderFunctionArgs } from "react-router";
import { eq } from "drizzle-orm";
import { db } from "~/lib/db.server";
import { listings, listingImages, users, profiles } from "~/lib/schema";
import { getOptionalSession } from "~/lib/auth.server";
import { haversineKm, formatDistance } from "~/lib/utils";

/**
 * GET /api/listings/:id
 * Returns a single listing's full detail as JSON (for mobile asset detail).
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const listingId = Number(params.id);
  if (Number.isNaN(listingId)) {
    return Response.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  // Optional auth — for distance computation
  const session = await getOptionalSession(request);
  const userId = session?.user?.id;

  // Fetch listing with user info
  const [row] = await db
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
      status: listings.status,
      userName: users.name,
      isVerified: users.emailVerified,
      ownerId: listings.userId,
    })
    .from(listings)
    .innerJoin(users, eq(listings.userId, users.id))
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!row) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }

  if (row.status !== "active") {
    return Response.json({ error: "Listing not available" }, { status: 404 });
  }

  // Fetch images
  const images = await db
    .select({ url: listingImages.url })
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId))
    .orderBy(listingImages.order);

  // Compute distance if user's profile has coordinates
  let distance: string | null = null;
  if (userId && row.lat != null && row.lng != null) {
    const [profile] = await db
      .select({ lat: profiles.lat, lng: profiles.lng })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    if (profile?.lat != null && profile?.lng != null) {
      distance = formatDistance(haversineKm(profile.lat, profile.lng, row.lat, row.lng));
    }
  }

  return Response.json({
    id: row.id,
    title: row.title,
    description: row.description,
    seekingDescription: row.seekingDescription,
    category: row.category,
    type: row.type,
    estimatedValueZar: row.estimatedValueZar,
    condition: row.condition,
    createdAt: row.createdAt.toISOString(),
    distance,
    userName: row.userName,
    isVerified: row.isVerified,
    ownerId: row.ownerId,
    imageUrl: images[0]?.url ?? null,
    images: images.map((i) => i.url),
  });
}
