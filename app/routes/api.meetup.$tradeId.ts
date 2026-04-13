import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { meetupSpots, meetupVotes } from "~/lib/schema";
import { eq, desc, count as countFn } from "drizzle-orm";

export async function action({ request, params }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const tradeId = Number(params.tradeId);
  const body = await request.json();

  const { action: act } = body;

  if (act === 'add_spot') {
    const { spot } = body;
    if (!spot || !spot.name || !spot.address) return new Response(JSON.stringify({ error: 'invalid_spot' }), { status: 400 });
    const inserted = await db.insert(meetupSpots).values({ tradeId, name: spot.name, address: spot.address, reason: spot.reason || null }).returning();
    return new Response(JSON.stringify({ spot: inserted[0] }), { status: 200 });
  }

  if (act === 'vote') {
    const { spotId } = body;
    if (!spotId) return new Response(JSON.stringify({ error: 'missing_spotId' }), { status: 400 });
    try {
      await db.insert(meetupVotes).values({ tradeId, userId: user.id, spotId });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (err: any) {
      // unique constraint may trigger if user already voted
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 400 });
    }
  }

  if (act === 'finalize') {
    // pick spot with most votes
    const rows = await db.select({
      spotId: meetupVotes.spotId,
      cnt: countFn()
    })
    .from(meetupVotes)
    .where(eq(meetupVotes.tradeId, tradeId))
    .groupBy(meetupVotes.spotId)
    .orderBy(desc(countFn()))
    .limit(1);

    if (!rows || rows.length === 0) return new Response(JSON.stringify({ error: 'no_votes' }), { status: 400 });
    const chosen = rows[0];
    return new Response(JSON.stringify({ chosenSpotId: chosen.spotId, votes: Number(chosen.cnt) }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'unsupported_action' }), { status: 400 });
}