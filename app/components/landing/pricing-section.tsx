import { Link } from "react-router";
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
};

const tiers: PricingTier[] = [
  {
    name: "Free",
    price: "R0",
    period: "/mo",
    description: "Start bartering with zero commitment. Everything you need for local peer-to-peer exchange.",
    features: [
      { label: "5 active listings" },
      { label: "Unlimited trades" },
      { label: "Basic search" },
      { label: "Local radius matching" },
    ],
    cta: "Start Trading",
    ctaLink: "/dashboard",
  },
  {
    name: "Trader Plus",
    price: "R29",
    period: "/mo",
    description: "For power traders who want visibility and insights across the network.",
    features: [
      { label: "20 active listings" },
      { label: "2 boost tokens/mo" },
      { label: "Priority in feed" },
      { label: "Advanced filters" },
      { label: "Trade analytics" },
    ],
    cta: "Upgrade Node",
    ctaLink: "/dashboard",
    popular: true,
  },
  {
    name: "Business",
    price: "R99",
    period: "/mo",
    description: "Built for registered SA entities. Liquidate surplus and manage B2B barter at scale.",
    features: [
      { label: "100 active listings" },
      { label: "10 boost tokens/mo" },
      { label: "CIPC verification badge" },
      { label: "Enterprise filters" },
      { label: "SARS export" },
    ],
    cta: "Initialize Business",
    ctaLink: "/dashboard",
  },
  {
    name: "Enterprise",
    price: "R249",
    period: "/mo",
    description: "Full protocol access with dedicated support and custom integrations for large operations.",
    features: [
      { label: "Unlimited listings" },
      { label: "30 boost tokens/mo" },
      { label: "Dedicated account manager" },
      { label: "API access" },
      { label: "Custom branding" },
      { label: "Priority support" },
    ],
    cta: "Contact Sales",
    ctaLink: "/dashboard",
  },
];

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24"
    >
      <ScrollReveal>
        <div className="mb-16 text-center">
          <span className="text-emerald-500 font-mono text-xs uppercase tracking-widest block mb-4">
            // Protocol.Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase">
            Choose Your Tier.
          </h2>
        </div>
      </ScrollReveal>

      <StaggerChildren
        staggerDelay={0.12}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {tiers.map((tier) => (
          <StaggerItem key={tier.name}>
          <Card
            key={tier.name}
            variant="glass"
            className={`flex flex-col relative transition-all duration-500 ${
              tier.popular
                ? "border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)] bg-gradient-to-b from-emerald-950/20 to-transparent"
                : "hover:border-white/20"
            }`}
          >
            {tier.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-slate-950 px-4 py-1 rounded-full font-mono text-xs font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                Most Popular
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
            </CardFooter>
          </Card>
          </StaggerItem>
        ))}
      </StaggerChildren>
    </section>
  );
}
