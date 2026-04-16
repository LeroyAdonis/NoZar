import { useEffect, useRef, useState } from "react";
import { useSearchParams, useFetcher, Link, useNavigate } from "react-router";
import { eq, and, desc, inArray, ilike, or, sql } from "drizzle-orm";
import { Search, X, Radar, User, TrendingUp, Package, ArrowRight, Sparkles } from "lucide-react";
import type { Route } from "./+types/browse";
import type { ListingCard } from "~/lib/types";
import { getOptionalSession } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { listings, listingImages, profiles, users } from "~/lib/schema";
import { timeAgo, haversineKm, formatDistance } from "~/lib/utils";
import { resolveRegion, MVP_REGIONS, provinceToSlug, type RegionSlug } from "~/lib/regions";
import { RegionToggle } from "~/components/ui/region-toggle";
import { AssetCard } from "~/components/ui/asset-card";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";
import { AuthPromptModal } from "~/components/ui/auth-prompt-modal";

// ─── Meta ──────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Browse — Nozar" },
    { name: "description", content: "Discover items and services available for barter near you" },
  ];
}

const CATEGORIES = ["All", "Electronics", "Home & Garden", "Fashion", "Skills", "Vehicles", "Sports", "Books", "Services"];

// ─── Loader (Guest-Accesible) ─────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  // Use optional session — allows guest access
  const session = await getOptionalSession(request);

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const regionParam = url.searchParams.get("region");
  const searchQuery = url.searchParams.get("q");
  const promptAuth = url.searchParams.get("promptAuth"); // For auth redirect flow

  // Default to Johannesburg for guests without location
  const defaultRegion: RegionSlug = "johannesburg";

  let currentRegion: RegionSlug = defaultRegion;

  if (session?.user) {
    // Authenticated user: fetch their province for region resolution
    const [userProfile] = await db
      .select({ lat: profiles.lat, lng: profiles.lng, province: profiles.province })
      .from(profiles)
      .where(eq(profiles.userId, session.user.id))
      .limit(1);

    currentRegion = resolveRegion(regionParam, userProfile?.province);
  } else {
    // Guest user: use region param or default
    if (regionParam && regionParam in MVP_REGIONS) {
      currentRegion = regionParam as RegionSlug;
    }
  }

  const regionConfig = MVP_REGIONS[currentRegion];

  // Build where clause: status + region, optionally add search
  const searchFilter = searchQuery
    ? or(
        ilike(listings.title, `%${searchQuery}%`),
        ilike(listings.description, `%${searchQuery}%`),
      )
    : undefined;

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      seekingDescription: listings.seekingDescription,
      category: listings.category,
      type: listings.type,
      estimatedValueZar: listings.estimatedValueZar,
      condition: listings.condition,
      createdAt: listings.createdAt,
      lat: listings.lat,
      lng: listings.lng,
      userName: users.name,
      isVerified: users.emailVerified,
    })
    .from(listings)
    .innerJoin(users, eq(listings.userId, users.id))
    .innerJoin(profiles, eq(listings.userId, profiles.userId))
    .where(
      and(
        eq(listings.status, "active"),
        eq(profiles.province, regionConfig.province),
        searchFilter,
      ),
    )
    .orderBy(desc(listings.createdAt))
    .limit(50);

  // Fetch first images for listings
  const listingIds = rows.map((r) => r.id);
  const images = listingIds.length > 0
    ? await db
        .select({ listingId: listingImages.listingId, url: listingImages.url })
        .from(listingImages)
        .where(inArray(listingImages.listingId, listingIds))
        .orderBy(listingImages.order)
    : [];

  // Keep only the first image per listing
  const imageMap = new Map<number, string>();
  for (const img of images) {
    if (!imageMap.has(img.listingId)) {
      imageMap.set(img.listingId, img.url);
    }
  }

  const items: ListingCard[] = rows
    .filter((r) => !category || category === "All" || r.category === category)
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      seekingDescription: r.seekingDescription,
      category: r.category,
      type: r.type,
      estimatedValueZar: r.estimatedValueZar,
      condition: r.condition,
      distance: "Sign in for distance", // Guest view — no precise distance
      timeAgo: timeAgo(new Date(r.createdAt)),
      userName: r.userName,
      isVerified: r.isVerified,
      imageUrl: imageMap.get(r.id) ?? null,
    }));

  // Get total active listings count for social proof
  const [totalListingsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(eq(listings.status, "active"));

  return {
    listings: items,
    currentRegion,
    searchQuery: searchQuery ?? null,
    isLoggedIn: !!session?.user,
    totalListings: totalListingsRow?.count ?? 0,
    promptAuth: promptAuth ?? null, // Pass through for auto-prompt
  };
}

