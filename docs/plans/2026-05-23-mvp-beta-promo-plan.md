# MVP Beta Promo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Open Plus (Tier 2) free for 90 days to all users as a promotional beta, auto-enroll on first dashboard load, add a dismissible promo banner on the landing page, expose promo status in billing, protect NoZar with a legal document, and validate everything with Playwright E2E tests.

**Architecture:** Extend `subscriptions` with `promo_expires_at` column and a new `"promo"` status; a new `promo.server.ts` idempotently enrolls every authenticated user on first dashboard visit; `getEffectivePlanCode()` in `tier-limits.ts` resolves the effective tier from raw DB data, so all existing tier-gating code automatically picks up promo status.

**Tech Stack:** React Router v7 SSR, Drizzle ORM + Neon PostgreSQL, Tailwind v4, Better Auth, PayFast (existing), Playwright E2E

---

## Execution Waves

```
Wave 1 (parallel — no dependencies):
  Task A — Backend core: schema + promo.server.ts + tier-limits
  Task B — Legal: markdown doc + route + routes.ts + footer
  Task D — Banner: PromoBanner component + landing.tsx

Wave 2 (parallel — needs Wave 1 Task A complete):
  Task C — Billing page: promo card + remove coming-soon + promoExpiresAt
  Task E — Dashboard loader: ensurePromoEnrolled call

Wave 3 (needs Wave 2 complete):
  Task F — E2E tests: e2e/promo.spec.ts
```

---

## Task A — Backend Core (Wave 1)

**Files:**
- Modify: `app/lib/schema.ts` — add `promoExpiresAt` column to `subscriptions`
- Modify: `app/lib/tier-limits.ts` — add `getEffectivePlanCode()` + `SubInfo` type
- Modify: `app/lib/tier-limits.server.ts` — use `getEffectivePlanCode` instead of `normalizeTierCode`
- Create: `app/lib/promo.server.ts` — `ensurePromoEnrolled()` + `PromoInfo` type
- Run Drizzle migration

### Step 1 — Add `promoExpiresAt` to subscriptions in schema.ts

Open `app/lib/schema.ts`. Find the `subscriptions` table (grep for `export const subscriptions`). Add `promoExpiresAt` as the last column before the closing `}`; also update the status comment:

```ts
// BEFORE (status comment on the status field):
status: text("status").notNull(), // active | cancelled | expired

// AFTER:
status: text("status").notNull(), // active | cancelled | expired | promo
...
nextPaymentDate: timestamp("next_payment_date"),
promoExpiresAt: timestamp("promo_expires_at"),      // ADD THIS LINE
createdAt: timestamp("created_at").notNull().defaultNow(),
```

Exact edit in `app/lib/schema.ts` — replace the line `nextPaymentDate: timestamp("next_payment_date"),` with:

```ts
  nextPaymentDate: timestamp("next_payment_date"),
  promoExpiresAt: timestamp("promo_expires_at"),
```

### Step 2 — Run typecheck to verify schema compiles

```bash
npm run typecheck
```

Expected: passes (or shows only pre-existing errors in `context-mode/`, `local/`, `push-permission-button.tsx`, `webpush.server.ts`, `pings.$id.tsx`).

### Step 3 — Generate and apply Drizzle migration

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Expected: a new migration file is created under `drizzle/` and applied. The `subscriptions` table now has a nullable `promo_expires_at` column.

### Step 4 — Add `getEffectivePlanCode` to tier-limits.ts

Replace the entire contents of `app/lib/tier-limits.ts` with:

```ts
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

export const AI_FEATURE_TIERS = {
  ai_description: ["plus", "business", "enterprise"],
  ai_matching:    ["plus", "business", "enterprise"],
  ai_chat:        ["plus", "business", "enterprise"],
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
```

### Step 5 — Update tier-limits.server.ts to use `getEffectivePlanCode`

Replace the entire contents of `app/lib/tier-limits.server.ts` with:

