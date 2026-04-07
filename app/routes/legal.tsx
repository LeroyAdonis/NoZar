import { Link, Outlet } from "react-router";
import { Repeat, ArrowLeft } from "lucide-react";

export default function LegalLayout() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-50 font-sans selection:bg-emerald-500/30">
      {/* Ambient background glow */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[30%] rounded-full bg-emerald-900/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 group text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-mono text-[10px] uppercase tracking-widest">
              Back to Home
            </span>
          </Link>

          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-300">
              <Repeat className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            </div>
            <span className="font-black text-lg tracking-tighter uppercase text-white group-hover:text-emerald-400 transition-colors">
              NoZar.
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
            © 2026 NoZar. All rights reserved.
          </p>
          <nav className="flex items-center gap-6">
            <Link
              to="/legal/terms"
              className="font-mono text-[10px] uppercase tracking-widest text-slate-600 hover:text-emerald-400 transition-colors"
            >
              Terms
            </Link>
            <Link
              to="/legal/privacy"
              className="font-mono text-[10px] uppercase tracking-widest text-slate-600 hover:text-emerald-400 transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/legal/community-guidelines"
              className="font-mono text-[10px] uppercase tracking-widest text-slate-600 hover:text-emerald-400 transition-colors"
            >
              Guidelines
            </Link>
            <Link
              to="/legal/complaints"
              className="font-mono text-[10px] uppercase tracking-widest text-slate-600 hover:text-emerald-400 transition-colors"
            >
              Complaints
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
