import { db } from "~/lib/db.server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { listings, trades } from "~/lib/schema";

// Get user's interest categories based on their listings and trades
export async function getUserInterestCategories(userId: string): Promise<string[]> {
  // Get categories from user's own active listings
  const ownListings = await db
    .select({ category: listings.category })
    .from(listings)
    .where(and(eq(listings.userId, userId), eq(listings.status, "active")));

  // Get categories from listings the user has traded for (as initiator)
  const tradesAsInitiator = await db
    .select({ category: listings.category })
    .from(trades)
    .innerJoin(listings, eq(trades.listingId, listings.id))
    .where(and(eq(trades.initiatorId, userId), ne(trades.status, "cancelled")));

  // Get categories from listings the user has traded for (as responder)
  const tradesAsResponder = await db
    .select({ category: listings.category })
    .from(trades)
    .innerJoin(listings, eq(trades.listingId, listings.id))
    .where(and(eq(trades.responderId, userId), ne(trades.status, "cancelled")));

  // Combine and deduplicate
  const allCategories = [
    ...ownListings.map((l) => l.category),
    ...tradesAsInitiator.map((l) => l.category),
    ...tradesAsResponder.map((l) => l.category),
  ];

  return [...new Set(allCategories)];
}

// Score a listing based on user interests (0 = no match, 1 = exact match)
export function scoreListingForUser(
  listingCategory: string,
  userCategories: string[],
): number {
  if (userCategories.length === 0) return 0;

  // Exact match = 1.0
  if (userCategories.includes(listingCategory)) return 1.0;

  // Check for partial matches (e.g. "Electronics" vs "Electronics & Gadgets")
  for (const cat of userCategories) {
    if (
      listingCategory.toLowerCase().includes(cat.toLowerCase()) ||
      cat.toLowerCase().includes(listingCategory.toLowerCase())
    ) {
      return 0.5;
    }
  }

  return 0;
}
