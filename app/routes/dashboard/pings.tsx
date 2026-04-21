import { useNavigate } from "react-router";
import { MessageSquare } from "lucide-react";
import { and, eq, or, desc, sql } from "drizzle-orm";

import type { Route } from "./+types/pings";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { trades, users, listings, messages, threadReadCursors } from "~/lib/schema";
import { timeAgo } from "~/lib/utils";
import type { TradeThread } from "~/lib/types";
import { PingThread } from "~/components/ui/ping-thread";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Pings — Nozar" },
    { name: "description", content: "Your swap requests and conversations" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);

  // Subquery: latest message per trade
  // Note: We use a LATERAL join to get the latest message per trade effectively
  // or just use a correlated subquery if supported.
  // The previous implementation had an issue with the subquery references.

  // Let's try to fetch all messages and filter in JS if the volume is low,
  // OR, better, let's fix the SQL query to use proper qualification.
  
  // Actually, a lateral join is cleaner.
  // Since we are using Drizzle, maybe we can use it, but Drizzle's lateral support is experimental or limited depending on version.
  
  // Let's try fixing the correlated subquery by using raw SQL for the correlated reference
  // correctly.
  
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
      id: trades.id,
      status: trades.status,
      initiatorId: trades.initiatorId,
      responderId: trades.responderId,
      initiatorName: initiator.name,
      responderName: responder.name,
      listingTitle: listings.title,
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
      or(eq(trades.initiatorId, user.id), eq(trades.responderId, user.id)),
    )
    .orderBy(desc(trades.updatedAt));

  const threads: TradeThread[] = rows
    .map((row) => {
      // The counterparty is the OTHER user in the trade
      const counterpartyName =
        row.initiatorId === user.id ? row.responderName : row.initiatorName;

      const activityDate = row.lastMessageTime
        ? new Date(row.lastMessageTime)
        : new Date(row.tradeUpdatedAt);

      // Unread = has messages AND (no cursor OR latest message is newer than cursor)
      const lastMsgDate = row.lastMessageTime
        ? new Date(row.lastMessageTime)
        : null;
      const unread =
        lastMsgDate !== null &&
        (row.lastReadAt === null ||
          lastMsgDate > new Date(row.lastReadAt));

      return {
        id: row.id,
        counterpartyName,
        listingTitle: row.listingTitle,
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

  return { threads };
}

export default function Pings({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const { threads } = loaderData;

  return (
    <div className="max-w-xl mx-auto px-0 pt-6 sm:pt-8 pb-28 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1">
            // Comms.Uplink
          </span>
          <h2 className="text-xl font-bold uppercase tracking-tight text-white">
            Active Pings
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400 border border-white/10 px-2 py-1 rounded bg-[#0F172A]">
          {threads.length} Thread{threads.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Ping list */}
      {threads.length > 0 ? (
        <div className="space-y-3">
          {threads.map((thread) => (
            <PingThread
              key={thread.id}
              thread={thread}
              onClick={() => navigate(`/dashboard/pings/${thread.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0F172A] border border-white/10 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-400 mb-1">
            No Active Pings
          </h3>
          <p className="text-xs text-slate-500 max-w-[240px]">
            Start a conversation by pinging an asset you&apos;re interested in
            swapping for.
          </p>
        </div>
      )}
    </div>
  );
}
