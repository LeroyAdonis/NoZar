import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { and, eq, or, desc, sql } from "drizzle-orm";
import { db } from "~/lib/db.server";
import { trades, users, listings, messages, threadReadCursors } from "~/lib/schema";
import { requireAuth } from "~/lib/auth.server";
import { timeAgo } from "~/lib/utils";
import type { TradeThread } from "~/lib/types";

/**
 * GET /api/trades
 * Returns the authenticated user's trade threads as JSON (for mobile ping list).
 */
/**
 * POST /api/trades
 * Creates a new trade (swap) from the listing detail page.
 * Used by mobile app via the "Offer a Swap" button.
 * Body: { listingId: number, offerItemId?: number }
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { user } = await requireAuth(request);
  const body = await request.json();
  const { listingId, offerItemId } = body;

  if (!listingId) {
    return Response.json({ error: "listingId is required" }, { status: 400 });
  }

  // Fetch the listing to get the owner
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!listing) {
    return Response.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.userId === user.id) {
    return Response.json({ error: "Cannot trade with your own listing" }, { status: 400 });
  }

  // Check for existing trade between these users on this listing
  const [existing] = await db
    .select({ id: trades.id })
    .from(trades)
    .where(
      and(
        eq(trades.listingId, listingId),
        eq(trades.initiatorId, user.id),
        eq(trades.responderId, listing.userId),
      ),
    )
    .limit(1);

  if (existing) {
    // Already have a trade — return existing
    return Response.json({ tradeId: existing.id, exists: true });
  }

  // Create the trade
  const [trade] = await db
    .insert(trades)
    .values({
      initiatorId: user.id,
      responderId: listing.userId,
      listingId,
      status: "pending",
    })
    .returning();

  return Response.json({ tradeId: trade.id, exists: false });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);

  // Build latest-message subquery
  const latestMessage = db
    .select({
      tradeId: messages.tradeId,
      text: sql<string>`(
        SELECT m2.text FROM messages m2
        WHERE m2.trade_id = messages.trade_id
        ORDER BY m2.created_at DESC LIMIT 1
      )`.as("latest_text"),
      createdAt: sql<Date>`(
        SELECT m3.created_at FROM messages m3
        WHERE m3.trade_id = messages.trade_id
        ORDER BY m3.created_at DESC LIMIT 1
      )`.as("latest_created_at"),
    })
    .from(messages)
    .groupBy(messages.tradeId)
    .as("latest_msg");

  // User aliases
  const initiator = db
    .select({ id: users.id, name: users.name })
    .from(users)
    .as("initiator");
  const responder = db
    .select({ id: users.id, name: users.name })
    .from(users)
    .as("responder");

  const rows = await db
    .select({
      id: trades.id,
      status: trades.status,
      initiatorId: trades.initiatorId,
      responderId: trades.responderId,
      initiatorName: initiator.name,
      responderName: responder.name,
      listingTitle: listings.title,
      listingId: listings.id,
      lastMessage: latestMessage.text,
      lastMessageTime: latestMessage.createdAt,
      tradeUpdatedAt: trades.updatedAt,
      lastReadAt: threadReadCursors.lastReadAt,
    })
    .from(trades)
    .innerJoin(initiator, eq(trades.initiatorId, initiator.id))
    .innerJoin(responder, eq(trades.responderId, responder.id))
    .innerJoin(listings, eq(trades.listingId, listings.id))
    .leftJoin(latestMessage, eq(trades.id, latestMessage.tradeId))
    .leftJoin(
      threadReadCursors,
      and(
        eq(threadReadCursors.tradeId, trades.id),
        eq(threadReadCursors.userId, user.id),
      ),
    )
    .where(
      and(
        or(eq(trades.initiatorId, user.id), eq(trades.responderId, user.id)),
        eq(trades.archived, false),
      ),
    )
    .orderBy(desc(trades.updatedAt));

  const threads: (TradeThread & { listingId: number })[] = rows.map((row) => {
    const counterpartyName =
      row.initiatorId === user.id ? row.responderName : row.initiatorName;

    const activityDate = row.lastMessageTime
      ? new Date(row.lastMessageTime)
      : new Date(row.tradeUpdatedAt);

    const lastMsgDate = row.lastMessageTime
      ? new Date(row.lastMessageTime)
      : null;
    const unread =
      lastMsgDate !== null &&
      (row.lastReadAt === null || lastMsgDate > new Date(row.lastReadAt));

    return {
      id: row.id,
      counterpartyName,
      listingTitle: row.listingTitle,
      listingId: row.listingId,
      status: row.status,
      unread,
      lastMessage: row.lastMessage ?? null,
      lastMessageTime: row.lastMessageTime
        ? new Date(row.lastMessageTime).toLocaleTimeString("en-ZA", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      timeAgo: timeAgo(activityDate),
    };
  });

  return Response.json({ threads });
}
