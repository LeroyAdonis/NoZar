import { useState } from "react";
import { Link, Outlet, redirect, useLocation, useNavigation, useNavigate } from "react-router";
import {
  Bell,
  ShieldCheck,
  Home,
  Map as MapIcon,
  Plus,
  MessageSquare,
  User,
  Radar,
  Gift,
} from "lucide-react";
import type { Route } from "./+types/dashboard";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { profiles } from "~/lib/schema";
import { eq } from "drizzle-orm";
import { getUnreadCount } from "~/lib/notifications.server";
import { ensurePromoEnrolled } from "~/lib/promo.server";
import { BottomNav } from "~/components/ui/bottom-nav";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";
import { LocationPromptModal } from "~/components/ui/location-prompt-modal";
import { provinceToSlug, getClosestRegion, MVP_REGIONS } from "~/lib/regions";
import { vapidPublicKey } from "~/lib/webpush.server";
import { PushPermissionButton } from "~/components/ui/push-permission-button";
import { TutorialOverlay } from "~/components/ui/tutorial-overlay";

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);

  // Gate: unverified users must confirm their email before accessing the dashboard.
  // Better Auth's requireEmailVerification blocks new sign-ins, but existing sessions
  // created before that flag was set can still reach here — so we enforce it explicitly.
  if (!user.emailVerified) {
    throw redirect("/verify-email");
  }

  await ensurePromoEnrolled(user.id); // auto-enroll in 90-day promo if no subscription
  const unreadCount = await getUnreadCount(db, user.id);

  const profile = (await db
    .select({
      avatarUrl: profiles.avatarUrl,
      displayName: profiles.displayName,
      province: profiles.province,
      lat: profiles.lat,
      lng: profiles.lng,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1))[0];

  return { user, unreadCount, profile: profile ?? null, vapidPublicKey };
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "setRegion") {
    const province = (formData.get("province") as string)?.trim() || null;
    if (province && provinceToSlug(province)) {
      await db
        .insert(profiles)
        .values({
          userId: user.id,
          province,
          displayName: user.name || user.email?.split("@")[0] || "User",
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: { province, updatedAt: new Date() },
        });
      return { success: true, intent: "setRegion" };
    }
    return { success: false, intent: "setRegion", error: "Invalid province" };
  }

  if (intent === "updateLocation") {
    const lat = parseFloat(formData.get("lat") as string);
    const lng = parseFloat(formData.get("lng") as string);

    if (isNaN(lat) || isNaN(lng)) {
      return {
        success: false,
        intent: "updateLocation",
        error: "We couldn't read your location. Please try again.",
      };
    }

    const regionSlug = getClosestRegion(lat, lng);
    const province = MVP_REGIONS[regionSlug].province;

    await db
      .insert(profiles)
      .values({
        userId: user.id,
        lat,
        lng,
        province,
        displayName: user.name || user.email?.split("@")[0] || "User",
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { lat, lng, province, updatedAt: new Date() },
      });

    return {
      success: true,
      intent: "updateLocation",
      location: { lat, lng, province },
    };
  }

  return { success: false, intent: "unknown", error: "Unknown intent" };
}

function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/dashboard/map")) return "map";
  if (pathname.startsWith("/dashboard/add")) return "add";
  if (pathname.startsWith("/dashboard/pings")) return "messages";
  if (pathname.startsWith("/dashboard/profile")) return "profile";
  if (pathname.startsWith("/dashboard/refer")) return "refer";
  if (pathname.startsWith("/dashboard/notifications")) return "notifications";
  if (pathname.startsWith("/dashboard/billing")) return "billing";
  if (pathname.startsWith("/dashboard/verify-phone")) return "verify-phone";
  // home, asset detail, and any unknown sub-routes default to "home"
  return "home";
}

const SECTION_LABELS: Record<string, string> = {
  home: "Home",
  map: "Explore",
  add: "Add item",
  messages: "Chats",
  profile: "Profile",
  refer: "Invite Friends",
  notifications: "Notifications",
  billing: "Billing",
  "verify-phone": "Verify Phone",
};

