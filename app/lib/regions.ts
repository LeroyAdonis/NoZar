// app/lib/regions.ts

export const MVP_REGIONS = {
  "cape-town": {
    label: "Cape Town",
    province: "Western Cape",
    center: { lat: -33.9249, lng: 18.4241 },
    emoji: "🏔️",
  },
  johannesburg: {
    label: "Johannesburg",
    province: "Gauteng",
    center: { lat: -26.2041, lng: 28.0473 },
    emoji: "🏙️",
  },
  durban: {
    label: "Durban",
    province: "KwaZulu-Natal",
    center: { lat: -29.8587, lng: 31.0218 },
    emoji: "🌊",
  },
} as const;

export type RegionSlug = keyof typeof MVP_REGIONS;

export const REGION_SLUGS = Object.keys(MVP_REGIONS) as RegionSlug[];

/** Map province name → region slug. Returns null if province is not an MVP region. */
export function provinceToSlug(province: string | null | undefined): RegionSlug | null {
  if (!province) return null;
  for (const [slug, config] of Object.entries(MVP_REGIONS)) {
    if (config.province === province) return slug as RegionSlug;
  }
  return null;
}

/** Resolve a region slug from URL param, falling back to user's province, then "johannesburg". */
export function resolveRegion(
  paramRegion: string | null,
  userProvince: string | null | undefined,
): RegionSlug {
  // Try URL param first
  if (paramRegion && paramRegion in MVP_REGIONS) {
    return paramRegion as RegionSlug;
  }
  // Fall back to user's province
  const fromProfile = provinceToSlug(userProvince);
  if (fromProfile) return fromProfile;
  // Default
  return "johannesburg";
}
