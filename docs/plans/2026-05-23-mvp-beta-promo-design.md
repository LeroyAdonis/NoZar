# MVP Beta Promo — Design Document

**Date:** 2026-05-23  
**Status:** Approved  
**Author:** Orchestrator (via Brainstorming skill)

---

## Overview

Open Tier 2 (Plus) to all users for free for 3 months as a promotional beta launch.  
After the promo period, users who wish to continue Plus must add banking details and subscribe at R99/month via PayFast.  
NoZar reserves the right to end the MVP beta at any time.

---

## Approach: Extend `subscriptions` table with `"promo"` status

Reuse the existing `subscriptions` table. Add a `promoExpiresAt` column and a new `"promo"` status value.  
A server function auto-enrolls every user on their first dashboard load.  
The existing PayFast webhook already overwrites status to `"active"` when they pay — no webhook changes required.

**Why not alternatives:**
- Separate `promoEnrollments` table: extra migration, extra query per page, more complex tier resolution
- Env flag + creation date: no per-user expiry tracking, no "expired promo" state for billing conversion

---

## Section 1: Data Layer

### Schema Migration

```sql
ALTER TABLE subscriptions ADD COLUMN promo_expires_at TIMESTAMP;
```

New status value: `"promo"` (alongside existing `"active"`, `"cancelled"`, `"expired"`)

### Tier Resolution

New helper `getEffectivePlanCode(sub)` in `app/lib/tier-limits.ts`:

| Subscription state | Effective plan |
|---|---|
| `status = "active"` | `sub.planCode` |
| `status = "promo"` && `promoExpiresAt > now` | `"plus"` |
| `status = "promo"` && `promoExpiresAt <= now` | `"free"` |
| No subscription row | `"free"` |
| `status = "cancelled"` or `"expired"` | `"free"` |

### Auto-Enrollment Module

**File:** `app/lib/promo.server.ts`

```
ensurePromoEnrolled(userId: string): PromoInfo
  - Query subscriptions WHERE userId
  - If no row → INSERT { planCode: "plus", status: "promo", promoExpiresAt: now + 90 days }
  - If existing promo row → return as-is (idempotent)
  - If active/cancelled row → skip, return existing state
  - Returns: { isPromo, promoExpiresAt, daysRemaining, effectivePlanCode }
```

Called from `dashboard.tsx` loader on every authenticated page load.

---

## Section 2: Dashboard & Billing UI

### `dashboard.tsx` loader

- Call `ensurePromoEnrolled(user.id)`
- Expose `promoInfo` in loader return value for child routes to access via parent loader data

### `billing.tsx` updates

- **Remove** "Coming Soon" banner (PayFast is live)
- **Add** Promo Status Card when `status === "promo"`:
  - 🟢 Green: "3-Month Beta Plus — X days remaining" (≥14 days left)
  - 🟡 Amber warning: "Your free Plus trial ends soon" (<14 days remaining)
  - 🔴 Red expired: "Your trial has ended — subscribe to keep Plus"
  - In all promo states: "Upgrade to Plus (R99/mo) →" CTA button launches PayFast checkout
  - Link to Beta Promo Terms legal document
- **Remove** "Launching soon" text from footer note

### PayFast flows (no changes needed)

- `api/pay/upgrade.ts` — already supports Plus; handles conversion from promo → active
- `api/pay/webhook.ts` — COMPLETE event sets `status = "active"` via `onConflictDoUpdate`, overriding promo row

---

## Section 3: Landing Page Promo Banner

**New component:** `app/components/landing/promo-banner.tsx`

### Behaviour

- **Position:** Replaces/extends the existing hardcoded beta top bar in `landing.tsx`
- **When dismissed:** Collapses to the minimal beta dot-label (preserves nav spacing)
- **Dismiss persistence:** `localStorage` key `"nozar-promo-dismissed"`
- **CTA target:** `/register` for guests, `/dashboard/billing` for logged-in users

### Content

> 🚀 **Beta Launch** — 3 months of Plus free. AI match, 20 listings, priority support. No card needed.  
> [Claim Free Plus →]