```ts
import { and, count, eq } from "drizzle-orm";
import { db } from "./db.server";
import { listings, subscriptions } from "./schema";
import {
  getEffectivePlanCode,
  listingLimitFor,
  type ListingUsage,
  type TierCode,
} from "./tier-limits";

export type { ListingUsage } from "./tier-limits";

export async function getListingUsage(userId: string): Promise<ListingUsage> {
  const [sub] = await db
    .select({
      planCode: subscriptions.planCode,
      status: subscriptions.status,
      promoExpiresAt: subscriptions.promoExpiresAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const planCode = getEffectivePlanCode(sub);
  const listingLimit = listingLimitFor(planCode);

  const [row] = await db
    .select({ value: count() })
    .from(listings)
    .where(and(eq(listings.userId, userId), eq(listings.status, "active")));

  const activeCount = row?.value ?? 0;

  return {
    planCode,
    listingLimit,
    activeCount,
    atLimit: activeCount >= listingLimit,
    overLimit: activeCount > listingLimit,
    remaining: Math.max(0, listingLimit - activeCount),
  };
}

/**
 * Lightweight helper that fetches only the user's tier code from subscriptions.
 * Use this when you don't need the full ListingUsage object.
 */
export async function getUserTier(userId: string): Promise<TierCode> {
  const [sub] = await db
    .select({
      planCode: subscriptions.planCode,
      status: subscriptions.status,
      promoExpiresAt: subscriptions.promoExpiresAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return getEffectivePlanCode(sub);
}
```

### Step 6 — Create `app/lib/promo.server.ts`

Create this new file:

```ts
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
```

### Step 7 — Typecheck

```bash
npm run typecheck
```

Expected: passes (no new errors beyond pre-existing ones).

### Step 8 — Commit

```bash
git add app/lib/schema.ts app/lib/tier-limits.ts app/lib/tier-limits.server.ts app/lib/promo.server.ts drizzle/
git commit -m "feat(promo): schema + promo enrollment + effective tier resolution

- Add promoExpiresAt column to subscriptions table
- Add getEffectivePlanCode() to tier-limits.ts
- Update tier-limits.server.ts to use getEffectivePlanCode
- Create promo.server.ts with ensurePromoEnrolled()

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task B — Legal Document (Wave 1)

**Files:**
- Create: `docs/legal/beta-promo-terms.md`
- Create: `app/routes/legal/beta-promo.tsx`
- Modify: `app/routes.ts` — add beta-promo route under legal
- Modify: `app/components/landing/footer-section.tsx` — add footer link

### Step 1 — Create the legal markdown document

Create `docs/legal/beta-promo-terms.md` with this content:

```markdown
# NoZar — Beta Promotional Terms

**Effective Date:** 23 May 2026
**Last Updated:** 23 May 2026

---

## 1. Overview

As part of the NoZar MVP Beta launch, we are offering all registered users **free access to the Plus tier (Tier 2)** for a period of **90 days** from their first login ("the Promotion"). This document sets out the terms and conditions that apply to the Promotion.

By continuing to use the NoZar platform after the Promotion has been communicated to you, you accept these Beta Promotional Terms ("Promo Terms"). These Promo Terms supplement and should be read alongside our [Terms of Service](/legal/terms) and [Privacy Policy](/legal/privacy).

---

## 2. Eligibility

2.1 The Promotion is open to all users who hold a registered NoZar account as at 23 May 2026, and to all new users who register during the Promotion period.

2.2 Each eligible user receives 90 calendar days of Plus tier access ("Promo Period"), commencing from the earlier of: (a) the date on which the Promotion was activated on the platform (23 May 2026); or (b) the date on which the user first logs in after creating an account.

2.3 The Promotion is non-transferable and applies to individual Consumer Accounts only.

---

## 3. Plus Tier Benefits During the Promo Period

During the Promo Period, eligible users will have access to the following Plus tier features at no charge:

- Up to **20 active listings** (versus 5 on the Free tier)
- **AI-powered listing matching** (NVIDIA AI)
- **AI-assisted chat features**
- **AI listing description generation**
- **Advanced search filters**
- **Priority support**

These features are provided on a best-efforts basis during the beta phase and may be modified at any time.

---

## 4. NoZar's Right to Modify or End the MVP Beta

