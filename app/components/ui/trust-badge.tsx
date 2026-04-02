import { Shield, CheckCircle2, Star } from "lucide-react";

export type TrustLevel = "newcomer" | "verified" | "trusted";

interface TrustBadgeProps {
  level: TrustLevel;
  completedTrades: number;
  averageRating: number | null;
  className?: string;
}

export function TrustBadge({ level, completedTrades, averageRating, className }: TrustBadgeProps) {
  const base = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full";

  if (level === "trusted") {
    return (
      <span className={`${base} bg-cyan-500/10 border border-cyan-500/20 ${className}`}>
        <Star className="w-3 h-3 text-cyan-400" />
        <span className="text-[9xs] font-mono text-cyan-400 uppercase tracking-widest">
          Trusted ★ {averageRating?.toFixed(1)}
        </span>
      </span>
    );
  }

  if (level === "verified") {
    return (
      <span className={`${base} bg-emerald-500/10 border border-emerald-500/30 ${className}`}>
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        <span className="text-[9xs] font-mono text-emerald-400 uppercase tracking-widest">
          Verified ✓ ({completedTrades}×)
        </span>
      </span>
    );
  }

  // Newcomer
  const progress = Math.min((completedTrades / 1) * 100, 100);
  return (
    <span className={`${base} gap-1 bg-slate-700/40 border border-slate-600/20 ${className}`}>
      <Shield className="w-3 h-3 text-slate-400" />
      <span className="text-[9xs] font-mono text-slate-400 uppercase tracking-widest">
        Newcomer
      </span>
      <span className="text-[9xs] font-mono text-slate-500">{progress.toFixed(0)}% to ✓)</span>
    </span>
  );
}