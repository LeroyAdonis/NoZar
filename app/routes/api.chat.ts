import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { AiServiceError } from "~/lib/ai.server";
import { handleChat } from "~/lib/chat.server";

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const body = await request.json();
  const { sessionId, tradeId, input } = body;
  try {
    const result = await handleChat({ user, sessionId, tradeId, input });
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("/api/chat error:", err);
    const error =
      err instanceof AiServiceError
        ? err.code
        : err?.message || "server_error";
    return new Response(JSON.stringify({ error }), { status: 500 });
  }
}
