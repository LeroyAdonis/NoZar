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
    label: "Home",
    href: "/dashboard",
    icon: Home,
    activeColor: "text-emerald-400",
    activeFill: "fill-emerald-400/20",
  },
  {
    id: "map",
    label: "Explore",
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
    label: "Chats",
    href: "/dashboard/pings",
    icon: MessageSquare,
    activeColor: "text-emerald-400",
    activeFill: "fill-emerald-400/20",
  },
  {
    id: "profile",
    label: "Profile",
    href: "/dashboard/profile",
    icon: User,
    activeColor: "text-emerald-400",
    activeFill: "fill-emerald-400/20",
  },
];

type BottomNavProps = {
  activeTab: string;
  /** When true, nav items are visually dimmed and clicks are blocked */
  isPending?: boolean;
  hasUnread?: boolean;
};

export function BottomNav({ activeTab, isPending = false, hasUnread = false }: BottomNavProps) {
  return (
    <nav
      data-testid="bottom-nav"
      className="fixed bottom-0 w-full z-50 bg-[#030712]/90 backdrop-blur-xl border-t border-white/10 pb-safe pt-1.5 sm:pt-2 px-4 sm:px-6 md:hidden"
      aria-label="Main navigation"
    >
      <div className="max-w-md mx-auto flex justify-between items-center relative pb-3 sm:pb-4">
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          // Elevated FAB for the center "Add" button
          if (tab.id === "add") {
            return (
              <div key={tab.id} className="relative -top-5 sm:-top-6">
                <Link
                  to={tab.href}
                  aria-disabled={isPending}
                  tabIndex={isPending ? -1 : undefined}
                  onClick={isPending ? (e) => e.preventDefault() : undefined}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                    isPending
                      ? "opacity-70 cursor-not-allowed"
                      : ""
                  } ${
                    isActive
                      ? "bg-emerald-400 text-[#030712] scale-95"
                      : "bg-emerald-500 text-[#030712] shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105"
                  }`}
                >
                  <Plus
                    className={`w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5] transition-transform ${
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
              aria-disabled={isPending}
              tabIndex={isPending ? -1 : undefined}
              onClick={isPending ? (e) => e.preventDefault() : undefined}
              className={`relative flex flex-col items-center gap-1 p-2 transition-colors ${
                isPending
                  ? "opacity-70 cursor-not-allowed"
                  : ""
              } ${
                isActive
                  ? tab.activeColor
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon
                className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? tab.activeFill : ""}`}
              />
              <span className="text-[9px] font-mono uppercase tracking-wider">
                {tab.label}
              </span>

              {/* Notification dot for Chats tab */}
              {tab.id === "messages" && hasUnread && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500 border border-[#030712]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
