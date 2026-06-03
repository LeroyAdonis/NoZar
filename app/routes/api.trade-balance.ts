import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { eq, asc } from "drizzle-orm";
import { listings, trades, messages, tradeItems } from "~/lib/schema";
import { analyzeTrade } from "~/lib/trade-negotiator.server";
import { getUserTier } from "~/lib/tier-limits.server";
import { canUseAiFeature } from "~/lib/tier-limits";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const tier = await getUserTier(user.id);

  // Gated behind ai_matching (Plus feature)
  if (!canUseAiFeature(tier, "ai_matching")) {
    return { error: "ai_tier_restricted", message: "AI Trade Negotiator is a Plus feature. Upgrade to use it." };
  }

  const url = new URL(request.url);
  const tradeId = Number(url.searchParams.get("tradeId"));

  if (!tradeId) {
    return { error: "Trade ID required" };
  }

  // Fetch the trade
  const [trade] = await db
    .select()
    .from(trades)
    .where(eq(trades.id, tradeId))
    .limit(1);

  if (!trade) {
    return { error: "Trade not found" };
  }

  // Fetch the listing (item A)
  const [listingA] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, trade.listingId))
    .limit(1);

  // Fetch trade items (the offered items — item B)
  const offeredItems = await db
    .select()
    .from(tradeItems)
    .where(eq(tradeItems.tradeId, tradeId));

  let listingB: typeof listingA | null = null;

  if (offeredItems.length > 0) {
    // Try to find the listing being offered
    for (const item of offeredItems) {
      if (item.listingId) {
        const [found] = await db
          .select()
          .from(listings)
          .where(eq(listings.id, item.listingId))
          .limit(1);
        if (found) {
          listingB = found;
          break;
        }
      }
    }
  }

  if (!listingA || !listingB) {
    return { error: "Could not find both items in this trade. Make sure an offer has been made." };
  }

  // Get recent conversation context
  const recentMessages = await db
    .select({ text: messages.text })
    .from(messages)
    .where(eq(messages.tradeId, tradeId))
    .orderBy(asc(messages.createdAt))
    .limit(10);

  const conversationContext = recentMessages
    .map((m) => m.text)
    .filter(Boolean)
    .join("\n");

  // Analyze the trade
  const analysis = await analyzeTrade(
    {
      title: listingA.title,
      description: listingA.description,
      category: listingA.category,
      condition: listingA.condition ?? "good",
      value: listingA.estimatedValueZar,
    },
    {
      title: listingB.title,
      description: listingB.description,
      category: listingB.category,
      condition: listingB.condition ?? "good",
      value: listingB.estimatedValueZar,
    },
    conversationContext || undefined,
  );

  return {
    itemA: { title: listingA.title },
    itemB: { title: listingB.title },
    ...analysis,
  };
}
