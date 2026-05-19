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

/**
 * Master switch for business-tier products.
 * MVP launches with individual ("For people") tiers only; flip to `true`
 * when Business + Enterprise are ready to ship.
 *
 * Surfaces that read this flag:
 *  - app/components/landing/pricing-section.tsx (Business + Enterprise cards)
 *  - app/routes/landing.tsx (For businesses card in dual-economy section)
 *  - app/components/landing/faq-section.tsx (Q8)
 *  - app/routes/dashboard/billing.tsx (Business tier card)
 */
export const BUSINESS_PRODUCTS_LIVE = false;
