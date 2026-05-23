import type { Route } from "./+types/api.messages.$tradeId";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { messages, trades } from "~/lib/schema";
import { eq, and, gt, asc } from "drizzle-orm";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const tradeId = Number(params.tradeId);
  if (Number.isNaN(tradeId) || !Number.isInteger(tradeId) || tradeId < 1) {
    return new Response("Invalid trade ID", { status: 400 });
  }

  // Verify user is a participant in this trade
  const trade = await db
    .select()
    .from(trades)
    .where(eq(trades.id, tradeId))
    .limit(1);

  if (
    !trade[0] ||
    (trade[0].initiatorId !== user.id && trade[0].responderId !== user.id)
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const since = url.searchParams.get("since");

  let sinceDate: Date | undefined;
  if (since) {
    sinceDate = new Date(since);
    if (Number.isNaN(sinceDate.getTime())) {
      return new Response("Invalid date parameter", { status: 400 });
    }
  }

  let query;
  if (sinceDate) {
    query = db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.tradeId, tradeId),
          gt(messages.createdAt, sinceDate),
        ),
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