### Styling

- Emerald gradient background, animated pulse dot
- Brutalist mono typography (`font-mono uppercase tracking-widest text-[10px]`)
- Slightly taller than current beta bar when active
- X dismiss button (top-right)

### Props

```ts
type PromoBannerProps = {
  isLoggedIn: boolean;
}
```

---

## Section 4: Legal Document

### New file: `docs/legal/beta-promo-terms.md`

Sections:

1. **Promo Description** — 3-month free Plus access for all users during MVP beta
2. **Eligibility** — All registered users as of promo launch; new users from registration date
3. **NoZar's Right to Terminate** — NoZar may end the MVP Beta and/or this promotion at any time without notice; access reverts to free tier
4. **Post-Promo Subscription** — To continue Plus after 90 days, users must subscribe at R99/month via PayFast (recurring monthly)
5. **Payment Processing** — Via PayFast (PCI-DSS compliant); card/bank details held by PayFast, not NoZar
6. **Data Retention** — Listings and trade history preserved regardless of tier
7. **Governing Law** — South African Consumer Protection Act 68 of 2008, Electronic Communications and Transactions Act

### New route: `legal/beta-promo`

- `app/routes/legal/beta-promo.tsx` — same pattern as `terms.tsx`
- Added to `routes.ts` under the `legal` parent route
- Linked from: footer section, billing promo card, existing Terms of Service

---

## Section 5: E2E Tests

**New file:** `e2e/promo.spec.ts`

| Test | What it verifies |
|---|---|
| Promo banner visible | Landing page shows banner with "Claim Free Plus" CTA |
| Banner dismiss | Click X → banner collapses; reload still collapsed (localStorage) |
| Auto-enrollment | New user registers → visits /dashboard/billing → shows "promo" status card with expiry |
| Effective tier | After enrollment, plan shows as `plus` in billing (20 listing limit, AI features) |
| PayFast upgrade flow | Click "Upgrade to Plus" → redirects to PayFast sandbox URL |
| Expired promo state | DB-seeded user with `promoExpiresAt` in past → billing shows "trial ended" + upgrade CTA |

---

## Implementation Waves (Parallel Execution Plan)

### Wave 1 — Foundation (can run in parallel)
- **Agent A**: Schema migration (`promoExpiresAt` column) + `promo.server.ts` module + `getEffectivePlanCode()` in tier-limits
- **Agent B**: Legal document (`docs/legal/beta-promo-terms.md`) + new legal route + routes.ts registration + footer link

### Wave 2 — Depends on Wave 1 foundation (can run in parallel)
- **Agent C**: Billing page updates (promo card, remove coming-soon, CTA, PayFast link)
- **Agent D**: Landing page promo banner component + integration in landing.tsx
- **Agent E**: Dashboard layout loader update (call ensurePromoEnrolled, expose promoInfo)

### Wave 3 — Depends on Wave 2
- **Agent F**: E2E Playwright tests (`e2e/promo.spec.ts`) + run tests

---

## Files Affected

| File | Change |
|---|---|
| `app/lib/schema.ts` | Add `promoExpiresAt` column to subscriptions |
| `drizzle/*.sql` | New migration file |
| `app/lib/tier-limits.ts` | Add `getEffectivePlanCode()` helper |
| `app/lib/promo.server.ts` | New — auto-enrollment logic |
| `app/routes/dashboard.tsx` | Call ensurePromoEnrolled in loader |
| `app/routes/dashboard/billing.tsx` | Promo status card, remove coming-soon, CTA |
| `app/components/landing/promo-banner.tsx` | New — promo banner component |
| `app/routes/landing.tsx` | Integrate PromoBanner |
| `docs/legal/beta-promo-terms.md` | New — beta promo legal document |
| `app/routes/legal/beta-promo.tsx` | New — legal route |
| `app/routes.ts` | Register new legal route |
| `app/components/landing/footer-section.tsx` | Link to beta promo terms |
| `e2e/promo.spec.ts` | New — E2E test suite |
