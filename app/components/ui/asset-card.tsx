import { MapPin, Clock, Repeat } from "lucide-react";
import type { Asset } from "~/lib/types";

type AssetCardProps = {
  asset: Asset;
  onClick?: () => void;
};

export function AssetCard({ asset, onClick }: AssetCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-[#0F172A] border border-white/10 rounded-3xl p-4 flex gap-4 hover:border-white/20 transition-colors cursor-pointer group shadow-lg"
    >
      {/* Image placeholder */}
      <div
        className={`w-24 h-24 rounded-2xl ${asset.image} border border-white/5 flex items-center justify-center flex-shrink-0 relative overflow-hidden`}
      >
        <Repeat className="w-6 h-6 text-white/20 group-hover:scale-110 transition-transform" />
        <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md rounded px-1.5 py-0.5 text-[8px] font-mono text-white">
          {asset.tier}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          <h3 className="font-bold text-sm leading-tight mb-1 text-slate-50 group-hover:text-emerald-400 transition-colors">
            {asset.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-1">
            <span className="text-slate-500">Needs:</span> {asset.need}
          </p>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-1 rounded-md">
              <MapPin className="w-3 h-3 text-cyan-500" /> {asset.distance}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
              <Clock className="w-3 h-3" /> {asset.time}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
