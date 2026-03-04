import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Repeat,
  ShieldCheck,
  MapPin,
  Briefcase,
  User,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Zap,
  Lock,
  Globe,
  Cpu,
  Home,
  Map as MapIcon,
  Plus,
  MessageSquare,
  Bell,
  Clock,
  Camera,
  Target,
  Send,
  Settings,
  LogOut,
  Check,
  Navigation2,
  Unlock,
  AlertTriangle,
} from "lucide-react";

// --- SHARED MOCK DATA ---
const MOCK_ASSETS = [
  {
    id: 1,
    title: "Sony A7III + Lens",
    need: "MacBook M1/M2",
    user: "David M.",
    distance: "2.4km",
    tier: "TIER_03",
    time: "2h ago",
    image: "bg-emerald-900/20",
    desc: "Lightly used Sony A7III body with a 50mm f1.8 lens. Shutter count is around 15k. Looking to swap for a working MacBook M1 or M2 for video editing. Will consider adding ZAR value if the Mac is high-spec.",
    category: "Electronics",
    isVerified: true,
  },
  {
    id: 2,
    title: "5hrs Plumbing Service",
    need: "Old Bakkie Tires",
    user: "Sipho T.",
    distance: "4.1km",
    tier: "TIER_02",
    time: "5h ago",
    image: "bg-cyan-900/20",
    desc: "Certified plumber offering 5 hours of labor. Good for fixing geysers, unblocking drains, or pipe installations. Need a set of 15-inch tires for my work bakkie, minimum 50% tread left.",
    category: "Service",
    isVerified: true,
  },
  {
    id: 3,
    title: "Office Desk (Oak)",
    need: "Microwave or R500 Value",
    user: "Sarah K.",
    distance: "800m",
    tier: "TIER_01",
    time: "1d ago",
    image: "bg-purple-900/20",
    desc: "Solid oak office desk. Dimensions: 120cm x 60cm. Has a small scratch on the back right corner. I need a working microwave or anything of similar value for a student flat.",
    category: "Furniture",
    isVerified: false,
  },
];

const MOCK_PINGS = [
  {
    id: 101,
    assetId: 2,
    user: "Sipho T.",
    asset: "Plumbing Service",
    status: "awaiting_reply",
    unread: true,
    time: "10m ago",
    messages: [
      {
        text: "Hey, I have 4 Goodyear 15-inch tires. Tread is about 60%. Would that cover the 5 hours?",
        sender: "them",
        time: "10:05 AM",
      },
    ],
  },
  {
    id: 102,
    assetId: 3,
    user: "Sarah K.",
    asset: "Office Desk",
    status: "handshake_ready",
    unread: false,
    time: "1d ago",
    messages: [
      {
        text: "Is the desk still available? I have a Defy microwave, practically new.",
        sender: "me",
        time: "Yesterday",
      },
      {
        text: "Yes it is! The microwave sounds perfect.",
        sender: "them",
        time: "Yesterday",
      },
    ],
  },
];

