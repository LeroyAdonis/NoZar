// app/components/ui/region-toggle.tsx
import { MVP_REGIONS, type RegionSlug, REGION_SLUGS } from "~/lib/regions";

type RegionToggleProps = {
  activeRegion: RegionSlug;
  onChange: (slug: RegionSlug) => void;
};

export function RegionToggle({ activeRegion, onChange }: RegionToggleProps) {
  return (
    <div className="flex gap-1.5 bg-[#0F172A] border border-white/10 rounded-full p-1">
      {REGION_SLUGS.map((slug) => {
        const region = MVP_REGIONS[slug];
        const isActive = slug === activeRegion;
        return (
          <button
            key={slug}
            type="button"
            onClick={() => onChange(slug)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest transition-all ${
              isActive
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "text-slate-500 hover:text-slate-300 border border-transparent"
            }`}
          >
            <span>{region.emoji}</span>
            <span>{region.label}</span>
          </button>
        );
      })}
    </div>
  );
}
