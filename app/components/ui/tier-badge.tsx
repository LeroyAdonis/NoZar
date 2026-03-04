import type { Asset } from "~/lib/types";

type TierBadgeProps = {
  tier: Asset["tier"];
};

export function TierBadge({ tier }: TierBadgeProps) {
  return (
    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
      {tier}
    </span>
  );
}
