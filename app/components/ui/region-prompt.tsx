"use client";

import { Form } from "react-router";
import { MapPin } from "lucide-react";
import { MVP_REGIONS, REGION_SLUGS } from "~/lib/regions";

type RegionPromptProps = {
  actionUrl?: string;
};

export function RegionPrompt({ actionUrl }: RegionPromptProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#030712]/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full flex flex-col max-h-[90vh] text-center">
        <div className="shrink-0 pb-4 sm:pb-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white">
            Select Your Region
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 sm:mt-2 px-2">
            Pick your region to see nearby swaps. You can change this later in your profile.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide -mx-1 px-1 pb-2">
          <div className="grid gap-2 sm:gap-3">
            {REGION_SLUGS.map((slug) => {
              const region = MVP_REGIONS[slug];
              return (
                <Form key={slug} method="post" action={actionUrl}>
                  <input type="hidden" name="intent" value="setRegion" />
                  <input type="hidden" name="province" value={region.province} />
                  <button
                    type="submit"
                    className="w-full bg-[#0F172A] border border-white/10 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group text-left active:scale-[0.98]"
                  >
                    <span className="text-2xl sm:text-4xl">{region.emoji}</span>
                    <div>
                      <h3 className="font-bold text-sm sm:text-lg text-white group-hover:text-emerald-400 transition-colors">
                        {region.label}
                      </h3>
                      <p className="text-[9px] sm:text-xs text-slate-500 font-mono uppercase tracking-widest">
                        {region.province}
                      </p>
                    </div>
                  </button>
                </Form>
              );
            })}
          </div>
        </div>
        <p className="shrink-0 pt-3 text-[10px] font-mono uppercase tracking-widest text-slate-600">
          All 9 provinces available
        </p>
      </div>
    </div>
  );
}
