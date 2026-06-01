import { eq, sql } from "drizzle-orm";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { NozarMap } from "~/components/map/nozar-map";
import { ListingsNearbyModal } from "~/components/ui/listings-nearby-modal";
import { LocationPromptModal } from "~/components/ui/location-prompt-modal";
import { RegionToggle } from "~/components/ui/region-toggle";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { isWithinMapScope, type MapCoordinates, resolveMapScope } from "~/lib/map-scope";
import { MVP_REGIONS } from "~/lib/regions";
import type { RegionSlug } from "~/lib/regions";
import { listingImages, listings, profiles } from "~/lib/schema";
import { haversineKm } from "~/lib/utils";

import type { Route } from "./+types/map";

type SavedLocation = {
  suburb: string | null;
  city: string | null;
  province: string | null;
  lat: number;
  lng: number;
};

function formatLatitude(lat: number): string {
  return `${Math.abs(lat).toFixed(4)}°${lat < 0 ? "S" : "N"}`;
}

function formatLongitude(lng: number): string {
  return `${Math.abs(lng).toFixed(4)}°${lng < 0 ? "W" : "E"}`;
}

function getSavedLocationLabel(savedLocation: SavedLocation, currentRegion: RegionSlug): string {
  const locationParts = [savedLocation.suburb, savedLocation.city, savedLocation.province].filter(
    Boolean,
  );

  if (locationParts.length > 0) {
    return locationParts.join(", ");
  }

  return `Near ${MVP_REGIONS[currentRegion].label}`;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Map — NoZar" },
    { name: "description", content: "Find swaps near your saved radar location" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const url = new URL(request.url);
  const regionParam = url.searchParams.get("region");

  const [userProfile] = await db
    .select({
      suburb: profiles.suburb,
      city: profiles.city,
      province: profiles.province,
      lat: profiles.lat,
      lng: profiles.lng,
      searchRadiusKm: profiles.searchRadiusKm,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const mapScope = resolveMapScope({
    regionParam,
    profileLat: userProfile?.lat,
    profileLng: userProfile?.lng,
    profileProvince: userProfile?.province,
    profileSearchRadiusKm: userProfile?.searchRadiusKm,
  });

  const savedLocation =
    userProfile?.lat != null && userProfile?.lng != null
      ? {
          suburb: userProfile.suburb,
          city: userProfile.city,
          province: userProfile.province,
          lat: userProfile.lat,
          lng: userProfile.lng,
        }
      : null;

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
      ownerProvince: profiles.province,
    })
    .from(listings)
    .innerJoin(profiles, eq(listings.userId, profiles.userId))
    .where(eq(listings.status, "active"));

  // ─── Province centers for fallback when a listing has no coords ───
  const PROVINCE_CENTERS: Record<string, { lat: number; lng: number }> = {
    "Western Cape": { lat: -33.9249, lng: 18.4241 },
    "Gauteng": { lat: -26.2041, lng: 28.0473 },
    "KwaZulu-Natal": { lat: -29.8587, lng: 31.0218 },
    "Eastern Cape": { lat: -33.957, lng: 25.6 },
    "Free State": { lat: -29.1, lng: 26.3 },
    "Limpopo": { lat: -23.9, lng: 29.5 },
    "Mpumalanga": { lat: -25.5, lng: 30.5 },
    "North West": { lat: -25.5, lng: 25.7 },
    "Northern Cape": { lat: -29.5, lng: 22.5 },
  };
  function listingLocation(listing: typeof activeListings[number]): { lat: number; lng: number } {
    if (listing.lat != null && listing.lng != null) return { lat: listing.lat, lng: listing.lng };
    const center = listing.ownerProvince ? PROVINCE_CENTERS[listing.ownerProvince] : null;
    if (center) return center;
    return { lat: -26.2041, lng: 28.0473 }; // fallback to JHB
  }

  const pins = activeListings
    .filter((listing) => {
      const loc = listingLocation(listing);
      return isWithinMapScope(loc, mapScope.center, mapScope.searchRadiusKm);
    })
    .map((listing) => {
      const loc = listingLocation(listing);
      return {
        id: listing.id,
        lat: loc.lat,
        lng: loc.lng,
        title: listing.title,
        type: listing.type as "item" | "service",
        description: listing.description,
        imageUrl: listing.imageUrl,
        user: {
          id: listing.userId,
          name: listing.userName,
          avatarUrl: listing.userAvatar,
        },
      };
    });

  return {
    apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
    currentRegion: mapScope.currentRegion,
    listings: pins,
    mapCenter: mapScope.center,
    savedLocation,
    searchRadiusKm: mapScope.searchRadiusKm,
    usesFallbackLocation: mapScope.usesFallbackLocation,
    _debug: {
      pinsCount: activeListings.length,
      region: mapScope.currentRegion,
      center: mapScope.center,
      radius: mapScope.searchRadiusKm,
      fallback: mapScope.usesFallbackLocation,
      hasSavedCoords: userProfile?.lat != null && userProfile?.lng != null,
    },
  };
}

export default function Map({ loaderData }: Route.ComponentProps) {
  const {
    apiKey,
    currentRegion,
    listings: pins,
    mapCenter,
    savedLocation,
    searchRadiusKm,
    usesFallbackLocation,
  } = loaderData;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [displayCenter, setDisplayCenter] = useState<MapCoordinates>(mapCenter);
  const [radiusKm, setRadiusKm] = useState(searchRadiusKm);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [showListingsModal, setShowListingsModal] = useState(false);
  const regionParam = searchParams.get("region");

  useEffect(() => {
    setDisplayCenter(mapCenter);
    setRadiusKm(searchRadiusKm);
  }, [mapCenter, searchRadiusKm]);

  useEffect(() => {
    if (!usesFallbackLocation && regionParam) {
      setSearchParams({}, { preventScrollReset: true, replace: true });
    }
  }, [regionParam, setSearchParams, usesFallbackLocation]);

  const radarCenter = usesFallbackLocation ? displayCenter : mapCenter;
  const filteredPins = useMemo(
    () =>
      pins.filter(
        (pin) => haversineKm(radarCenter.lat, radarCenter.lng, pin.lat, pin.lng) <= radiusKm,
      ),
    [pins, radarCenter.lat, radarCenter.lng, radiusKm],
  );

  const handlePinClick = useCallback(
    (id: number) => {
      void navigate(`/dashboard/asset/${id}`);
    },
    [navigate],
  );

  const handleMapLocationClick = useCallback(() => {
    setShowLocationPrompt(true);
  }, []);

  function handleRegionChange(slug: RegionSlug) {
    if (!usesFallbackLocation) {
      return;
    }

    const newRegion = MVP_REGIONS[slug];
    setSearchParams({ region: slug }, { preventScrollReset: true });
    setDisplayCenter(newRegion.center);
  }

  if (!apiKey) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center">
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-8 text-center">
          <div className="mb-3 text-4xl">🗺️</div>
          <h2 className="text-lg font-semibold text-slate-100">Map unavailable</h2>
          <p className="mt-1 text-sm text-slate-400">
            Google Maps API key is not configured. Contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  const savedLocationLabel = savedLocation
    ? getSavedLocationLabel(savedLocation, currentRegion)
    : `${MVP_REGIONS[currentRegion].label} preview`;
  const coordinateLabel = savedLocation
    ? `${formatLatitude(savedLocation.lat)} · ${formatLongitude(savedLocation.lng)}`
    : null;
  const localRadiusDescription = usesFallbackLocation
    ? "Adjust the preview radius for this page only. Save your location to lock the map to your real area."
    : "Adjusting radius here only changes this map view. Your saved centre stays fixed until you update your profile or save a new device location.";

  return (
    <div className="space-y-4">
      <div className="pt-2">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-emerald-500">
          // Local Radar
        </span>
        <h2 className="text-xl font-bold uppercase tracking-tight text-white">Map</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          NoZar stays hyper-local. Nearby listings are scoped from your saved radar centre, and
          only the radius changes locally on this page.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-white/10 bg-[#0F172A] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2 min-w-0">
              <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">
                {usesFallbackLocation ? "// Region preview" : "// Saved radar centre"}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">{savedLocationLabel}</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {usesFallbackLocation
                  ? "You have not saved coordinates yet, so the map stays in MVP preview mode. Pick a region to browse nearby listings, then save your current location to anchor the radar."
                  : "Your search centre is anchored to the coordinates saved on your profile. Pan and zoom freely, but only a persisted profile/location update can move the actual radar centre."}
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold shrink-0 ${
                usesFallbackLocation
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {usesFallbackLocation ? "Preview only" : "Profile anchored"}
            </span>
          </div>

          {usesFallbackLocation ? (
            <div className="mt-4 w-fit">
              <RegionToggle activeRegion={currentRegion} onChange={handleRegionChange} />
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
              {coordinateLabel ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  {coordinateLabel}
                </span>
              ) : null}
              {savedLocation?.province ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  {savedLocation.province}
                </span>
              ) : null}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleMapLocationClick}
              className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#030712] transition-colors hover:bg-emerald-400"
            >
              {usesFallbackLocation ? "Save current location" : "Refresh saved location"}
            </button>
            {!usesFallbackLocation ? (
              <Link
                to="/dashboard/profile"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Update in profile
              </Link>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0F172A] p-4 sm:p-5">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-slate-400">
            // Active radius
          </span>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-4xl font-black tracking-tight text-white">{radiusKm}</span>
            <span className="pb-1 text-sm font-semibold uppercase tracking-widest text-emerald-300">
              km
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{localRadiusDescription}</p>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
              <span className="text-xs font-medium text-slate-400">Listings in range</span>
              <span className="text-sm font-bold text-white">{filteredPins.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
              <span className="text-xs font-medium text-slate-400">Discovery mode</span>
              <span className="text-sm font-bold text-emerald-300">Hyper-local only</span>
            </div>
          </div>
        </section>
      </div>

      <div className="relative -mx-1 overflow-hidden rounded-3xl border border-white/10 bg-[#020617] md:mx-0">
        <div className="relative h-[65dvh] min-h-[26rem]">
          <NozarMap
            apiKey={apiKey}
            center={radarCenter}
            onPinClick={handlePinClick}
            onRadiusChange={setRadiusKm}
            pins={filteredPins}
            radarCenter={radarCenter}
            radarRadiusKm={radiusKm}
            zoom={12}
          />

          {/* Top info card — full-width on mobile, constrained on sm+ */}
          <div className="absolute left-3 right-3 top-3 z-10 rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-lg backdrop-blur sm:left-6 sm:top-6 sm:right-auto sm:max-w-xs">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
              {usesFallbackLocation ? "Region preview" : "Locked to saved centre"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {usesFallbackLocation
                ? `Exploring ${MVP_REGIONS[currentRegion].label} within ${radiusKm}km`
                : `Searching within ${radiusKm}km of your saved radar location`}
            </p>
            <p className="mt-1 hidden text-xs leading-relaxed text-slate-400 sm:block">
              {usesFallbackLocation
                ? "Save your current location to turn this into a profile-anchored search."
                : "Moving the map does not change the actual search centre. Save a new location first."}
            </p>
            {/* Debug info - always visible for troubleshooting */}
            <details className="mt-2 rounded-lg border border-white/5 bg-white/5 p-2 text-[10px] font-mono text-slate-500">
              <summary className="cursor-pointer text-white/60 hover:text-white/90">🔍 Debug</summary>
              <p>Listings: {pins.length} | Filtered: {filteredPins.length}</p>
              <p>Region: {currentRegion}</p>
              <p>Center: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}</p>
              <p>Radius: {searchRadiusKm}km | Saved coords: {savedLocation ? "yes" : "no"}</p>
              {savedLocation && <p>Saved: {savedLocation.lat.toFixed(4)}, {savedLocation.lng.toFixed(4)}</p>}
            </details>
          </div>

          {/* FAB — bottom-right, icon-only on mobile */}
          <div className="absolute bottom-4 right-4 z-10 sm:bottom-6 sm:right-6">
            <button
              type="button"
              onClick={handleMapLocationClick}
              className="flex items-center gap-2 rounded-full bg-slate-800/90 px-3 py-3 text-sm font-bold text-emerald-400 shadow-xl ring-1 ring-emerald-500/50 backdrop-blur transition-all hover:bg-slate-700/90 hover:scale-105 active:scale-95 sm:px-5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="7" />
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
              </svg>
              <span className="hidden sm:inline">
                {usesFallbackLocation ? "SAVE LOCATION" : "UPDATE LOCATION"}
              </span>
            </button>
          </div>

          {/* Listings count / no-listings — below info card on mobile, top-right on sm+ */}
          {filteredPins.length === 0 ? (
            <div className="absolute bottom-20 left-3 right-3 z-10 rounded-2xl border border-white/10 bg-[#0F172A]/90 px-4 py-3 shadow-lg backdrop-blur sm:bottom-auto sm:left-auto sm:right-6 sm:top-28 sm:max-w-xs">
              <p className="text-sm font-semibold text-slate-100">No listings within {radiusKm}km</p>
              <p className="mt-1 text-xs text-slate-400">
                Try a larger local radius or add your own listing to start the neighbourhood loop.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowListingsModal(true)}
              className="absolute bottom-20 right-4 z-10 rounded-full border border-white/10 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-300 shadow-lg backdrop-blur transition-all hover:bg-slate-800/90 hover:text-white active:scale-95 sm:bottom-auto sm:right-6 sm:top-28"
            >
              {filteredPins.length} {filteredPins.length === 1 ? "listing" : "listings"} in range
            </button>
          )}
        </div>
      </div>

      <LocationPromptModal
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onSuccess={() => setShowLocationPrompt(false)}
        variant={usesFallbackLocation ? "setup" : "refresh"}
      />

      <ListingsNearbyModal
        isOpen={showListingsModal}
        onClose={() => setShowListingsModal(false)}
        pins={filteredPins}
        radarCenter={radarCenter}
        radiusKm={radiusKm}
      />
    </div>
  );
}
