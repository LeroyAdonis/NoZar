import { getClosestRegion, MVP_REGIONS, resolveRegion, type RegionSlug } from "~/lib/regions";
import { haversineKm } from "~/lib/utils";

type NullableNumber = number | null | undefined;

export type MapCoordinates = {
  lat: number;
  lng: number;
};

export type MapScope = {
  center: MapCoordinates;
  currentRegion: RegionSlug;
  searchRadiusKm: number;
  usesFallbackLocation: boolean;
  fallbackProvince: string;
};

export const DEFAULT_MAP_SEARCH_RADIUS_KM = 50;

function hasSavedCoordinates(lat: NullableNumber, lng: NullableNumber): boolean {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
}

function normalizeSearchRadiusKm(searchRadiusKm: NullableNumber): number {
  if (
    searchRadiusKm != null &&
    Number.isFinite(searchRadiusKm) &&
    searchRadiusKm > 0
  ) {
    return Math.round(searchRadiusKm);
  }

  return DEFAULT_MAP_SEARCH_RADIUS_KM;
}

export function resolveMapScope(args: {
  regionParam: string | null;
  profileLat: NullableNumber;
  profileLng: NullableNumber;
  profileProvince: string | null | undefined;
  profileSearchRadiusKm: NullableNumber;
}): MapScope {
  const usesFallbackLocation = !hasSavedCoordinates(args.profileLat, args.profileLng);

  const currentRegion = usesFallbackLocation
    ? resolveRegion(args.regionParam, args.profileProvince)
    : getClosestRegion(args.profileLat as number, args.profileLng as number);

  return {
    center: usesFallbackLocation
      ? MVP_REGIONS[currentRegion].center
      : {
          lat: Number(args.profileLat),
          lng: Number(args.profileLng),
        },
    currentRegion,
    searchRadiusKm: normalizeSearchRadiusKm(args.profileSearchRadiusKm),
    usesFallbackLocation,
    fallbackProvince: MVP_REGIONS[currentRegion].province,
  };
}

export function isWithinMapScope(
  listing: MapCoordinates,
  center: MapCoordinates,
  radiusKm: number,
): boolean {
  return haversineKm(center.lat, center.lng, listing.lat, listing.lng) <= radiusKm;
}
