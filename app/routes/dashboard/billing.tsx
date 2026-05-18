import { useLoaderData } from "react-router";
import { CreditCard, Check, Lock, Bell, Zap, BarChart3, Shield, Layers } from "lucide-react";

import type { Route } from "./+types/billing";
import { requireAuth } from "~/lib/auth.server";
import { getListingUsage } from "~/lib/tier-limits.server";
import { LISTING_LIMITS } from "~/lib/tier-limits";

// ─── Tier definitions ──────────────────────────────────────────

const TIERS = [
  {
    code: "free",
    label: "TIER_01",
    name: "Free",
    priceZar: null,
    listingLimit: LISTING_LIMITS.free,
    features: [
      { text: `${LISTING_LIMITS.free} active listings`, included: true },
      { text: "Browse & trade", included: true },
      { text: "Basic search", included: true },
      { text: "Trade messaging", included: true },
      { text: "AI match", included: false },
      { text: "Priority support", included: false },
      { text: "Analytics", included: false },
    ],
  },
  {
    code: "plus",
    label: "TIER_02",
    name: "Plus",
    priceZar: 99,
    listingLimit: LISTING_LIMITS.plus,
    features: [
      { text: `${LISTING_LIMITS.plus} active listings`, included: true },
      { text: "Browse & trade", included: true },
      { text: "Advanced filters", included: true },
      { text: "Trade messaging", included: true },
      { text: "AI match", included: true },
      { text: "Priority support", included: true },
      { text: "Analytics", included: false },
    ],
  },
  {
    code: "business",
    label: "TIER_03",
    name: "Business",
    priceZar: 299,
    listingLimit: LISTING_LIMITS.business,
    features: [
      { text: `${LISTING_LIMITS.business} active listings`, included: true },
      { text: "Browse & trade", included: true },
      { text: "Advanced filters", included: true },
      { text: "Trade messaging", included: true },
      { text: "AI match + insights", included: true },
      { text: "Dedicated support", included: true },
      { text: "Analytics dashboard", included: true },
    ],
  },
] as const;

// ─── Meta ──────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Billing — Nozar" },
    { name: "description", content: "Manage your Nozar subscription and tier" },
  ];
}

// ─── Loader ────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const usage = await getListingUsage(user.id);

  return {
    planCode: usage.planCode,
    listingCount: usage.activeCount,
  };
}

// ─── Component ─────────────────────────────────────────────────

export default function BillingPage() {
  const { planCode, listingCount } = useLoaderData<typeof loader>();

  const currentTier = TIERS.find((t) => t.code === planCode) ?? TIERS[0];
  const usagePct = Math.min((listingCount / currentTier.listingLimit) * 100, 100);
  const overLimit = listingCount > currentTier.listingLimit;
  const atLimit = listingCount >= currentTier.listingLimit;
  const approaching = !atLimit && usagePct >= 80;
  const usageWarn = approaching || atLimit;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ── Page header ── */}
      <div>
        <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1">
          // Account
        </span>
        <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          Billing &amp; Subscription
        </h1>
      </div>

      {/* ── Coming-soon banner ── */}
      <div className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3.5">
        <Bell className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
            Coming Soon
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Billing &amp; subscriptions are launching soon — powered by{" "}
            <span className="text-slate-300 font-mono">PayFast</span>.
            You&apos;ll be notified when upgrades become available.
          </p>
        </div>
      </div>

      {/* ── Current plan card ── */}
      <section className="bg-[#0F172A] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Current Plan
          </span>
          <span className="px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            {currentTier.label} — {currentTier.name}
          </span>
        </div>

        {/* Usage bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Listings Usage
            </span>
            <span
              className={`text-xs font-mono ${
                atLimit ? "text-rose-400" : approaching ? "text-amber-400" : "text-slate-400"
              }`}
            >
              {listingCount} / {currentTier.listingLimit}
            </span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                atLimit ? "bg-rose-500" : approaching ? "bg-amber-400" : "bg-emerald-500"
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          {usageWarn && (
            <p
              className={`text-[10px] font-mono ${
                atLimit ? "text-rose-400/80" : "text-amber-400/70"
              }`}
            >
              {overLimit
                ? "Over listing limit — archive some listings or upgrade when billing launches"
                : atLimit
                ? "At listing limit — upgrade when billing launches to add more"
                : "Approaching listing limit — upgrade when billing launches"}
            </p>
          )}
        </div>

        {/* Current tier features quick-view */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-1">
          {currentTier.features.filter((f) => f.included).map((f) => (
            <div key={f.text} className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-slate-400">{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tier comparison table ── */}
      <section className="space-y-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 block">
          // Tier Comparison
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TIERS.map((tier) => {
            const isCurrent = tier.code === planCode;
            return (
              <div
                key={tier.code}
                className={`bg-[#0F172A] rounded-2xl border p-5 flex flex-col gap-4 transition-colors ${
                  isCurrent
                    ? "border-emerald-500/40"
                    : "border-white/5 hover:border-white/10"
                }`}
              >
                {/* Tier header */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                      {tier.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-mono uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-black uppercase tracking-tight">
                    {tier.name}
                  </h2>
                  <p className="text-[10px] font-mono text-slate-500">
                    {tier.priceZar === null ? (
                      "Free forever"
                    ) : (
                      <>
                        <span className="text-sm font-bold text-slate-300">
                          R{tier.priceZar}
                        </span>
                        <span className="text-slate-600"> / mo</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Feature list */}
                <ul className="space-y-1.5 flex-1">
                  {tier.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-2">
                      {f.included ? (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-3 h-3 shrink-0 flex items-center justify-center">
                          <span className="block w-2 h-px bg-white/10 rounded-full" />
                        </span>
                      )}
                      <span
                        className={`text-[11px] ${
                          f.included ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="w-full py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest text-center text-emerald-400 border border-emerald-500/20 bg-emerald-500/5">
                    Current Plan
                  </div>
                ) : (
                  <div className="relative group">
                    <button
                      disabled
                      className="w-full py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest text-center text-slate-600 border border-white/5 bg-white/[0.02] cursor-not-allowed flex items-center justify-center gap-1.5"
                      aria-disabled="true"
                    >
                      <Lock className="w-3 h-3" />
                      Upgrade to {tier.name}
                    </button>
                    {/* Tooltip */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 whitespace-nowrap">
                      <div className="bg-[#0F172A] border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-400 shadow-xl">
                        Payment processing coming soon — powered by PayFast
                      </div>
                      <div className="w-2 h-2 bg-[#0F172A] border-r border-b border-white/10 rotate-45 mx-auto -mt-1" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Feature highlights ── */}
      <section className="bg-[#0F172A] border border-white/5 rounded-2xl p-5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 block mb-4">
          // What&apos;s included in paid tiers
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Zap,
              label: "AI Match",
              desc: "Smart listing recommendations powered by NVIDIA AI",
            },
            {
              icon: Layers,
              label: "More Listings",
              desc: "Post up to 100 active listings vs 5 on free",
            },
            {
              icon: Shield,
              label: "Priority Support",
              desc: "Fast-track issue resolution via dedicated channel",
            },
            {
              icon: BarChart3,
              label: "Analytics",
              desc: "Insights into listing views, trade rates, and reach",
            },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                {label}
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer note ── */}
      <p className="text-[10px] font-mono text-slate-600 text-center pb-4">
        All prices in ZAR · Billing via PayFast · Launching soon
      </p>
    </div>
  );
}