// --- 1. LANDING PAGE COMPONENT ---
function LandingPage({ onNavigate }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e, id) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className='min-h-screen bg-[#030712] text-slate-50 font-sans selection:bg-emerald-500/30 overflow-x-hidden'>
      <div className='fixed inset-0 z-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[150px]' />
        <div className='absolute top-[40%] right-[-20%] w-[60%] h-[60%] rounded-full bg-cyan-900/10 blur-[150px]' />
        <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
      </div>

      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${isScrolled ? "bg-[#030712]/80 backdrop-blur-xl border-b border-white/5 py-4" : "bg-transparent py-6"}`}
      >
        <div className='max-w-7xl mx-auto px-6 lg:px-8 flex justify-between items-center'>
          <div
            className='flex items-center gap-3 cursor-pointer group'
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className='w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-300'>
              <Repeat className='w-5 h-5 text-emerald-400 stroke-[2.5]' />
            </div>
            <span className='text-2xl font-black tracking-tighter uppercase text-white'>
              NoZar<span className='text-emerald-500'>.</span>
            </span>
          </div>

          <div className='hidden md:flex items-center gap-10'>
            {[
              { label: "Platform", id: "how-it-works" },
              { label: "Consumers", id: "consumers" },
              { label: "Business", id: "business" },
              { label: "Protocol", id: "safety" },
            ].map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => handleNavClick(e, link.id)}
                className='text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-emerald-400 transition-colors'
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className='hidden md:flex items-center gap-4'>
            <button
              onClick={() => onNavigate("dashboard")}
              className='text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-colors px-4'
            >
              [ Auth ]
            </button>
            <button
              onClick={() => onNavigate("dashboard")}
              className='text-sm font-bold bg-emerald-500 text-slate-950 px-6 py-2.5 rounded-lg hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2'
            >
              Access Network
            </button>
          </div>

          <button
            className='md:hidden text-slate-300 p-2'
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className='fixed inset-0 z-40 bg-[#030712]/95 backdrop-blur-2xl pt-28 px-6 md:hidden border-b border-white/10'>
          <div className='flex flex-col gap-8 text-lg font-mono uppercase tracking-widest'>
            <a
              href='#how-it-works'
              onClick={(e) => handleNavClick(e, "how-it-works")}
              className='text-slate-300 hover:text-emerald-400'
            >
              01. Platform
            </a>
            <a
              href='#consumers'
              onClick={(e) => handleNavClick(e, "consumers")}
              className='text-slate-300 hover:text-emerald-400'
            >
              02. Consumers
            </a>
            <a
              href='#business'
              onClick={(e) => handleNavClick(e, "business")}
              className='text-slate-300 hover:text-emerald-400'
            >
              03. Business
            </a>
            <a
              href='#safety'
              onClick={(e) => handleNavClick(e, "safety")}
              className='text-slate-300 hover:text-emerald-400'
            >
              04. Trust Protocol
            </a>
            <hr className='border-white/10 my-2' />
            <button
              onClick={() => onNavigate("dashboard")}
              className='w-full text-left text-slate-300'
            >
              [ Authenticate ]
            </button>
            <button
              onClick={() => onNavigate("dashboard")}
              className='w-full bg-emerald-500 text-slate-950 py-4 rounded-xl font-bold mt-2'
            >
              Access Network
            </button>
          </div>
        </div>
      )}

      <main className='relative z-10 pt-40 pb-20 lg:pt-56 lg:pb-32 px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center'>
        <div className='inline-flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono uppercase tracking-widest text-emerald-400 mb-10 backdrop-blur-md'>
          <span className='relative flex h-2 w-2'>
            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
            <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500'></span>
          </span>
          Network Status: Beta Active (CPT/JHB)
        </div>
        <h1 className='text-5xl md:text-8xl lg:text-[7.5rem] font-black tracking-tighter leading-[0.9] mb-8 uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50'>
          Decentralize <br />
          <span className='text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500'>
            Your Value.
          </span>
        </h1>
        <p className='text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light'>
          The spatial barter network for South Africa. Bypass inflation by
          exchanging idle assets, surplus inventory, and professional services
          directly.{" "}
          <span className='text-white font-medium'>Zero ZAR required.</span>
        </p>
        <div className='flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto'>
          <button
            onClick={() => onNavigate("dashboard")}
            className='w-full sm:w-auto px-10 py-5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-lg hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-3'
          >
            Initialize Trade <ArrowRight className='w-5 h-5' />
          </button>
          <button
            onClick={() => onNavigate("dashboard")}
            className='w-full sm:w-auto px-10 py-5 rounded-xl bg-white/5 text-white font-medium text-lg hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-3 backdrop-blur-md'
          >
            View Live Index
          </button>
        </div>
      </main>

      {/* The Bento Grid: How It Works */}
      <section
        id='how-it-works'
        className='relative z-10 py-24 px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24'
      >
        <div className='mb-16'>
          <span className='text-emerald-500 font-mono text-xs uppercase tracking-widest block mb-4'>
            // System Architecture
          </span>
          <h2 className='text-4xl md:text-5xl font-black tracking-tighter uppercase'>
            How The Matrix Works.
          </h2>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-12 gap-6'>
          <div className='md:col-span-8 group relative rounded-3xl bg-[#0F172A]/80 border border-white/10 overflow-hidden backdrop-blur-sm hover:border-white/20 transition-all duration-500 p-8 md:p-12 flex flex-col justify-between min-h-[400px]'>
            <div className='absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-700' />
            <div className='relative z-10'>
              <Cpu className='w-10 h-10 text-emerald-400 mb-6' />
              <h3 className='text-3xl font-bold tracking-tight mb-4 text-white'>
                Value Parity Engine
              </h3>
              <p className='text-slate-400 text-lg max-w-md'>
                Our algorithm categorizes items and services into hidden ZAR
                value tiers, ensuring you only see trades that match your
                asset's worth.
              </p>
            </div>
            <div className='relative z-10 mt-10 grid grid-cols-3 gap-3'>
              <div className='h-2 rounded-full bg-emerald-500/50 w-full' />
              <div className='h-2 rounded-full bg-white/10 w-full' />
              <div className='h-2 rounded-full bg-emerald-500/50 w-full' />
            </div>
          </div>

          <div className='md:col-span-4 group relative rounded-3xl bg-[#0F172A]/80 border border-white/10 overflow-hidden backdrop-blur-sm hover:border-cyan-500/30 transition-all duration-500 p-8 md:p-12 flex flex-col justify-between min-h-[400px]'>
            <div className='relative z-10'>
              <Globe className='w-10 h-10 text-cyan-400 mb-6' />
              <h3 className='text-2xl font-bold tracking-tight mb-4'>
                Hyper-Local Indexing
              </h3>
              <p className='text-slate-400 text-sm'>
                Physical goods are restricted to your geographic radius. Digital
                services open to national exchange.
              </p>
            </div>
            <div className='relative z-10 mt-8 flex items-center justify-center h-32 w-full border border-white/5 rounded-2xl bg-black/20'>
              <div className='w-16 h-16 rounded-full border border-cyan-500/50 flex items-center justify-center animate-pulse'>
                <div className='w-2 h-2 bg-cyan-400 rounded-full' />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Economies */}
      <div className='max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-24'>
        <section
          id='consumers'
          className='scroll-mt-32 relative rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#030712] border border-white/10 p-10 hover:border-blue-500/30 transition-all duration-500'
        >
          <span className='text-blue-400 font-mono text-xs uppercase tracking-widest block mb-6'>
            // User Node: Consumer
          </span>
          <div className='w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-8 border border-blue-500/20'>
            <User className='w-8 h-8 text-blue-400' />
          </div>
          <h3 className='text-3xl font-bold tracking-tight mb-4'>
            Peer-to-Peer Exchange
          </h3>
          <p className='text-slate-400 mb-10 text-lg'>
            Turn your idle assets and spare time into the things you actually
            need. 100% free to join and trade locally.
          </p>
          <ul className='space-y-4 mb-12 font-mono text-sm text-slate-300'>
            <li className='flex items-center gap-3'>
              <span className='text-blue-500'>[+]</span> Zero transaction fees
            </li>
            <li className='flex items-center gap-3'>
              <span className='text-blue-500'>[+]</span> Skill-for-Item trading
            </li>
            <li className='flex items-center gap-3'>
              <span className='text-blue-500'>[+]</span> Automated local radius
              matching
            </li>
          </ul>
          <button
            onClick={() => onNavigate("dashboard")}
            className='w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold transition-colors'
          >
            Initialize Consumer Node
          </button>
        </section>

        <section
          id='business'
          className='scroll-mt-32 relative rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#030712] border border-white/10 p-10 hover:border-emerald-500/30 transition-all duration-500'
        >
          <span className='text-emerald-400 font-mono text-xs uppercase tracking-widest block mb-6'>
            // User Node: Enterprise
          </span>
          <div className='w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/20'>
            <Briefcase className='w-8 h-8 text-emerald-400' />
          </div>
          <h3 className='text-3xl font-bold tracking-tight mb-4'>
            B2B Liquidity Protocol
          </h3>
          <p className='text-slate-400 mb-10 text-lg'>
            Liquidate dead stock and monetize idle equipment to preserve cash
            flow. Dedicated tools for registered SA entities.
          </p>
          <ul className='space-y-4 mb-12 font-mono text-sm text-slate-300'>
            <li className='flex items-center gap-3'>
              <span className='text-emerald-500'>[+]</span> Verified CIPC Badges
            </li>
            <li className='flex items-center gap-3'>
              <span className='text-emerald-500'>[+]</span> Enterprise-only
              filters
            </li>
            <li className='flex items-center gap-3'>
              <span className='text-emerald-500'>[+]</span> SARS-compliant
              ledger exports
            </li>
          </ul>
          <button
            onClick={() => onNavigate("dashboard")}
            className='w-full py-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold transition-colors'
          >
            View Enterprise Protocol
          </button>
        </section>
      </div>

      {/* Security Protocol */}
      <section
        id='safety'
        className='relative z-10 py-32 bg-[#030712] border-y border-white/5 scroll-mt-20 overflow-hidden'
      >
        <div className='absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]' />
        <div className='max-w-7xl mx-auto px-6 lg:px-8 relative z-10'>
          <div className='text-center mb-20'>
            <span className='text-emerald-500 font-mono text-xs uppercase tracking-widest block mb-4'>
              // Protocol.Security
            </span>
            <h2 className='text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6'>
              The Staged Trust <br /> Architecture.
            </h2>
            <p className='text-slate-400 text-lg max-w-2xl mx-auto'>
              Engineered specifically for the South African risk landscape. Your
              identity and location remain sealed until mutual consensus is
              achieved.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div className='bg-[#0F172A] border border-white/10 p-8 rounded-3xl relative'>
              <div className='absolute top-0 left-8 -translate-y-1/2 bg-slate-900 border border-white/10 px-4 py-1 rounded-full font-mono text-xs text-slate-400'>
                STAGE_01
              </div>
              <Lock className='w-8 h-8 text-slate-500 mb-6 mt-4' />
              <h4 className='text-xl font-bold mb-3 text-white'>
                Encrypted Blind Chat
              </h4>
              <p className='text-slate-400 text-sm leading-relaxed'>
                Negotiate within our closed-loop system. Phone numbers and
                emails are scrubbed and restricted.
              </p>
            </div>
            <div className='bg-gradient-to-b from-[#0F172A] to-emerald-950/20 border border-emerald-500/20 p-8 rounded-3xl relative transform md:-translate-y-4 shadow-[0_0_30px_rgba(16,185,129,0.1)]'>
              <div className='absolute top-0 left-8 -translate-y-1/2 bg-emerald-900 border border-emerald-500/30 px-4 py-1 rounded-full font-mono text-xs text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'>
                STAGE_02
              </div>
              <ShieldCheck className='w-8 h-8 text-emerald-400 mb-6 mt-4' />
              <h4 className='text-xl font-bold mb-3 text-white'>
                The Digital Handshake
              </h4>
              <p className='text-slate-400 text-sm leading-relaxed'>
                Both parties execute a dual-consent digital signature. Only then
                does the platform query our verification ledger.
              </p>
            </div>
            <div className='bg-[#0F172A] border border-white/10 p-8 rounded-3xl relative'>
              <div className='absolute top-0 left-8 -translate-y-1/2 bg-slate-900 border border-white/10 px-4 py-1 rounded-full font-mono text-xs text-slate-400'>
                STAGE_03
              </div>
              <MapPin className='w-8 h-8 text-slate-500 mb-6 mt-4' />
              <h4 className='text-xl font-bold mb-3 text-white'>
                Safe Zone Routing
              </h4>
              <p className='text-slate-400 text-sm leading-relaxed'>
                The system routes both users to a computationally vetted,
                well-lit public perimeter (e.g., partnered petrol stations).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Brutalist Footer CTA */}
      <section className='relative z-10 border-t border-white/5 bg-[#030712] py-32 overflow-hidden'>
        <div className='absolute inset-0 bg-emerald-500/5 backdrop-blur-3xl pointer-events-none' />
        <div className='max-w-5xl mx-auto px-6 text-center relative z-10'>
          <h2 className='text-5xl md:text-8xl font-black tracking-tighter uppercase mb-8'>
            Bypass The{" "}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600'>
              Fiat.
            </span>
          </h2>
          <button
            onClick={() => onNavigate("dashboard")}
            className='px-12 py-6 rounded-2xl bg-white text-slate-950 font-black text-xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.1)] uppercase tracking-widest'
          >
            Execute Join Protocol
          </button>
        </div>
      </section>

      <footer className='relative z-10 border-t border-white/10 bg-[#030712] pt-16 pb-8'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8'>
          <div className='border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-xs text-slate-600 uppercase tracking-widest'>
            <p>
              Sys.Build // {new Date().getFullYear()} // NoZar PTY LTD // RSA
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- 2. SUB-VIEWS FOR DASHBOARD ---

// View 1: Home/Index Feed
function IndexView({ onOpenAsset }) {
  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-end pt-2'>
        <div>
          <span className='text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1'>
            // Local Index
          </span>
          <h2 className='text-xl font-bold uppercase tracking-tight'>
            Nearby Assets
          </h2>
        </div>
      </div>

      <div className='space-y-4'>
        {MOCK_ASSETS.map((item) => (
          <div
            key={item.id}
            onClick={() => onOpenAsset(item.id)}
            className='bg-[#0F172A] border border-white/10 rounded-3xl p-4 flex gap-4 hover:border-white/20 transition-colors cursor-pointer group shadow-lg'
          >
            <div
              className={`w-24 h-24 rounded-2xl ${item.image} border border-white/5 flex items-center justify-center flex-shrink-0 relative overflow-hidden`}
            >
              <Repeat className='w-6 h-6 text-white/20 group-hover:scale-110 transition-transform' />
              <div className='absolute bottom-1 right-1 bg-black/60 backdrop-blur-md rounded px-1.5 py-0.5 text-[8px] font-mono text-white'>
                {item.tier}
              </div>
            </div>
            <div className='flex-1 flex flex-col justify-between py-1'>
              <div>
                <h3 className='font-bold text-sm leading-tight mb-1 text-slate-50 group-hover:text-emerald-400 transition-colors'>
                  {item.title}
                </h3>
                <p className='text-xs text-slate-400 line-clamp-1'>
                  <span className='text-slate-500'>Needs:</span> {item.need}
                </p>
              </div>
              <div className='flex items-center justify-between mt-3'>
                <div className='flex items-center gap-3'>
                  <span className='flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-1 rounded-md'>
                    <MapPin className='w-3 h-3 text-cyan-500' /> {item.distance}
                  </span>
                  <span className='flex items-center gap-1 text-[10px] font-mono text-slate-500'>
                    <Clock className='w-3 h-3' /> {item.time}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className='py-8 text-center'>
        <button className='text-emerald-500 text-xs font-mono uppercase tracking-widest mt-2 hover:text-emerald-400'>
          Expand Radius
        </button>
      </div>
    </div>
  );
}

// View 1.5: Asset Detail Page
function AssetDetailView({ assetId, onBack, onPing }) {
  const asset = MOCK_ASSETS.find((a) => a.id === assetId);
  if (!asset) return null;

  return (
    <div className='space-y-6 animate-in slide-in-from-right-4 duration-300'>
      {/* Header / Back */}
      <button
        onClick={onBack}
        className='flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-colors'
      >
        <ChevronLeft className='w-4 h-4' /> Return to Index
      </button>

      {/* Hero Image Block */}
      <div
        className={`w-full aspect-video rounded-3xl ${asset.image} border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl`}
      >
        <Repeat className='w-16 h-16 text-white/10' />
        <div className='absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded px-2 py-1 text-[10px] font-mono text-white uppercase border border-white/10'>
          {asset.category}
        </div>
        <div className='absolute top-4 right-4 bg-emerald-500/10 backdrop-blur-md rounded px-2 py-1 text-[10px] font-mono text-emerald-400 uppercase border border-emerald-500/20'>
          {asset.tier}
        </div>
      </div>

      {/* Title & Request */}
      <div>
        <h1 className='text-3xl font-black uppercase tracking-tight text-white mb-2'>
          {asset.title}
        </h1>
        <div className='bg-[#0F172A] border border-white/10 rounded-2xl p-4 mb-6'>
          <span className='text-[10px] font-mono text-cyan-500 uppercase tracking-widest block mb-1'>
            Target Value Exchange
          </span>
          <p className='font-medium text-slate-200'>{asset.need}</p>
        </div>

        {/* Description */}
        <span className='text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-2'>
          Asset Details
        </span>
        <p className='text-slate-400 text-sm leading-relaxed mb-6'>
          {asset.desc}
        </p>

        {/* User Node Info */}
        <div className='flex items-center justify-between p-4 border border-white/10 rounded-2xl bg-[#0F172A]/50 mb-8'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5'>
              <span className='font-bold text-slate-400'>
                {asset.user.charAt(0)}
              </span>
            </div>
            <div>
              <h4 className='font-bold text-sm text-white'>{asset.user}</h4>
              {asset.isVerified ? (
                <span className='flex items-center gap-1 text-[9px] font-mono text-emerald-400 uppercase'>
                  <ShieldCheck className='w-3 h-3' /> Node Verified
                </span>
              ) : (
                <span className='flex items-center gap-1 text-[9px] font-mono text-slate-500 uppercase'>
                  Unverified Node
                </span>
              )}
            </div>
          </div>
          <div className='text-right'>
            <span className='flex items-center gap-1 text-[10px] font-mono text-slate-400'>
              <MapPin className='w-3 h-3 text-cyan-500' /> {asset.distance}
            </span>
          </div>
        </div>

        {/* Action */}
        <button
          onClick={() => onPing(asset.id)}
          className='w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2'
        >
          <MessageSquare className='w-4 h-4 fill-[#030712]' /> Initialize Ping
        </button>
      </div>
    </div>
  );
}

// View 4: Messages / Pings List
function PingsView({ onOpenChat }) {
  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-end'>
        <div>
          <span className='text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1'>
            // Comms.Uplink
          </span>
          <h2 className='text-xl font-bold uppercase tracking-tight'>
            Active Pings
          </h2>
        </div>
        <span className='text-xs font-mono text-slate-400 border border-white/10 px-2 py-1 rounded bg-[#0F172A]'>
          2 Threads
        </span>
      </div>

      <div className='space-y-3'>
        {MOCK_PINGS.map((ping) => (
          <div
            key={ping.id}
            onClick={() => onOpenChat(ping.id)}
            className='bg-[#0F172A] border border-white/10 rounded-3xl p-4 flex gap-4 cursor-pointer hover:border-emerald-500/30 transition-colors relative group'
          >
            {ping.unread && (
              <span className='absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' />
            )}

            <div className='w-12 h-12 rounded-xl bg-[#030712] flex items-center justify-center border border-white/10 flex-shrink-0 group-hover:border-emerald-500/30'>
              <span className='text-sm font-bold text-slate-400 group-hover:text-emerald-400'>
                {ping.user.charAt(0)}
              </span>
            </div>

            <div className='flex-1 py-0.5'>
              <div className='flex justify-between items-start mb-1'>
                <h4 className='font-bold text-sm text-white'>{ping.user}</h4>
                <span className='text-[10px] font-mono text-slate-500'>
                  {ping.time}
                </span>
              </div>
              <p className='text-xs text-slate-400 truncate w-[200px]'>
                Re: {ping.asset}
              </p>

              {ping.status === "handshake_ready" && (
                <div className='mt-2 inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20'>
                  <Unlock className='w-3 h-3' /> Handshake Initiated
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// View 4.5: Active Chat & Handshake Protocol
function ChatDetailView({ pingId, onBack }) {
  const ping = MOCK_PINGS.find((p) => p.id === pingId);
  const asset = MOCK_ASSETS.find((a) => a.id === ping?.assetId);

  // State machine for the handshake protocol
  // 'chatting' -> 'proposed' -> 'accepted' (Stage 3 reveal)
  const initialHandshakeState =
    ping?.status === "handshake_ready" ? "proposed" : "chatting";
  const [handshakeState, setHandshakeState] = useState(initialHandshakeState);
  const [messages, setMessages] = useState(ping?.messages || []);
  const [input, setInput] = useState("");

  if (!ping || !asset) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { text: input, sender: "me", time: "Just now" }]);
    setInput("");
  };

  const handleProposeHandshake = () => {
    setHandshakeState("proposed");
    setMessages([
      ...messages,
      {
        type: "system",
        text: "You proposed a Secure Handshake.",
        time: "Just now",
      },
    ]);
  };

  const handleAcceptHandshake = () => {
    setHandshakeState("accepted");
  };

  return (
    <div className='flex flex-col h-[calc(100vh-160px)] animate-in slide-in-from-right-4 duration-300'>
      {/* Header */}
      <div className='flex items-center justify-between pb-4 border-b border-white/5 shrink-0'>
        <button
          onClick={onBack}
          className='p-2 -ml-2 text-slate-400 hover:text-white transition-colors'
        >
          <ChevronLeft className='w-5 h-5' />
        </button>
        <div className='text-center'>
          <h3 className='font-bold text-sm text-white'>{ping.user}</h3>
          <span className='text-[10px] font-mono text-slate-500 uppercase'>
            {asset.title}
          </span>
        </div>
        <div className='w-8 h-8 rounded-full bg-[#0F172A] border border-emerald-500/30 flex items-center justify-center'>
          <span className='text-xs font-bold text-emerald-500'>
            {ping.user.charAt(0)}
          </span>
        </div>
      </div>

      {/* Trust Protocol Warning */}
      {handshakeState === "chatting" && (
        <div className='my-4 p-3 rounded-xl bg-cyan-900/10 border border-cyan-500/20 flex gap-3 shrink-0'>
          <Lock className='w-4 h-4 text-cyan-400 shrink-0 mt-0.5' />
          <p className='text-[10px] font-mono text-cyan-400 leading-relaxed uppercase tracking-wider'>
            Stage 01: Chat is encrypted. Phone numbers and emails are
            automatically scrubbed for your safety.
          </p>
        </div>
      )}

      {/* Message Scroll Area */}
      <div className='flex-1 overflow-y-auto py-4 space-y-4 pr-2 scrollbar-hide'>
        {messages.map((msg, i) => {
          if (msg.type === "system") {
            return (
              <div key={i} className='flex justify-center my-4'>
                <span className='text-[9px] font-mono uppercase tracking-widest text-slate-500 bg-[#0F172A] px-3 py-1 rounded-full border border-white/5'>
                  [ {msg.text} ]
                </span>
              </div>
            );
          }
          const isMe = msg.sender === "me";
          return (
            <div
              key={i}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-3 ${isMe ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-50" : "bg-[#0F172A] border border-white/10 text-slate-300"}`}
              >
                <p className='text-sm'>{msg.text}</p>
                <span
                  className={`text-[8px] font-mono mt-1 block ${isMe ? "text-emerald-500/50 text-right" : "text-slate-500"}`}
                >
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}

        {/* --- THE HANDSHAKE UI STAGES --- */}

        {/* State: Proposed */}
        {handshakeState === "proposed" && (
          <div className='mt-6 p-5 rounded-2xl bg-[#0F172A] border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]'>
            <div className='flex justify-center mb-3'>
              <div className='w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 animate-pulse'>
                <Unlock className='w-5 h-5 text-emerald-400' />
              </div>
            </div>
            <h4 className='text-center font-bold text-white mb-2 uppercase tracking-wide'>
              Stage 02: Handshake Initiated
            </h4>
            <p className='text-center text-xs text-slate-400 mb-4'>
              Both parties must commit to reveal the Safe Zone meetup ticket and
              identity verification.
            </p>
            <button
              onClick={handleAcceptHandshake}
              className='w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all'
            >
              Commit & Reveal
            </button>
          </div>
        )}

        {/* State: Accepted (The Ticket) */}
        {handshakeState === "accepted" && (
          <div className='mt-6 rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#030712] border border-emerald-500/50 overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.2)]'>
            {/* Ticket Header */}
            <div className='bg-emerald-500/10 p-4 border-b border-emerald-500/20 flex justify-between items-center'>
              <span className='text-[10px] font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1'>
                <ShieldCheck className='w-3 h-3' /> Mutual Consensus Reached
              </span>
              <span className='text-[10px] font-mono text-slate-500'>
                TKT-8842
              </span>
            </div>

            {/* Map Placeholder */}
            <div className='w-full h-32 bg-[#030712] relative flex items-center justify-center overflow-hidden'>
              <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-10" />
              <div className='w-32 h-32 rounded-full border border-cyan-500/20 absolute animate-ping' />
              <MapPin className='w-8 h-8 text-cyan-400 relative z-10' />
            </div>

            {/* Meetup Details */}
            <div className='p-5 space-y-4'>
              <div>
                <span className='text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1'>
                  System Selected Safe Zone
                </span>
                <h4 className='font-bold text-white text-lg flex items-center gap-2'>
                  Engen Garage, Main Rd{" "}
                  <CheckCircle2 className='w-4 h-4 text-emerald-500' />
                </h4>
                <p className='text-xs text-slate-400 mt-1'>
                  Well-lit area with 24/7 CCTV coverage.
                </p>
              </div>

              <div className='grid grid-cols-2 gap-3 pt-3 border-t border-white/5'>
                <div className='p-3 bg-white/5 rounded-xl border border-white/5'>
                  <span className='text-[9px] font-mono text-slate-500 uppercase block mb-1'>
                    Party B Status
                  </span>
                  <span className='text-xs font-bold text-emerald-400'>
                    ID Verified
                  </span>
                </div>
                <div className='p-3 bg-white/5 rounded-xl border border-white/5'>
                  <span className='text-[9px] font-mono text-slate-500 uppercase block mb-1'>
                    Exchange Window
                  </span>
                  <span className='text-xs font-bold text-white'>48 Hours</span>
                </div>
              </div>

              <button className='w-full py-3 mt-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/10 flex items-center justify-center gap-2'>
                <Navigation2 className='w-4 h-4' /> Get Directions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input Footer (Hidden if Handshake Accepted) */}
      {handshakeState !== "accepted" && (
        <div className='pt-3 pb-safe shrink-0'>
          <div className='flex gap-2'>
            <button
              onClick={handleProposeHandshake}
              disabled={handshakeState === "proposed"}
              className='p-3 rounded-xl bg-[#0F172A] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              title='Initiate Handshake'
            >
              <ShieldCheck className='w-5 h-5' />
            </button>
            <input
              type='text'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder='Encrypted transmission...'
              className='flex-1 bg-[#0F172A] border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50'
            />
            <button
              onClick={handleSend}
              className='p-3 rounded-xl bg-emerald-500 text-[#030712] hover:bg-emerald-400 transition-colors'
            >
              <Send className='w-5 h-5' />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 3. MAIN DASHBOARD LAYOUT CONTROLLER ---
function AppDashboard({ onNavigate }) {
  // viewState structure: { name: 'home' | 'map' | 'add' | 'profile' | 'messages' | 'asset_detail' | 'chat', params: {} }
  const [viewState, setViewState] = useState({ name: "home", params: null });

  // Map viewState to bottom navigation highlight
  const getActiveTab = () => {
    if (["home", "asset_detail"].includes(viewState.name)) return "home";
    if (["messages", "chat"].includes(viewState.name)) return "messages";
    return viewState.name; // map, add, profile
  };
  const activeTab = getActiveTab();

  // Route handlers
  const handleTabClick = (tabName) => {
    window.scrollTo(0, 0);
    setViewState({ name: tabName, params: null });
  };

  const handleOpenAsset = (id) => {
    window.scrollTo(0, 0);
    setViewState({ name: "asset_detail", params: { id } });
  };

  const handleOpenChat = (pingId) => {
    window.scrollTo(0, 0);
    setViewState({ name: "chat", params: { id: pingId } });
  };

  const handleInitiatePing = (assetId) => {
    window.scrollTo(0, 0);
    // In a real app, this would create a new ping. Here we mock routing to an empty chat.
    setViewState({ name: "chat", params: { id: 999, newAssetId: assetId } });
  };

  const renderContent = () => {
    switch (viewState.name) {
      case "home":
        return <IndexView onOpenAsset={handleOpenAsset} />;
      case "asset_detail":
        return (
          <AssetDetailView
            assetId={viewState.params.id}
            onBack={() => handleTabClick("home")}
            onPing={handleInitiatePing}
          />
        );
      case "messages":
        return <PingsView onOpenChat={handleOpenChat} />;
      case "chat":
        return (
          <ChatDetailView
            pingId={viewState.params.id}
            onBack={() => handleTabClick("messages")}
          />
        );
      // ... Other stubs (omitted for brevity, assume they exist or fallback)
      default:
        return <IndexView onOpenAsset={handleOpenAsset} />;
    }
  };

  return (
    <div className='min-h-screen bg-[#030712] text-slate-50 font-sans pb-28 selection:bg-emerald-500/30'>
      <div className='fixed inset-0 z-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-[-10%] left-[-20%] w-[60%] h-[30%] rounded-full bg-emerald-900/10 blur-[120px]' />
      </div>

      <header className='sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center'>
        <button
          onClick={() => onNavigate("landing")}
          className='flex items-center gap-2 group cursor-pointer text-slate-400 hover:text-emerald-400 transition-colors'
          title='Back to Landing Page'
        >
          <div className='w-10 h-10 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-300'>
            <Repeat className='w-5 h-5 text-emerald-400 stroke-[2.5]' />
          </div>
          <span className='hidden sm:block font-black text-xl tracking-tighter uppercase text-white group-hover:text-emerald-400 transition-colors'>
            NoZar.
          </span>
        </button>

        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-3 text-right'>
            <div className='hidden sm:block'>
              <h1 className='font-bold text-sm leading-tight text-white'>
                Zanele A.
              </h1>
              <div className='flex items-center justify-end gap-1.5 text-emerald-400 font-mono text-[10px] uppercase tracking-widest mt-0.5'>
                <ShieldCheck className='w-3 h-3' />
                <span>Node Verified</span>
              </div>
            </div>
            <div
              className='w-10 h-10 rounded-full bg-[#0F172A] border border-emerald-500/30 flex items-center justify-center overflow-hidden cursor-pointer'
              onClick={() => handleTabClick("profile")}
            >
              <span className='font-bold text-sm text-emerald-500'>ZA</span>
            </div>
          </div>
        </div>
      </header>

      <main className='relative z-10 p-6 max-w-2xl mx-auto h-full'>
        {renderContent()}
      </main>

      {/* Bottom Nav */}
      <nav className='fixed bottom-0 w-full z-50 bg-[#030712]/90 backdrop-blur-xl border-t border-white/10 pb-safe pt-2 px-6'>
        <div className='max-w-md mx-auto flex justify-between items-center relative pb-4'>
          <button
            onClick={() => handleTabClick("home")}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === "home" ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Home
              className={`w-6 h-6 ${activeTab === "home" ? "fill-emerald-400/20" : ""}`}
            />
            <span className='text-[9px] font-mono uppercase tracking-wider'>
              Index
            </span>
          </button>

          <button
            onClick={() => handleTabClick("map")}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === "map" ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"}`}
          >
            <MapIcon
              className={`w-6 h-6 ${activeTab === "map" ? "fill-cyan-400/20" : ""}`}
            />
            <span className='text-[9px] font-mono uppercase tracking-wider'>
              Radar
            </span>
          </button>

          <div className='relative -top-6'>
            <button
              onClick={() => handleTabClick("add")}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${activeTab === "add" ? "bg-emerald-400 text-[#030712] scale-95" : "bg-emerald-500 text-[#030712] shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105"}`}
            >
              <Plus
                className={`w-8 h-8 stroke-[2.5] transition-transform ${activeTab === "add" ? "rotate-45" : ""}`}
              />
            </button>
          </div>

          <button
            onClick={() => handleTabClick("messages")}
            className={`relative flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === "messages" ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"}`}
          >
            <MessageSquare
              className={`w-6 h-6 ${activeTab === "messages" ? "fill-emerald-400/20" : ""}`}
            />
            <span className='text-[9px] font-mono uppercase tracking-wider'>
              Pings
            </span>
            <span className='absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500 border border-[#030712]'></span>
          </button>

          <button
            onClick={() => handleTabClick("profile")}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === "profile" ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"}`}
          >
            <User
              className={`w-6 h-6 ${activeTab === "profile" ? "fill-emerald-400/20" : ""}`}
            />
            <span className='text-[9px] font-mono uppercase tracking-wider'>
              Node
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// --- 4. MAIN APPLICATION ROUTER ---
export default function App() {
  const [currentRoute, setCurrentRoute] = useState("landing");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentRoute]);

  if (currentRoute === "landing") {
    return <LandingPage onNavigate={setCurrentRoute} />;
  }

  return <AppDashboard onNavigate={setCurrentRoute} />;
}
