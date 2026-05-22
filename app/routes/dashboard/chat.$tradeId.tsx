import { Link, useLoaderData } from "react-router";
import { Lock } from "lucide-react";
import type { LoaderFunctionArgs } from "react-router";
import { useEffect, useState } from "react";
import ChatWindow from "~/components/ui/ChatWindow";
import ChatComposer from "~/components/ui/ChatComposer";
import { requireAuth } from "~/lib/auth.server";
import { getUserTier } from "~/lib/tier-limits.server";
import { canUseAiFeature } from "~/lib/tier-limits";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const tier = await getUserTier(user.id);
  return { canUseAiChat: canUseAiFeature(tier, "ai_chat") };
}

export default function TradeChat({ params }: any) {
  const { canUseAiChat } = useLoaderData<typeof loader>();
  const tradeId = Number(params.tradeId);
  const [messages, setMessages] = useState<Array<any>>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/messages/${tradeId}`);
      const data = await res.json();
      setMessages(data);
    }
    load();
  }, [tradeId]);

  async function onSend(text: string) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId, input: text }),
    });
    if (res.ok) {
      const json = await res.json();
      setMessages((m) => [
        ...m,
        { text, role: "user" },
        { text: json.message.text, role: "assistant" },
      ]);
    } else {
      console.error("send failed");
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
      <ChatWindow messages={messages} />
      <ChatComposer onSend={onSend} />
    </div>
  );
}
