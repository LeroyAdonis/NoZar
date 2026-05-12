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
      className="bg-[#0F172A] border border-white/10 rounded-3xl p-3 sm:p-4 flex gap-3 sm:gap-4 hover:border-white/20 transition-colors cursor-pointer group shadow-lg overflow-hidden"
    >
      {/* Image / placeholder */}
      <div
        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl ${listing.imageUrl ? "" : "bg-emerald-900/20"} border border-white/5 flex items-center justify-center flex-shrink-0 relative overflow-hidden`}
      >
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Repeat className="w-5 h-5 sm:w-6 sm:h-6 text-white/20 group-hover:scale-110 transition-transform" />
        )}
        <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md rounded px-1 sm:px-1.5 py-0.5 text-[7px] sm:text-[8px] font-mono text-white">
          {listing.type}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between py-0.5 sm:py-1 min-w-0">
        <div>
          <h3 className="font-bold text-xs sm:text-sm leading-tight mb-0.5 sm:mb-1 text-slate-50 group-hover:text-emerald-400 transition-colors line-clamp-2">
            {listing.title}
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1">
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
        <div className="flex flex-col gap-0.5 mt-2 sm:mt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md whitespace-nowrap">
              <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-500 shrink-0" /> {listing.distance}
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 truncate max-w-[60px] sm:max-w-[80px]">
                {listing.userName}
              </span>
              {listing.isVerified && (
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400" />
                </span>
              )}
            </div>
          </div>
          <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-slate-500 whitespace-nowrap">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> {listing.timeAgo}
          </span>
        </div>
      </div>
    </div>
  );
}
