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

export type SubInfo = {
  planCode?: string | null;
  status?: string | null;
  promoExpiresAt?: Date | null;
};

export function normalizeTierCode(planCode: string | null | undefined): TierCode {
  const code = (planCode ?? "free") as TierCode;
  return code in LISTING_LIMITS ? code : "free";
}

export function listingLimitFor(planCode: string | null | undefined): number {
  return LISTING_LIMITS[normalizeTierCode(planCode)];
}

/**
 * Resolves the effective tier for a user given their raw subscription row.
 * - status "active"  → use planCode (paid subscription)
 * - status "promo" AND promoExpiresAt in the future → "plus"
 * - anything else (no row, expired, cancelled) → "free"
 */
export function getEffectivePlanCode(sub?: SubInfo | null): TierCode {
  if (!sub) return "free";
  if (sub.status === "active") return normalizeTierCode(sub.planCode);
  if (
    sub.status === "promo" &&
    sub.promoExpiresAt &&
    sub.promoExpiresAt > new Date()
  ) {
    return "plus";
  }
  return "free";
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

/**
 * AI features that are behind a paywall.
 * Features NOT in this map are free for everyone (e.g. Fraud Shield, Fair Trade badge).
 *
 * Safety features stay free — that's the NoZar community-first philosophy.
 * AI convenience/power features are the upgrade value.
 */
export const AI_FEATURE_TIERS = {
  ai_description:        ["plus", "business", "enterprise"],
  ai_matching:           ["plus", "business", "enterprise"],
  ai_listing_from_photo: ["plus", "business", "enterprise"],
  personalized_feed:     ["plus", "business", "enterprise"],
  ai_chat:               ["free", "plus", "business", "enterprise"],  // Fraud Shield deep analysis — free for everyone
} satisfies Record<string, TierCode[]>;

export type AiFeature = keyof typeof AI_FEATURE_TIERS;

/**
 * Returns true if the given plan tier can access the named AI feature.
 * The AI meetup spot suggester is intentionally NOT in this map — it is open to all tiers.
 */
export function canUseAiFeature(
  planCode: string | null | undefined,
  feature: AiFeature,
): boolean {
  const tier = normalizeTierCode(planCode);
  return (AI_FEATURE_TIERS[feature] as TierCode[]).includes(tier);
}
