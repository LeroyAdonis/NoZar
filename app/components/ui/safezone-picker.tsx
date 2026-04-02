import { MapPin, ShieldCheck, RotateCw } from "lucide-react";
import { Spinner } from "./loading-indicator";

export interface MeetupSpot {
  name: string;
  address: string;
  reason: string;
}

interface Props {
  spots: MeetupSpot[];
  selected: number | null;
  onSelect: (index: number) => void;
  isGenerating?: boolean;
  isConfirmed?: boolean;
}

export function SafeZonePicker({ spots, selected, onSelect, isGenerating, isConfirmed }: Props) {
  if (isConfirmed) {
    const spot = selected !== null && spots[selected];
    return (
      <div className="rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#030712] border border-emerald-500/50 overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.2)]">
        <div className="bg-emerald-500/10 p-3 border-b border-emerald-500/20 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
            Safe Zone Confirmed 🤝
          </span>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
              Meetup Location
            </span>
            <h4 className="font-bold text-white text-lg flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              {spot ? spot.name : "TBD"}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {spot ? spot.address : ""}
            </p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl">
            <span className="text-[9px] font-mono text-emerald-400 uppercase block">
              ✓ Both parties agreed on this location
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="rounded-2xl bg-[#0F172A] border border-white/10 p-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-[10px] font-mono text-slate-400 uppercase">
            Finding safer spots...
          </span>
        </div>
      </div>
    );
  }

  if (spots.length === 0 && !isGenerating) {
    return (
      <div className="rounded-2xl bg-[#0F172A] border border-white/10 p-5 text-center">
        <MapPin className="w-6 h-6 text-slate-600 mx-auto mb-2" />
        <p className="text-[10px] font-mono text-slate-500">
          Tap to generate safe meetup spots
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#0F172A] border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          Suggested Safe Meetup Spots
        </span>
      </div>

      <div className="divide-y divide-white/5">
        {spots.map((spot, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            className={`w-full text-left p-4 transition-all ${
              selected === idx
                ? "bg-emerald-500/10 border-l-2 border-l-emerald-500"
                : "hover:bg-white/5"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  selected === idx
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-slate-600"
                }`}
              >
                {selected === idx && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <h4 className="font-semibold text-sm text-white">
                    {spot.name}
                  </h4>
                </div>
                <p className="text-xs text-slate-400">{spot.address}</p>
                {spot.reason && (
                  <p className="text-[10px] font-mono text-emerald-400/60 mt-1">
                    → {spot.reason}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
