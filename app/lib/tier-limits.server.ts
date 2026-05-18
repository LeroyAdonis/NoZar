import { and, count, eq } from "drizzle-orm";
import { db } from "./db.server";
import { listings, subscriptions } from "./schema";
import {
  listingLimitFor,
  normalizeTierCode,
  type ListingUsage,
} from "./tier-limits";

export type { ListingUsage } from "./tier-limits";

export async function getListingUsage(userId: string): Promise<ListingUsage> {
  const [sub] = await db
    .select({ planCode: subscriptions.planCode })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const planCode = normalizeTierCode(sub?.planCode);
  const listingLimit = listingLimitFor(planCode);

  const [row] = await db
    .select({ value: count() })
    .from(listings)
    .where(and(eq(listings.userId, userId), eq(listings.status, "active")));

  const activeCount = row?.value ?? 0;

  return {
    planCode,
    listingLimit,
    activeCount,
    atLimit: activeCount >= listingLimit,
    overLimit: activeCount > listingLimit,
    remaining: Math.max(0, listingLimit - activeCount),
  };
}
