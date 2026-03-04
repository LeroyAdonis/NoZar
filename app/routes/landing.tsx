import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  Repeat,
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

import { StatsBar } from "~/components/landing/stats-bar";
import { TrustBadgesSection } from "~/components/landing/trust-badges-section";
import { PricingSection } from "~/components/landing/pricing-section";
import { TestimonialsSection } from "~/components/landing/testimonials-section";
import { FaqSection } from "~/components/landing/faq-section";
import FooterSection from "~/components/landing/footer-section";
import type { Route } from "./+types/landing";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Nozar — Barter Without Boundaries" },
    {
      name: "description",
      content:
        "The spatial barter network for South Africa. Bypass inflation by exchanging idle assets, surplus inventory, and professional services directly. Zero ZAR required.",
    },
  ];
}

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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

      {/* Fixed Navbar */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${isScrolled ? "bg-[#030712]/80 backdrop-blur-xl border-b border-white/5 py-4" : "bg-transparent py-6"}`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex justify-between items-center">
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
              <Repeat className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase text-white">
              NoZar<span className="text-emerald-500">.</span>
            </span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-10">
            {[
              { label: "Platform", id: "how-it-works" },
              { label: "Consumers", id: "consumers" },
              { label: "Business", id: "business" },
              { label: "Protocol", id: "safety" },
              { label: "Pricing", id: "pricing" },
              { label: "FAQ", id: "faq" },
            ].map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => handleNavClick(e, link.id)}
                className="text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Auth + CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-colors px-4"
            >
              [ Auth ]
            </Link>
            <Link
              to="/dashboard"
              className="text-sm font-bold bg-emerald-500 text-slate-950 px-6 py-2.5 rounded-lg hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2"
            >
              Access Network
            </Link>
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
            <a
              href="#how-it-works"
              onClick={(e) => handleNavClick(e, "how-it-works")}
              className="text-slate-300 hover:text-emerald-400"
            >
              01. Platform
            </a>
            <a
              href="#consumers"
              onClick={(e) => handleNavClick(e, "consumers")}
              className="text-slate-300 hover:text-emerald-400"
            >
              02. Consumers
            </a>
            <a
              href="#business"
              onClick={(e) => handleNavClick(e, "business")}
              className="text-slate-300 hover:text-emerald-400"
            >
              03. Business
            </a>
            <a
              href="#safety"
              onClick={(e) => handleNavClick(e, "safety")}
              className="text-slate-300 hover:text-emerald-400"
            >
              04. Trust Protocol
            </a>
            <a
              href="#pricing"
              onClick={(e) => handleNavClick(e, "pricing")}
              className="text-slate-300 hover:text-emerald-400"
            >
              05. Pricing
            </a>
            <a
              href="#faq"
              onClick={(e) => handleNavClick(e, "faq")}
              className="text-slate-300 hover:text-emerald-400"
            >
              06. FAQ
            </a>
            <hr className="border-white/10 my-2" />
            <Link to="/dashboard" className="w-full text-left text-slate-300">
              [ Authenticate ]
            </Link>
            <Link
              to="/dashboard"
              className="w-full bg-emerald-500 text-slate-950 py-4 rounded-xl font-bold mt-2 text-center"
            >
              Access Network
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="relative z-10 pt-40 pb-20 lg:pt-56 lg:pb-32 px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono uppercase tracking-widest text-emerald-400 mb-10 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Network Status: Beta Active (CPT/JHB)
        </div>
        <h1 className="text-5xl md:text-8xl lg:text-[7.5rem] font-black tracking-tighter leading-[0.9] mb-8 uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
          Decentralize <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            Your Value.
          </span>
        </h1>
        <p className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
          The spatial barter network for South Africa. Bypass inflation by
          exchanging idle assets, surplus inventory, and professional services
          directly.{" "}
          <span className="text-white font-medium">Zero ZAR required.</span>
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-10 py-5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-lg hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-3"
          >
            Initialize Trade <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-10 py-5 rounded-xl bg-white/5 text-white font-medium text-lg hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-3 backdrop-blur-md"
          >
            View Live Index
          </Link>
        </div>
      </main>

      {/* Stats Bar */}
      <StatsBar />

      {/* The Bento Grid: How It Works */}
      <section
        id="how-it-works"
        className="relative z-10 py-24 px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24"
      >
        <div className="mb-16">
          <span className="text-emerald-500 font-mono text-xs uppercase tracking-widest block mb-4">
            // System Architecture
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">
            How The Matrix Works.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Value Parity Engine — spans 8 cols */}
          <div className="md:col-span-8 group relative rounded-3xl bg-[#0F172A]/80 border border-white/10 overflow-hidden backdrop-blur-sm hover:border-white/20 transition-all duration-500 p-8 md:p-12 flex flex-col justify-between min-h-[400px]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-700" />
            <div className="relative z-10">
              <Cpu className="w-10 h-10 text-emerald-400 mb-6" />
              <h3 className="text-3xl font-bold tracking-tight mb-4 text-white">
                Value Parity Engine
              </h3>
              <p className="text-slate-400 text-lg max-w-md">
                Our algorithm categorizes items and services into hidden ZAR
                value tiers, ensuring you only see trades that match your
                asset&apos;s worth.
              </p>
            </div>
            <div className="relative z-10 mt-10 grid grid-cols-3 gap-3">
              <div className="h-2 rounded-full bg-emerald-500/50 w-full" />
              <div className="h-2 rounded-full bg-white/10 w-full" />
              <div className="h-2 rounded-full bg-emerald-500/50 w-full" />
            </div>
          </div>

          {/* Hyper-Local Indexing — spans 4 cols */}
          <div className="md:col-span-4 group relative rounded-3xl bg-[#0F172A]/80 border border-white/10 overflow-hidden backdrop-blur-sm hover:border-cyan-500/30 transition-all duration-500 p-8 md:p-12 flex flex-col justify-between min-h-[400px]">
            <div className="relative z-10">
              <Globe className="w-10 h-10 text-cyan-400 mb-6" />
              <h3 className="text-2xl font-bold tracking-tight mb-4">
                Hyper-Local Indexing
              </h3>
              <p className="text-slate-400 text-sm">
                Physical goods are restricted to your geographic radius. Digital
                services open to national exchange.
              </p>
            </div>
            <div className="relative z-10 mt-8 flex items-center justify-center h-32 w-full border border-white/5 rounded-2xl bg-black/20">
              <div className="w-16 h-16 rounded-full border border-cyan-500/50 flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 bg-cyan-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Economies: Consumer + Business */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-24">
        {/* For Consumers */}
        <section
          id="consumers"
          className="scroll-mt-32 relative rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#030712] border border-white/10 p-10 hover:border-blue-500/30 transition-all duration-500"
        >
          <span className="text-blue-400 font-mono text-xs uppercase tracking-widest block mb-6">
            // User Node: Consumer
          </span>
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-8 border border-blue-500/20">
            <User className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-3xl font-bold tracking-tight mb-4">
            Peer-to-Peer Exchange
          </h3>
          <p className="text-slate-400 mb-10 text-lg">
            Turn your idle assets and spare time into the things you actually
            need. 100% free to join and trade locally.
          </p>
          <ul className="space-y-4 mb-12 font-mono text-sm text-slate-300">
            <li className="flex items-center gap-3">
              <span className="text-blue-500">[+]</span> Zero transaction fees
            </li>
            <li className="flex items-center gap-3">
              <span className="text-blue-500">[+]</span> Skill-for-Item trading
            </li>
            <li className="flex items-center gap-3">
              <span className="text-blue-500">[+]</span> Automated local radius
              matching
            </li>
          </ul>
          <Link
            to="/dashboard"
            className="block w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold transition-colors text-center"
          >
            Initialize Consumer Node
          </Link>
        </section>

        {/* For Business */}
        <section
          id="business"
          className="scroll-mt-32 relative rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#030712] border border-white/10 p-10 hover:border-emerald-500/30 transition-all duration-500"
        >
          <span className="text-emerald-400 font-mono text-xs uppercase tracking-widest block mb-6">
            // User Node: Enterprise
          </span>
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/20">
            <Briefcase className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-3xl font-bold tracking-tight mb-4">
            B2B Liquidity Protocol
          </h3>
          <p className="text-slate-400 mb-10 text-lg">
            Liquidate dead stock and monetize idle equipment to preserve cash
            flow. Dedicated tools for registered SA entities.
          </p>
          <ul className="space-y-4 mb-12 font-mono text-sm text-slate-300">
            <li className="flex items-center gap-3">
              <span className="text-emerald-500">[+]</span> Verified CIPC Badges
            </li>
            <li className="flex items-center gap-3">
              <span className="text-emerald-500">[+]</span> Enterprise-only
              filters
            </li>
            <li className="flex items-center gap-3">
              <span className="text-emerald-500">[+]</span> SARS-compliant
              ledger exports
            </li>
          </ul>
          <Link
            to="/dashboard"
            className="block w-full py-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold transition-colors text-center"
          >
            View Enterprise Protocol
          </Link>
        </section>
      </div>

      {/* Security Protocol */}
      <section
        id="safety"
        className="relative z-10 py-32 bg-[#030712] border-y border-white/5 scroll-mt-20 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <span className="text-emerald-500 font-mono text-xs uppercase tracking-widest block mb-4">
              // Protocol.Security
            </span>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6">
              The Staged Trust <br /> Architecture.
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Engineered specifically for the South African risk landscape. Your
              identity and location remain sealed until mutual consensus is
              achieved.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stage 01 */}
            <div className="bg-[#0F172A] border border-white/10 p-8 rounded-3xl relative">
              <div className="absolute top-0 left-8 -translate-y-1/2 bg-slate-900 border border-white/10 px-4 py-1 rounded-full font-mono text-xs text-slate-400">
                STAGE_01
              </div>
              <Lock className="w-8 h-8 text-slate-500 mb-6 mt-4" />
              <h4 className="text-xl font-bold mb-3 text-white">
                Encrypted Blind Chat
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Negotiate within our closed-loop system. Phone numbers and
                emails are scrubbed and restricted.
              </p>
            </div>
            {/* Stage 02 — elevated */}
            <div className="bg-gradient-to-b from-[#0F172A] to-emerald-950/20 border border-emerald-500/20 p-8 rounded-3xl relative transform md:-translate-y-4 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="absolute top-0 left-8 -translate-y-1/2 bg-emerald-900 border border-emerald-500/30 px-4 py-1 rounded-full font-mono text-xs text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                STAGE_02
              </div>
              <ShieldCheck className="w-8 h-8 text-emerald-400 mb-6 mt-4" />
              <h4 className="text-xl font-bold mb-3 text-white">
                The Digital Handshake
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Both parties execute a dual-consent digital signature. Only then
                does the platform query our verification ledger.
              </p>
            </div>
            {/* Stage 03 */}
            <div className="bg-[#0F172A] border border-white/10 p-8 rounded-3xl relative">
              <div className="absolute top-0 left-8 -translate-y-1/2 bg-slate-900 border border-white/10 px-4 py-1 rounded-full font-mono text-xs text-slate-400">
                STAGE_03
              </div>
              <MapPin className="w-8 h-8 text-slate-500 mb-6 mt-4" />
              <h4 className="text-xl font-bold mb-3 text-white">
                Safe Zone Routing
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                The system routes both users to a computationally vetted,
                well-lit public perimeter (e.g., partnered petrol stations).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signal Badges */}
      <TrustBadgesSection />

      {/* Pricing Tiers */}
      <PricingSection />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* FAQ */}
      <FaqSection />

      {/* Brutalist Footer CTA */}
      <section className="relative z-10 border-t border-white/5 bg-[#030712] py-32 overflow-hidden">
        <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase mb-8">
            Bypass The{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
              Fiat.
            </span>
          </h2>
          <Link
            to="/dashboard"
            className="inline-block px-12 py-6 rounded-2xl bg-white text-slate-950 font-black text-xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.1)] uppercase tracking-widest"
          >
            Execute Join Protocol
          </Link>
        </div>
      </section>

      {/* Footer */}
      <FooterSection />
    </div>
  );
}
