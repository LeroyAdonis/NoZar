import { eq, and, isNotNull } from "drizzle-orm";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

import { NozarMap } from "~/components/map/nozar-map";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { listings } from "~/lib/schema";

import type { Route } from "./+types/map";

// Default center: Johannesburg CBD
const JHB_CENTER = { lat: -26.2041, lng: 28.0473 };

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Map — Nozar" },
    { name: "description", content: "Find swaps near you on the map" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuth(request);

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

  // Filter out any rows where lat/lng resolved to null at runtime
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
  };
}

export default function Map({ loaderData }: Route.ComponentProps) {
  const { listings: pins, apiKey } = loaderData;
  const navigate = useNavigate();
  const [center, setCenter] = useState(JHB_CENTER);

  const handlePinClick = useCallback(
    (id: number) => {
      void navigate(`/dashboard/asset/${id}`);
    },
    [navigate],
  );

  const handleRecenter = useCallback(() => {
    setCenter({ ...JHB_CENTER });
  }, []);

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center">
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
    <div className="relative -m-4 h-[calc(100%+2rem)] md:-m-6 md:h-[calc(100%+3rem)]">
      <NozarMap
        apiKey={apiKey}
        pins={pins}
        center={center}
        zoom={12}
        onPinClick={handlePinClick}
      />

      {/* Floating recenter button */}
      <button
        type="button"
        onClick={handleRecenter}
        className="absolute bottom-6 right-6 z-10 flex items-center gap-2 rounded-full bg-slate-800/90 px-4 py-2 text-sm font-medium text-slate-100 shadow-lg ring-1 ring-slate-700 backdrop-blur transition-colors hover:bg-slate-700/90"
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

      {/* Listings count badge */}
      {pins.length > 0 && (
        <div className="absolute left-6 top-6 z-10 rounded-full bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-300 shadow-lg ring-1 ring-slate-700 backdrop-blur">
          {pins.length} {pins.length === 1 ? "listing" : "listings"} nearby
        </div>
      )}
    </div>
  );
}
