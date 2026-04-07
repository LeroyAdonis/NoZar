// app/components/ui/region-toggle.tsx
import { useRef, useEffect } from "react";
import { MVP_REGIONS, type RegionSlug, REGION_SLUGS } from "~/lib/regions";

type RegionToggleProps = {
  activeRegion: RegionSlug;
  onChange: (slug: RegionSlug) => void;
};

export function RegionToggle({ activeRegion, onChange }: RegionToggleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active region on mount and when it changes
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const button = activeRef.current;
      const scrollLeft =
        button.offsetLeft - container.offsetWidth / 2 + button.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [activeRegion]);

  return (
    <div
      ref={scrollRef}
      data-testid="region-toggle"
      className="flex gap-1.5 bg-[#0F172A] border border-white/10 rounded-2xl sm:rounded-full p-1 overflow-x-auto scrollbar-hide max-w-full snap-x snap-mandatory"
    >
      {REGION_SLUGS.map((slug) => {
        const region = MVP_REGIONS[slug];
        const isActive = slug === activeRegion;
        return (
          <button
            key={slug}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onChange(slug)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-full text-[9px] sm:text-[10px] font-mono uppercase tracking-widest transition-all flex-shrink-0 snap-center ${
              isActive
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "text-slate-500 hover:text-slate-300 border border-transparent"
            }`}
          >
            <span className="text-sm sm:text-base">{region.emoji}</span>
            <span className="whitespace-nowrap">{region.label}</span>
          </button>
        );
      })}
    </div>
  );
}
