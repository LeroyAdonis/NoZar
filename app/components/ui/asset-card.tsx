import { MapPin, Clock, Repeat } from "lucide-react";
import type { ListingCard } from "~/lib/types";

type AssetCardProps = {
  listing: ListingCard;
  onClick?: () => void;
};

export function AssetCard({ listing, onClick }: AssetCardProps) {
  return (
    <div
      data-testid="asset-card"
      onClick={onClick}
      className="bg-[#0F172A] border border-white/10 rounded-3xl p-4 flex gap-4 hover:border-white/20 transition-colors cursor-pointer group shadow-lg"
    >
      {/* Image / placeholder */}
      <div
        className={`w-24 h-24 rounded-2xl ${listing.imageUrl ? "" : "bg-emerald-900/20"} border border-white/5 flex items-center justify-center flex-shrink-0 relative overflow-hidden`}
      >
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Repeat className="w-6 h-6 text-white/20 group-hover:scale-110 transition-transform" />
        )}
        <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md rounded px-1.5 py-0.5 text-[8px] font-mono text-white">
          {listing.type}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
        <div>
          <h3 className="font-bold text-sm leading-tight mb-1 text-slate-50 group-hover:text-emerald-400 transition-colors line-clamp-2">
            {listing.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-1">
            {listing.seekingDescription ? (
              <>
                <span className="text-slate-500">Needs:</span>{" "}
                {listing.seekingDescription}
              </>
            ) : (
              listing.description
            )}
          </p>
        </div>
        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-1 rounded-md whitespace-nowrap">
              <MapPin className="w-3 h-3 text-cyan-500 shrink-0" /> {listing.distance}
            </span>
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-500 whitespace-nowrap">
              <Clock className="w-3 h-3 shrink-0" /> {listing.timeAgo}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[80px]">
              {listing.userName}
            </span>
            {listing.isVerified && (
              <span className="w-3 h-3 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
