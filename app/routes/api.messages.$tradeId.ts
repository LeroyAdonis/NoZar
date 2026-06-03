import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { messages, trades, listings, users, trustProfiles } from "~/lib/schema";
import { eq, and, asc, gt, count } from "drizzle-orm";

/**
 * GET  /api/messages/:tradeId — Load messages (with optional ?since=ISO filter)
 * POST /api/messages/:tradeId — Send a message
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const tradeId = Number(params.tradeId);
  if (Number.isNaN(tradeId) || !Number.isInteger(tradeId) || tradeId < 1) {
    return Response.json({ error: "Invalid trade ID" }, { status: 400 });
  }

  // Verify user is a participant
  const [trade] = await db
    .select()
    .from(trades)
    .where(eq(trades.id, tradeId))
    .limit(1);

  if (!trade || (trade.initiatorId !== user.id && trade.responderId !== user.id)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const since = url.searchParams.get("since");

  let sinceDate: Date | undefined;
  if (since) {
    sinceDate = new Date(since);
    if (Number.isNaN(sinceDate.getTime())) {
      return Response.json({ error: "Invalid date parameter" }, { status: 400 });
    }
  }

  let query;
  if (sinceDate) {
    query = db
      .select()
      .from(messages)
      .where(
        and(eq(messages.tradeId, tradeId), gt(messages.createdAt, sinceDate)),
      )
      .orderBy(asc(messages.createdAt));
  } else {
    query = db
      .select()
      .from(messages)
      .where(eq(messages.tradeId, tradeId))
      .orderBy(asc(messages.createdAt));
  }

  const msgs = await query;
  return Response.json(msgs);
}

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { user } = await requireAuth(request);
  const tradeId = Number(params.tradeId);
  if (Number.isNaN(tradeId) || !Number.isInteger(tradeId) || tradeId < 1) {
    return Response.json({ error: "Invalid trade ID" }, { status: 400 });
  }

  // Verify trade and participation
  const [trade] = await db
    .select()
    .from(trades)
    .where(eq(trades.id, tradeId))
    .limit(1);

  if (!trade) {
    return Response.json({ error: "Trade not found" }, { status: 404 });
  }

  if (trade.initiatorId !== user.id && trade.responderId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse body
  const body = await request.json();
  const rawText = body.text?.trim();
  if (!rawText) {
    return Response.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  if (rawText.length > 2000) {
    return Response.json({ error: "Message too long (max 2000 chars)" }, { status: 400 });
  }

  // Newcomer message limit
  const [tp] = await db
    .select({ level: trustProfiles.level })
    .from(trustProfiles)
    .where(eq(trustProfiles.userId, user.id))
    .limit(1);

  if (tp?.level === "newcomer") {
    const [{ value: msgCount }] = await db
      .select({ value: count() })
      .from(messages)
      .where(
        and(
          eq(messages.tradeId, tradeId),
          eq(messages.senderId, user.id),
          eq(messages.type, "text"),
        ),
      );
    if (msgCount >= 5) {
      return Response.json(
        { error: "New users can send 5 messages per trade. Complete your first trade to unlock unlimited messaging." },
        { status: 403 },
      );
    }
  }

  // Scrub PII during blind-chat stage
  let text = rawText;
  if (trade.status === "proposed" || trade.status === "negotiating") {
    text = text
      .replace(/(\+?27|0)\s*\d[\d\s\-]{7,12}/g, "[phone redacted]")
      .replace(/\b[\w.\-+]+@[\w.\-]+\.\w{2,}\b/gi, "[email redacted]");
  }

  await db.insert(messages).values({
    tradeId,
    senderId: user.id,
    text,
    type: "text",
  });

  return Response.json({ ok: true });
}
