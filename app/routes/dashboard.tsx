"use client";

import { Link, Outlet, useLocation } from "react-router";
import { Bell, Repeat, Settings, ShieldCheck } from "lucide-react";
import { BottomNav } from "~/components/ui/bottom-nav";

function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/dashboard/map")) return "map";
  if (pathname.startsWith("/dashboard/add")) return "add";
  if (pathname.startsWith("/dashboard/pings")) return "messages";
  if (pathname.startsWith("/dashboard/profile")) return "profile";
  // home, asset detail, and any unknown sub-routes default to "home"
  return "home";
}

export default function DashboardLayout() {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-50 font-sans pb-28 selection:bg-emerald-500/30">
      {/* Ambient background glow */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[30%] rounded-full bg-emerald-900/10 blur-[120px]" />
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 group cursor-pointer text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-300">
            <Repeat className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
          </div>
          <span className="hidden sm:block font-black text-xl tracking-tighter uppercase text-white group-hover:text-emerald-400 transition-colors">
            NoZar.
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-right">
            <div>
              <h1 className="font-bold text-sm leading-tight text-white">
                Zanele A.
              </h1>
              <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-mono text-[10px] uppercase tracking-widest mt-0.5">
                <ShieldCheck className="w-3 h-3" />
                <span>Node Verified</span>
              </div>
            </div>
          </div>

          <button className="relative w-10 h-10 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors">
            <Bell className="w-5 h-5 text-slate-400" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 border border-[#030712]" />
          </button>

          <button className="w-10 h-10 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors">
            <Settings className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 p-6 max-w-2xl mx-auto">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav activeTab={activeTab} />
    </div>
  );
}
