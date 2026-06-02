import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useFetcher, Link } from "react-router";
import { eq, ne, and, desc, inArray, ilike, or } from "drizzle-orm";
import { AiServiceError, generateContent } from "~/lib/ai.server";
import { Sparkles, Search, X, Radar, Lock } from "lucide-react";
import { getUserTier } from "~/lib/tier-limits.server";
import { canUseAiFeature } from "~/lib/tier-limits";
import type { Route } from "./+types/home";
import type { ListingCard } from "~/lib/types";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { listings, listingImages, profiles, users } from "~/lib/schema";
import { timeAgo, haversineKm, formatDistance } from "~/lib/utils";
import { resolveRegion, MVP_REGIONS, provinceToSlug } from "~/lib/regions";
import { AssetCard } from "~/components/ui/asset-card";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard — NoZar" },
    { name: "description", content: "Your NoZar dashboard" },
  ];
}

const CATEGORY_CHIPS = [
  { display: "All",           value: "All" },
  { display: "📱 Electronics", value: "Electronics" },
  { display: "👕 Clothes",     value: "Fashion" },
  { display: "🏠 Home",        value: "Home & Garden" },
  { display: "🔧 Skills",      value: "Skills" },
  { display: "🚗 Vehicles",    value: "Vehicles" },
  { display: "📦 Other",       value: "Other" },
] as const;

// ─── AI Match Cache (5-minute TTL per user) ────────────────────
type CacheEntry = { matchedIds: number[]; expiresAt: number };
const aiMatchCache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedMatches(userId: string): number[] | null {
  const entry = aiMatchCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    aiMatchCache.delete(userId);
    return null;
  }
  return entry.matchedIds;
}

function setCachedMatches(userId: string, matchedIds: number[]): void {
  aiMatchCache.set(userId, {
    matchedIds,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ─── Loader ────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const regionParam = url.searchParams.get("region");
  const searchQuery = url.searchParams.get("q");
  const scope = url.searchParams.get("scope") ?? "local";

  // Fetch user's province for region resolution
  const [userProfile] = await db
    .select({ lat: profiles.lat, lng: profiles.lng, province: profiles.province })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const currentRegion = resolveRegion(regionParam, userProfile?.province);
  const regionConfig = MVP_REGIONS[currentRegion];

  // Build where clause: always filter by status + region, optionally add search
  const searchFilter =
    searchQuery
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
        scope === "national"
          ? undefined
          : eq(profiles.province, regionConfig.province),
        ne(listings.userId, user.id),
        searchFilter,
      ),
    )
    .orderBy(desc(listings.createdAt))
    .limit(50);

  // Fetch images and own listings in parallel
  const listingIds = rows.map((r) => r.id);
  const [images, ownListings] = await Promise.all([
    listingIds.length > 0
      ? db
          .select({ listingId: listingImages.listingId, url: listingImages.url })
          .from(listingImages)
          .where(inArray(listingImages.listingId, listingIds))
          .orderBy(listingImages.order)
      : Promise.resolve([]),
    db
      .select({ title: listings.title, description: listings.description, category: listings.category })
      .from(listings)
      .where(and(eq(listings.userId, user.id), eq(listings.status, "active"))),
  ]);

  // Keep only the first image per listing (query is ordered by `order`)
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
      distance:
        userProfile?.lat != null && userProfile?.lng != null && r.lat != null && r.lng != null
          ? formatDistance(haversineKm(userProfile.lat, userProfile.lng, r.lat, r.lng))
          : "Dist. unknown",
      timeAgo: timeAgo(new Date(r.createdAt)),
      userName: r.userName,
      isVerified: r.isVerified,
      imageUrl: imageMap.get(r.id) ?? null,
    }));

  // ── Directional keyword matching ──
  // Only match when the USER's offering keywords appear in the other listing's
  // seeking description (not the reverse, not a symmetric overlap).
  // Filters out common stop words to avoid false positives like "power".
  const STOP_WORDS = new Set([
    "looking", "trade", "barter", "swap", "exchange", "offers", "open",
    "offering", "willing", "would", "could", "should", "much", "many",
    "need", "want", "gear", "stuff", "items", "things", "something",
    "anything", "good", "great", "nice", "like", "new", "used",
    "including", "includes", "please", "thank", "thanks", "also",
    "quality", "excellent", "perfect", "well", "really", "some", "any",
    "get", "got", "interested", "must", "can", "work", "way", "make",
    "done", "ever", "say", "still", "even", "back", "put", "keep",
    "let", "know", "see", "come", "take", "use", "made", "power",
  ]);

  function matchesSeeking(seekingDescription: string | null): boolean {
    if (!seekingDescription || ownListings.length === 0) return false;

    const seekText = seekingDescription.toLowerCase();

    // Check each of the user's own listings against what this listing is seeking
    return ownListings.some((listing) => {
      // Build offering keywords from title + category only (description is noisy)
      const offeringWords = `${listing.title} ${listing.category}`
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

      if (offeringWords.length === 0) return false;

      // Directional check: do my offering keywords appear in their seeking description?
      return offeringWords.some((word) => seekText.includes(word));
    });
  }

  // Tag items with youHaveMatch
  const taggedItems: ListingCard[] = items.map((item) => ({
    ...item,
    youHaveMatch: matchesSeeking(item.seekingDescription),
  }));

  const tier = await getUserTier(user.id);

  return {
    listings: taggedItems,
    hasListings: ownListings.length > 0,
    currentRegion,
    needsRegion: !userProfile?.province || !provinceToSlug(userProfile.province),
    needsLocation: !userProfile?.lat || !userProfile?.lng,
    searchQuery: searchQuery ?? null,
    scope,
    canUseAiMatching: canUseAiFeature(tier, "ai_matching"),
  };
}

