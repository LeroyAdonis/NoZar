import { useState } from "react";
import { Scale, Package, Clock, X, Plus, Check } from "lucide-react";

interface Listing {
  id: number;
  title: string;
  estimatedValueZar: number | null;
}

interface TradeItem {
  listingId?: number;
  description?: string;
  estimatedValue?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (items: TradeItem[]) => void;
  maxItems: number;
  userListings: Listing[];
  theirValue: number;
  yourValue: number;
}

export function BalancePile({
  isOpen,
  onClose,
  onSubmit,
  maxItems,
  userListings,
  theirValue,
  yourValue,
}: Props) {
  const [mode, setMode] = useState<"listing" | "service" | null>(null);
  const [selectedListings, setSelectedListings] = useState<number[]>([]);
  const [customService, setCustomService] = useState("");
  const [customValue, setCustomValue] = useState("");

  if (!isOpen) return null;

  const gap = theirValue - yourValue;
  const currentItemsCount = selectedListings.length + (customService.trim() ? 1 : 0);

  // Live preview of pending additions
  const pendingValue = selectedListings.reduce((sum, id) => {
    const l = userListings.find((x) => x.id === id);
    return sum + (l?.estimatedValueZar ?? 0);
  }, 0) + (Number(customValue) || 0);

  const previewYourValue = yourValue + pendingValue;
  const previewGap = theirValue - previewYourValue;

  const handleAddFromListings = (listing: Listing) => {
    if (currentItemsCount >= maxItems) return;
    if (selectedListings.includes(listing.id)) {
      setSelectedListings((prev) => prev.filter((id) => id !== listing.id));
    } else {
      setSelectedListings((prev) => [...prev, listing.id]);
    }
  };

  const handleAccept = () => {
    const items: TradeItem[] = [
      ...selectedListings.map(
        (id): TradeItem => {
          const l = userListings.find((x) => x.id === id);
          return { listingId: Number(id), estimatedValue: l?.estimatedValueZar || undefined };
        },
      ),
      customService.trim()
        ? ({ description: customService.trim(), estimatedValue: Number(customValue) || undefined } as TradeItem)
        : null,
    ].filter((x): x is TradeItem => x !== null);

    onSubmit(items);
    setSelectedListings([]);
    setCustomService("");
    setCustomValue("");
    setMode(null);
  };

  const handleAcceptAsIs = () => {
    onSubmit([]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-nz-surface border border-white/10 rounded-t-3xl max-h-[calc(85dvh-80px)] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+80px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white">
              ⚖️ Balance the Trade
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Value Summary */}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <span className="text-[9px] font-mono text-slate-500 uppercase">Theirs</span>
              <p className="text-sm font-bold text-white">~R{theirValue.toLocaleString()}</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <span className="text-[9px] font-mono text-slate-500 uppercase">
                {pendingValue > 0 ? "New Gap" : "Gap"}
              </span>
              <p className={`text-sm font-bold ${
                pendingValue > 0
                  ? previewGap === 0
                    ? "text-emerald-400"
                    : Math.abs(previewGap) < Math.abs(gap)
                      ? "text-amber-300"
                      : "text-amber-400"
                  : gap > 0
                    ? "text-amber-400"
                    : "text-emerald-400"
              }`}>
                {(() => {
                  const activeGap = pendingValue > 0 ? previewGap : gap;
                  if (activeGap === 0) return "✓ Even";
                  return `~R${Math.abs(activeGap).toLocaleString()}`;
                })()}
              </p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <span className="text-[9px] font-mono text-slate-500 uppercase">Yours</span>
              <p className="text-sm font-bold text-white">
                ~R{yourValue.toLocaleString()}
                {pendingValue > 0 && (
                  <span className="text-emerald-400 text-[10px] ml-1">+{pendingValue.toLocaleString()}</span>
                )}
              </p>
            </div>
          </div>

          {/* Direction indicator */}
          {(() => {
            const activeGap = pendingValue > 0 ? previewGap : gap;
            if (activeGap === 0) {
              return <p className="text-center text-[10px] font-mono text-emerald-400">✓ Values match</p>;
            }
            const youOwe = activeGap > 0;
            return (
              <p className="text-center text-[10px] font-mono text-amber-400">
                {youOwe
                  ? `You need R${Math.abs(activeGap).toLocaleString()} more to match their offer`
                  : `They need R${Math.abs(activeGap).toLocaleString()} more to match your offer`
                }
              </p>
            );
          })()}

          {/* Mode Buttons */}
          {!mode && (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMode("listing")}
                disabled={currentItemsCount >= maxItems}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-300 hover:bg-white/10 disabled:opacity-30"
              >
                <Package className="w-3.5 h-3.5" /> Add Listing
              </button>
              <button
                onClick={() => setMode("service")}
                disabled={currentItemsCount >= maxItems}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-300 hover:bg-white/10 disabled:opacity-30"
              >
                <Clock className="w-3.5 h-3.5" /> Extend Service
              </button>
              <button
                onClick={handleAcceptAsIs}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
              >
                <Check className="w-3.5 h-3.5" /> Accept As-Is
              </button>
            </div>
          )}

          {/* Available Listings */}
          {mode === "listing" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Your Listings ({currentItemsCount}/{maxItems})
                </span>
                <button
                  onClick={() => setMode(null)}
                  className="text-[10px] font-mono text-slate-500 hover:text-slate-300"
                >
                  Back
                </button>
              </div>
              {userListings.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleAddFromListings(l)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedListings.includes(l.id)
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{l.title}</span>
                    <span className="text-xs font-mono text-emerald-400">
                      ~R{l.estimatedValueZar?.toLocaleString() || "?"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Custom Service */}
          {mode === "service" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Service Extension
                </span>
                <button
                  onClick={() => setMode(null)}
                  className="text-[10px] font-mono text-slate-500 hover:text-slate-300"
                >
                  Back
                </button>
              </div>
              <textarea
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                placeholder="e.g. I'll also include 2hrs of graphic design..."
                maxLength={300}
                rows={3}
                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
              <input
                type="number"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Est. value (R)..."
                min={0}
                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          )}
        </div>

        {/* Preview + Submit */}
        {(selectedListings.length > 0 || customService.trim()) && (
          <div className="p-5 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Your pile ({currentItemsCount}/{maxItems})
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                +R{pendingValue.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedListings.map((id) => {
                const l = userListings.find((x) => x.id === id);
                return (
                  <span
                    key={id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400"
                  >
                    {l?.title || `#${id}`}
                  </span>
                );
              })}
              {customService.trim() && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400">
                  {customService.slice(0, 30)}{customService.length > 30 ? "..." : ""}
                </span>
              )}
            </div>
            <button
              onClick={handleAccept}
              className="w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all"
            >
              {previewGap === 0
                ? "⚖️ Balanced — Submit Offer"
                : `⚖️ Submit (gap: R${Math.abs(previewGap).toLocaleString()})`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
