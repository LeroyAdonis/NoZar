import { Link } from "react-router";
import {
  Home,
  Map as MapIcon,
  Plus,
  MessageSquare,
  User,
  Search,
  Package,
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
  /** When true, nav items are visually dimmed and clicks are blocked */
  isPending?: boolean;
  /** Unread notification count for Pings tab */
  unreadCount?: number;
  /** User's avatar URL (if authenticated) */
  avatarUrl?: string | null;
  /** User's display name (for avatar fallback) */
  displayName?: string;
};

/**
 * BottomNav - Mobile navigation component for the dashboard.
 * Shows auth state with profile avatar or guest icon.
 * Touch-friendly targets for mobile-first design.
 */
export function BottomNav({
  activeTab,
  isPending = false,
  unreadCount = 0,
  avatarUrl,
  displayName = "User",
}: BottomNavProps) {
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

          // Profile tab with avatar or guest icon
          if (tab.id === "profile") {
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
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border ${
                      isActive ? "border-emerald-400" : "border-white/20"
                    }`}
                  />
                ) : (
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-700 text-slate-400 border border-white/10"
                    }`}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-[9px] font-mono uppercase tracking-wider">
                  {tab.label}
                </span>
              </Link>
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

              {/* Notification dot for Pings tab */}
              {tab.id === "messages" && unreadCount > 0 && (
                <span className="absolute top-1 right-2 min-w-[14px] h-[14px] rounded-full bg-emerald-500 border border-[#030712] flex items-center justify-center px-0.5">
                  <span className="text-[8px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * GuestBottomNav - A simplified bottom nav for guest/unauthenticated users.
 * Used on public pages like browse.tsx
 */
export function GuestBottomNav({
  activeTab,
  isPending = false,
  onAddClick,
  onTradeClick,
}: {
  activeTab: string;
  isPending?: boolean;
  onAddClick: () => void;
  onTradeClick: () => void;
}) {
  return (
    <nav
      data-testid="guest-bottom-nav"
      className="fixed bottom-0 w-full z-50 bg-[#030712]/90 backdrop-blur-xl border-t border-white/10 pb-safe pt-1.5 sm:pt-2 px-4 sm:px-6 md:hidden"
      aria-label="Guest navigation"
    >
      <div className="max-w-md mx-auto flex justify-between items-center relative pb-3 sm:pb-4">
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${
            activeTab === "home" ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Home className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[9px] font-mono uppercase tracking-wider">Home</span>
        </Link>

        {/* Browse */}
        <Link
          to="/dashboard/browse"
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${
            activeTab === "browse" ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Package className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[9px] font-mono uppercase tracking-wider">Browse</span>
        </Link>

        {/* Add Asset FAB - triggers auth prompt for guests */}
        <button
          onClick={onAddClick}
          disabled={isPending}
          className="relative -top-5 sm:-top-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-emerald-500 text-[#030712] shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400 hover:scale-105 transition-all"
        >
          <Plus className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
        </button>

        {/* Trade - triggers auth prompt for guests */}
        <button
          onClick={onTradeClick}
          disabled={isPending}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${
            activeTab === "trade"
              ? "text-emerald-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Search className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[9px] font-mono uppercase tracking-wider">Trade</span>
        </button>

        {/* Sign In */}
        <Link
          to="/login"
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${
            activeTab === "signin"
              ? "text-emerald-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <User className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[9px] font-mono uppercase tracking-wider">Sign In</span>
        </Link>
      </div>
    </nav>
  );
}