4.1 **NoZar reserves the absolute right to terminate the MVP Beta, the Promotion, and/or any features available during the Beta at any time, with or without prior notice and without any obligation or liability to users.**

4.2 In the event that the Promotion is terminated early, NoZar will make reasonable efforts to notify affected users via email or in-app notification; however, uninterrupted access is not guaranteed.

4.3 NoZar may, at its sole discretion:
- Extend or shorten the Promo Period at any time;
- Modify or remove features included in the Plus tier during the Promo Period;
- Restrict or revoke Promotion access for any user who violates the [Terms of Service](/legal/terms) or [Community Guidelines](/legal/community-guidelines).

4.4 The Promotion is provided on a good-faith basis to allow early adopters to test the platform. It does not constitute a contractual commitment to provide Plus features beyond the stated Promo Period, and creates no expectation of continued access.

---

## 5. What Happens After the Promo Period

5.1 At the end of the 90-day Promo Period, your account will automatically revert to the **Free tier**, unless you have actively subscribed to a paid plan before expiry.

5.2 To continue accessing Plus tier features after your Promo Period ends, you must subscribe to the NoZar Plus plan at **R99.00 per month** (inclusive of applicable VAT).

5.3 Subscriptions are processed through **PayFast** (Pty) Ltd, a PCI-DSS compliant payment provider. By subscribing, you authorise PayFast to charge your nominated payment method on a recurring monthly basis.

5.4 You may cancel your subscription at any time via the **Billing** page in your NoZar dashboard. Cancellation takes effect at the end of the current billing period; no partial-month refunds are issued.

---

## 6. Payment Processing

6.1 All subscription payments are processed exclusively through **PayFast** (Pty) Ltd (Registration No. 2009/019040/07), operating under the supervision of the South African Reserve Bank.

6.2 Your card, banking, and payment details are entered directly on PayFast's PCI-DSS Level 1 certified payment page. **NoZar does not collect, store, or have access to your banking or card details at any time.**

6.3 In the event of a payment dispute or unauthorised charge, you should contact PayFast support directly at [support@payfast.co.za](mailto:support@payfast.co.za) in addition to notifying NoZar at [hello@nozar.co.za](mailto:hello@nozar.co.za).

---

## 7. Data and Content During and After the Promo Period

7.1 Your listings, trade history, messages, and profile data are retained regardless of your tier status.

7.2 After your Promo Period ends and if you do not subscribe, your account will be subject to the Free tier listing limit (5 active listings). If you exceed this limit at the time of downgrade, you will be unable to create new listings until you archive existing listings to meet the Free tier limit. **Existing listings will not be automatically deleted.**

7.3 NoZar's data practices are governed by the [Privacy Policy](/legal/privacy) and the Protection of Personal Information Act 4 of 2013 (POPIA).

---

## 8. No Warranties; Limitation of Liability

8.1 The Promotion and all Plus tier features are provided **"as is"** and **"as available"** during the MVP Beta phase. NoZar makes no warranties, express or implied, regarding uptime, feature availability, data accuracy, or fitness for a particular purpose during this period.

8.2 To the maximum extent permitted by applicable law, NoZar shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from: (a) your participation in the Promotion; (b) any modification or withdrawal of Plus features; or (c) the early termination of the MVP Beta.

8.3 Nothing in these Promo Terms excludes or limits liability for death or personal injury caused by negligence, or any other liability that cannot be excluded under the Consumer Protection Act 68 of 2008.

---

## 9. Governing Law and Jurisdiction

9.1 These Promo Terms are governed by and construed in accordance with the laws of the Republic of South Africa.

9.2 These Promo Terms are subject to the Consumer Protection Act 68 of 2008, the Electronic Communications and Transactions Act 25 of 2002 (ECTA), and the Protection of Personal Information Act 4 of 2013 (POPIA).

9.3 Any disputes arising from the Promotion shall first be referred to informal mediation. Unresolved disputes shall be subject to the exclusive jurisdiction of the competent courts of the Western Cape, Republic of South Africa.

---

## 10. Contact

For questions about this Promotion or these Promo Terms:

