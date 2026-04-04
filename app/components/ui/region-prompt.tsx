// app/components/ui/region-prompt.tsx
"use client";

import { Form } from "react-router";
import { MapPin } from "lucide-react";
import { MVP_REGIONS, REGION_SLUGS } from "~/lib/regions";

type RegionPromptProps = {
  /** Form action URL — should POST to a route that updates profiles.province */
  actionUrl?: string;
};

export function RegionPrompt({ actionUrl }: RegionPromptProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#030712]/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Header */}
        <div>
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
            Select Your Region
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Pick your region to see nearby swaps. You can change this later in your profile.
          </p>
        </div>

        {/* Region cards */}
        <div className="grid gap-4">
          {REGION_SLUGS.map((slug) => {
            const region = MVP_REGIONS[slug];
            return (
              <Form
                key={slug}
                method="post"
                action={actionUrl}
              >
                <input type="hidden" name="intent" value="setRegion" />
                <input type="hidden" name="province" value={region.province} />
                <button
                  type="submit"
                  className="w-full bg-[#0F172A] border border-white/10 rounded-2xl p-6 flex items-center gap-4 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group text-left"
                >
                  <span className="text-4xl">{region.emoji}</span>
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">
                      {region.label}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">
                      {region.province}
                    </p>
                  </div>
                </button>
              </Form>
            );
          })}
        </div>

        {/* Coming soon note */}
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
          More provinces coming soon
        </p>
      </div>
    </div>
  );
}
