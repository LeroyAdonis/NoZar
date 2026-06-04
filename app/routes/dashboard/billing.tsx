import { useEffect, useRef } from "react";
import { Form, useLoaderData, useSearchParams, useFetcher } from "react-router";
import type { Route } from "./+types/billing";
import { eq } from "drizzle-orm";
import {
  CreditCard,
  Check,
  Lock,
  Zap,
  BarChart3,
  Shield,
  Layers,
  Rocket,
  ExternalLink,
  Loader2,
} from "lucide-react";

import { useHaptics } from "~/components/ui/haptic-provider";

import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { subscriptions } from "~/lib/schema";
import { getListingUsage } from "~/lib/tier-limits.server";
import { LISTING_LIMITS, BUSINESS_PRODUCTS_LIVE } from "~/lib/tier-limits";

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

const VISIBLE_TIERS = BUSINESS_PRODUCTS_LIVE
  ? TIERS
  : TIERS.filter((t) => t.code !== "business");

// ─── Meta ──────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Billing — NoZar" },
    {
      name: "description",
      content: "Manage your NoZar subscription and tier",
    },
  ];
}

// ─── Loader ────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const usage = await getListingUsage(user.id);

  const [sub] = await db
    .select({
      status: subscriptions.status,
      nextPaymentDate: subscriptions.nextPaymentDate,
      promoExpiresAt: subscriptions.promoExpiresAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  const url = new URL(request.url);
  const isProduction = process.env.VERCEL_ENV === "production";
  const testpayOn = url.searchParams.get("testpay") === "1";
  const hasCreds = Boolean(
    process.env.PAYSTACK_PUBLIC_KEY && process.env.PAYSTACK_SECRET_KEY,
  );
  const upgradeEnabled = hasCreds && (isProduction || testpayOn);

  return {
    planCode: usage.planCode,
    listingCount: usage.activeCount,
    subscription: sub
      ? {
          status: sub.status,
          nextPaymentDate: sub.nextPaymentDate,
          promoExpiresAt: sub.promoExpiresAt,
        }
      : null,
    upgradeEnabled,
  };
}

// ─── Component ─────────────────────────────────────────────────

export default function BillingPage() {
  const { planCode, listingCount, subscription, upgradeEnabled } =
    useLoaderData<typeof loader>();

  const haptics = useHaptics();
  const [searchParams] = useSearchParams();
  const fetcher = useFetcher<{ ok?: boolean; redirectUrl?: string; error?: string }>();
  const redirectingRef = useRef(false);

  // Fire success haptic when Paystack returns with ps=success
  useEffect(() => {
    if (searchParams.get("ps") === "success") {
      haptics.success();
    }
  }, [searchParams]);

  // Handle fetcher redirect — redirect to Paystack checkout
  useEffect(() => {
    if (
      fetcher.data?.redirectUrl &&
      fetcher.state === "idle" &&
      !redirectingRef.current
    ) {
      redirectingRef.current = true;
      window.location.href = fetcher.data.redirectUrl;
    }
  }, [fetcher.data, fetcher.state]);

  // Show a brief loading state during redirect
  const isRedirecting =
    fetcher.state !== "idle" || redirectingRef.current;

  const currentTier = TIERS.find((t) => t.code === planCode) ?? TIERS[0];
  const usagePct = Math.min(
    (listingCount / currentTier.listingLimit) * 100,
    100,
  );
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

      {/* ── Active subscription / Cancel section ── */}
      {subscription?.status === "active" && (
        <section className="bg-[#0F172A] border border-emerald-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Active subscription
              </p>
              {subscription.nextPaymentDate && (
                <p className="text-xs text-slate-400 mt-1">
                  Next charge:{" "}
                  {new Date(subscription.nextPaymentDate).toLocaleDateString(
                    "en-ZA",
                    { year: "numeric", month: "short", day: "numeric" },
                  )}
                </p>
              )}
            </div>
            <Form method="post" action="/api/pay/cancel">
              <button
                type="submit"
                onClick={() => haptics.warning()}
                className="px-4 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest text-rose-400 border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
              >
                Cancel subscription
              </button>
            </Form>
          </div>
        </section>
      )}

      {/* ── Promo status card ── */}
      {subscription?.status === "promo" && (
        <div
          data-testid="promo-status-card"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                Beta Plus Active
              </span>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
              Free for 90 days
            </span>
          </div>
          <p className="text-xs text-slate-400">
            You have full{" "}
            <span className="text-emerald-400 font-semibold">Plus</span> access
            during the beta.
            {subscription.promoExpiresAt && (
              <>
                {" "}
                Your free period ends on{" "}
                <span className="text-slate-200">
                  {new Date(subscription.promoExpiresAt).toLocaleDateString(
                    "en-ZA",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                </span>
                .
              </>
            )}
          </p>
          <p className="text-[10px] text-slate-500">
            After the beta, you can subscribe to keep Plus access. No card
            required during the free period.
          </p>
        </div>
      )}

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
                atLimit
                  ? "text-rose-400"
                  : approaching
                    ? "text-amber-400"
                    : "text-slate-400"
              }`}
            >
              {listingCount} / {currentTier.listingLimit}
            </span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                atLimit
                  ? "bg-rose-500"
                  : approaching
                    ? "bg-amber-400"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          {usageWarn && (
            <p
              className={`text-[10px] font-mono ${
                atLimit
                  ? "text-rose-400/80"
                  : "text-amber-400/70"
              }`}
            >
              {overLimit
                ? "Over listing limit — archive some listings or upgrade to add more"
                : atLimit
                  ? "At listing limit — upgrade to add more"
                  : "Approaching listing limit — consider upgrading"}
            </p>
          )}
        </div>

        {/* Current tier features quick-view */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-1">
          {currentTier.features
            .filter((f) => f.included)
            .map((f) => (
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
          {VISIBLE_TIERS.map((tier) => {
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
                ) : tier.code === "plus" && upgradeEnabled ? (
                  <fetcher.Form method="post" action="/api/pay/upgrade">
                    <input type="hidden" name="planCode" value="plus" />
                    <button
                      type="submit"
                      disabled={isRedirecting}
                      className="w-full py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest text-center text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 disabled:cursor-wait transition-colors flex items-center justify-center gap-2"
                    >
                      {isRedirecting ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Redirecting…
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3 h-3" />
                          Upgrade to Plus
                        </>
                      )}
                    </button>
                  </fetcher.Form>
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
                        Payment processing coming soon — powered by Paystack
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

      {!BUSINESS_PRODUCTS_LIVE && (
        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3.5">
          <Lock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
              Business plans — coming soon
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trading for a registered business? Drop us a note at{" "}
              <a
                href="mailto:hello@nozar.co.za?subject=Business%20plan%20waitlist"
                className="text-amber-300 underline underline-offset-2"
              >
                hello@nozar.co.za
              </a>{" "}
              to join the waitlist.
            </p>
          </div>
        </div>
      )}

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
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer note ── */}
      <p className="text-[10px] font-mono text-slate-600 text-center pb-4">
        All prices in ZAR &middot; Billing via Paystack &middot; Cancel anytime
      </p>
    </div>
  );
}