**Email:** [hello@nozar.co.za](mailto:hello@nozar.co.za)
**Website:** [nozar.co.za](https://nozar.co.za)
**Postal Address:** NoZar, Cape Town, Western Cape, Republic of South Africa

*NoZar is a South African platform. All currency references are in South African Rand (ZAR).*
```

### Step 2 — Create `app/routes/legal/beta-promo.tsx`

Follow the same pattern as `app/routes/legal/terms.tsx`:

```tsx
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseMarkdown } from "~/lib/parse-markdown";
import { MarkdownRenderer } from "~/components/markdown-renderer";
import type { Route } from "./+types/beta-promo";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Beta Promo Terms — NoZar" },
    {
      name: "description",
      content:
        "Terms and conditions for the NoZar 3-month Beta Plus promotional period.",
    },
  ];
}

export async function loader(_args: Route.LoaderArgs) {
  const filePath = resolve("docs/legal/beta-promo-terms.md");
  const source = await readFile(filePath, "utf-8");
  const blocks = parseMarkdown(source);
  return { blocks };
}

export default function BetaPromoTermsPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 sm:p-10">
      <div className="mb-8">
        <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
          Legal
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
          Beta Promotional Terms
        </h1>
        <p className="text-slate-500 text-sm mt-1">Last updated: May 2026</p>
      </div>
      <MarkdownRenderer blocks={loaderData.blocks} />
      <nav className="mt-12 pt-6 border-t border-white/5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600 mb-3">
          Other Documents
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/legal/terms" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
            Terms of Service →
          </a>
          <a href="/legal/privacy" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
            Privacy Policy →
          </a>
          <a href="/legal/community-guidelines" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
            Community Guidelines →
          </a>
          <a href="/legal/complaints" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
            Complaints Process →
          </a>
        </div>
      </nav>
    </div>
  );
}
```

### Step 3 — Register the route in `app/routes.ts`

In `app/routes.ts`, find the `legal` route group (line 37). Add `beta-promo` as a new child route:

```ts
// BEFORE:
route("legal", "routes/legal.tsx", [
  route("terms", "routes/legal/terms.tsx"),
  route("privacy", "routes/legal/privacy.tsx"),
  route("community-guidelines", "routes/legal/community-guidelines.tsx"),
  route("complaints", "routes/legal/complaints.tsx"),
]),

// AFTER:
route("legal", "routes/legal.tsx", [
  route("terms", "routes/legal/terms.tsx"),
  route("privacy", "routes/legal/privacy.tsx"),
  route("community-guidelines", "routes/legal/community-guidelines.tsx"),
  route("complaints", "routes/legal/complaints.tsx"),
  route("beta-promo", "routes/legal/beta-promo.tsx"),
]),
```

### Step 4 — Add footer link in `app/components/landing/footer-section.tsx`

Find the `legalLinks` array (currently lines 12–17). Add the Beta Promo Terms entry:

```ts
// BEFORE:
const legalLinks = [
  { label: "Terms of Service", to: "/legal/terms" },
  { label: "Privacy Policy", to: "/legal/privacy" },
  { label: "Community Guidelines", to: "/legal/community-guidelines" },
  { label: "Complaints Process", to: "/legal/complaints" },
] as const;

// AFTER:
const legalLinks = [
  { label: "Terms of Service", to: "/legal/terms" },
  { label: "Privacy Policy", to: "/legal/privacy" },
  { label: "Community Guidelines", to: "/legal/community-guidelines" },
  { label: "Complaints Process", to: "/legal/complaints" },
  { label: "Beta Promo Terms", to: "/legal/beta-promo" },
] as const;
```

### Step 5 — Typecheck

```bash
npm run typecheck
```

Expected: passes (or only pre-existing errors).

### Step 6 — Commit

```bash
git add docs/legal/beta-promo-terms.md app/routes/legal/beta-promo.tsx app/routes.ts app/components/landing/footer-section.tsx
git commit -m "feat(legal): beta promo terms page

- Add docs/legal/beta-promo-terms.md (10 sections, SA law, right-to-terminate)
- Add /legal/beta-promo route matching terms.tsx pattern
- Register route in app/routes.ts
- Add 'Beta Promo Terms' link to footer

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task D — Promo Banner (Wave 1)

