import { useNavigate, useSearchParams, useFetcher } from "react-router";
import { eq, ne, and, desc, inArray } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Sparkles } from "lucide-react";
import type { Route } from "./+types/home";
import type { ListingCard } from "~/lib/types";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { listings, listingImages, profiles, users } from "~/lib/schema";
import { timeAgo, haversineKm, formatDistance } from "~/lib/utils";
import { resolveRegion, MVP_REGIONS, provinceToSlug, type RegionSlug } from "~/lib/regions";
import { RegionToggle } from "~/components/ui/region-toggle";
import { AssetCard } from "~/components/ui/asset-card";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard — Nozar" },
    { name: "description", content: "Your Nozar dashboard" },
  ];
}

const CATEGORIES = ["All", "Electronics", "Furniture", "Service", "Vehicles"];

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

  // Fetch user's province for region resolution
  const [userProfile] = await db
    .select({ lat: profiles.lat, lng: profiles.lng, province: profiles.province })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const currentRegion = resolveRegion(regionParam, userProfile?.province);
  const regionConfig = MVP_REGIONS[currentRegion];

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
      ),
    )
    .orderBy(desc(listings.createdAt))
    .limit(20);

  // Fetch first images for listings
  const listingIds = rows.map((r) => r.id);
  const images = listingIds.length > 0
    ? await db
        .select({ listingId: listingImages.listingId, url: listingImages.url })
        .from(listingImages)
        .where(inArray(listingImages.listingId, listingIds))
        .orderBy(listingImages.order)
    : [];

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
          : "Nearby",
      timeAgo: timeAgo(new Date(r.createdAt)),
      userName: r.userName,
      isVerified: r.isVerified,
      imageUrl: imageMap.get(r.id) ?? null,
    }));

  return { listings: items, currentRegion, needsRegion: !userProfile?.province || !provinceToSlug(userProfile.province) };
}

// ─── Action (AI Match) ─────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "aiMatch") {
    return { error: "Unknown intent" };
  }

  const { user } = await requireAuth(request);

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

  // Build the Gemini prompt
  const userProfile = userListings
    .map(
      (l) =>
        `- Has: "${l.title}" (${l.category}) — ${l.description}` +
        (l.seekingDescription ? ` | Seeking: ${l.seekingDescription}` : ""),
    )
    .join("\n");

  const availableListings = otherListings
    .map(
      (l) =>
        `ID:${l.id} "${l.title}" (${l.category}, ${l.type}) — ${l.description}` +
        (l.seekingDescription ? ` | Seeking: ${l.seekingDescription}` : ""),
    )
    .join("\n");

  const prompt = `You are a trade matching assistant for a South African barter platform called Nozar.

A user has the following items/services available for trade:
${userProfile}

Here are listings from other users:
${availableListings}

Rank the above listings by how well they match what this user is seeking, and how well the user's items match what those listings are seeking. Consider category relevance, complementary needs, and value alignment.

Return ONLY a JSON array of listing IDs in order from best match to worst match. Include only IDs with a reasonable match quality (at least somewhat relevant). Return at most 10 IDs.

Example response: [5, 12, 3]

Return ONLY the JSON array, no explanation.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
      return { error: "AI matching is not configured" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse the JSON array from Gemini's response
    // Strip markdown code fences if present
    const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
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
  } catch {
    return { error: "AI matching unavailable — try again later" };
  }
}

// ─── Component ─────────────────────────────────────────────────

export default function DashboardHome({
  loaderData,
}: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "All";
  const radiusKm = Number(searchParams.get("radius") ?? "10");
  const fetcher = useFetcher<typeof action>();
  const { currentRegion } = loaderData;

  function handleRegionChange(slug: RegionSlug) {
    const params = new URLSearchParams(searchParams);
    params.set("region", slug);
    params.delete("category");
    setSearchParams(params, { preventScrollReset: true });
  }

  const isMatching = fetcher.state !== "idle";
  const matchData = fetcher.data;
  const matchedIds = matchData && "matchedIds" in matchData ? new Set(matchData.matchedIds) : null;
  const matchError = matchData && "error" in matchData ? matchData.error : null;

  function handleCategoryClick(category: string) {
    setSearchParams(
      category === "All" ? {} : { category },
      { preventScrollReset: true },
    );
  }

  return (
    <div className="space-y-6">
      {isMatching && <LoadingBar />}
      {/* Region toggle */}
      <div className="flex justify-center pt-2">
        <RegionToggle activeRegion={currentRegion} onChange={handleRegionChange} />
      </div>

      {/* Section header */}
      <div className="flex justify-between items-end">
        <div>
          <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1">
            // Local Index
          </span>
          <h2 className="text-xl font-bold uppercase tracking-tight">
            Nearby Assets
          </h2>
        </div>

        {/* AI Match button */}
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
      </div>

      {/* AI Match feedback */}
      {matchError === "no_listings" && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400 font-mono">
          Add listings first to get AI matches
        </div>
      )}
      {matchError && matchError !== "no_listings" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400 font-mono">
          {matchError}
        </div>
      )}
      {matchedIds && matchedIds.size > 0 && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3 text-xs text-purple-400 font-mono">
          Found {matchedIds.size} AI-matched listing{matchedIds.size !== 1 ? "s" : ""} for you
        </div>
      )}
      {matchedIds && matchedIds.size === 0 && (
        <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl px-4 py-3 text-xs text-slate-400 font-mono">
          No strong matches found — try adding more listings
        </div>
      )}

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto md:flex-wrap md:overflow-x-visible pb-2 scrollbar-hide -mx-1 px-1">
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-mono uppercase tracking-widest transition-all border ${
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

      {/* Asset feed */}
      {loaderData.listings.length > 0 ? (
        <div data-testid="feed" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            No assets found in this region
            {activeCategory !== "All" && (
              <> under <span className="font-mono text-slate-500">{activeCategory}</span></>
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
