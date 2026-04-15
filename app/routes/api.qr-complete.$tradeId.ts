import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { trades, messages } from "~/lib/schema";
import { eq, and } from "drizzle-orm";

export async function action({ request, params }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const tradeId = Number(params.tradeId);
  
  // Verify user is a participant
  const trade = await db.select().from(trades).where(eq(trades.id, tradeId)).limit(1);
  if (!trade[0] || (trade[0].initiatorId !== user.id && trade[0].responderId !== user.id)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  // Update status to 'completed'
  await db.update(trades).set({ status: 'completed' }).where(eq(trades.id, tradeId));

  // Insert an audit message
  await db.insert(messages).values({ 
    tradeId, 
    senderId: user.id, 
    text: "Trade physically completed via QR handshake", 
    type: 'handshake' 
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
