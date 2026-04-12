import { eq, and, isNotNull, sql } from "drizzle-orm";
import { useCallback, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { NozarMap } from "~/components/map/nozar-map";
import { LocationPromptModal } from "~/components/ui/location-prompt-modal";
import { RegionToggle } from "~/components/ui/region-toggle";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { resolveRegion, MVP_REGIONS } from "~/lib/regions";
import type { RegionSlug } from "~/lib/regions";
import { listings, profiles, listingImages } from "~/lib/schema";
import { haversineKm } from "~/lib/utils";

import type { Route } from "./+types/map";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Map — Nozar" },
    { name: "description", content: "Find swaps near you on the map" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const url = new URL(request.url);
  const regionParam = url.searchParams.get("region");

  const [userProfile] = await db
    .select({ 
      province: profiles.province,
      lat: profiles.lat,
      lng: profiles.lng,
      searchRadiusKm: profiles.searchRadiusKm,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const currentRegion = resolveRegion(regionParam, userProfile?.province);
  const regionConfig = MVP_REGIONS[currentRegion];

  // Use profile coordinates if available, otherwise fall back to region center
  const userCenter = (userProfile?.lat && userProfile?.lng) 
    ? { lat: userProfile.lat, lng: userProfile.lng }
    : regionConfig.center;

  const activeListings = await db
    .select({
      id: listings.id,
      lat: listings.lat,
      lng: listings.lng,
      title: listings.title,
      type: listings.type,
      description: listings.description,
      imageUrl: sql<string | null>`(SELECT url FROM ${listingImages} WHERE ${listingImages.listingId} = ${listings.id} LIMIT 1)`,
      userId: profiles.userId,
      userName: profiles.displayName,
      userAvatar: profiles.avatarUrl,
    })
    .from(listings)
    .innerJoin(profiles, eq(listings.userId, profiles.userId))
    .where(
      and(
        eq(listings.status, "active"),
        isNotNull(listings.lat),
        isNotNull(listings.lng),
      ),
    );

  const pins = activeListings
    .filter(
      (l): l is typeof l & { lat: number; lng: number } =>
        l.lat !== null && l.lng !== null,
    )
    .map((l) => ({
      id: l.id,
      lat: l.lat,
      lng: l.lng,
      title: l.title,
      type: l.type as "item" | "service",
      description: l.description,
      imageUrl: l.imageUrl,
      user: {
        id: l.userId,
        name: l.userName,
        avatarUrl: l.userAvatar,
      },
    }));

  return {
    listings: pins,
    apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
    regionCenter: userCenter,
    searchRadiusKm: userProfile?.searchRadiusKm ?? 25,
    currentRegion,
  };
}

export default function Map({ loaderData }: Route.ComponentProps) {
  const { listings: pins, apiKey, regionCenter, searchRadiusKm, currentRegion } = loaderData;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [center, setCenter] = useState<{ lat: number; lng: number }>(regionCenter);
  const [radarCenter, setRadarCenter] = useState<{ lat: number; lng: number }>(regionCenter);
  // Default radius from profile
  const [radiusKm, setRadiusKm] = useState(searchRadiusKm);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  // Keep map state in sync with profile updates from the modal
  useEffect(() => {
    setCenter(regionCenter);
    setRadarCenter(regionCenter);
    setRadiusKm(searchRadiusKm);
  }, [regionCenter, searchRadiusKm]);

  // Filter pins to those within the active radar radius of the radar centre.
  const filteredPins = pins.filter(
    (pin) => haversineKm(radarCenter.lat, radarCenter.lng, pin.lat, pin.lng) <= radiusKm,
  );

  const handlePinClick = useCallback(
    (id: number) => {
      void navigate(`/dashboard/asset/${id}`);
    },
    [navigate],
  );

  const handleRadarClick = useCallback(() => {
    setShowLocationPrompt(true);
  }, []);

  function handleRegionChange(slug: RegionSlug) {
    const newRegion = MVP_REGIONS[slug];
    setSearchParams({ region: slug }, { preventScrollReset: true });
    setCenter(newRegion.center);
    setRadarCenter(newRegion.center);
  }

  if (!apiKey) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center">
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-8 text-center">
          <div className="mb-3 text-4xl">🗺️</div>
          <h2 className="text-lg font-semibold text-slate-100">
            Map unavailable
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Google Maps API key is not configured. Contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative -m-4 h-[65dvh] min-h-[24rem] md:-m-6 md:h-[70dvh]">
      {/* Region toggle */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
        <RegionToggle activeRegion={currentRegion} onChange={handleRegionChange} />
      </div>

      <NozarMap
        apiKey={apiKey}
        pins={filteredPins}
        center={center}
        zoom={12}
        onPinClick={handlePinClick}
        radarCenter={radarCenter}
        radarRadiusKm={radiusKm}
        onRadiusChange={setRadiusKm}
      />

      {/* Floating radar button */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleRadarClick}
          className="flex items-center gap-2 rounded-full bg-slate-800/90 px-5 py-3 text-sm font-bold text-emerald-400 shadow-xl ring-1 ring-emerald-500/50 backdrop-blur transition-all hover:bg-slate-700/90 hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
          </svg>
          START RADAR
        </button>
      </div>

      <LocationPromptModal
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onSuccess={() => {
          setShowLocationPrompt(false);
          // The page will revalidate and update coordinates via the dashboard action
        }}
      />

      {/* Listings count badge — reflects active radar filter */}
      {filteredPins.length > 0 && (
        <div className="absolute left-6 top-24 z-10 rounded-full bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-300 shadow-lg ring-1 ring-slate-700 backdrop-blur">
          {filteredPins.length} {filteredPins.length === 1 ? "listing" : "listings"} within {radiusKm}km
        </div>
      )}

      {filteredPins.length === 0 && (
        <div className="absolute left-6 top-24 z-10 rounded-2xl border border-white/10 bg-[#0F172A]/90 px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-sm font-semibold text-slate-100">No listings within {radiusKm}km</p>
          <p className="mt-1 text-xs text-slate-400">
            Try expanding the radius or add your own listing to get started.
          </p>
        </div>
      )}
    </div>
  );
}
