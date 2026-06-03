import { Link } from "react-router";
import { Lock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { ScrollReveal } from "~/components/motion/scroll-reveal";
import {
  StaggerChildren,
  StaggerItem,
} from "~/components/motion/stagger-children";
import { BUSINESS_PRODUCTS_LIVE } from "~/lib/tier-limits";

type PricingFeature = {
  label: string;
};

type PricingTier = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PricingFeature[];
  cta: string;
  ctaLink: string;
  popular?: boolean;
  businessProduct?: boolean;
};

const tiers: PricingTier[] = [
  {
    name: "Free",
    price: "R0",
    period: "/mo",
    description: "Everything you need to start swapping. Safety features included for free — no card required.",
    features: [
      { label: "5 active listings" },
      { label: "Unlimited swaps" },
      { label: "AI Fraud Shield protection" },
      { label: "Fair Trade value badge" },
      { label: "Basic matching + search" },
    ],
    cta: "Start trading",
    ctaLink: "/dashboard",
  },
  {
    name: "Plus",
    price: "R69",
    period: "/mo",
    description: "For regular traders who want AI to do the heavy lifting.",
    features: [
      { label: "20 active listings" },
      { label: "AI Match + Swap Scores" },
      { label: "AI Listing from Photo" },
      { label: "Personalized Feed" },
      { label: "Advanced filters + priority support" },
    ],
    cta: "Upgrade to Plus",
    ctaLink: "/dashboard/billing",
    popular: true,
  },
  {
    name: "Business",
    price: "R299",
    period: "/mo",
    description: "For registered SA businesses moving stock and equipment.",
    features: [
      { label: "100 active listings" },
      { label: "Advanced filters" },
      { label: "AI match + insights" },
      { label: "Dedicated support" },
      { label: "Analytics dashboard" },
    ],
    cta: "Start business plan",
    ctaLink: "/dashboard/billing",
    businessProduct: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Dedicated support and custom integrations for larger operations.",
    features: [
      { label: "Unlimited listings" },
      { label: "Dedicated account manager" },
      { label: "API access" },
      { label: "Custom branding" },
      { label: "Priority support" },
    ],
    cta: "Contact sales",
    ctaLink: "mailto:hello@nozar.co.za?subject=Enterprise%20plan%20inquiry",
    businessProduct: true,
  },
];

const visibleTiers = tiers.map((tier) =>
  tier.businessProduct && !BUSINESS_PRODUCTS_LIVE
    ? { ...tier, comingSoon: true as const }
    : { ...tier, comingSoon: false as const },
);

// TASK 05 COMPLETE

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24"
    >
      <ScrollReveal>
        <div className="mb-16 text-center">
          <span className="text-emerald-500 font-mono text-xs uppercase tracking-widest block mb-4">
            // Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase">
            Pick a plan.
          </h2>
        </div>
      </ScrollReveal>

      <StaggerChildren
        staggerDelay={0.12}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {visibleTiers.map((tier) => (
          <StaggerItem key={tier.name}>
          <Card
            variant="glass"
            className={`flex flex-col relative transition-all duration-500 ${
              tier.popular
                ? "border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)] bg-gradient-to-b from-emerald-950/20 to-transparent"
                : "hover:border-white/20"
            } ${tier.comingSoon ? "opacity-60" : ""}`}
          >
            {tier.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-slate-950 px-4 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                Most popular
              </div>
            )}

            <CardHeader className={tier.popular ? "pt-8" : ""}>
              <span className="text-slate-400 font-mono text-xs uppercase tracking-widest block mb-2">
                {tier.name}
              </span>
              <CardTitle className="text-3xl font-black tracking-tight">
                <span className="font-mono">
                  {tier.price}
                  <span className="text-base font-normal text-slate-500">
                    {tier.period}
                  </span>
                </span>
              </CardTitle>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                {tier.description}
              </p>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3 font-mono text-sm text-slate-300">
                {tier.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-3">
                    <span className="text-emerald-500">[+]</span>
                    {feature.label}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              {tier.comingSoon ? (
                <div
                  aria-disabled="true"
                  className="block w-full py-3 rounded-xl font-bold text-center text-sm bg-white/[0.02] border border-white/10 text-slate-500 flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="font-mono text-xs uppercase tracking-widest">
                    Coming soon
                  </span>
                </div>
              ) : tier.ctaLink.startsWith("mailto:") ? (
                <a
                  href={tier.ctaLink}
                  className={`block w-full py-3 rounded-xl font-bold transition-colors text-center text-sm ${
                    tier.popular
                      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {tier.cta}
                </a>
              ) : (
                <Link
                  to={tier.ctaLink}
                  className={`block w-full py-3 rounded-xl font-bold transition-colors text-center text-sm ${
                    tier.popular
                      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {tier.cta}
                </Link>
              )}
            </CardFooter>
          </Card>
          </StaggerItem>
        ))}
      </StaggerChildren>
    </section>
  );
}
