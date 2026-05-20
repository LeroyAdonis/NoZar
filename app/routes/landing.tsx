import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  ArrowRight,

  ShieldCheck,
  MapPin,
  Briefcase,
  User,
  Menu,
  X,
  Lock,
  Globe,
  Cpu,
} from "lucide-react";

import { TrustBadgesSection } from "~/components/landing/trust-badges-section";
import { PricingSection } from "~/components/landing/pricing-section";
import { FaqSection } from "~/components/landing/faq-section";
import FooterSection from "~/components/landing/footer-section";
import type { Route } from "./+types/landing";
import { ScrollReveal } from "~/components/motion/scroll-reveal";
import { MagneticButton } from "~/components/motion/magnetic-button";
import { getOptionalSession } from "~/lib/auth.server";
import { BUSINESS_PRODUCTS_LIVE } from "~/lib/tier-limits";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalSession(request);
  return { isLoggedIn: !!session };
}

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "NoZar — Trade Without Cash" },
    {
      name: "description",
      content:
        "South Africa's barter platform. Swap your stuff, skills, and services with people near you. No money changes hands.",
    },
  ];
}

const SECTION_IDS = [
  "how-it-works",
  "exchange",
  "safety",
  "pricing",
  "faq",
] as const;

type SectionId = (typeof SECTION_IDS)[number];

