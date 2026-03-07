import { Link, Outlet, useLocation, useNavigation } from "react-router";
import { Bell, Repeat, ShieldCheck } from "lucide-react";
import type { Route } from "./+types/dashboard";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { profiles } from "~/lib/schema";
import { eq } from "drizzle-orm";
import { getUnreadCount } from "~/lib/notifications.server";
import { BottomNav } from "~/components/ui/bottom-nav";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";
import { RegionPrompt } from "~/components/ui/region-prompt";
import { provinceToSlug } from "~/lib/regions";

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const unreadCount = await getUnreadCount(db, user.id);

  const [profile] = await db
    .select({
      avatarUrl: profiles.avatarUrl,
      displayName: profiles.displayName,
      province: profiles.province,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  return { user, unreadCount, profile: profile ?? null };
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "setRegion") {
    const province = (formData.get("province") as string)?.trim() || null;
    if (province && provinceToSlug(province)) {
      await db
        .update(profiles)
        .set({ province, updatedAt: new Date() })
        .where(eq(profiles.userId, user.id));
    }
    return { success: true };
  }

  return { error: "Unknown intent" };
}

function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/dashboard/map")) return "map";
  if (pathname.startsWith("/dashboard/add")) return "add";
  if (pathname.startsWith("/dashboard/pings")) return "messages";
  if (pathname.startsWith("/dashboard/profile")) return "profile";
  // home, asset detail, and any unknown sub-routes default to "home"
  return "home";
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const navigation = useNavigation();
  const activeTab = getActiveTab(location.pathname);
  const { user, unreadCount, profile } = loaderData;
  const needsRegion = !profile?.province || !provinceToSlug(profile.province);

  const isNavigating = navigation.state !== "idle";

  // Get display name from user data
  const displayName = user.name ?? "User";

  return (
    <div className="min-h-screen bg-[#030712] text-slate-50 font-sans pb-28 selection:bg-emerald-500/30">
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

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <Link
          to="/dashboard"
          aria-disabled={isNavigating}
          tabIndex={isNavigating ? -1 : undefined}
          onClick={isNavigating ? (e) => e.preventDefault() : undefined}
          className={`flex items-center gap-2 group cursor-pointer text-slate-400 hover:text-emerald-400 transition-colors ${
            isNavigating ? "opacity-70 pointer-events-none" : ""
          }`}
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
                {displayName}
              </h1>
              <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-mono text-[10px] uppercase tracking-widest mt-0.5">
                <ShieldCheck className="w-3 h-3" />
                <span>{user.emailVerified ? "Verified" : "Unverified"}</span>
              </div>
            </div>
          </div>

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
            className={`relative w-10 h-10 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors ${
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
            className={`relative w-10 h-10 rounded-full overflow-hidden border border-white/10 flex items-center justify-center hover:border-emerald-500/30 transition-colors ${
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
        className={`relative z-10 p-6 max-w-2xl mx-auto transition-opacity duration-200 ${
          isNavigating ? "opacity-70" : ""
        }`}
        aria-busy={isNavigating}
      >
        <Outlet />
      </main>

      {needsRegion && <RegionPrompt />}

      {/* Bottom navigation */}
      <BottomNav activeTab={activeTab} isPending={isNavigating} />
    </div>
  );
}
