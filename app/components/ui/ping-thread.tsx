import type { TradeThread } from "~/lib/types";
import { useHaptics } from "~/components/ui/haptic-provider";

type PingThreadProps = {
  thread: TradeThread;
  onClick?: () => void;
};

type BadgeConfig = {
  label: string;
  className: string;
};

function getStatusBadge(status: string): BadgeConfig {
  switch (status) {
    case "proposed":
      return { label: "Offered", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
    case "negotiating":
      return { label: "Chatting", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case "agreed":
    case "contact_shared":
      return { label: "Agreed", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    case "completed":
      return { label: "Done ✓", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" };
    case "frozen":
      return { label: "Paused", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
    default:
      return { label: status, className: "bg-white/5 text-slate-500 border-white/10" };
  }
}

export function PingThread({ thread, onClick }: PingThreadProps) {
  const haptics = useHaptics();
  const badge = getStatusBadge(thread.status);

  return (
    <div
      onClick={() => {
        haptics.lightTap();
        onClick?.();
      }}
      className="bg-[#0F172A] border border-white/10 rounded-3xl p-4 flex gap-4 cursor-pointer hover:border-emerald-500/30 transition-colors relative group"
    >
      {thread.unread && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
      )}

      {/* Avatar */}
      <div className="w-12 h-12 rounded-xl bg-[#030712] flex items-center justify-center border border-white/10 flex-shrink-0 group-hover:border-emerald-500/30">
        <span className="text-sm font-bold text-slate-400 group-hover:text-emerald-400">
          {thread.counterpartyName.charAt(0)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex justify-between items-start mb-1">
          <h4 className={`text-sm ${thread.unread ? "font-extrabold text-white" : "font-bold text-slate-300"}`}>
            {thread.counterpartyName}
          </h4>
          <span className="text-[10px] font-mono text-slate-500">{thread.timeAgo}</span>
        </div>

        <p className={`text-xs truncate ${thread.unread ? "text-slate-300" : "text-slate-400"}`}>
          About: {thread.listingTitle}
        </p>

        {thread.lastMessage && (
          <p className={`text-xs truncate mt-1 ${thread.unread ? "text-slate-300 font-medium" : "text-slate-500"}`}>
            {thread.lastMessage}
          </p>
        )}

        {/* Status badge */}
        <div className="mt-2">
          <span className={`inline-flex items-center text-[9px] font-mono px-2 py-0.5 rounded border uppercase tracking-widest ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      </div>
    </div>
  );
}
