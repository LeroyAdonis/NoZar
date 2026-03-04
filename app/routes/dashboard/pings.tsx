import { useNavigate } from "react-router";
import { MessageSquare } from "lucide-react";
import type { Route } from "./+types/pings";
import { MOCK_PINGS } from "~/lib/mock-data";
import { PingThread } from "~/components/ui/ping-thread";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Pings — Nozar" },
    { name: "description", content: "Your swap requests and conversations" },
  ];
}

export default function Pings() {
  const navigate = useNavigate();

  const activePings = MOCK_PINGS.filter(
    (p) => p.status === "awaiting_reply" || p.status === "handshake_ready",
  );

  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-28 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1">
            // Comms.Uplink
          </span>
          <h2 className="text-xl font-bold uppercase tracking-tight text-white">
            Active Pings
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400 border border-white/10 px-2 py-1 rounded bg-[#0F172A]">
          {activePings.length} Thread{activePings.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Ping list */}
      {activePings.length > 0 ? (
        <div className="space-y-3">
          {activePings.map((ping) => (
            <PingThread
              key={ping.id}
              ping={ping}
              onClick={() => navigate(`/dashboard/pings/${ping.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0F172A] border border-white/10 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-400 mb-1">
            No Active Pings
          </h3>
          <p className="text-xs text-slate-500 max-w-[240px]">
            Start a conversation by pinging an asset you&apos;re interested in
            swapping for.
          </p>
        </div>
      )}
    </div>
  );
}