// ─── Action (AI Match) ─────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "aiMatch") {
    return { error: "Unknown intent" };
  }

  const { user } = await requireAuth(request);

  const tier = await getUserTier(user.id);
  if (!canUseAiFeature(tier, "ai_matching")) {
    return { error: "ai_tier_restricted" };
  }

  const url = new URL(request.url);
  const regionParam = url.searchParams.get("region");

  const [regionProfile] = await db
    .select({ province: profiles.province })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const currentRegion = resolveRegion(regionParam, regionProfile?.province);
  const regionConfig = MVP_REGIONS[currentRegion];

  // Check cache first
  const cached = getCachedMatches(user.id);
  if (cached) {
    return { matchedIds: cached };
  }

  // Get user's own active listings (what they have + what they seek)
  const userListings = await db
    .select({
      title: listings.title,
      description: listings.description,
      seekingDescription: listings.seekingDescription,
      category: listings.category,
      estimatedValueZar: listings.estimatedValueZar,
    })
    .from(listings)
    .where(
      and(eq(listings.userId, user.id), eq(listings.status, "active")),
    );

  if (userListings.length === 0) {
    return { error: "no_listings" };
  }

  // Get available listings from other users (scoped to current region)
  const otherListings = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      seekingDescription: listings.seekingDescription,
      category: listings.category,
      type: listings.type,
      estimatedValueZar: listings.estimatedValueZar,
    })
    .from(listings)
    .innerJoin(profiles, eq(listings.userId, profiles.userId))
    .where(
      and(
        ne(listings.userId, user.id),
        eq(listings.status, "active"),
        eq(profiles.province, regionConfig.province),
      ),
    )
    .limit(50);

  if (otherListings.length === 0) {
    return { matchedIds: [] };
  }

  // Build the NVIDIA prompt
  const userProfile = userListings
    .map(
      (l) =>
        `- Has: "${l.title}" (${l.category}) — ${l.description}` +
        (l.estimatedValueZar != null ? ` | Value: ~R${l.estimatedValueZar.toLocaleString("en-ZA")}` : "") +
        (l.seekingDescription ? ` | Seeking: ${l.seekingDescription}` : ""),
    )
    .join("\n");

  const availableListings = otherListings
    .map(
      (l) =>
        `ID:${l.id} "${l.title}" (${l.category}, ${l.type}) — ${l.description}` +
        (l.estimatedValueZar != null ? ` | Value: ~R${l.estimatedValueZar.toLocaleString("en-ZA")}` : "") +
        (l.seekingDescription ? ` | Seeking: ${l.seekingDescription}` : ""),
    )
    .join("\n");

  const prompt = `You are a trade matching assistant for a South African barter platform called NoZar.

A user has the following items/services available for trade:
${userProfile}

Here are listings from other users:
${availableListings}

Rank the above listings by how well they match what this user is seeking, and how well the user's items match what those listings are seeking. Consider category relevance, complementary needs, value alignment, and value gap (how fair the exchange is based on estimated values).

Boost listings where:
- The user's offering matches what the other listing is seeking
- The other listing's offering matches what the user is seeking
- Estimated values are within ~30% of each other (fair trade)

Penalize listings where:
- Neither party offers what the other wants
- The value gap exceeds 50% with no reasonable way to balance (no cash difference mentioned)

Return ONLY a JSON array of listing IDs in order from best match to worst match. Include only IDs with a reasonable match quality (at least somewhat relevant). Return at most 10 IDs.

Example response: [5, 12, 3]

Return ONLY the JSON array, no explanation.`;

  try {
    const text = await generateContent(prompt);
    const cleaned = (text || "").replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
    const parsed: unknown = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      return { error: "AI returned unexpected format" };
    }

    // Validate: keep only IDs that exist in the available listings
    const validIds = new Set(otherListings.map((l) => l.id));
    const matchedIds = parsed
      .filter((id): id is number => typeof id === "number" && validIds.has(id));

    setCachedMatches(user.id, matchedIds);
    return { matchedIds };
  } catch (error) {
    return {
      error:
        error instanceof AiServiceError &&
        error.code === "nvidia_not_configured"
          ? "AI matching is unavailable because NVIDIA AI is not configured"
          : "AI matching unavailable — try again later",
    };
  }
}