**Files:**
- Create: `app/components/landing/promo-banner.tsx`
- Modify: `app/routes/landing.tsx` — replace hard-coded beta bar with `<PromoBanner>`

### Step 1 — Create `app/components/landing/promo-banner.tsx`

```tsx
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { X, Rocket } from "lucide-react";

const DISMISSED_KEY = "nozar-promo-dismissed";

type Props = { isLoggedIn?: boolean };

/**
 * Dismissible promotional banner for the MVP Beta Plus promo.
 * Before hydration (or after dismiss) renders the minimal beta tag
 * so the page layout never shifts.
 */
export function PromoBanner({ isLoggedIn = false }: Props) {
  const [dismissed, setDismissed] = useState(true); // true = minimal bar while loading
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    setDismissed(isDismissed);
    setMounted(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  /* Minimal bar — shown before mount or after dismiss */
  if (!mounted || dismissed) {
    return (
      <div className="fixed top-0 w-full z-[60] bg-emerald-500/10 border-b border-emerald-500/20 py-2 text-center backdrop-blur-md">
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-emerald-400">
          <span className="inline-block animate-pulse mr-2">●</span>
          Beta — live in Joburg &amp; Cape Town
        </p>
      </div>
    );
  }

  /* Full promo bar */
  return (
    <div
      data-testid="promo-banner"
      className="fixed top-0 w-full z-[60] backdrop-blur-md border-b border-emerald-500/25"
      style={{
        background:
          "linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(6,182,212,0.07) 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 justify-center flex-wrap">
          <Rocket className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden />
          <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-emerald-400 text-center">
            <span className="text-emerald-300 font-bold">Beta Launch</span>
            <span className="text-emerald-600 mx-2">—</span>
            3 months of Plus free · 20 listings · AI match · No card needed
          </p>
          <Link
            data-testid="promo-cta"
            to={isLoggedIn ? "/dashboard/billing" : "/register"}
            className="shrink-0 px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 text-[9px] font-mono uppercase tracking-widest hover:bg-emerald-400 transition-colors font-bold"
          >
            {isLoggedIn ? "View Your Plus →" : "Claim Free Plus →"}
          </Link>
        </div>
        <button
          data-testid="promo-dismiss"
          onClick={handleDismiss}
          className="shrink-0 text-emerald-400/50 hover:text-emerald-400 transition-colors p-1 rounded"
          aria-label="Dismiss promotional banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
```

### Step 2 — Integrate PromoBanner in `app/routes/landing.tsx`

**2a.** Add the import at the top of `app/routes/landing.tsx` (near the other component imports):

```ts
import { PromoBanner } from "~/components/landing/promo-banner";
```

**2b.** In the loader, expose whether the user is logged in. Find the loader and add a session check. Currently `landing.tsx` uses `getOptionalSession`. If it already does so, add `isLoggedIn` to the return. If there is no loader, create one:

First, check if landing.tsx already has a loader (grep for `export async function loader`). If it does, add `isLoggedIn` to its return value. If it doesn't, add this minimal loader:

```ts
import { getOptionalSession } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalSession(request);
  return { isLoggedIn: Boolean(session?.user) };
}
```

**2c.** In the component, destructure `isLoggedIn` from `useLoaderData`. If there's an existing `useLoaderData` call, add `isLoggedIn` to it:

```ts
const { isLoggedIn } = useLoaderData<typeof loader>();
```

**2d.** Replace the hard-coded MVP Beta Banner block (lines ~135–141) with the new component. The old code is:

```tsx
{/* MVP Beta Banner */}
<div className="fixed top-0 w-full z-[60] bg-emerald-500/10 border-b border-emerald-500/20 py-2 text-center backdrop-blur-md">
  <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-emerald-400">
    <span className="inline-block animate-pulse mr-2">●</span>
    Beta — live in Joburg &amp; Cape Town
  </p>
</div>
```

Replace with:

```tsx
{/* Promo Banner */}
<PromoBanner isLoggedIn={isLoggedIn} />
```