export default function LandingPage({
  loaderData,
}: Route.ComponentProps) {
  const { isLoggedIn } = loaderData;
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track which section is visible using IntersectionObserver
  useEffect(() => {
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first entry that is intersecting (topmost visible section)
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        }
      },
      {
        // Trigger zone: top 20-30% of viewport — feels natural for scroll tracking
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      },
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      setMobileMenuOpen(false);
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    },
    [],
  );

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-50 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Background ambient effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[150px]" />
        <div className="absolute top-[40%] right-[-20%] w-[60%] h-[60%] rounded-full bg-cyan-900/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
      </div>

      {/* MVP Beta Banner */}
      <div className="fixed top-0 w-full z-[60] bg-emerald-500/10 border-b border-emerald-500/20 py-2 text-center backdrop-blur-md">
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-emerald-400">
          <span className="inline-block animate-pulse mr-2">●</span>
          Beta — live in Joburg &amp; Cape Town
        </p>
      </div>

      {/* Fixed Navbar */}
      <nav
        className={`fixed top-8 w-full z-50 transition-all duration-500 ${isScrolled ? "bg-[#030712]/80 backdrop-blur-xl border-b border-white/5 py-4" : "bg-transparent py-6"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={handleScrollToTop}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleScrollToTop();
            }}
            role="button"
            tabIndex={0}
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-300">
              <img src="/logo.svg" alt="NoZar" className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase text-white">
              NoZar<span className="text-emerald-500">.</span>
            </span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-10">
            {[
              { label: "How it works", id: "how-it-works" as const },
              { label: "For you", id: "exchange" as const },
              { label: "Safety", id: "safety" as const },
              { label: "Pricing", id: "pricing" as const },
              { label: "FAQ", id: "faq" as const },
            ].map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => handleNavClick(e, link.id)}
                  className={`relative text-xs font-mono uppercase tracking-widest transition-all duration-300 ${
                    isActive
                      ? "text-emerald-400 [text-shadow:0_0_12px_rgba(16,185,129,0.4)]"
                      : "text-slate-400 hover:text-emerald-400"
                  }`}
                >
                  {isActive && (
                    <span className="mr-1.5 text-emerald-500">▸</span>
                  )}
                  {link.label}
                  {/* Active underline scanline */}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-px bg-emerald-500 transition-all duration-300 ${
                      isActive
                        ? "w-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                        : "w-0"
                    }`}
                    style={{ transitionTimingFunction: "var(--ease-smooth)" }}
                  />
                </a>
              );
            })}
          </div>

          {/* Desktop Auth + CTA */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="text-sm font-bold bg-emerald-500 text-slate-950 px-6 py-2.5 rounded-lg hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-colors px-4"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-bold bg-emerald-500 text-slate-950 px-6 py-2.5 rounded-lg hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-slate-300 p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#030712]/95 backdrop-blur-2xl pt-28 px-6 md:hidden border-b border-white/10">
          <div className="flex flex-col gap-8 text-lg font-mono uppercase tracking-widest">
            {[
              { num: "01", label: "How it works", id: "how-it-works" as const },
              { num: "02", label: "For you", id: "exchange" as const },
              { num: "03", label: "Safety", id: "safety" as const },
              { num: "04", label: "Pricing", id: "pricing" as const },
              { num: "05", label: "FAQ", id: "faq" as const },
            ].map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => handleNavClick(e, link.id)}
                  className={`transition-all duration-300 ${
                    isActive
                      ? "text-emerald-400 [text-shadow:0_0_12px_rgba(16,185,129,0.4)]"
                      : "text-slate-300 hover:text-emerald-400"
                  }`}
                >
                  <span
                    className={`transition-colors duration-300 ${
                      isActive ? "text-emerald-500" : "text-slate-600"
                    }`}
                  >
                    {link.num}.
                  </span>{" "}
                  {link.label}
                </a>
              );
            })}
            <hr className="border-white/10 my-2" />
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="w-full bg-emerald-500 text-slate-950 py-4 rounded-xl font-bold mt-2 text-center"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="w-full text-left text-slate-300">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="w-full bg-emerald-500 text-slate-950 py-4 rounded-xl font-bold mt-2 text-center"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="relative z-10 pt-28 sm:pt-40 pb-14 sm:pb-20 lg:pt-56 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div data-testid="network-status" className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono uppercase tracking-widest text-emerald-400 mb-10 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Beta — Joburg &amp; Cape Town
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-[7.5rem] font-black tracking-tighter leading-[0.9] mb-6 sm:mb-8 uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
          Trade <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            Without Cash.
          </span>
        </h1>
        <p className="text-base sm:text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed font-light">
          South Africa's barter platform. Swap your stuff, skills, and services
          with people near you.{" "}
          <span className="text-white font-medium">No money changes hands.</span>
        </p>
        <div className="flex flex-col items-center gap-4 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <MagneticButton>
              <Link
                data-testid="hero-cta"
                to={isLoggedIn ? "/dashboard" : "/register"}
                className="w-full sm:w-auto px-10 py-5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-lg hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-3"
              >
                {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}{" "}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </MagneticButton>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-10 py-5 rounded-xl bg-white/5 text-white font-medium text-lg hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-3 backdrop-blur-md"
            >
              Browse listings
            </Link>
          </div>
          {/* TASK 10 COMPLETE */}
          <Link
            to="/refer"
            className="text-emerald-500 hover:text-emerald-400 font-mono text-sm underline"
          >
            Know someone with something to trade?
          </Link>
        </div>
      </main>

      {/* The Bento Grid: How It Works */}
      <section
        id="how-it-works"
        className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24"
      >
        <ScrollReveal>
          <div className="mb-12 sm:mb-16">
            <span className="text-emerald-500 font-mono text-xs uppercase tracking-widest block mb-4">
              // How it works
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase">
              Fair swaps, locally matched.
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
          {/* Value Parity Engine — spans 8 cols */}
          <ScrollReveal delay={0.1} className="md:col-span-8">
          <div className="group relative rounded-3xl bg-[#0F172A]/80 border border-white/10 overflow-hidden backdrop-blur-sm hover:border-white/20 transition-all duration-500 p-6 sm:p-8 md:p-12 flex flex-col justify-between min-h-[240px] sm:min-h-[320px] md:min-h-[400px]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-700" />
            <div className="relative z-10">
              <Cpu className="w-10 h-10 text-emerald-400 mb-6" />
              <h3 className="text-3xl font-bold tracking-tight mb-4 text-white">
                Fair value matching
              </h3>
              <p className="text-slate-400 text-lg max-w-md">
                Every listing sits in a value tier — from Micro (under R300) to
                Luxury (R75,000+). You see trades at your tier and one nearby,
                so swaps stay fair. You set the value; the community keeps it
                honest.
              </p>
            </div>
            <div className="relative z-10 mt-10 grid grid-cols-3 gap-3">
              <div className="h-2 rounded-full bg-emerald-500/50 w-full" />
              <div className="h-2 rounded-full bg-white/10 w-full" />
              <div className="h-2 rounded-full bg-emerald-500/50 w-full" />
            </div>
          </div>
          </ScrollReveal>
          {/* TASK 04 COMPLETE */}

          {/* Hyper-Local Indexing — spans 4 cols */}
          <ScrollReveal delay={0.2} className="md:col-span-4">
          <div className="group relative rounded-3xl bg-[#0F172A]/80 border border-white/10 overflow-hidden backdrop-blur-sm hover:border-cyan-500/30 transition-all duration-500 p-6 sm:p-8 md:p-12 flex flex-col justify-between min-h-[240px] sm:min-h-[320px] md:min-h-[400px]">
            <div className="relative z-10">
              <Globe className="w-10 h-10 text-cyan-400 mb-6" />
              <h3 className="text-2xl font-bold tracking-tight mb-4">
                Matched nearby
              </h3>
              <p className="text-slate-400 text-sm">
                Physical items match within your radius (15km by default,
                adjustable 3–50km). Digital services and skills are open
                nationwide.
              </p>
            </div>
            <div className="relative z-10 mt-8 flex items-center justify-center h-32 w-full border border-white/5 rounded-2xl bg-black/20">
              <div className="w-16 h-16 rounded-full border border-cyan-500/50 flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 bg-cyan-400 rounded-full" />
              </div>
            </div>
          </div>
          </ScrollReveal>
          {/* TASK 02 COMPLETE */}
        </div>
      </section>

      {/* Dual Economies: Trade (Consumer + Enterprise) */}
      <section id="exchange" className="scroll-mt-32 pb-16 sm:pb-24">
        <ScrollReveal>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <span className="text-emerald-500 font-mono text-xs uppercase tracking-widest block mb-3">
              // For you
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase">
              For people.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                For businesses.
              </span>
            </h2>
            <p className="text-slate-400 text-lg mt-4 max-w-2xl">
              One platform. Swap personal items and skills, or move surplus
              stock as a verified business.
            </p>
          </div>
        </ScrollReveal>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* For Consumers */}
        <ScrollReveal delay={0.1}>
        <div
          className="relative rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#030712] border border-white/10 p-6 sm:p-10 hover:border-blue-500/30 transition-all duration-500"
        >
          <span className="text-blue-400 font-mono text-xs uppercase tracking-widest block mb-6">
            // For people
          </span>
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-8 border border-blue-500/20">
            <User className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-3xl font-bold tracking-tight mb-4">
            Swap with your neighbours
          </h3>
          <p className="text-slate-400 mb-10 text-lg">
            Turn your stuff and spare time into things you actually need.
            Free to join. Free to trade.
          </p>
          <ul className="space-y-4 mb-12 font-mono text-sm text-slate-300">
            <li className="flex items-center gap-3">
              <span className="text-blue-500">[+]</span> No transaction fees
            </li>
            <li className="flex items-center gap-3">
              <span className="text-blue-500">[+]</span> Swap items for skills
            </li>
            <li className="flex items-center gap-3">
              <span className="text-blue-500">[+]</span> Matched to people near
              you
            </li>
          </ul>
          <Link
            to="/dashboard"
            className="block w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold transition-colors text-center"
          >
            Start trading free
          </Link>
        </div>
        </ScrollReveal>

        {/* For Business */}
        <ScrollReveal delay={0.2}>
        <div
          className="relative rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#030712] border border-white/10 p-6 sm:p-10 hover:border-emerald-500/30 transition-all duration-500"
        >
          {!BUSINESS_PRODUCTS_LIVE && (
            <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[10px] uppercase tracking-widest">
              Coming soon
            </span>
          )}
          <span className="text-emerald-400 font-mono text-xs uppercase tracking-widest block mb-6">
            // For businesses
          </span>
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/20">
            <Briefcase className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-3xl font-bold tracking-tight mb-4">
            Business-to-business swaps
          </h3>
          <p className="text-slate-400 mb-10 text-lg">
            {BUSINESS_PRODUCTS_LIVE
              ? "Move dead stock and put idle equipment to work — without touching cash flow. Built for registered SA businesses."
              : "Move dead stock and put idle equipment to work — without touching cash flow. Built for registered SA businesses. Launching soon."}
          </p>
          <ul className="space-y-4 mb-12 font-mono text-sm text-slate-300">
            <li className="flex items-center gap-3">
              <span className="text-emerald-500">[+]</span> Verified CIPC badge
            </li>
            <li className="flex items-center gap-3">
              <span className="text-emerald-500">[+]</span> Business-only
              filters
            </li>
            <li className="flex items-center gap-3">
              <span className="text-emerald-500">[+]</span> SARS-ready ledger
              exports
            </li>
          </ul>
          {BUSINESS_PRODUCTS_LIVE ? (
            <Link
              to="/dashboard"
              className="block w-full py-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold transition-colors text-center"
            >
              See business plans
            </Link>
          ) : (
            <a
              href="mailto:hello@nozar.co.za?subject=Business%20plan%20waitlist"
              className="block w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold transition-colors text-center"
            >
              Notify me at launch
            </a>
          )}
        </div>
        </ScrollReveal>
      </div>
      </section>

      {/* Safety Rules */}
      <section
        id="safety"
        className="relative z-10 py-20 sm:py-32 bg-[#030712] border-y border-white/5 scroll-mt-20 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal>
            <div className="text-center mb-12 sm:mb-20">
              <span className="text-emerald-500 font-mono text-xs uppercase tracking-widest block mb-4">
                // Safety
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 sm:mb-6">
                How we keep <br /> you safe.
              </h2>
              <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
                Built for South Africa. Your name and location stay private
                until both of you agree to swap.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* Stage 01 */}
            <ScrollReveal delay={0.1}>
            <div className="bg-[#0F172A] border border-white/10 p-6 sm:p-8 rounded-3xl relative">
              <div className="absolute top-0 left-8 -translate-y-1/2 bg-slate-900 border border-white/10 px-4 py-1 rounded-full font-mono text-xs text-slate-400">
                STEP 01
              </div>
              <Lock className="w-8 h-8 text-slate-500 mb-6 mt-4" />
              <h4 className="text-xl font-bold mb-3 text-white">
                Private chat
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Talk through NoZar. Phone numbers and emails are blocked
                until both of you agree to share them.
              </p>
            </div>
            </ScrollReveal>
            {/* Stage 02 — elevated */}
            <ScrollReveal delay={0.2}>
            <div className="bg-gradient-to-b from-[#0F172A] to-emerald-950/20 border border-emerald-500/20 p-6 sm:p-8 rounded-3xl relative sm:transform sm:-translate-y-4 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="absolute top-0 left-8 -translate-y-1/2 bg-emerald-900 border border-emerald-500/30 px-4 py-1 rounded-full font-mono text-xs text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                STEP 02
              </div>
              <ShieldCheck className="w-8 h-8 text-emerald-400 mb-6 mt-4" />
              <h4 className="text-xl font-bold mb-3 text-white">
                Both agree
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Once you've agreed on the swap, both tap to confirm. Only then
                do contact details unlock.
              </p>
            </div>
            </ScrollReveal>
            {/* Stage 03 */}
            <ScrollReveal delay={0.3}>
            <div className="bg-[#0F172A] border border-white/10 p-6 sm:p-8 rounded-3xl relative">
              <div className="absolute top-0 left-8 -translate-y-1/2 bg-slate-900 border border-white/10 px-4 py-1 rounded-full font-mono text-xs text-slate-400">
                STEP 03
              </div>
              <MapPin className="w-8 h-8 text-slate-500 mb-6 mt-4" />
              <h4 className="text-xl font-bold mb-3 text-white">
                Safe meetup spots
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                We suggest three public meetup spots near you both — petrol
                forecourts, mall entrances, and busy public areas. For high-value
                swaps, we can text a trusted contact when you're heading out.
              </p>
            </div>
            </ScrollReveal>
            {/* TASK 03 COMPLETE */}
          </div>
        </div>
      </section>

      {/* Trust Signal Badges */}
      <TrustBadgesSection />

      {/* Pricing Tiers */}
      <PricingSection />

      {/* FAQ */}
      <FaqSection />

      {/* Brutalist Footer CTA */}
      <section className="relative z-10 border-t border-white/5 bg-[#030712] py-20 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <ScrollReveal>
            <h2 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter uppercase mb-6 sm:mb-8">
              Start swapping <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
                today.
              </span>
            </h2>
          </ScrollReveal>
          <MagneticButton>
            <Link
              to={isLoggedIn ? "/dashboard" : "/register"}
              className="inline-block px-12 py-6 rounded-2xl bg-white text-slate-950 font-black text-xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.1)] uppercase tracking-widest"
            >
              {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
            </Link>
          </MagneticButton>
        </div>
      </section>

      {/* Footer */}
      <FooterSection />
    </div>
  );
}