// ─── Component ─────────────────────────────────────────────────

export default function BrowsePage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "All";
  const { currentRegion, searchQuery, isLoggedIn, totalListings, promptAuth } = loaderData;

  // Auth prompt state
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authActionLabel, setAuthActionLabel] = useState("");

  // Auto-show auth prompt if redirected from protected route
  useEffect(() => {
    if (promptAuth && !isLoggedIn) {
      setAuthActionLabel(promptAuth);
      setShowAuthPrompt(true);
      // Clear the URL param to prevent re-prompting on refresh
      const params = new URLSearchParams(searchParams);
      params.delete("promptAuth");
      setSearchParams(params, { replace: true });
    }
  }, [promptAuth, isLoggedIn, searchParams, setSearchParams]);

  // Debounced search
  const [inputValue, setInputValue] = useState(searchQuery ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setInputValue(searchQuery ?? "");
  }, [searchQuery]);

  function handleSearchInput(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        if (value.trim()) {
          p.set("q", value.trim());
        } else {
          p.delete("q");
        }
        return p;
      }, { preventScrollReset: true });
    }, 300);
  }

  function handleRegionChange(slug: RegionSlug) {
    const params = new URLSearchParams(searchParams);
    params.set("region", slug);
    params.delete("category");
    setSearchParams(params, { preventScrollReset: true });
  }

  function handleCategoryClick(category: string) {
    setSearchParams(
      category === "All" ? {} : { category },
      { preventScrollReset: true },
    );
  }

  // Protected action handlers
  function handleAddClick() {
    if (!isLoggedIn) {
      setAuthActionLabel("Add Asset");
      setShowAuthPrompt(true);
    } else {
      navigate("/dashboard/add");
    }
  }

  function handleListingClick(listingId: number) {
    if (!isLoggedIn) {
      setAuthActionLabel("view full listing details");
      setShowAuthPrompt(true);
    } else {
      navigate(`/dashboard/asset/${listingId}`);
    }
  }

  function handleInitiateTrade() {
    if (!isLoggedIn) {
      setAuthActionLabel("Initiate Trade");
      setShowAuthPrompt(true);
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-50 font-sans selection:bg-emerald-500/30">
      {/* Ambient background glow */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[30%] rounded-full bg-emerald-900/10 blur-[120px]" />
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:border-emerald-500/40 transition-all">
              <img src="/logo.svg" alt="NoZar" className="w-5 h-5" />
            </div>
            <span className="font-black text-lg tracking-tighter uppercase text-white hidden sm:block">
              NoZar<span className="text-emerald-500">.</span>
            </span>
          </Link>

          {/* Auth status */}
          {isLoggedIn ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
            >
              <User className="w-4 h-4" />
              Dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-2 text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl bg-emerald-500 text-[#030712] text-xs font-bold uppercase tracking-wider hover:bg-emerald-400 transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 px-4 py-6 max-w-2xl mx-auto">
        {/* Social proof banner */}
        <div className="mb-6 flex items-center justify-center gap-2 text-center">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
            {totalListings.toLocaleString()} active listings
          </span>
        </div>

        {/* Hero section for guests */}
        {!isLoggedIn && (
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-6 text-center">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-2">
              Discover What's Available
            </h1>
            <p className="text-sm text-slate-400 mb-4">
              Browse items and services near you. Sign up to list your own or start trading.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-[#030712] font-bold text-sm hover:bg-emerald-400 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Get Started Free
            </Link>
          </div>
        )}

        {/* Region toggle */}
        <div className="mb-6 flex justify-center">
          <RegionToggle activeRegion={currentRegion} onChange={handleRegionChange} />
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search by title or description…"
            autoComplete="off"
            className="w-full bg-[#0F172A] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => handleSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide mb-6 -mx-1 px-1">
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`whitespace-nowrap px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all border ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-[#0F172A] text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-300"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Section header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1">
              // {currentRegion.replace(/-/g, " ").toUpperCase()}
            </span>
            <h2 className="text-lg font-bold uppercase tracking-tight">
              Available Listings
            </h2>
          </div>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-[#030712] font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-colors"
          >
            <Package className="w-4 h-4" />
            Add Asset
          </button>
        </div>

        {/* Asset feed */}
        {loaderData.listings.length > 0 ? (
          <div data-testid="feed" className="grid gap-4 sm:grid-cols-2">
            {loaderData.listings.map((listing: ListingCard) => (
              <div
                key={listing.id}
                className="relative cursor-pointer"
                onClick={() => handleListingClick(listing.id)}
              >
                <AssetCard listing={listing} />
                {/* Guest overlay hint */}
                {!isLoggedIn && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-[#030712]/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                      Sign in to view details
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-slate-600 text-4xl mb-4">⊘</div>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-widest mb-1">
              No results
            </p>
            <p className="text-slate-600 text-xs">
              No assets found in this region.
              {searchQuery && (
                <>
                  {" "}Try a different search term.
                </>
              )}
            </p>
          </div>
        )}

        {/* CTA for guests at bottom */}
        {!isLoggedIn && loaderData.listings.length > 0 && (
          <div className="mt-10 py-8 text-center border-t border-white/5">
            <p className="text-slate-400 text-sm mb-4">
              Ready to start trading?
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-[#030712] font-bold text-sm hover:bg-emerald-400 transition-colors"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </main>

      {/* Auth prompt modal */}
      <AuthPromptModal
        isOpen={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        actionLabel={authActionLabel}
      />

      {/* Bottom nav placeholder for guests */}
      <nav className="fixed bottom-0 w-full z-50 bg-[#030712]/90 backdrop-blur-xl border-t border-white/10 pb-safe pt-2 px-4 md:hidden">
        <div className="max-w-md mx-auto flex justify-between items-center pb-4">
          <Link
            to="/"
            className="flex flex-col items-center gap-1 p-2 text-slate-500 hover:text-slate-300"
          >
            <Radar className="w-5 h-5" />
            <span className="text-[9px] font-mono uppercase tracking-wider">Home</span>
          </Link>
          <Link
            to="/dashboard/browse"
            className="flex flex-col items-center gap-1 p-2 text-emerald-400"
          >
            <Package className="w-5 h-5" />
            <span className="text-[9px] font-mono uppercase tracking-wider">Browse</span>
          </Link>
          <button
            onClick={handleAddClick}
            className="relative -top-4 w-14 h-14 rounded-full flex items-center justify-center bg-emerald-500 text-[#030712] shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition-colors"
          >
            <Package className="w-6 h-6 stroke-[2.5]" />
          </button>
          <button
            onClick={handleInitiateTrade}
            className="flex flex-col items-center gap-1 p-2 text-slate-500 hover:text-slate-300"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[9px] font-mono uppercase tracking-wider">Trade</span>
          </button>
          <Link
            to="/login"
            className="flex flex-col items-center gap-1 p-2 text-slate-500 hover:text-slate-300"
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] font-mono uppercase tracking-wider">Sign In</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
