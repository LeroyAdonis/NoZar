import { eq } from "drizzle-orm";
import { db } from "./db.server";
import { subscriptions } from "./schema";
import { getEffectivePlanCode, type TierCode } from "./tier-limits";

export type PromoInfo = {
  isPromo: boolean;
  promoExpiresAt: Date | null;
  /** Days remaining in promo (0 if not promo or expired) */
  daysRemaining: number;
  effectivePlanCode: TierCode;
};

const PROMO_DURATION_DAYS = 90;

/**
 * Idempotent: enrolls a user in the 90-day promo if they have no subscription row.
 * Safe to call on every dashboard load — returns cached data if already enrolled.
 */
export async function ensurePromoEnrolled(userId: string): Promise<PromoInfo> {
  const [existing] = await db
    .select({
      status: subscriptions.status,
      planCode: subscriptions.planCode,
      promoExpiresAt: subscriptions.promoExpiresAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!existing) {
    const promoExpiresAt = new Date();
    promoExpiresAt.setDate(promoExpiresAt.getDate() + PROMO_DURATION_DAYS);

    await db.insert(subscriptions).values({
      userId,
      planCode: "plus",
      status: "promo",
      promoExpiresAt,
    });

    return {
      isPromo: true,
      promoExpiresAt,
      daysRemaining: PROMO_DURATION_DAYS,
      effectivePlanCode: "plus",
    };
  }

  const isPromo = existing.status === "promo";
  const promoExpiresAt = existing.promoExpiresAt ?? null;
  const now = new Date();
  const daysRemaining =
    isPromo && promoExpiresAt
      ? Math.max(0, Math.ceil((promoExpiresAt.getTime() - now.getTime()) / 86_400_000))
      : 0;

  const effectivePlanCode = getEffectivePlanCode(existing);

  return { isPromo, promoExpiresAt, daysRemaining, effectivePlanCode };
}
