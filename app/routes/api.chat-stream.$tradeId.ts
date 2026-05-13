import type { Route } from "./+types/api.chat-stream.$tradeId";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { messages, trades } from "~/lib/schema";
import { eq, count } from "drizzle-orm";

/**
 * SSE endpoint for real-time chat updates.
 *
 * The server polls the DB every 3 s and pushes a "new-messages" event only
 * when the message count changes — eliminating the 2 s full-page reload the
 * client was doing before.  A heartbeat every 25 s keeps proxies from closing
 * idle connections.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  // Auth gate — throws redirect("/login") if not authenticated
  const { user } = await requireAuth(request);
  const tradeId = Number(params.tradeId);

  if (Number.isNaN(tradeId)) {
    throw new Response("Not found", { status: 404 });
  }

  // Verify the user is a participant in this trade
  const [trade] = await db
    .select()
    .from(trades)
    .where(eq(trades.id, tradeId))
    .limit(1);

  if (
    !trade ||
    (trade.initiatorId !== user.id && trade.responderId !== user.id)
  ) {
    throw new Response("Forbidden", { status: 403 });
  }

  // Snapshot the message count at connection time
  const [{ value: initialCount }] = await db
    .select({ value: count() })
    .from(messages)
    .where(eq(messages.tradeId, tradeId));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let lastCount = initialCount;

      function sendEvent(event: string, data: string): void {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${data}\n\n`),
          );
        } catch {
          // Controller may already be closed; ignore.
        }
      }

      function cleanup(): void {
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // Already closed; ignore.
        }
      }

      // Poll the DB every 3 s — much cheaper than a 2 s full-page reload per client
      const pollInterval = setInterval(async () => {
        if (request.signal.aborted) {
          cleanup();
          return;
        }
        try {
          const [{ value: currentCount }] = await db
            .select({ value: count() })
            .from(messages)
            .where(eq(messages.tradeId, tradeId));

          if (currentCount !== lastCount) {
            lastCount = currentCount;
            sendEvent("new-messages", String(currentCount));
          }
        } catch {
          // Silently skip on transient DB errors; client stays connected.
        }
      }, 3000);

      // Heartbeat every 25 s to keep the connection alive through proxies
      const heartbeatInterval = setInterval(() => {
        sendEvent("heartbeat", "ping");
      }, 25000);

      // Clean up when the client disconnects
      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx/proxy buffering
    },
  });
}
