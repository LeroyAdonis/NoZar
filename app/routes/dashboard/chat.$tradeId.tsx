import { Link, useLoaderData } from "react-router";
import { Lock, Scale, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
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
  const [analysis, setAnalysis] = useState<{ verdict: string; suggestions: string[]; explanation: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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

      {/* AI Trade Negotiator */}
      <div className="mb-3">
        {analysis ? (
          <div className={`rounded-xl border p-3 ${
            analysis.verdict === "fair"
              ? "bg-emerald-500/5 border-emerald-500/20"
              : analysis.verdict === "slightly_unbalanced"
              ? "bg-amber-500/5 border-amber-500/20"
              : "bg-red-500/5 border-red-500/20"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {analysis.verdict === "fair" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  AI Trade Analysis
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAnalysis(null)}
                className="text-[10px] font-mono text-slate-500 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-slate-300 mb-2">{analysis.explanation}</p>
            {analysis.suggestions.length > 0 && (
              <ul className="space-y-1">
                {analysis.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <Sparkles className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : analysisError ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 mb-2">
            <p className="text-xs text-amber-400">{analysisError}</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={async () => {
            setAnalyzing(true);
            setAnalysisError(null);
            setAnalysis(null);
            try {
              const res = await fetch(`/api/trade-balance?tradeId=${tradeId}`);
              const data = await res.json();
              if (data.error) {
                setAnalysisError(data.message ?? data.error);
              } else {
                setAnalysis(data);
              }
            } catch {
              setAnalysisError("Could not analyze trade. Try again.");
            }
            setAnalyzing(false);
          }}
          disabled={analyzing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-emerald-400 transition-colors text-[11px] font-mono uppercase tracking-widest disabled:opacity-50"
        >
          <Scale className="w-3.5 h-3.5" />
          {analyzing ? "Analyzing trade..." : "Suggest Fair Trade"}
        </button>
      </div>
      <ChatWindow messages={messages} currentUserId={userId} />
      <ChatComposer onSend={onSend} />
    </div>
  );
}