// ─── Component ─────────────────────────────────────────────────

export default function DashboardHome({
  loaderData,
}: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "All";
  const scope = (searchParams.get("scope") ?? "local") as "local" | "national";
  const radiusKm = Number(searchParams.get("radius") ?? "10");
  const fetcher = useFetcher<typeof action>();
  const { currentRegion, searchQuery, canUseAiMatching } = loaderData;

  // ── Search with explicit submit ──
  const [inputValue, setInputValue] = useState(searchQuery ?? "");

  useEffect(() => {
    setInputValue(searchQuery ?? "");
  }, [searchQuery]);

  function handleSearchSubmit() {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (inputValue.trim()) {
        p.set("q", inputValue.trim());
      } else {
        p.delete("q");
      }
      return p;
    }, { preventScrollReset: true });
  }

  function handleSearchClear() {
    setInputValue("");
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("q");
      return p;
    }, { preventScrollReset: true });
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  }

  function handleScopeChange(newScope: "local" | "national") {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (newScope === "local") {
        p.delete("scope");
      } else {
        p.set("scope", "national");
      }
      return p;
    }, { preventScrollReset: true });
  }

  const isMatching = fetcher.state !== "idle";
  const matchData = fetcher.data;
  const matchedIds = matchData && "matchedIds" in matchData ? new Set(matchData.matchedIds) : null;
  const matchError = matchData && "error" in matchData ? matchData.error : null;

  function handleCategoryClick(value: string) {
    setSearchParams(
      value === "All" ? {} : { category: value },
      { preventScrollReset: true },
    );
  }

  return (
    <div className="space-y-6">
      {isMatching && <LoadingBar />}
      {loaderData.needsLocation && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-start gap-3 animate-in slide-in-from-top-4 duration-500">
          <div className="p-1.5 rounded-full bg-amber-500/20">
            <Radar className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Limited Mode Active
            </p>
            <p className="text-[10px] text-amber-200/60 leading-relaxed mt-0.5">
              Exact distances are hidden. Using <strong>{currentRegion.replace(/-/g, " ")}</strong> as your default region.
            </p>
          </div>
        </div>
      )}
      {/* Local / National toggle */}
      <div className="flex gap-1 bg-[#0F172A] border border-white/10 rounded-full p-1 w-fit">
        {(["local", "national"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleScopeChange(s)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest transition-all ${
              scope === s
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {s === "local" ? "Local" : "National"}
          </button>
        ))}
      </div>

      {/* Section header */}
      <div className="flex justify-between items-end gap-2">
        <div>
          <p className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest mb-1">
            Based on your listings
          </p>
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight">
            Your match
          </h2>
        </div>

        {/* AI Match button */}
        {canUseAiMatching ? (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="aiMatch" />
            <button
              type="submit"
              disabled={isMatching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest border transition-all disabled:opacity-50 disabled:cursor-wait bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50"
            >
              {isMatching ? <Spinner className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
              {isMatching ? "Matching…" : "AI Match"}
            </button>
          </fetcher.Form>
        ) : (
          <Link
            to="/dashboard/billing"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest border bg-white/[0.03] text-slate-500 border-white/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
            title="Upgrade to Plus to use AI Match"
          >
            <Lock className="w-3 h-3" />
            AI Match — Plus only
          </Link>
        )}
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search by title or description…"
            autoComplete="off"
            className="w-full bg-[#0F172A] border border-white/10 rounded-xl pl-9 sm:pl-10 pr-9 sm:pr-10 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleSearchClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleSearchSubmit}
          className="px-4 py-2.5 sm:py-3 rounded-xl bg-emerald-500 text-[#030712] font-mono font-bold uppercase tracking-widest text-[10px] sm:text-xs hover:bg-emerald-400 transition-colors shrink-0 flex items-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5" />
          Search
        </button>
      </div>

      {/* AI Match feedback */}
      {matchError === "no_listings" && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400 font-mono">
          Add listings first to get AI matches
        </div>
      )}
      {matchError && matchError !== "no_listings" && matchError !== "ai_tier_restricted" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400 font-mono">
          {matchError}
        </div>
      )}
      {matchedIds && matchedIds.size > 0 && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3 text-xs text-purple-400 font-mono">
          Found {matchedIds.size} AI-matched listing{matchedIds.size !== 1 ? "s" : ""} for you
        </div>
      )}
      {searchQuery && loaderData.listings.length > 0 && (
        <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl px-4 py-2 text-xs text-slate-400 font-mono">
          Showing {loaderData.listings.length} result{loaderData.listings.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
        </div>
      )}
      {matchedIds && matchedIds.size === 0 && (
        <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl px-4 py-3 text-xs text-slate-400 font-mono">
          No strong matches found — try adding more listings
        </div>
      )}

      {/* Category filter chips */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto md:flex-wrap md:overflow-x-visible pb-2 scrollbar-hide -mx-1 px-1">
        {CATEGORY_CHIPS.map((chip) => {
          const isActive = activeCategory === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => handleCategoryClick(chip.value)}
              className={`whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-mono uppercase tracking-wider sm:tracking-widest transition-all border ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-[#0F172A] text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-300"
              }`}
            >
              {chip.display}
            </button>
          );
        })}
      </div>

      {/* Onboarding empty-state card — shown only when user has no active listings */}
      {!loaderData.hasListings && (
        <div className="bg-[#0F172A] border border-emerald-500/20 rounded-2xl p-5 sm:p-7 animate-in slide-in-from-top-4 duration-500">
          <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-2">
            // Getting Started
          </span>
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tighter text-white mb-1">
            Welcome to NoZar
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed mb-6 max-w-prose">
            South Africa's barter platform. No money changes hands — swap what you have for what you need.
          </p>

          {/* 3-step barter loop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {(
              [
                {
                  step: "01",
                  label: "List an Item",
                  detail: "Post what you're offering and what you'd like in return.",
                },
                {
                  step: "02",
                  label: "Browse the Feed",
                  detail: "Discover assets nearby. Use AI Match to find the best fits.",
                },
                {
                  step: "03",
                  label: "Ping to Swap",
                  detail: "Send a swap offer. Chat, agree, and exchange — done.",
                },
              ] as const
            ).map(({ step, label, detail }) => (
              <div
                key={step}
                className="flex gap-3 bg-[#030712] border border-white/5 rounded-xl p-4"
              >
                <span className="font-mono text-[10px] text-emerald-500 uppercase tracking-widest shrink-0 pt-0.5">
                  {step}
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white mb-0.5">
                    {label}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            to="/dashboard/add"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 text-black text-[11px] font-mono font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors"
          >
            List Your First Item →
          </Link>
        </div>
      )}

      {/* Asset feed */}
      {loaderData.listings.length > 0 ? (
        <div data-testid="feed" className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loaderData.listings.map((listing) => (
            <div key={listing.id} className="relative">
              {matchedIds?.has(listing.id) && (
                <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 bg-purple-500 text-white text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg shadow-purple-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI Matched
                </div>
              )}
              <AssetCard
                listing={listing}
                youHaveMatch={listing.youHaveMatch}
                onClick={() => navigate(`/dashboard/asset/${listing.id}`)}
              />
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
            No assets found
            {searchQuery && (
              <> for <span className="font-mono text-slate-500">"{searchQuery}"</span></>
            )}
            {activeCategory !== "All" && (
              <> in <span className="font-mono text-slate-500">{activeCategory}</span></>
            )}
            {!searchQuery && activeCategory === "All" && (
              <> in this region</>
            )}
          </p>
        </div>
      )}

      {/* Footer action */}
      <div className="py-8 text-center">
        <button
          onClick={() =>
            setSearchParams(
              (prev) => {
                const newParams = new URLSearchParams(prev);
                newParams.set("radius", String(radiusKm + 5));
                return newParams;
              },
              { preventScrollReset: true },
            )
          }
          className="text-emerald-500 text-xs font-mono uppercase tracking-widest mt-2 hover:text-emerald-400 transition-colors flex items-center gap-1 mx-auto"
        >
          {radiusKm}km radius — Expand
        </button>
      </div>
    </div>
  );
}