### Step 3 — Typecheck

```bash
npm run typecheck
```

Expected: passes.

### Step 4 — Commit

```bash
git add app/components/landing/promo-banner.tsx app/routes/landing.tsx
git commit -m "feat(banner): dismissible MVP beta promo banner on landing page

- New PromoBanner component with localStorage dismiss
- CTA routes to /register (guest) or /dashboard/billing (logged-in)
- Replaces hard-coded beta bar in landing.tsx

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task C — Billing Page (Wave 2, after Task A)

**Files:**
- Modify: `app/routes/dashboard/billing.tsx`

### Step 1 — Add `promoExpiresAt` to the billing loader select

Find the existing `db.select` call in the loader (lines ~84–91). Add `promoExpiresAt` to the select:

```ts
// BEFORE:
const [sub] = await db
  .select({
    status: subscriptions.status,
    nextPaymentDate: subscriptions.nextPaymentDate,
  })
  .from(subscriptions)
  .where(eq(subscriptions.userId, user.id))
  .limit(1);

// AFTER:
const [sub] = await db
  .select({
    status: subscriptions.status,
    nextPaymentDate: subscriptions.nextPaymentDate,
    promoExpiresAt: subscriptions.promoExpiresAt,
  })
  .from(subscriptions)
  .where(eq(subscriptions.userId, user.id))
  .limit(1);
```

### Step 2 — Add `promoExpiresAt` to loader return

```ts
// BEFORE:
return {
  planCode: usage.planCode,
  listingCount: usage.activeCount,
  subscription: sub
    ? { status: sub.status, nextPaymentDate: sub.nextPaymentDate }
    : null,
  upgradeEnabled,
};

