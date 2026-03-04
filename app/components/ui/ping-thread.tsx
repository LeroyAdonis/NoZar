import { Unlock } from "lucide-react";
import type { Ping } from "~/lib/types";

type PingThreadProps = {
  ping: Ping;
  onClick?: () => void;
};

export function PingThread({ ping, onClick }: PingThreadProps) {
  const lastMessage = ping.messages[ping.messages.length - 1];

  return (
    <div
      onClick={onClick}
      className="bg-[#0F172A] border border-white/10 rounded-3xl p-4 flex gap-4 cursor-pointer hover:border-emerald-500/30 transition-colors relative group"
    >
      {/* Unread dot */}
      {ping.unread && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
      )}

      {/* User avatar */}
      <div className="w-12 h-12 rounded-xl bg-[#030712] flex items-center justify-center border border-white/10 flex-shrink-0 group-hover:border-emerald-500/30">
        <span className="text-sm font-bold text-slate-400 group-hover:text-emerald-400">
          {ping.user.charAt(0)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-bold text-sm text-white">{ping.user}</h4>
          <span className="text-[10px] font-mono text-slate-500">
            {ping.time}
          </span>
        </div>
        <p className="text-xs text-slate-400 truncate">
          Re: {ping.asset}
        </p>

        {/* Last message preview */}
        {lastMessage && (
          <p className="text-xs text-slate-500 truncate mt-1">
            {lastMessage.sender === "me" ? "You: " : ""}
            {lastMessage.text}
          </p>
        )}

        {/* Handshake status badge */}
        {ping.status === "handshake_ready" && (
          <div className="mt-2 inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
            <Unlock className="w-3 h-3" /> Handshake Initiated
          </div>
        )}
      </div>
    </div>
  );
}
