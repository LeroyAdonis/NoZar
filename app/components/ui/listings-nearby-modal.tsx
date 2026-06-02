// app/components/ui/listings-nearby-modal.tsx
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, X, Repeat } from "lucide-react";
import { haversineKm, formatDistance } from "~/lib/utils";

type NearbyPin = {
  id: number;
  lat: number;
  lng: number;
  title: string;
  type: "item" | "service";
  description: string;
  imageUrl: string | null;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};

type ListingsNearbyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  pins: NearbyPin[];
  radarCenter: { lat: number; lng: number };
  radiusKm: number;
};

export function ListingsNearbyModal({
  isOpen,
  onClose,
  pins,
  radarCenter,
  radiusKm,
}: ListingsNearbyModalProps) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85dvh] rounded-t-3xl border-t border-white/10 bg-[#0F172A] shadow-2xl"
          >
            {/* Handle */}
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {pins.length} {pins.length === 1 ? "listing" : "listings"} nearby
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Within {radiusKm}km of your radar centre
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto px-3 pb-[76px] md:pb-6" style={{ maxHeight: "calc(85dvh - 100px)" }}>
              {pins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MapPin className="mb-3 h-8 w-8 text-slate-600" />
                  <p className="text-sm font-medium text-slate-400">No listings in range</p>
                  <p className="mt-1 text-xs text-slate-500">Try expanding your search radius</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pins.map((pin) => {
                    const distKm = haversineKm(radarCenter.lat, radarCenter.lng, pin.lat, pin.lng);
                    const cityLabel = distKm < 1 ? "Less than 1 km away" : `${formatDistance(distKm)} away`;
                    return (
                      <button
                        key={pin.id}
                        type="button"
                        onClick={() => {
                          onClose();
                          void navigate(`/dashboard/asset/${pin.id}`);
                        }}
                        className="flex w-full gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-left transition-colors hover:border-white/15 hover:bg-white/[0.06] active:bg-white/[0.04]"
                      >
                        {/* Thumbnail */}
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/5">
                          {pin.imageUrl ? (
                            <img
                              src={pin.imageUrl}
                              alt={pin.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-emerald-900/20">
                              <Repeat className="h-5 w-5 text-white/20" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate text-sm font-bold text-slate-50">
                              {pin.title}
                            </h4>
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider ${
                                pin.type === "service"
                                  ? "bg-cyan-500/10 text-cyan-400"
                                  : "bg-emerald-500/10 text-emerald-400"
                              }`}
                            >
                              {pin.type}
                            </span>
                          </div>
                          <p className="line-clamp-1 text-xs text-slate-400">{pin.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-cyan-500" />
                              {cityLabel}
                            </span>
                            <span>·</span>
                            <span className="truncate">by {pin.user.name}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
