export const LISTING_LIMITS = {
  free: 5,
  plus: 20,
  business: 100,
  enterprise: Number.POSITIVE_INFINITY,
} as const;

export type TierCode = keyof typeof LISTING_LIMITS;

export type ListingUsage = {
  planCode: TierCode;
  listingLimit: number;
  activeCount: number;
  atLimit: boolean;
  overLimit: boolean;
  remaining: number;
};

export function normalizeTierCode(planCode: string | null | undefined): TierCode {
  const code = (planCode ?? "free") as TierCode;
  return code in LISTING_LIMITS ? code : "free";
}

export function listingLimitFor(planCode: string | null | undefined): number {
  return LISTING_LIMITS[normalizeTierCode(planCode)];
}