const SIDEBAR_LINKS = [
  { id: "home",     label: "Home",     href: "/dashboard",          icon: Home },
  { id: "map",      label: "Explore",  href: "/dashboard/map",      icon: MapIcon },
  { id: "add",      label: "Add item", href: "/dashboard/add",      icon: Plus },
  { id: "messages", label: "Chats",    href: "/dashboard/pings",    icon: MessageSquare },
  { id: "profile",  label: "Profile",  href: "/dashboard/profile",  icon: User },
] as const;

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const navigation = useNavigation();
  const activeTab = getActiveTab(location.pathname);
  const { user, unreadCount, profile, vapidPublicKey } = loaderData;
  const needsLocation = !!user && (!profile?.lat || !profile?.lng);
  const [isLocationDismissed, setIsLocationDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nozar_location_dismissed") === "1";
  });
  const handleLocationDismiss = () => {
    localStorage.setItem("nozar_location_dismissed", "1");
    setIsLocationDismissed(true);
  };
  const handleLocationReopen = () => {
    localStorage.removeItem("nozar_location_dismissed");
    setIsLocationDismissed(false);
  };

  const navigate = useNavigate();

  const [hasSeenTutorial, setHasSeenTutorial] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("nozar_tutorial_seen") === "1";
  });

  const handleTutorialDismiss = () => {
    localStorage.setItem("nozar_tutorial_seen", "1");
    setHasSeenTutorial(true);
  };

  const showLocationModal = !!user && needsLocation && !isLocationDismissed;

  const isNavigating = navigation.state !== "idle";

  // Get display name from user data
  const displayName = user?.name ?? "Guest";

  return (
    <div className="min-h-screen bg-[#030712] text-slate-50 font-sans pb-24 sm:pb-28 md:pb-0 md:pl-60 selection:bg-emerald-500/30">
      {/* Global navigation loading bar — fixed at very top of viewport */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-[100]">
          <LoadingBar />
          <span className="sr-only" aria-live="assertive">
            Loading page
          </span>
        </div>
      )}

      {/* Ambient background glow */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[30%] rounded-full bg-emerald-900/10 blur-[120px]" />
      </div>

      {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-60 bg-[#0F172A] border-r border-white/5 z-40"
        aria-label="Desktop sidebar navigation"
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/5 shrink-0">
          <Link
            to="/dashboard"
            aria-disabled={isNavigating}
            tabIndex={isNavigating ? -1 : undefined}
            onClick={isNavigating ? (e) => e.preventDefault() : undefined}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:border-emerald-500/40 transition-all">
              <img src="/logo.svg" alt="NoZar" className="w-5 h-5" />
            </div>
            <span className="font-black text-lg tracking-tighter uppercase text-white group-hover:text-emerald-400 transition-colors">
              NoZar.
            </span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label="Sidebar navigation">
          {SIDEBAR_LINKS.map((link) => {
            const isActive = activeTab === link.id;
            const Icon = link.icon;

            if (link.id === "add") {
              return (
                <Link
                  key={link.id}
                  to={link.href}
                  aria-disabled={isNavigating}
                  tabIndex={isNavigating ? -1 : undefined}
                  onClick={isNavigating ? (e) => e.preventDefault() : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all my-2 ${
                    isActive
                      ? "bg-emerald-400 text-[#030712]"
                      : "bg-emerald-500 text-[#030712] hover:bg-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.3)]"
                  } ${isNavigating ? "opacity-70 pointer-events-none" : ""}`}
                >
                  <Icon className="w-4 h-4 shrink-0 stroke-[2.5]" />
                  {link.label}
                </Link>
              );
            }

            return (
              <Link
                key={link.id}
                to={link.href}
                aria-disabled={isNavigating}
                tabIndex={isNavigating ? -1 : undefined}
                onClick={(e) => {
                  if (isNavigating) {
                    e.preventDefault();
                  }
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all border ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent"
                } ${isNavigating ? "opacity-70 pointer-events-none" : ""}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : "text-slate-500"}`}
                />
                {link.label}
                {link.id === "messages" && unreadCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center px-1">
                    <span className="text-[9px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Invite / Refer — secondary action above user footer */}
        <div className="px-3 pb-2">
          <Link
            to="/dashboard/refer"
            aria-disabled={isNavigating}
            tabIndex={isNavigating ? -1 : undefined}
            onClick={isNavigating ? (e) => e.preventDefault() : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all border ${
              activeTab === "refer"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 border-dashed border-white/10 hover:border-emerald-500/20"
            } ${isNavigating ? "opacity-70 pointer-events-none" : ""}`}
          >
            <Gift className={`w-4 h-4 shrink-0 ${activeTab === "refer" ? "text-emerald-400" : "text-slate-500"}`} />
            Invite Friends
          </Link>
        </div>

        {/* User info + notifications at bottom */}
        {user ? (
          <div className="p-4 border-t border-white/5 shrink-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex items-center justify-center shrink-0">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="bg-slate-700 w-full h-full flex items-center justify-center text-emerald-400 font-bold text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-white truncate">{displayName}</p>
                <div className="flex items-center gap-1 text-emerald-400 font-mono text-[9px] uppercase tracking-widest mt-0.5">
                  <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                  <span>{user.emailVerified ? "Verified" : "Unverified"}</span>
                </div>
              </div>
              <Link
                to="/dashboard/notifications"
                aria-label={
                  unreadCount > 0
                    ? `${unreadCount} unread notifications`
                    : "Notifications"
                }
                className="relative shrink-0 w-7 h-7 rounded-lg bg-[#030712] border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors"
              >
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-emerald-500 border border-[#030712] flex items-center justify-center px-0.5">
                    <span className="text-[8px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </span>
                )}
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-white/5 shrink-0">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500 text-[#030712] font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-colors"
            >
              Sign In / Register
            </Link>
          </div>
        )}
      </aside>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 flex justify-between items-center">
        {/* Logo — mobile only (desktop sidebar carries it) */}
        <Link
          to="/dashboard"
          aria-disabled={isNavigating}
          tabIndex={isNavigating ? -1 : undefined}
          onClick={isNavigating ? (e) => e.preventDefault() : undefined}
          className={`md:hidden flex items-center gap-2 group cursor-pointer text-slate-400 hover:text-emerald-400 transition-colors ${
            isNavigating ? "opacity-70 pointer-events-none" : ""
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-300">
            <img src="/logo.svg" alt="NoZar" className="w-6 h-6" />
          </div>
          <span className="hidden sm:block font-black text-xl tracking-tighter uppercase text-white group-hover:text-emerald-400 transition-colors">
            NoZar.
          </span>
        </Link>

        {/* Desktop: section label replacing logo */}
        <div className="hidden md:flex items-center gap-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            {SECTION_LABELS[activeTab] ?? "Dashboard"}
          </span>
          {needsLocation && isLocationDismissed && (
            <button
              onClick={handleLocationReopen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all animate-in fade-in zoom-in-95 duration-300"
            >
              <Radar className="w-3.5 h-3.5" /> Enable Radar
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Push notification toggle — shown in header on all screens */}
          <PushPermissionButton vapidPublicKey={vapidPublicKey} />
          {needsLocation && isLocationDismissed && (
            <button
              onClick={handleLocationReopen}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-mono uppercase tracking-widest border border-amber-500/30 bg-amber-500/10 text-amber-400 active:scale-95 transition-all"
            >
              <Radar className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Radar Off</span>
            </button>
          )}
          {/* User info — sm screens on mobile only (desktop has sidebar) */}
          {user ? (
            <div className="hidden sm:flex md:hidden items-center gap-3 text-right">
              <div>
                <h1 className="font-bold text-sm leading-tight text-white">
                  {displayName}
                </h1>
                <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-mono text-[10px] uppercase tracking-widest mt-0.5">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{user.emailVerified ? "Verified" : "Unverified"}</span>
                </div>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden sm:flex md:hidden items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-[#030712] hover:bg-emerald-400 transition-colors"
            >
              Sign In
            </Link>
          )}

          {/* Notifications — mobile only (desktop sidebar has it) */}
          <Link
            to="/dashboard/notifications"
            aria-label={
              unreadCount > 0
                ? `Notifications — ${unreadCount} unread`
                : "Notifications"
            }
            aria-disabled={isNavigating}
            tabIndex={isNavigating ? -1 : undefined}
            onClick={isNavigating ? (e) => e.preventDefault() : undefined}
            className={`md:hidden relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors ${
              isNavigating ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            <Bell className="w-5 h-5 text-slate-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-emerald-500 border-2 border-[#030712] flex items-center justify-center px-1">
                <span className="text-[10px] font-bold text-white leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              </span>
            )}
          </Link>

          <Link
            to="/dashboard/profile"
            aria-disabled={isNavigating}
            tabIndex={isNavigating ? -1 : undefined}
            onClick={isNavigating ? (e) => e.preventDefault() : undefined}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-white/10 flex items-center justify-center hover:border-emerald-500/30 transition-colors ${
              isNavigating ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isNavigating ? (
              <Spinner className="w-5 h-5 text-emerald-400" />
            ) : profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="bg-slate-700 w-full h-full flex items-center justify-center text-emerald-400 font-bold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main
        className={`relative p-3 sm:p-4 md:p-6 max-w-2xl mx-auto md:max-w-4xl md:mx-0 md:px-8 md:py-8 transition-opacity duration-200 ${
          isNavigating ? "opacity-70" : ""
        }`}
        aria-busy={isNavigating}
      >
        <Outlet />
      </main>

      <LocationPromptModal
        isOpen={showLocationModal}
        onClose={handleLocationDismiss}
      />

      {!hasSeenTutorial && (
        <TutorialOverlay
          onDismiss={handleTutorialDismiss}
          onNavigate={navigate}
        />
      )}

      {/* Bottom navigation — mobile only (BottomNav itself adds md:hidden) */}
      <BottomNav activeTab={activeTab} isPending={isNavigating} hasUnread={unreadCount > 0} />
    </div>
  );
}
