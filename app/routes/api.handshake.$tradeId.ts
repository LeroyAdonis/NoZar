import type { ActionArgs } from "@remix-run/node";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { trades, messages } from "~/lib/schema";
import { eq } from "drizzle-orm";

export async function action({ request, params }: ActionArgs) {
  const { user } = await requireAuth(request as any);
  const tradeId = Number(params.tradeId);
  const body = await request.json();
  const { action: act, payload } = body;

  // Verify user is a participant
  const trade = await db.select().from(trades).where(eq(trades.id, tradeId)).limit(1);
  if (!trade[0] || (trade[0].initiatorId !== user.id && trade[0].responderId !== user.id)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  let newStatus = trade[0].status;
  switch (act) {
    case 'propose':
      newStatus = 'negotiating';
      break;
    case 'accept':
      newStatus = 'agreed';
      break;
    case 'complete':
      newStatus = 'completed';
      break;
    case 'cancel':
      newStatus = 'cancelled';
      break;
    default:
      // unsupported action
      return new Response(JSON.stringify({ error: 'unsupported_action' }), { status: 400 });
  }

  await db.update(trades).set({ status: newStatus }).where(eq(trades.id, tradeId)).run();

  // Insert an audit message
  const text = payload && payload.note ? payload.note : `${user.name || user.id} performed ${act}`;
  await db.insert(messages).values({ tradeId, senderId: user.id, text, type: 'handshake' }).run();

  return new Response(JSON.stringify({ tradeId, status: newStatus }), { status: 200 });
}