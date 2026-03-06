import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";

import type { db as _db } from "./db.server";
import {
  listings,
  messages,
  threadReadCursors,
  trades,
  users,
} from "./schema";

type AppDb = typeof _db;

// ─── Notification preview type ──────────────────────────────

/** Trade thread notification with unread status and message preview. */
export interface TradeNotification {
  tradeId: number;
  counterpartyId: string;
  counterpartyName: string;
  listingTitle: string;
  tradeStatus: string;
  lastMessageText: string | null;
  lastMessageAt: Date | null;
  unread: boolean;
}

// ─── Queries ────────────────────────────────────────────────

/**
 * Count trades with unread messages for a user.
 *
 * A trade is "unread" when it has at least one message AND
 * either no read-cursor exists or the latest message is newer
 * than the cursor.
 */
export async function getUnreadCount(
  db: AppDb,
  userId: string,
): Promise<number> {
  const result = await db
    .select({
      count: sql<number>`count(distinct ${trades.id})`,
    })
    .from(trades)
    .innerJoin(messages, eq(messages.tradeId, trades.id))
    .leftJoin(
      threadReadCursors,
      and(
        eq(threadReadCursors.tradeId, trades.id),
        eq(threadReadCursors.userId, userId),
      ),
    )
    .where(
      and(
        or(eq(trades.initiatorId, userId), eq(trades.responderId, userId)),
        or(
          isNull(threadReadCursors.lastReadAt),
          gt(messages.createdAt, threadReadCursors.lastReadAt),
        ),
      ),
    );

  return Number(result[0]?.count ?? 0);
}

/**
 * Upsert the read cursor for a trade thread to the current time.
 *
 * Call this when a user opens / views a trade thread so all
 * existing messages are marked as "read".
 */
export async function markThreadRead(
  db: AppDb,
  userId: string,
  tradeId: number,
): Promise<void> {
  await db
    .insert(threadReadCursors)
    .values({ userId, tradeId, lastReadAt: sql`now()` })
    .onConflictDoUpdate({
      target: [threadReadCursors.userId, threadReadCursors.tradeId],
      set: { lastReadAt: sql`now()` },
    });
}

/**
 * Get recent trade threads with unread status and latest
 * message preview, ordered by most-recently-updated first.
 *
 * Returns one entry per trade the user participates in.
 */
export async function getNotifications(
  db: AppDb,
  userId: string,
): Promise<TradeNotification[]> {
  // Subquery: latest message per trade (mirrors pings.tsx pattern)
  const latestMessage = db
    .select({
      tradeId: messages.tradeId,
      text: sql<string>`(
        SELECT m2.text FROM ${messages} m2
        WHERE m2.trade_id = ${messages.tradeId}
        ORDER BY m2.created_at DESC LIMIT 1
      )`.as("latest_text"),
      createdAt: sql<Date>`(
        SELECT m3.created_at FROM ${messages} m3
        WHERE m3.trade_id = ${messages.tradeId}
        ORDER BY m3.created_at DESC LIMIT 1
      )`.as("latest_created_at"),
    })
    .from(messages)
    .groupBy(messages.tradeId)
    .as("latest_msg");

  // Alias the users table for initiator and responder
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
      tradeId: trades.id,
      tradeStatus: trades.status,
      initiatorId: trades.initiatorId,
      responderId: trades.responderId,
      initiatorName: initiator.name,
      responderName: responder.name,
      listingTitle: listings.title,
      lastMessageText: latestMessage.text,
      lastMessageAt: latestMessage.createdAt,
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
        eq(threadReadCursors.userId, userId),
      ),
    )
    .where(
      or(eq(trades.initiatorId, userId), eq(trades.responderId, userId)),
    )
    .orderBy(desc(trades.updatedAt));

  return rows.map((row) => {
    const counterpartyId =
      row.initiatorId === userId ? row.responderId : row.initiatorId;
    const counterpartyName =
      row.initiatorId === userId ? row.responderName : row.initiatorName;

    const lastMessageAt = row.lastMessageAt
      ? new Date(row.lastMessageAt)
      : null;

    // Unread = has messages AND (no cursor OR latest message is newer than cursor)
    const unread =
      lastMessageAt !== null &&
      (row.lastReadAt === null ||
        lastMessageAt > new Date(row.lastReadAt));

    return {
      tradeId: row.tradeId,
      counterpartyId,
      counterpartyName,
      listingTitle: row.listingTitle,
      tradeStatus: row.tradeStatus,
      lastMessageText: row.lastMessageText ?? null,
      lastMessageAt,
      unread,
    };
  });
}
