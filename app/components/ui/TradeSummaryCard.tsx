interface TradeSummaryCardProps {
  role: "yours" | "theirs";
  title: string;
  estimatedValueZar?: number | null;
  imageUrl?: string | null;
  type?: string;
}

export default function TradeSummaryCard({
  role,
  title,
  estimatedValueZar,
  imageUrl,
  type,
}: TradeSummaryCardProps) {
  return (
    <div className="relative bg-[#0F172A] border border-white/10 rounded-2xl p-3 flex gap-3 overflow-hidden">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-[9px] font-mono text-slate-500 uppercase">
          {role === "yours" ? "You offer" : "They offer"}
        </span>
        <div className="flex gap-2 items-start">
          <div className="w-12 h-12 rounded-xl bg-emerald-900/20 border border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white/20 text-lg">📦</span>
            )}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <h3 className="font-bold text-xs leading-snug text-slate-50 break-words line-clamp-2">
              {title}
            </h3>
            {estimatedValueZar != null && estimatedValueZar > 0 && (
              <span className="text-[10px] font-mono text-emerald-400">
                ~R{estimatedValueZar.toLocaleString()}
              </span>
            )}
            {type && (
              <span className="text-[9px] font-mono text-slate-600 uppercase">{type}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
