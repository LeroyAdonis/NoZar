import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import {
  trades,
  users,
  profiles,
  listings,
  listingImages,
  messages,
} from "~/lib/schema";
import { eq, asc } from "drizzle-orm";

/**
 * GET /api/trades/:id
 * Returns trade detail with counterparty, listing, and messages.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const tradeId = Number(params.id);
  if (Number.isNaN(tradeId)) {
    return Response.json({ error: "Invalid trade ID" }, { status: 400 });
  }

  // Fetch trade
  const [trade] = await db
    .select()
    .from(trades)
    .where(eq(trades.id, tradeId))
    .limit(1);

  if (!trade) {
    return Response.json({ error: "Trade not found" }, { status: 404 });
  }

  // Verify user is a participant
  if (trade.initiatorId !== user.id && trade.responderId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const counterpartyId =
    trade.initiatorId === user.id ? trade.responderId : trade.initiatorId;

  // Fetch counterparty, listing + image, and messages in parallel
  const [counterpartyRows, [listing], listingImgRows, tradeMessages] = await Promise.all([
    db
      .select({
        name: users.name,
        image: profiles.avatarUrl,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, counterpartyId))
      .limit(1),

    db
      .select()
      .from(listings)
      .where(eq(listings.id, trade.listingId))
      .limit(1),

    db
      .select({ url: listingImages.url })
      .from(listingImages)
      .where(eq(listingImages.listingId, trade.listingId))
      .orderBy(listingImages.order)
      .limit(1),

    db
      .select()
      .from(messages)
      .where(eq(messages.tradeId, tradeId))
      .orderBy(asc(messages.createdAt)),
  ]);

  if (!counterpartyRows[0] || !listing) {
    return Response.json({ error: "Trade data incomplete" }, { status: 404 });
  }

  return Response.json({
    trade: {
      id: trade.id,
      initiatorId: trade.initiatorId,
      responderId: trade.responderId,
      listingId: trade.listingId,
      status: trade.status,
    },
    messages: tradeMessages,
    counterparty: counterpartyRows[0],
    listing: {
      id: listing.id,
      title: listing.title,
      estimatedValueZar: listing.estimatedValueZar,
      imageUrl: listingImgRows[0]?.url ?? null,
    },
    currentUserId: user.id,
  });
}

/**
 * PATCH /api/trades/:id
 * Updates a trade's status (e.g. agree → progressing, share contact, complete)
 * Body: { action: "agree" | "complete" | "cancel" }
 */
export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== "PATCH") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { user } = await requireAuth(request);
  const tradeId = Number(params.id);
  if (Number.isNaN(tradeId)) {
    return Response.json({ error: "Invalid trade ID" }, { status: 400 });
  }

  const body = await request.json();
  const { action: statusAction } = body;

  if (!statusAction || !["agree", "complete", "cancel"].includes(statusAction)) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  // Fetch trade
  const [trade] = await db
    .select()
    .from(trades)
    .where(eq(trades.id, tradeId))
    .limit(1);

  if (!trade) {
    return Response.json({ error: "Trade not found" }, { status: 404 });
  }

  // Verify user is a participant
  if (trade.initiatorId !== user.id && trade.responderId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Map action to new status
  const statusMap: Record<string, string> = {
    agree: "negotiating",
    complete: "completed",
    cancel: "cancelled",
  };

  const newStatus = statusMap[statusAction];

  // Prevent invalid transitions
  if (trade.status === "completed" || trade.status === "cancelled") {
    return Response.json({ error: "Trade already completed or cancelled" }, { status: 400 });
  }

  // Update
  const [updated] = await db
    .update(trades)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(trades.id, tradeId))
    .returning();

  // Insert a system message so both users see the status change in chat
  const statusLabels: Record<string, string> = {
    negotiating: "Trade agreed! 🤝 Both parties are now negotiating.",
    completed: "Swap completed! 🎉",
    cancelled: "Trade cancelled.",
  };

  await db.insert(messages).values({
    tradeId,
    senderId: user.id,
    text: statusLabels[newStatus] ?? `Status changed to ${newStatus}`,
    type: "system",
  });

  return Response.json({
    tradeId: updated.id,
    status: updated.status,
    message: statusLabels[newStatus] ?? "Status updated",
  });
}
