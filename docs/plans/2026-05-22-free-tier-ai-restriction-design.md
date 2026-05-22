# Free-Tier AI Restriction Design

**Date:** 2026-05-22  
**Status:** Approved  
**Author:** Brainstorming session

---

## Context

NoZar uses NVIDIA AI (via `app/lib/ai.server.ts` → `nvidia.server.ts`) in multiple product surfaces. The current codebase applies no tier-based gating — all authenticated users can invoke AI regardless of subscription tier.

**Goal:** Restrict all AI features to `plus` / `business` / `enterprise` tiers. The single exception is the **AI meetup spot suggester** (`pings.$id.tsx` → `generate_meetup_spots` intent), which remains open to all tiers as a trust/safety feature.

---

## AI Feature Inventory

| Feature | File | Restrict free tier? |
|---|---|---|
| AI Description Generator | `app/routes/dashboard/add.tsx` | ✅ Yes |
| AI Smart Matching (Radar) | `app/routes/dashboard/home.tsx` | ✅ Yes |
| AI Chat Assistant | `app/routes/api.chat.ts` + `chat.$tradeId.tsx` | ✅ Yes |
| AI Meetup Spot Suggestions | `app/routes/dashboard/pings.$id.tsx` | ❌ No — open to all |

---

## Approach: Central `canUseAiFeature()` Helper

All tier policy lives in `app/lib/tier-limits.ts` — the existing home for listing limits and `BUSINESS_PRODUCTS_LIVE`. We extend it with an AI feature access map and a helper.

### 1. `app/lib/tier-limits.ts` changes

```ts
export const AI_FEATURE_TIERS = {
  ai_description: ["plus", "business", "enterprise"],
  ai_matching:    ["plus", "business", "enterprise"],
  ai_chat:        ["plus", "business", "enterprise"],
} satisfies Record<string, TierCode[]>;

export type AiFeature = keyof typeof AI_FEATURE_TIERS;

export function canUseAiFeature(
  planCode: string | null | undefined,
  feature: AiFeature,
): boolean {
  const tier = normalizeTierCode(planCode);
  return (AI_FEATURE_TIERS[feature] as TierCode[]).includes(tier);
}
```

### 2. `app/lib/tier-limits.server.ts` changes

Add a lightweight helper for routes that don't already load `ListingUsage`:

```ts
export async function getUserTier(userId: string): Promise<TierCode> {
  const [sub] = await db
    .select({ planCode: subscriptions.planCode })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return normalizeTierCode(sub?.planCode);
}
```

---

## Server-Side Enforcement

Each restricted action returns a sentinel error string `"ai_tier_restricted"` before calling any AI function.

### `app/routes/dashboard/add.tsx` — `aiDescription` intent
```ts
// Uses existing `usage.planCode` from getListingUsage call above it
if (!canUseAiFeature(usage.planCode, "ai_description")) {
  return { aiError: "ai_tier_restricted" };
}
```

### `app/routes/dashboard/home.tsx` — AI matching action
```ts
// Fetch tier at the top of the action
const tier = await getUserTier(user.id);
if (!canUseAiFeature(tier, "ai_matching")) {
  return { error: "ai_tier_restricted" };
}
```

### `app/routes/api.chat.ts` — AI chat action
```ts
const tier = await getUserTier(user.id);
if (!canUseAiFeature(tier, "ai_chat")) {
  return new Response(
    JSON.stringify({ error: "ai_tier_restricted" }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}
```

### `app/routes/dashboard/pings.$id.tsx`
No changes. The `generate_meetup_spots` intent is open to all tiers.

---

## UI Layer

The UI surface receives `canUseAiFeature` booleans from loaders and responds accordingly:

### `app/routes/dashboard/add.tsx`
- Loader already returns `usage` (containing `planCode`) — no new DB call needed.
- When restricted: replace "Generate with AI" button with a locked state: a `PLUS+ ONLY` badge linking to `/dashboard/billing`.

### `app/routes/dashboard/home.tsx`
- Loader calls `getUserTier(user.id)` and returns `canUseAiMatching`.
- When restricted: the Radar / AI Match button is disabled and shows an inline `UPGRADE TO PLUS` tooltip/badge.

### `app/routes/dashboard/chat.$tradeId.tsx`
- Add a `loader` (currently client-only). Returns `canUseAiChat`.
- When restricted: render an upgrade gate panel instead of `ChatWindow` + `ChatComposer`.

### Shared upgrade copy
- "AI features are available on Plus and above."
- CTA: `UPGRADE PLAN →` linking to `/dashboard/billing`.

---

## Error Handling

- Server always returns `{ error: "ai_tier_restricted" }` (HTTP 403) if bypassed via direct API call.
- UI detects this sentinel and shows the upgrade prompt rather than a generic error.
- All other `AiServiceError` codes (`nvidia_not_configured`, `nvidia_failed`) continue to surface as before.

---

## Non-Goals

- No changes to `pings.$id.tsx` meetup feature.
- No rate-limiting or per-feature quotas (may follow in a future iteration).
- No changes to the AI service layer (`ai.server.ts`, `nvidia.server.ts`).
