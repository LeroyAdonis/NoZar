import { Link, useLoaderData } from "react-router";
import { Lock } from "lucide-react";
import type { LoaderFunctionArgs } from "react-router";
import { useEffect, useState } from "react";
import ChatWindow from "~/components/ui/ChatWindow";
import ChatComposer from "~/components/ui/ChatComposer";
import { requireAuth } from "~/lib/auth.server";
import { getUserTier } from "~/lib/tier-limits.server";
import { canUseAiFeature } from "~/lib/tier-limits";
import type { Route } from "./+types/chat.$tradeId";

type ChatMessage = {
  id?: number;
  text: string;
  role: "user" | "assistant";
  senderId?: string;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const tier = await getUserTier(user.id);
  return { canUseAiChat: canUseAiFeature(tier, "ai_chat"), userId: user.id };
}

export default function TradeChat({ params }: Route.ComponentProps) {
  const { canUseAiChat, userId } = useLoaderData<typeof loader>();
  const tradeId = Number(params.tradeId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    setError(null);

    async function load() {
      try {
        const res = await fetch(`/api/messages/${tradeId}`, {
          signal: abortController.signal,
        });
        if (!res.ok) throw new Error(`Failed to load messages (${res.status})`);
        const data = await res.json();
        if (!abortController.signal.aborted) {
          // Enrich messages with senderId and isMe for fraud detection
          const enriched = (data as ChatMessage[]).map((m) => ({
            ...m,
            role: (m.senderId === userId ? "user" : "assistant") as "user" | "assistant",
          }));
          setMessages(enriched);
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error("Failed to load messages:", err);
        setError("Failed to load messages. Please try again.");
      }
    }
    load();

    return () => abortController.abort();
  }, [tradeId, userId]);

  async function onSend(text: string) {
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeId, input: text }),
      });
      if (!res.ok) throw new Error(`Send failed (${res.status})`);
      const json = await res.json();
      setMessages((m) => [
        ...m,
        { text, role: "user", senderId: userId },
        { text: json.message.text, role: "assistant" },
      ]);
    } catch (err) {
      console.error("send failed:", err);
      setError("Failed to send message. Please try again.");
    }
  }

  if (!canUseAiChat) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-4 text-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
          <Lock className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
            Plus feature
          </p>
          <h2 className="text-base font-black uppercase tracking-tight text-white mb-2">
            AI Chat Assistant
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
            AI-powered chat is available on Plus and above. Upgrade to get smart trade assistance.
          </p>
        </div>
        <Link
          to="/dashboard/billing"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-[#030712] text-[11px] font-mono font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors"
        >
          Upgrade plan →
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      {error && (
        <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded">
          {error}
        </div>
      )}
      <ChatWindow messages={messages} currentUserId={userId} />
      <ChatComposer onSend={onSend} />
    </div>
  );
}
