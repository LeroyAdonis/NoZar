import type { ActionArgs } from "@remix-run/node";
import { requireAuth } from "~/lib/auth.server";
import { handleChat } from "~/lib/chat.server";

export async function action({ request }: ActionArgs) {
  const { user } = await requireAuth(request as any);
  const body = await request.json();
  const { sessionId, tradeId, input } = body;
  try {
    const result = await handleChat({ user, sessionId, tradeId, input });
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("/api/chat error:", err);
    return new Response(JSON.stringify({ error: err.message || "server_error" }), { status: 500 });
  }
}