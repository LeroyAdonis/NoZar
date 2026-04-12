import { eq, and, isNotNull } from "drizzle-orm";
import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { NozarMap } from "~/components/map/nozar-map";
import { RegionToggle } from "~/components/ui/region-toggle";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { resolveRegion, MVP_REGIONS } from "~/lib/regions";
import type { RegionSlug } from "~/lib/regions";
import { listings, profiles } from "~/lib/schema";
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
    .select({ province: profiles.province })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const currentRegion = resolveRegion(regionParam, userProfile?.province);
  const regionConfig = MVP_REGIONS[currentRegion];

  const activeListings = await db
    .select({
      id: listings.id,
      lat: listings.lat,
      lng: listings.lng,
      title: listings.title,
      type: listings.type,
    })
    .from(listings)
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
      ...l,
      type: l.type as "item" | "service",
    }));

  return {
    listings: pins,
    apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
    regionCenter: regionConfig.center,
    currentRegion,
  };
}

export default function Map({ loaderData }: Route.ComponentProps) {
  const { listings: pins, apiKey, regionCenter, currentRegion } = loaderData;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [center, setCenter] = useState(regionCenter);
  const [radarCenter, setRadarCenter] = useState(regionCenter);
  // Default radius: 25 km — matches the active radar ring highlight
  const [radiusKm, setRadiusKm] = useState(25);
  const [isLocating, setIsLocating] = useState(false);

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

  const handleRecenter = useCallback(() => {
    setCenter({ ...regionCenter });
    setRadarCenter({ ...regionCenter });
  }, [regionCenter]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCenter(newCenter);
        setRadarCenter(newCenter);
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
        alert("Unable to retrieve your location");
      },
      { enableHighAccuracy: true },
    );
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

      {/* Floating recenter/location buttons */}
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="flex items-center gap-2 rounded-full bg-slate-800/90 px-4 py-2.5 text-sm font-medium text-emerald-400 shadow-lg ring-1 ring-emerald-500/30 backdrop-blur transition-all hover:bg-slate-700/90 disabled:opacity-50"
        >
          {isLocating ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {isLocating ? "Locating..." : "My Location"}
        </button>

        <button
          type="button"
          onClick={handleRecenter}
          className="flex items-center gap-2 rounded-full bg-slate-800/90 px-4 py-2 text-sm font-medium text-slate-100 shadow-lg ring-1 ring-slate-700 backdrop-blur transition-colors hover:bg-slate-700/90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.05 4.05a7 7 0 1 1 9.9 9.9L10 18.9l-4.95-4.95a7 7 0 0 1 0-9.9ZM10 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
              clipRule="evenodd"
            />
          </svg>
          Recenter
        </button>
      </div>

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
