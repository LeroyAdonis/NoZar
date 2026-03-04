import { Link } from "react-router";
import {
  Home,
  Map as MapIcon,
  Plus,
  MessageSquare,
  User,
} from "lucide-react";

type NavTab = {
  id: string;
  label: string;
  href: string;
  icon: typeof Home;
  activeColor: string;
  activeFill: string;
};

const NAV_TABS: NavTab[] = [
  {
    id: "home",
    label: "Index",
    href: "/dashboard",
    icon: Home,
    activeColor: "text-emerald-400",
    activeFill: "fill-emerald-400/20",
  },
  {
    id: "map",
    label: "Radar",
    href: "/dashboard/map",
    icon: MapIcon,
    activeColor: "text-cyan-400",
    activeFill: "fill-cyan-400/20",
  },
  {
    id: "add",
    label: "",
    href: "/dashboard/add",
    icon: Plus,
    activeColor: "",
    activeFill: "",
  },
  {
    id: "messages",
    label: "Pings",
    href: "/dashboard/pings",
    icon: MessageSquare,
    activeColor: "text-emerald-400",
    activeFill: "fill-emerald-400/20",
  },
  {
    id: "profile",
    label: "Node",
    href: "/dashboard/profile",
    icon: User,
    activeColor: "text-emerald-400",
    activeFill: "fill-emerald-400/20",
  },
];

type BottomNavProps = {
  activeTab: string;
};

export function BottomNav({ activeTab }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 w-full z-50 bg-[#030712]/90 backdrop-blur-xl border-t border-white/10 pb-safe pt-2 px-6">
      <div className="max-w-md mx-auto flex justify-between items-center relative pb-4">
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          // Elevated FAB for the center "Add" button
          if (tab.id === "add") {
            return (
              <div key={tab.id} className="relative -top-6">
                <Link
                  to={tab.href}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? "bg-emerald-400 text-[#030712] scale-95"
                      : "bg-emerald-500 text-[#030712] shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105"
                  }`}
                >
                  <Plus
                    className={`w-8 h-8 stroke-[2.5] transition-transform ${
                      isActive ? "rotate-45" : ""
                    }`}
                  />
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={tab.id}
              to={tab.href}
              className={`relative flex flex-col items-center gap-1 p-2 transition-colors ${
                isActive
                  ? tab.activeColor
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon
                className={`w-6 h-6 ${isActive ? tab.activeFill : ""}`}
              />
              <span className="text-[9px] font-mono uppercase tracking-wider">
                {tab.label}
              </span>

              {/* Notification dot for Pings tab */}
              {tab.id === "messages" && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500 border border-[#030712]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