// AFTER:
return {
  planCode: usage.planCode,
  listingCount: usage.activeCount,
  subscription: sub
    ? {
        status: sub.status,
        nextPaymentDate: sub.nextPaymentDate,
        promoExpiresAt: sub.promoExpiresAt ?? null,
      }
    : null,
  upgradeEnabled,
};
```

### Step 3 — Remove "Coming Soon" banner

Find and remove the entire `!upgradeEnabled` banner block (lines ~139–154). This block starts with `{!upgradeEnabled && (` and ends with `)}`. Delete it entirely — PayFast is now properly integrated and the promo makes billing always relevant.

### Step 4 — Add Promo Status Card

After the existing active-subscription section (`subscription?.status === "active"` block, which ends around line 184), add a new promo status card:

```tsx
{/* ── Promo Status Card ── */}
{subscription?.status === "promo" && (
  <section
    data-testid="promo-status-card"
    className="bg-emerald-500/5 border border-emerald-500/30 rounded-2xl p-5"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Beta Promo Active
          </span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            FREE PLUS
          </span>
        </div>
        {subscription.promoExpiresAt && (
          <p className="text-xs text-slate-400">
            Free Plus access until{" "}
            <span className="text-slate-200 font-mono">
              {new Date(subscription.promoExpiresAt).toLocaleDateString("en-ZA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </p>
        )}
        <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm">
          After your promo ends, your account returns to Free (5 listings). Subscribe
          to keep Plus at R99/month — no card needed until then.
        </p>
      </div>
    </div>
    <div className="mt-3 flex items-center gap-2 text-[9px] font-mono text-slate-600">
      <a href="/legal/beta-promo" className="hover:text-emerald-400 transition-colors underline underline-offset-2">
        Beta Promo Terms
      </a>
    </div>
  </section>
)}
```

### Step 5 — Update footer note text

Find the footer note at the bottom of the component (line ~417):

```tsx
// BEFORE:
<p className="text-[10px] font-mono text-slate-600 text-center pb-4">
  All prices in ZAR · Billing via PayFast · Launching soon
</p>

// AFTER:
<p className="text-[10px] font-mono text-slate-600 text-center pb-4">
  All prices in ZAR · Billing via PayFast · Cancel anytime
</p>
```

### Step 6 — Update usage warning messages

Find the 3 `usageWarn` warning strings (around line 226–230). They currently say "upgrade when billing launches". Replace them to just say "upgrade":

```tsx
// BEFORE (3 strings):
"Over listing limit — archive some listings or upgrade when billing launches"
"At listing limit — upgrade when billing launches to add more"
"Approaching listing limit — upgrade when billing launches"

// AFTER:
"Over listing limit — archive some listings or upgrade to Plus"
"At listing limit — upgrade to Plus to add more listings"
"Approaching listing limit — consider upgrading to Plus"
```

### Step 7 — Typecheck

```bash
npm run typecheck
```

Expected: passes.

### Step 8 — Commit

```bash
git add app/routes/dashboard/billing.tsx
git commit -m "feat(billing): promo status card + remove coming-soon banner

- Show promo expiry date and CTA when status is 'promo'
- Remove Coming Soon billing banner (PayFast is live)
- Update footer note: 'Launching soon' → 'Cancel anytime'
- Update usage warning copy

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task E — Dashboard Loader (Wave 2, after Task A)

**Files:**
- Modify: `app/routes/dashboard.tsx`

### Step 1 — Import `ensurePromoEnrolled`

At the top of `app/routes/dashboard.tsx`, add this import alongside the other server imports:

```ts
import { ensurePromoEnrolled } from "~/lib/promo.server";
```

### Step 2 — Call `ensurePromoEnrolled` in the loader

The current loader (lines 28–44) runs sequentially. Update it to call `ensurePromoEnrolled` in parallel with the unread count and profile queries. Replace the existing loader with:

```ts
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);

  const [unreadCount, profileRows] = await Promise.all([
    getUnreadCount(db, user.id),
    db
      .select({
        avatarUrl: profiles.avatarUrl,
        displayName: profiles.displayName,
        province: profiles.province,
        lat: profiles.lat,
        lng: profiles.lng,
      })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1),
    ensurePromoEnrolled(user.id), // fire-and-forget enrollment; result unused at layout level
  ]);

  const profile = profileRows[0] ?? null;

  return { user, unreadCount, profile, vapidPublicKey };
}
```

> **Note:** `Promise.all` returns a 3-element tuple. We only destructure the first two; `ensurePromoEnrolled` is awaited for its side-effect (DB enrollment) without exposing its result at the layout level — the billing page has its own loader for promo details.

### Step 3 — Typecheck

```bash
npm run typecheck
```

Expected: passes. TypeScript may warn if `Promise.all` tuple destructuring is strict — adjust to explicit typing if needed:

```ts
const [unreadCount, profileRows] = await Promise.all([
  getUnreadCount(db, user.id),
  db.select({ ... }).from(profiles).where(eq(profiles.userId, user.id)).limit(1),
  ensurePromoEnrolled(user.id),
] as const);
```

### Step 4 — Commit

```bash
git add app/routes/dashboard.tsx
git commit -m "feat(dashboard): auto-enroll users in promo on first dashboard load

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task F — E2E Tests (Wave 3)

**Files:**
- Create: `e2e/promo.spec.ts`

### Step 1 — Create `e2e/promo.spec.ts`

```ts
import { expect, test, type Page, type TestInfo } from "@playwright/test";

// ─── Helpers ──────────────────────────────────────────────────

async function registerFreshUser(page: Page, testInfo: TestInfo) {
  const uniqueKey = `${Date.now()}-${testInfo.parallelIndex}-${slugify(testInfo.project.name)}`;
  const email = `playwright-promo-${uniqueKey}@example.com`;

  await page.goto("/register");
  await dismissCookieBanner(page);
  await page.getByLabel("Display Name").fill(`Promo Test ${uniqueKey}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  return { email };
}

async function dismissCookieBanner(page: Page) {
  const btn = page.getByRole("button", { name: "Accept" });
  if (await btn.isVisible()) await btn.click();
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// ─── Landing page banner ───────────────────────────────────────

test.describe("Promo Banner — landing page", () => {
  test("shows full promo banner to guests", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);
    await expect(page.getByTestId("promo-banner")).toBeVisible();
    await expect(page.getByTestId("promo-cta")).toBeVisible();
    await expect(page.getByTestId("promo-cta")).toHaveAttribute("href", "/register");
  });

  test("CTA links to /dashboard/billing for logged-in users", async ({ page }, testInfo) => {
    await registerFreshUser(page, testInfo);
    await page.goto("/");
    await dismissCookieBanner(page);

    // Wait for hydration so the logged-in CTA is shown
    const cta = page.getByTestId("promo-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/dashboard/billing");
  });

  test("banner can be dismissed and stays dismissed on reload", async ({ page }) => {
    await page.goto("/");
    await dismissCookieBanner(page);

    const dismiss = page.getByTestId("promo-dismiss");
    await expect(dismiss).toBeVisible();
    await dismiss.click();

    // Full promo bar gone, minimal beta bar remains
    await expect(page.getByTestId("promo-banner")).not.toBeVisible();

    // Reload — should still be dismissed (localStorage persisted)
    await page.reload();
    await expect(page.getByTestId("promo-banner")).not.toBeVisible();
  });
});

// ─── Promo enrollment ─────────────────────────────────────────

test.describe("Promo enrollment — dashboard", () => {
  test("new users are auto-enrolled in promo on first dashboard visit", async ({
    page,
  }, testInfo) => {
    await registerFreshUser(page, testInfo);
    // Dashboard load triggers ensurePromoEnrolled — navigate to billing to verify
    await page.goto("/dashboard/billing");
    await expect(page.getByTestId("promo-status-card")).toBeVisible();
  });

  test("promo status card shows expiry date", async ({ page }, testInfo) => {
    await registerFreshUser(page, testInfo);
    await page.goto("/dashboard/billing");

    const card = page.getByTestId("promo-status-card");
    await expect(card).toBeVisible();
    // Should contain a date in ZA locale format e.g. "14 August 2026"
    await expect(card).toContainText(/\d{1,2}\s+\w+\s+20\d{2}/);
  });
});

// ─── Legal document ────────────────────────────────────────────

test.describe("Beta Promo Terms — legal page", () => {
  test("renders /legal/beta-promo with correct heading", async ({ page }) => {
    await page.goto("/legal/beta-promo");
    await expect(page).toHaveTitle(/Beta Promo Terms/);
    await expect(
      page.getByRole("heading", { name: /Beta Promotional Terms/i }),
    ).toBeVisible();
  });

  test("footer contains link to beta promo terms", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: "Beta Promo Terms" });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/legal\/beta-promo$/);
  });
});
```

### Step 2 — Run the tests

```bash
npx playwright test e2e/promo.spec.ts --project=chromium
```

Expected: all 7 tests pass.

If the promo banner tests fail on "not visible" assertions, ensure that the `data-testid` attributes in `promo-banner.tsx` are correct. The full promo bar only renders after React hydration — Playwright waits for it automatically.

### Step 3 — Run full typecheck

```bash
npm run typecheck
```

Expected: passes.

### Step 4 — Run full E2E suite to check for regressions

```bash
npx playwright test --project=chromium
```

Expected: all existing + new tests pass.

### Step 5 — Commit

```bash
git add e2e/promo.spec.ts
git commit -m "test(e2e): promo banner, enrollment, billing card, legal page

7 Playwright tests covering:
- Landing banner visibility and dismiss
- CTA href by auth state
- Auto-enrollment on dashboard load
- Promo status card with expiry date
- /legal/beta-promo page
- Footer link to beta promo terms

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Final Verification

After all tasks complete, run:

```bash
npm run typecheck
npx playwright test --project=chromium
```

Verify:
- [ ] `npm run typecheck` exits 0 (beyond pre-existing errors)
- [ ] `GET /legal/beta-promo` returns 200 with correct heading
- [ ] New user hitting `/dashboard` for the first time → subscription row with `status = "promo"` in DB
- [ ] `/dashboard/billing` shows Promo Status Card with expiry date
- [ ] Plus tier features accessible (AI match, 20 listing limit)
- [ ] PayFast upgrade form still works (`?testpay=1` or `PAYFAST_MODE=sandbox`)
- [ ] Landing page banner dismisses and stays dismissed across reloads
- [ ] Footer contains "Beta Promo Terms" link
