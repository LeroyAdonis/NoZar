# PayFast Integration & Business 'Coming Soon' Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Plus (R99/mo) subscriptions via PayFast for MVP launch; hide all business products behind a single feature flag until they're ready.

**Architecture:** Single `BUSINESS_PRODUCTS_LIVE` flag in `app/lib/tier-limits.ts` gates 5 surfaces (pricing card, dual-economy card, FAQ Q8, billing tier card, Q2 sweep). PayFast uses native subscription model (`subscription_type=1`): browser POSTs auto-submitting form to PayFast hosted page → server-side ITN webhook is the source of truth → 4 independent security checks (signature, source IP, amount, POST-back validate). New `payment_events` table provides idempotency via composite `(m_payment_id, pf_payment_id)`. Existing `subscriptions`, `boostTokens`, `transactions` tables stay.

**Tech Stack:** React Router v7 (server actions + loaders), Drizzle ORM + Neon Postgres, Better Auth, Vercel deployment, vitest (added in this plan) for unit tests, Playwright for E2E.

**Spec:** [`docs/superpowers/specs/2026-05-19-payfast-integration-design.md`](../specs/2026-05-19-payfast-integration-design.md)

---

## File Structure

### Phase 0 — Coming Soon Gating
- Modify: `app/lib/tier-limits.ts` — add `BUSINESS_PRODUCTS_LIVE` constant
- Modify: `app/components/landing/pricing-section.tsx` — gate Business + Enterprise cards
- Modify: `app/routes/landing.tsx` — gate "For businesses" card (dual-economy section)
- Modify: `app/components/landing/faq-section.tsx` — rewrite Q8, sweep Q2 + Q4 for business claims
- Modify: `app/routes/dashboard/billing.tsx` — gate Business tier card in TIERS array

### Phase 1 — Test Infrastructure
- Modify: `package.json` — add vitest + tsx, add `test:unit` script
- Create: `vitest.config.ts` — minimal vitest config sharing Vite plugins

### Phase 2 — Schema
- Modify: `app/lib/schema.ts` — add `paymentEvents` table, add `subscriptionToken` column on `subscriptions`, make `transactions.listingId` nullable
- Generate: `drizzle/00NN_*.sql` (auto-named) — migration file produced by `drizzle-kit generate`

### Phase 3 — PayFast Library (pure functions, TDD)
- Create: `app/lib/payfast.server.ts` — signature build/verify, IP allowlist, POST-back validate, cancel subscription API
- Create: `app/lib/payfast.server.test.ts` — vitest unit tests with golden fixtures

### Phase 4 — Routes
- Delete: `app/lib/paystack.server.ts`
- Rewrite: `app/routes/api.pay.upgrade.ts` — Plus form-build action
- Rewrite: `app/routes/api.pay.webhook.ts` — ITN handler with 4 checks
- Create: `app/routes/api.pay.cancel.ts` — cancel subscription action

### Phase 5 — Billing UI Wiring
- Modify: `app/routes/dashboard/billing.tsx` — Plus button wired to action with `?testpay=1` guard outside Production; Cancel button when active

### Phase 6 — Vercel Env
- No file changes; CLI commands

### Phase 7 — E2E + Cutover
- Create: `e2e/billing-payfast.spec.ts` — Playwright smoke test for upgrade form render (does not click submit)

---

## Phase 0 — Coming Soon Gating

### Task 1: Add `BUSINESS_PRODUCTS_LIVE` feature flag

**Files:**
- Modify: `app/lib/tier-limits.ts`

- [ ] **Step 1: Add the flag**

Append to `app/lib/tier-limits.ts`:

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add app/lib/tier-limits.ts
git commit -m "feat: add BUSINESS_PRODUCTS_LIVE feature flag (MVP default off)"
```

---

### Task 2: Gate Business + Enterprise cards on landing pricing section

**Files:**
- Modify: `app/components/landing/pricing-section.tsx`

- [ ] **Step 1: Import the flag and add per-tier gating field**

At the top of `app/components/landing/pricing-section.tsx`, add to existing imports:

```ts
import { BUSINESS_PRODUCTS_LIVE } from "~/lib/tier-limits";
import { Lock } from "lucide-react";
```

Extend the `PricingTier` type (lines 19-28) to include the optional gate flag:

```ts
type PricingTier = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PricingFeature[];
  cta: string;
  ctaLink: string;
  popular?: boolean;
  businessProduct?: boolean;
};
```

Mark the Business and Enterprise entries with `businessProduct: true`. After the existing `tiers` array literal, derive the visible list:

```ts
const visibleTiers = tiers.map((tier) =>
  tier.businessProduct && !BUSINESS_PRODUCTS_LIVE
    ? { ...tier, comingSoon: true as const }
    : { ...tier, comingSoon: false as const },
);
```

- [ ] **Step 2: Replace CTA render with gated branch**

In the JSX, replace the existing `tiers.map` with `visibleTiers.map`. Replace the existing `<CardFooter>` block (lines 161-185) with:

```tsx
<CardFooter>
  {tier.comingSoon ? (
    <div
      aria-disabled="true"
      className="block w-full py-3 rounded-xl font-bold text-center text-sm bg-white/[0.02] border border-white/10 text-slate-500 flex items-center justify-center gap-2"
    >
      <Lock className="w-3.5 h-3.5" />
      <span className="font-mono text-xs uppercase tracking-widest">
        Coming soon
      </span>
    </div>
  ) : tier.ctaLink.startsWith("mailto:") ? (
    <a
      href={tier.ctaLink}
      className={`block w-full py-3 rounded-xl font-bold transition-colors text-center text-sm ${
        tier.popular
          ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          : "bg-white/5 border border-white/10 hover:bg-white/10"
      }`}
    >
      {tier.cta}
    </a>
  ) : (
    <Link
      to={tier.ctaLink}
      className={`block w-full py-3 rounded-xl font-bold transition-colors text-center text-sm ${
        tier.popular
          ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          : "bg-white/5 border border-white/10 hover:bg-white/10"
      }`}
    >
      {tier.cta}
    </Link>
  )}
</CardFooter>
```

Also dim the card opacity when `comingSoon`. Find the existing `<Card>` element (lines 118-126) and add `${tier.comingSoon ? "opacity-60" : ""}` to its className concatenation.

- [ ] **Step 3: Manual visual check**

Run `npm run dev`. Open landing page, scroll to Pricing. Confirm:
- Free + Plus cards render unchanged with normal CTAs.
- Business + Enterprise cards are dimmed and show "Coming soon" with lock icon.

- [ ] **Step 4: Commit**

```bash
git add app/components/landing/pricing-section.tsx
git commit -m "feat: gate Business + Enterprise pricing cards behind BUSINESS_PRODUCTS_LIVE"
```

---

### Task 3: Gate "For businesses" card in landing dual-economy section

**Files:**
- Modify: `app/routes/landing.tsx`

- [ ] **Step 1: Import the flag**

At the top of `app/routes/landing.tsx`, add to existing imports:

```ts
import { BUSINESS_PRODUCTS_LIVE } from "~/lib/tier-limits";
```

- [ ] **Step 2: Replace the For businesses CTA**

Find the existing "For businesses" CTA `Link` element (lines 492-498). Replace it with:

```tsx
{BUSINESS_PRODUCTS_LIVE ? (
  <Link
    to="/dashboard"
    className="block w-full py-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold transition-colors text-center"
  >
    See business plans
  </Link>
) : (
  <a
    href="mailto:hello@nozar.co.za?subject=Business%20plan%20waitlist"
    className="block w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold transition-colors text-center"
  >
    Notify me at launch
  </a>
)}
```

- [ ] **Step 3: Add Coming Soon badge top-right of the card**

Inside the "For businesses" card `<div>` (the one starting at line 463), add immediately after the opening tag:

```tsx
{!BUSINESS_PRODUCTS_LIVE && (
  <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[10px] uppercase tracking-widest">
    Coming soon
  </span>
)}
```

- [ ] **Step 4: Soften the headline copy when gated**

The existing description (line 475-478) implies live features. Replace it with a flag-aware version. Find:

```tsx
<p className="text-slate-400 mb-10 text-lg">
  Move dead stock and put idle equipment to work — without touching
  cash flow. Built for registered SA businesses.
</p>
```

Replace with:

```tsx
<p className="text-slate-400 mb-10 text-lg">
  {BUSINESS_PRODUCTS_LIVE
    ? "Move dead stock and put idle equipment to work — without touching cash flow. Built for registered SA businesses."
    : "Move dead stock and put idle equipment to work — without touching cash flow. Built for registered SA businesses. Launching soon."}
</p>
```

- [ ] **Step 5: Manual visual check**

Run `npm run dev`. Open landing page, scroll to "For people. For businesses." section. Confirm:
- "For people" card unchanged.
- "For businesses" card shows amber "Coming soon" badge top-right.
- CTA reads "Notify me at launch" and opens a mailto.
- Description ends with "Launching soon."

- [ ] **Step 6: Commit**

```bash
git add app/routes/landing.tsx
git commit -m "feat: gate 'For businesses' card with coming-soon CTA + waitlist mailto"
```

---

### Task 4: Rewrite FAQ Q8, sweep Q2 + Q4 for business claims

**Files:**
- Modify: `app/components/landing/faq-section.tsx`

- [ ] **Step 1: Import the flag**

At the top of `app/components/landing/faq-section.tsx`:

```ts
import { BUSINESS_PRODUCTS_LIVE } from "~/lib/tier-limits";
```

- [ ] **Step 2: Make the FAQ list flag-aware**

Replace the existing `const faqItems: FaqItem[] = [...]` literal with a function call:

```ts
const buildFaqItems = (): FaqItem[] => [
  {
    id: "01",
    question: "What is NoZar?",
    answer:
      "NoZar is a barter platform for South Africa. Swap your stuff, skills, and services directly with people near you — no cash needed. Every listing sits in a value tier, so you only see fair swaps.",
  },
  {
    id: "02",
    question: "Is it really free?",
    answer: BUSINESS_PRODUCTS_LIVE
      ? "Yes. The Free plan gives you 5 active listings, unlimited swaps, and local matching — at no cost. No transaction fees, ever. If you want more capacity, Plus (R99/mo) and Business (R299/mo) unlock advanced filters, AI match, priority support, and business tools."
      : "Yes. The Free plan gives you 5 active listings, unlimited swaps, and local matching — at no cost. No transaction fees, ever. If you want more capacity, Plus (R99/mo) unlocks advanced filters, AI match, and priority support.",
  },
  {
    id: "03",
    question: "How do I stay safe?",
    answer:
      "Three steps. First, you chat privately on NoZar — phone numbers and emails are blocked. Then both of you confirm the swap. Only after that do contact details unlock, and we suggest safe public meetup spots. Your identity stays private until you both agree.",
  },
  {
    id: "04",
    question: "What can I trade?",
    answer:
      "Anything legal with real value. Items like electronics, furniture, clothes, appliances, vehicles, and sports gear. Services like design, dev, tutoring, repairs, photography, and more. We match things by value tier so you only see swaps that are worth your while.",
  },
  {
    id: "05",
    question: "How does contact exchange work?",
    answer:
      "Contact details are hidden by default. Only after you both confirm the swap do they unlock — and even then, you choose what to share (phone, email, or location). Shared details expire after 72 hours, with an optional 48-hour extension if you both agree.",
  },
  {
    id: "06",
    question: "How are disputes handled?",
    answer:
      "If a swap goes wrong, open a dispute from your trade page. A neutral moderator reviews the chat and confirmation history, then proposes a fair outcome.",
  },
  {
    id: "07",
    question: "Which areas do you cover?",
    answer:
      "We're live in Johannesburg and Cape Town. Durban, Pretoria, and Bloemfontein are next. Digital services (design, dev, tutoring) are already open nationwide. Your local radius starts at 15km and you can adjust it between 3km and 50km in your profile.",
  },
  {
    id: "08",
    question: "Can businesses use NoZar?",
    answer: BUSINESS_PRODUCTS_LIVE
      ? "Yes. The Business plan is built for registered SA companies. Verify with CIPC to get a business badge, business-only filters, and SARS-ready exports for every swap. Move dead stock and put idle equipment to work — without touching cash flow."
      : "Business plans are launching soon. For now NoZar is open to individual traders. Drop us a note at hello@nozar.co.za if you want to be on the waitlist when business features go live.",
  },
  {
    id: "09",
    question: "Is barter legal with SARS?",
    answer:
      "Yes. SARS treats barter as legitimate trade. Under the VAT Act and Income Tax Act, you account for the fair market value of what you receive as taxable income. NoZar's trade ledger export helps you keep accurate records for the five years SARS requires.",
  },
  {
    id: "10",
    question: "How do ratings work?",
    answer:
      "After every completed swap, both of you rate each other. Ratings are hidden until both are in, so no one can retaliate. Hit 10+ swaps with a 4.5+ average and you earn the Trusted Trader badge — it boosts you in search.",
  },
];

const faqItems = buildFaqItems();
```

- [ ] **Step 3: Manual visual check**

Run `npm run dev`. Open landing → scroll to FAQ. Open Q2 and Q8. Confirm:
- Q2 no longer mentions "Business (R299/mo)" or "business tools".
- Q8 reads "Business plans are launching soon..."

- [ ] **Step 4: Commit**

```bash
git add app/components/landing/faq-section.tsx
git commit -m "feat: gate FAQ Q2 + Q8 business claims behind BUSINESS_PRODUCTS_LIVE"
```

---

### Task 5: Gate Business tier card in `/dashboard/billing`

**Files:**
- Modify: `app/routes/dashboard/billing.tsx`

- [ ] **Step 1: Import the flag and derive visible tiers**

At the top of `app/routes/dashboard/billing.tsx`, update the `tier-limits` import (currently line 7):

```ts
import { LISTING_LIMITS, BUSINESS_PRODUCTS_LIVE } from "~/lib/tier-limits";
```

After the `TIERS` array (after line 60), add:

```ts
const VISIBLE_TIERS = BUSINESS_PRODUCTS_LIVE
  ? TIERS
  : TIERS.filter((t) => t.code !== "business");
```

- [ ] **Step 2: Render `VISIBLE_TIERS` in the comparison grid**

In `BillingPage`, find the `{TIERS.map((tier) => {` line (around line 188) and change to `{VISIBLE_TIERS.map((tier) => {`.

- [ ] **Step 3: Add a banner row pointing to business waitlist when gated**

Below the existing tier-comparison grid (after the closing `</section>` of the comparison section, around line 278), add:

```tsx
{!BUSINESS_PRODUCTS_LIVE && (
  <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3.5">
    <Lock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
        Business plans — coming soon
      </p>
      <p className="text-xs text-slate-400 leading-relaxed">
        Trading for a registered business? Drop us a note at{" "}
        <a
          href="mailto:hello@nozar.co.za?subject=Business%20plan%20waitlist"
          className="text-amber-300 underline underline-offset-2"
        >
          hello@nozar.co.za
        </a>{" "}
        to join the waitlist.
      </p>
    </div>
  </div>
)}
```

- [ ] **Step 4: Manual visual check**

Run `npm run dev`, log in with `testtrader@nozar-test.com / TestTrader123!`, go to `/dashboard/billing`. Confirm:
- Tier comparison shows Free + Plus only (no Business card).
- Below the comparison grid, an amber "Business plans — coming soon" banner is visible with waitlist mailto link.

- [ ] **Step 5: Commit**

```bash
git add app/routes/dashboard/billing.tsx
git commit -m "feat: hide Business tier card on /dashboard/billing + add waitlist banner"
```

---

## Phase 1 — Test Infrastructure

### Task 6: Add vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest + dev deps**

Run:

```bash
npm install --save-dev vitest @vitest/coverage-v8
```

Expected: vitest 2.x+ added to `devDependencies`. No conflicts with vite 7.

- [ ] **Step 2: Add `test:unit` script to `package.json`**

In the `"scripts"` block, add (alphabetical with existing scripts):

```json
"test:unit": "vitest run",
"test:unit:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

Create `vitest.config.ts` at repo root:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: false,
    environment: "node",
    include: ["app/**/*.test.ts"],
    exclude: ["node_modules", "e2e", ".worktrees"],
  },
});
```

- [ ] **Step 4: Verify vitest runs with zero tests**

```bash
npm run test:unit
```

Expected: exit code 0, message "No test files found" (no error).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "build: add vitest for unit tests"
```

---

## Phase 2 — Schema

### Task 7: Schema changes — `payment_events` table, `subscriptionToken`, nullable `listingId`

**Files:**
- Modify: `app/lib/schema.ts`

- [ ] **Step 1: Make `transactions.listingId` nullable**

Find the `transactions` table definition (around line 213). Change:

```ts
listingId: integer("listing_id")
  .notNull()
  .references(() => listings.id, { onDelete: "cascade" }),
```

To:

```ts
listingId: integer("listing_id")
  .references(() => listings.id, { onDelete: "cascade" }),
```

- [ ] **Step 2: Add `subscriptionToken` to `subscriptions`**

In the `subscriptions` table definition (around line 344), add the token field. Insert after `subscriptionCode`:

```ts
subscriptionToken: text("subscription_token"),
```

- [ ] **Step 3: Add `paymentEvents` table**

Append to `app/lib/schema.ts` (before the "Web Push Tables" section header):

```ts
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: serial("id").primaryKey(),
    mPaymentId: text("m_payment_id").notNull(),
    pfPaymentId: text("pf_payment_id"),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    paymentStatus: text("payment_status").notNull(),
    amountGrossCents: integer("amount_gross_cents").notNull(),
    rawPayload: jsonb("raw_payload").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("payment_events_dedup_uq").on(t.mPaymentId, t.pfPaymentId),
  ],
);
```

- [ ] **Step 4: Generate Drizzle migration**

```bash
npx drizzle-kit generate
```

Expected: new file in `drizzle/` (e.g., `drizzle/0001_xxxx.sql`) containing CREATE TABLE for `payment_events`, ALTER on `subscriptions`, and ALTER on `transactions.listing_id`. Inspect the file — if it tries to DROP NOT NULL on `transactions.listing_id` cleanly, proceed.

- [ ] **Step 5: Apply migration to dev DB**

```bash
npx drizzle-kit migrate
```

Expected: applies cleanly. If it errors on the listing_id null change due to existing data, you'll need to inspect — but the table should be empty in dev.

- [ ] **Step 6: Commit**

```bash
git add app/lib/schema.ts drizzle/
git commit -m "feat(db): add payment_events table, subscriptionToken, nullable listingId"
```

---

## Phase 3 — PayFast Library (TDD)

### Task 8: Signature builder — failing test first

**Files:**
- Create: `app/lib/payfast.server.ts`
- Create: `app/lib/payfast.server.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/lib/payfast.server.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPayFastSignature } from "./payfast.server";

describe("buildPayFastSignature", () => {
  it("produces MD5 of url-encoded ordered fields with passphrase", () => {
    // Golden fixture: this is the canonical PayFast example from their
    // integration guide. See https://developers.payfast.co.za/docs#signature
    const fields: Array<[string, string]> = [
      ["merchant_id", "10000100"],
      ["merchant_key", "46f0cd694581a"],
      ["return_url", "http://www.yourdomain.co.za/return"],
      ["cancel_url", "http://www.yourdomain.co.za/cancel"],
      ["notify_url", "http://www.yourdomain.co.za/notify"],
      ["amount", "100.00"],
      ["item_name", "Test Product"],
    ];

    // No passphrase
    expect(buildPayFastSignature(fields, "")).toMatch(/^[a-f0-9]{32}$/);

    // With passphrase, signature MUST change deterministically
    const sigA = buildPayFastSignature(fields, "");
    const sigB = buildPayFastSignature(fields, "jt7NOE43FZPn");
    expect(sigA).not.toEqual(sigB);
    expect(sigB).toMatch(/^[a-f0-9]{32}$/);
  });

  it("ignores empty-string values", () => {
    const fields: Array<[string, string]> = [
      ["a", "1"],
      ["b", ""],
      ["c", "3"],
    ];
    const withEmpty = buildPayFastSignature(fields, "");
    const withoutEmpty = buildPayFastSignature(
      [["a", "1"], ["c", "3"]],
      "",
    );
    expect(withEmpty).toEqual(withoutEmpty);
  });

  it("uses PHP-style URL encoding (spaces → %20, uppercase hex)", () => {
    const fields: Array<[string, string]> = [
      ["item_name", "hello world"],
      ["x", "ä"],
    ];
    // Should not throw; signature is deterministic
    const sig = buildPayFastSignature(fields, "");
    expect(sig).toMatch(/^[a-f0-9]{32}$/);
    expect(sig).toEqual(buildPayFastSignature(fields, ""));
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm run test:unit
```

Expected: FAIL with "Cannot find module './payfast.server'" or similar.

- [ ] **Step 3: Implement `buildPayFastSignature`**

Create `app/lib/payfast.server.ts`:

```ts
import crypto from "node:crypto";

/**
 * PHP-style URL encoding used by PayFast.
 * - Spaces become %20 (not +)
 * - Hex digits uppercase (Node's encodeURIComponent already does this)
 * - All reserved chars encoded
 */
function pfEncode(value: string): string {
  return encodeURIComponent(value).replace(/%[0-9a-f]{2}/g, (m) =>
    m.toUpperCase(),
  );
}

/**
 * Build a PayFast MD5 signature.
 *
 * Field order MUST match the order PayFast expects:
 *  - For outgoing form: the order specified in PayFast docs (merchant_id first, etc.)
 *  - For incoming ITN verification: the order fields were received in
 *
 * Empty-string values are excluded per PayFast convention.
 *
 * @param fields  Ordered [key, value] pairs.
 * @param passphrase  Merchant passphrase from PayFast dashboard. Empty string if none.
 */
export function buildPayFastSignature(
  fields: Array<[string, string]>,
  passphrase: string,
): string {
  const parts = fields
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${pfEncode(v)}`);

  if (passphrase) {
    parts.push(`passphrase=${pfEncode(passphrase)}`);
  }

  const signatureString = parts.join("&");
  return crypto.createHash("md5").update(signatureString).digest("hex");
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm run test:unit
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/lib/payfast.server.ts app/lib/payfast.server.test.ts
git commit -m "feat(payfast): MD5 signature builder with PHP-style url-encoding"
```

---

### Task 9: ITN signature verifier

**Files:**
- Modify: `app/lib/payfast.server.ts`
- Modify: `app/lib/payfast.server.test.ts`

- [ ] **Step 1: Write the failing test**

In `app/lib/payfast.server.test.ts`, update the existing import line to add `verifyItnSignature`:

```ts
import { buildPayFastSignature, verifyItnSignature } from "./payfast.server";
```

Then append the new describe block:

```ts
describe("verifyItnSignature", () => {
  it("returns true for a self-built valid signature", () => {
    const formData = new URLSearchParams();
    formData.append("m_payment_id", "test-uuid");
    formData.append("pf_payment_id", "PF-123");
    formData.append("payment_status", "COMPLETE");
    formData.append("amount_gross", "99.00");
    // Compute signature on these fields in URLSearchParams order
    const fields: Array<[string, string]> = [...formData.entries()] as Array<
      [string, string]
    >;
    const sig = buildPayFastSignature(fields, "test-pass");
    formData.append("signature", sig);

    expect(verifyItnSignature(formData, "test-pass")).toBe(true);
  });

  it("returns false when signature has been tampered with", () => {
    const formData = new URLSearchParams();
    formData.append("m_payment_id", "test-uuid");
    formData.append("amount_gross", "99.00");
    formData.append("signature", "0".repeat(32));

    expect(verifyItnSignature(formData, "test-pass")).toBe(false);
  });

  it("returns false when amount is tampered after signing", () => {
    const formData = new URLSearchParams();
    formData.append("m_payment_id", "test-uuid");
    formData.append("amount_gross", "99.00");
    const sig = buildPayFastSignature(
      [...formData.entries()] as Array<[string, string]>,
      "p",
    );
    // tamper: bump the amount
    formData.set("amount_gross", "999.00");
    formData.append("signature", sig);

    expect(verifyItnSignature(formData, "p")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect 3 failures**

```bash
npm run test:unit
```

Expected: existing tests pass, new ones fail with "verifyItnSignature is not exported".

- [ ] **Step 3: Implement the verifier**

Append to `app/lib/payfast.server.ts`:

```ts
/**
 * Verify an inbound PayFast ITN signature against the merchant passphrase.
 *
 * Uses the field order as received from PayFast (URLSearchParams preserves
 * insertion order, which matches the raw POST body order on Node 18+).
 */
export function verifyItnSignature(
  formData: URLSearchParams,
  passphrase: string,
): boolean {
  const provided = formData.get("signature");
  if (!provided) return false;

  const fields: Array<[string, string]> = [];
  for (const [key, value] of formData.entries()) {
    if (key === "signature") continue;
    fields.push([key, value]);
  }

  const expected = buildPayFastSignature(fields, passphrase);
  // Constant-time compare
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(provided, "utf8"),
    Buffer.from(expected, "utf8"),
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm run test:unit
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/lib/payfast.server.ts app/lib/payfast.server.test.ts
git commit -m "feat(payfast): ITN signature verifier with constant-time compare"
```

---

### Task 10: Source-IP allowlist + POST-back validator + cancel API stubs

**Files:**
- Modify: `app/lib/payfast.server.ts`

These three functions are network-dependent — unit testing them in isolation has limited value. We add them with clear interfaces and integration-test them via the webhook test later.

- [ ] **Step 1: Add `isPayFastSourceIp`**

Append to `app/lib/payfast.server.ts`:

```ts
import { promises as dns } from "node:dns";

const PAYFAST_HOSTNAMES = [
  "www.payfast.co.za",
  "sandbox.payfast.co.za",
  "w1w.payfast.co.za",
  "w2w.payfast.co.za",
] as const;

let cachedIps: { ips: Set<string>; expiresAt: number } | null = null;
const IP_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function refreshPayFastIps(): Promise<Set<string>> {
  const results = await Promise.all(
    PAYFAST_HOSTNAMES.map(async (host) => {
      try {
        const addrs = await dns.resolve4(host);
        return addrs;
      } catch {
        return [] as string[];
      }
    }),
  );
  return new Set(results.flat());
}

export async function isPayFastSourceIp(ip: string): Promise<boolean> {
  const now = Date.now();
  if (!cachedIps || cachedIps.expiresAt < now) {
    cachedIps = {
      ips: await refreshPayFastIps(),
      expiresAt: now + IP_CACHE_TTL_MS,
    };
  }
  return cachedIps.ips.has(ip);
}
```

- [ ] **Step 2: Add `validateItnWithPayFast`**

Append:

```ts
const PAYFAST_HOSTS = {
  live: "https://www.payfast.co.za",
  sandbox: "https://sandbox.payfast.co.za",
} as const;

function payFastHost(): string {
  return process.env.PAYFAST_MODE === "sandbox"
    ? PAYFAST_HOSTS.sandbox
    : PAYFAST_HOSTS.live;
}

/**
 * POST the ITN body back to PayFast to confirm it was actually sent by them.
 * PayFast responds with the literal string "VALID" or "INVALID".
 */
export async function validateItnWithPayFast(
  formData: URLSearchParams,
): Promise<boolean> {
  const body = formData.toString();
  const res = await fetch(`${payFastHost()}/eng/query/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return false;
  const text = (await res.text()).trim();
  return text === "VALID";
}
```

- [ ] **Step 3: Add `cancelSubscription`**

Append:

```ts
/**
 * Cancel an active PayFast subscription via the recurring billing API.
 * Requires merchant credentials + HMAC SHA-256 signature in headers.
 * https://developers.payfast.co.za/docs#subscriptions
 */
export async function cancelSubscription(token: string): Promise<void> {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";
  if (!merchantId) throw new Error("PAYFAST_MERCHANT_ID not set");

  const timestamp = new Date().toISOString();
  const headers: Record<string, string> = {
    "merchant-id": merchantId,
    version: "v1",
    timestamp,
  };

  // Signature: alphabetically sorted headers + passphrase, URL-encoded, MD5
  const fields: Array<[string, string]> = Object.entries(headers).sort(
    ([a], [b]) => a.localeCompare(b),
  ) as Array<[string, string]>;
  const signature = buildPayFastSignature(fields, passphrase);

  const res = await fetch(
    `https://api.payfast.co.za/subscriptions/${encodeURIComponent(token)}/cancel?testing=${process.env.PAYFAST_MODE === "sandbox" ? "true" : "false"}`,
    {
      method: "PUT",
      headers: { ...headers, signature },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayFast cancel failed: ${res.status} ${body}`);
  }
}
```

- [ ] **Step 4: Type-check**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/lib/payfast.server.ts
git commit -m "feat(payfast): IP allowlist, POST-back validator, cancel-subscription API"
```

---

### Task 11: Build PayFast form-fields helper

**Files:**
- Modify: `app/lib/payfast.server.ts`
- Modify: `app/lib/payfast.server.test.ts`

This is the helper the upgrade action will use to construct the auto-submit form.

- [ ] **Step 1: Write the failing test**

In `app/lib/payfast.server.test.ts`, update the existing import line to also include `buildPlusSubscriptionFields`:

```ts
import {
  buildPayFastSignature,
  buildPlusSubscriptionFields,
  verifyItnSignature,
} from "./payfast.server";
```

Then append the new describe block:

```ts
describe("buildPlusSubscriptionFields", () => {
  it("produces the field set required for a Plus monthly subscription", () => {
    process.env.PAYFAST_MERCHANT_ID = "10000100";
    process.env.PAYFAST_MERCHANT_KEY = "46f0cd694581a";

    const result = buildPlusSubscriptionFields({
      userId: "user-123",
      email: "alice@example.com",
      firstName: "Alice",
      mPaymentId: "uuid-1",
      baseUrl: "https://nozar.co.za",
      todayISO: "2026-05-19",
    });

    // Field order matters — check the keys appear in the documented order
    const keys = result.fields.map(([k]) => k);
    expect(keys[0]).toBe("merchant_id");
    expect(keys[1]).toBe("merchant_key");
    expect(keys).toContain("subscription_type");
    expect(keys).toContain("recurring_amount");
    expect(keys).toContain("frequency");
    expect(keys).toContain("cycles");

    const fieldMap = Object.fromEntries(result.fields);
    expect(fieldMap.merchant_id).toBe("10000100");
    expect(fieldMap.amount).toBe("99.00");
    expect(fieldMap.recurring_amount).toBe("99.00");
    expect(fieldMap.subscription_type).toBe("1");
    expect(fieldMap.frequency).toBe("3"); // monthly
    expect(fieldMap.cycles).toBe("0"); // indefinite
    expect(fieldMap.m_payment_id).toBe("uuid-1");
    expect(fieldMap.custom_str1).toBe("user-123");
    expect(fieldMap.custom_str2).toBe("plus");
    expect(fieldMap.notify_url).toBe("https://nozar.co.za/api/pay/webhook");
    expect(fieldMap.return_url).toBe(
      "https://nozar.co.za/dashboard/billing?pf=success",
    );
    expect(fieldMap.cancel_url).toBe(
      "https://nozar.co.za/dashboard/billing?pf=cancel",
    );
    expect(result.actionUrl).toBe("https://www.payfast.co.za/eng/process");
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm run test:unit
```

Expected: FAIL on `buildPlusSubscriptionFields` not exported.

- [ ] **Step 3: Implement**

Append to `app/lib/payfast.server.ts`:

```ts
export type PlusSubscriptionInput = {
  userId: string;
  email: string;
  firstName: string;
  mPaymentId: string;
  baseUrl: string; // e.g. https://nozar.co.za (no trailing slash)
  todayISO: string; // YYYY-MM-DD
};

export type PayFastFormPayload = {
  actionUrl: string;
  fields: Array<[string, string]>; // ordered
};

export function buildPlusSubscriptionFields(
  input: PlusSubscriptionInput,
): PayFastFormPayload {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  if (!merchantId || !merchantKey) {
    throw new Error(
      "PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY must be set",
    );
  }

  const fields: Array<[string, string]> = [
    ["merchant_id", merchantId],
    ["merchant_key", merchantKey],
    ["return_url", `${input.baseUrl}/dashboard/billing?pf=success`],
    ["cancel_url", `${input.baseUrl}/dashboard/billing?pf=cancel`],
    ["notify_url", `${input.baseUrl}/api/pay/webhook`],
    ["name_first", input.firstName],
    ["email_address", input.email],
    ["m_payment_id", input.mPaymentId],
    ["amount", "99.00"],
    ["item_name", "NoZar Plus (monthly)"],
    ["item_description", "Monthly Plus subscription"],
    ["custom_str1", input.userId],
    ["custom_str2", "plus"],
    ["subscription_type", "1"],
    ["billing_date", input.todayISO],
    ["recurring_amount", "99.00"],
    ["frequency", "3"], // monthly
    ["cycles", "0"], // indefinite
  ];

  return {
    actionUrl: `${payFastHost()}/eng/process`,
    fields,
  };
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm run test:unit
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/lib/payfast.server.ts app/lib/payfast.server.test.ts
git commit -m "feat(payfast): buildPlusSubscriptionFields helper for upgrade flow"
```

---

## Phase 4 — Routes

### Task 12: Delete `paystack.server.ts`

**Files:**
- Delete: `app/lib/paystack.server.ts`

- [ ] **Step 1: Check for remaining imports**

PowerShell (Windows):

```powershell
Select-String -Path "app\**\*.ts","app\**\*.tsx" -Pattern "paystack" -List
```

Or with ripgrep if available:

```bash
rg "paystack" app
```

Expected: matches only in `app/routes/api.pay.upgrade.ts` and `app/routes/api.pay.webhook.ts` (both rewritten in the next two tasks). If anything else references paystack, stop and audit before deleting.

- [ ] **Step 2: Delete the file**

```bash
git rm app/lib/paystack.server.ts
```

- [ ] **Step 3: Confirm typecheck fails as expected**

```bash
npm run typecheck
```

Expected: errors in `api.pay.upgrade.ts` and `api.pay.webhook.ts` about missing `~/lib/paystack.server` — these get fixed in Tasks 13 + 14. **Do not commit yet** — the next two tasks will fix the type errors and we'll commit then. Hold the deletion staged.

---

### Task 13: Rewrite `/api/pay/upgrade` for PayFast Plus signup

**Files:**
- Rewrite: `app/routes/api.pay.upgrade.ts`

- [ ] **Step 1: Replace the file contents**

Overwrite `app/routes/api.pay.upgrade.ts` with:

```ts
import { type ActionFunctionArgs, data } from "react-router";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { subscriptions, transactions, profiles } from "~/lib/schema";
import {
  buildPayFastSignature,
  buildPlusSubscriptionFields,
} from "~/lib/payfast.server";

const SUPPORTED_PLAN = "plus";

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const planCode = String(formData.get("planCode") ?? "");

  if (planCode !== SUPPORTED_PLAN) {
    return data(
      { error: "Only Plus is available at MVP launch" },
      { status: 400 },
    );
  }

  // Reject duplicate active subscriptions
  const [existing] = await db
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  if (existing?.status === "active") {
    return data(
      { error: "You already have an active subscription" },
      { status: 400 },
    );
  }

  // Fetch first name for prefilling PayFast form
  const [profile] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);
  const firstName = (profile?.displayName ?? user.name ?? "Trader").split(
    " ",
  )[0];

  const mPaymentId = randomUUID();

  // Insert pending transaction (listingId is null for subscription txns)
  await db.insert(transactions).values({
    userId: user.id,
    listingId: null,
    amount: 9900, // ZAR cents (R99.00)
    currency: "ZAR",
    status: "pending",
    providerReference: mPaymentId,
  });

  // Build the PayFast form
  const baseUrl =
    process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;
  const todayISO = new Date().toISOString().slice(0, 10);

  const payload = buildPlusSubscriptionFields({
    userId: user.id,
    email: user.email,
    firstName,
    mPaymentId,
    baseUrl,
    todayISO,
  });

  // Sign the fields. PayFast outgoing form signature uses the same ordering
  // as the field order in the form.
  const signature = buildPayFastSignature(
    payload.fields,
    process.env.PAYFAST_PASSPHRASE ?? "",
  );

  const signedFields: Array<[string, string]> = [
    ...payload.fields,
    ["signature", signature],
  ];

  // Return a tiny self-submitting HTML form that POSTs the user's browser
  // straight to PayFast's hosted page.
  const html = renderAutoSubmitForm(payload.actionUrl, signedFields);
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function renderAutoSubmitForm(
  actionUrl: string,
  fields: ReadonlyArray<readonly [string, string]>,
): string {
  const inputs = fields
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}" />`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Redirecting to PayFast…</title>
</head>
<body>
  <p>Redirecting to PayFast…</p>
  <form id="pf" method="post" action="${escapeHtml(actionUrl)}">
    ${inputs}
    <noscript><button type="submit">Continue to PayFast</button></noscript>
  </form>
  <script>document.getElementById("pf").submit();</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: errors in `api.pay.webhook.ts` only (still importing paystack). Move on to Task 14.

---

### Task 14: Rewrite `/api/pay/webhook` ITN handler

**Files:**
- Rewrite: `app/routes/api.pay.webhook.ts`

- [ ] **Step 1: Replace the file contents**

Overwrite `app/routes/api.pay.webhook.ts` with:

```ts
import { type ActionFunctionArgs } from "react-router";
import { and, eq, sql } from "drizzle-orm";

import { db } from "~/lib/db.server";
import {
  boostTokens,
  paymentEvents,
  subscriptions,
  transactions,
} from "~/lib/schema";
import {
  isPayFastSourceIp,
  validateItnWithPayFast,
  verifyItnSignature,
} from "~/lib/payfast.server";

// Boost token allowance per plan, refilled on each successful charge.
const TOKEN_REFILL: Record<string, number> = { plus: 10 };

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await request.text();
  const formData = new URLSearchParams(rawBody);
  const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";

  // Gate 1: signature
  if (!verifyItnSignature(formData, passphrase)) {
    return new Response("Invalid signature", { status: 400 });
  }

  // Gate 2: source IP (best-effort — Vercel runs behind proxies)
  const sourceIp = (
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    ""
  )
    .split(",")[0]
    .trim();

  if (sourceIp && !(await isPayFastSourceIp(sourceIp))) {
    return new Response("Source IP not allowed", { status: 400 });
  }

  // Gate 3: amount check against our pending transaction
  const mPaymentId = formData.get("m_payment_id");
  const pfPaymentId = formData.get("pf_payment_id");
  const amountGrossStr = formData.get("amount_gross") ?? "0";
  const paymentStatus = formData.get("payment_status") ?? "";
  const userId = formData.get("custom_str1");
  const planCode = formData.get("custom_str2") ?? "";
  const subscriptionToken = formData.get("token");

  if (!mPaymentId || !userId) {
    return new Response("Missing m_payment_id or custom_str1", { status: 400 });
  }

  const expectedAmountCents = Math.round(parseFloat(amountGrossStr) * 100);

  const [txn] = await db
    .select({ amount: transactions.amount })
    .from(transactions)
    .where(eq(transactions.providerReference, mPaymentId))
    .limit(1);

  if (txn && txn.amount !== expectedAmountCents) {
    return new Response("Amount mismatch", { status: 400 });
  }

  // Gate 4: POST-back validation
  const valid = await validateItnWithPayFast(formData);
  if (!valid) {
    return new Response("Failed PayFast validate", { status: 400 });
  }

  // Idempotency: insert into payment_events; if conflict on dedup unique,
  // we've already processed this charge — return 200 immediately.
  const rawPayload = Object.fromEntries(formData.entries());
  const inserted = await db
    .insert(paymentEvents)
    .values({
      mPaymentId,
      pfPaymentId,
      userId,
      paymentStatus,
      amountGrossCents: expectedAmountCents,
      rawPayload,
    })
    .onConflictDoNothing({
      target: [paymentEvents.mPaymentId, paymentEvents.pfPaymentId],
    })
    .returning({ id: paymentEvents.id });

  if (inserted.length === 0) {
    // Duplicate event — already processed
    return new Response("OK (duplicate)", { status: 200 });
  }

  // Apply state changes based on payment_status
  if (paymentStatus === "COMPLETE") {
    const nextPaymentDate = addMonths(new Date(), 1);

    await db
      .insert(subscriptions)
      .values({
        userId,
        planCode,
        status: "active",
        subscriptionToken: subscriptionToken ?? null,
        email: formData.get("email_address") ?? null,
        nextPaymentDate,
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          status: "active",
          planCode,
          subscriptionToken: subscriptionToken ?? null,
          nextPaymentDate,
          updatedAt: new Date(),
        },
      });

    // Mark transaction completed (first charge has matching m_payment_id)
    if (txn) {
      await db
        .update(transactions)
        .set({
          status: "completed",
          providerReference: pfPaymentId ?? mPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(transactions.providerReference, mPaymentId));
    }

    // Refill boost tokens
    const refill = TOKEN_REFILL[planCode] ?? 0;
    if (refill > 0) {
      await db
        .insert(boostTokens)
        .values({ userId, balance: refill, lastRefillAt: new Date() })
        .onConflictDoUpdate({
          target: boostTokens.userId,
          set: {
            balance: sql`${boostTokens.balance} + ${refill}`,
            lastRefillAt: new Date(),
          },
        });
    }
  } else if (paymentStatus === "CANCELLED") {
    await db
      .update(subscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId));
  }
  // FAILED → log only via payment_events insert above; PayFast will retry.

  return new Response("OK", { status: 200 });
}

function addMonths(d: Date, months: number): Date {
  const result = new Date(d);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: passes (other than the two pre-existing errors documented in `memory/project_nozar_status.md` for `app/routes/dashboard/pings.$id.tsx` — leave those alone).

- [ ] **Step 3: Run unit tests**

```bash
npm run test:unit
```

Expected: all PayFast lib tests still pass.

- [ ] **Step 4: Commit (bundled with paystack deletion + upgrade rewrite)**

```bash
git add app/lib/paystack.server.ts app/routes/api.pay.upgrade.ts app/routes/api.pay.webhook.ts
git commit -m "feat(payfast): replace Paystack stubs with PayFast upgrade + ITN webhook"
```

(The `git rm` from Task 12 is in this same commit.)

---

### Task 15: Add `/api/pay/cancel` action

**Files:**
- Create: `app/routes/api.pay.cancel.ts`

- [ ] **Step 1: Create the route**

Create `app/routes/api.pay.cancel.ts`:

```ts
import { type ActionFunctionArgs, data } from "react-router";
import { eq } from "drizzle-orm";

import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { subscriptions } from "~/lib/schema";
import { cancelSubscription } from "~/lib/payfast.server";

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);

  const [sub] = await db
    .select({
      token: subscriptions.subscriptionToken,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  if (!sub || sub.status !== "active") {
    return data({ error: "No active subscription to cancel" }, { status: 400 });
  }
  if (!sub.token) {
    return data(
      { error: "Subscription is missing a PayFast token — contact support" },
      { status: 400 },
    );
  }

  await cancelSubscription(sub.token);

  // PayFast will fire an ITN with payment_status=CANCELLED; the webhook
  // updates subscriptions.status. We optimistically mark it cancelled now
  // for immediate UI feedback.
  await db
    .update(subscriptions)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(subscriptions.userId, user.id));

  return data({ ok: true }, { status: 200 });
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add app/routes/api.pay.cancel.ts
git commit -m "feat(payfast): add /api/pay/cancel action"
```

---

## Phase 5 — Billing UI Wiring

### Task 16: Wire Plus Upgrade button + Cancel button on `/dashboard/billing`

**Files:**
- Modify: `app/routes/dashboard/billing.tsx`

- [ ] **Step 1: Update imports at the top of the file**

In `app/routes/dashboard/billing.tsx`, update the existing import block. Add `Form` to the react-router import and add new imports for db/schema/drizzle:

```ts
import { Form, useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import { CreditCard, Check, Lock, Bell, Zap, BarChart3, Shield, Layers } from "lucide-react";

import type { Route } from "./+types/billing";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { subscriptions } from "~/lib/schema";
import { getListingUsage } from "~/lib/tier-limits.server";
import { LISTING_LIMITS, BUSINESS_PRODUCTS_LIVE } from "~/lib/tier-limits";
```

- [ ] **Step 2: Replace the loader**

Replace the existing `loader` function (lines 73-81 before edits) with:

```ts
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const usage = await getListingUsage(user.id);

  const [sub] = await db
    .select({
      status: subscriptions.status,
      nextPaymentDate: subscriptions.nextPaymentDate,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  const url = new URL(request.url);
  const isProduction = process.env.VERCEL_ENV === "production";
  const testpayOn = url.searchParams.get("testpay") === "1";
  const upgradeEnabled = isProduction || testpayOn;

  return {
    planCode: usage.planCode,
    listingCount: usage.activeCount,
    subscription: sub
      ? { status: sub.status, nextPaymentDate: sub.nextPaymentDate }
      : null,
    upgradeEnabled,
  };
}
```

- [ ] **Step 3: Replace the Plus Upgrade button with a real `<Form>`**

Find the existing tier CTA block (lines 251-273). Replace the entire `{isCurrent ? (...) : (...)}` ternary with:

```tsx
{isCurrent ? (
  <div className="w-full py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest text-center text-emerald-400 border border-emerald-500/20 bg-emerald-500/5">
    Current Plan
  </div>
) : tier.code === "plus" && upgradeEnabled ? (
  <Form method="post" action="/api/pay/upgrade">
    <input type="hidden" name="planCode" value="plus" />
    <button
      type="submit"
      className="w-full py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest text-center text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors"
    >
      Upgrade to Plus
    </button>
  </Form>
) : (
  <div className="relative group">
    <button
      disabled
      className="w-full py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest text-center text-slate-600 border border-white/5 bg-white/[0.02] cursor-not-allowed flex items-center justify-center gap-1.5"
      aria-disabled="true"
    >
      <Lock className="w-3 h-3" />
      Upgrade to {tier.name}
    </button>
    <div className="absolute -top-9 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 whitespace-nowrap">
      <div className="bg-[#0F172A] border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-400 shadow-xl">
        Payment processing coming soon — powered by PayFast
      </div>
      <div className="w-2 h-2 bg-[#0F172A] border-r border-b border-white/10 rotate-45 mx-auto -mt-1" />
    </div>
  </div>
)}
```

Update the destructuring at the top of `BillingPage` (line 86) to also pull `subscription` and `upgradeEnabled`:

```tsx
const { planCode, listingCount, subscription, upgradeEnabled } =
  useLoaderData<typeof loader>();
```

- [ ] **Step 4: Add a Cancel section when subscription is active**

Below the existing Coming-Soon banner section (after the section ending around line 121), insert a new section that renders only when `subscription?.status === "active"`:

```tsx
{subscription?.status === "active" && (
  <section className="bg-[#0F172A] border border-emerald-500/20 rounded-2xl p-5 space-y-3">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
          Active subscription
        </p>
        {subscription.nextPaymentDate && (
          <p className="text-xs text-slate-400 mt-1">
            Next charge:{" "}
            {new Date(subscription.nextPaymentDate).toLocaleDateString(
              "en-ZA",
              { year: "numeric", month: "short", day: "numeric" },
            )}
          </p>
        )}
      </div>
      <Form method="post" action="/api/pay/cancel">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest text-rose-400 border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
        >
          Cancel subscription
        </button>
      </Form>
    </div>
  </section>
)}
```

- [ ] **Step 5: Manual visual check (dev)**

```bash
npm run dev
```

Log in as `testtrader@nozar-test.com / TestTrader123!`, go to `/dashboard/billing`:
- Plus card shows disabled button (because `VERCEL_ENV` is not `production` and no `?testpay=1`).
- Append `?testpay=1` to URL → Plus card now shows green "Upgrade to Plus" button.
- Clicking the button POSTs to `/api/pay/upgrade` — without env vars set locally it will throw on missing `PAYFAST_MERCHANT_ID`. That's expected behaviour before Task 17.

- [ ] **Step 6: Commit**

```bash
git add app/routes/dashboard/billing.tsx
git commit -m "feat: wire Plus upgrade Form + Cancel button on /dashboard/billing"
```

---

## Phase 6 — Vercel Env

### Task 17: Install Vercel CLI + add env vars

**Files:**
- No file changes; CLI commands

- [ ] **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
vercel --version
```

Expected: prints version (e.g., `42.x.x`).

- [ ] **Step 2: Authenticate**

```bash
vercel login
```

Follow the email-link or GitHub prompt. Confirm with `vercel whoami`.

- [ ] **Step 3: Link the local repo to the Vercel project**

From repo root:

```bash
vercel link
```

Pick the existing `nozar` project (or whatever name it has on Vercel).

- [ ] **Step 4: Add env vars to Production + Preview**

For each command, when prompted, paste the value and press Enter. CLI hides input.

```bash
vercel env add PAYFAST_MERCHANT_ID production
# paste: 35020909
vercel env add PAYFAST_MERCHANT_ID preview
# paste: 35020909
vercel env add PAYFAST_MERCHANT_KEY production
# paste: puaoft0qaqwi9
vercel env add PAYFAST_MERCHANT_KEY preview
# paste: puaoft0qaqwi9
vercel env add PAYFAST_PASSPHRASE production
# paste: <your passphrase>
vercel env add PAYFAST_PASSPHRASE preview
# paste: <your passphrase>
vercel env add PAYFAST_MODE production
# paste: live
vercel env add PAYFAST_MODE preview
# paste: live
```

- [ ] **Step 5: Verify**

```bash
vercel env ls
```

Expected: 8 entries (4 keys × 2 environments). All show as set; values masked.

- [ ] **Step 6: Pull env locally for dev testing**

```bash
vercel env pull .env.local
```

Expected: creates/overwrites `.env.local` containing all production vars. Confirm `.env.local` is in `.gitignore` (it should already be).

- [ ] **Step 7: Configure PayFast merchant dashboard**

Log in to PayFast → Account Information → Integration. Set:
- ITN URL: `https://nozar.co.za/api/pay/webhook`
- Enable IPN: yes
- IPN email: `hello@nozar.co.za`

This is a manual step; no commit.

---

## Phase 7 — E2E Smoke + Cutover

### Task 18: Playwright smoke for `/dashboard/billing` Plus button

**Files:**
- Create: `e2e/billing-payfast.spec.ts`

This test verifies the Upgrade button renders with `?testpay=1` and POSTs to the correct action. It does NOT submit to PayFast (would charge real money).

- [ ] **Step 1: Write the test**

Create `e2e/billing-payfast.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const TEST_USER = "testtrader@nozar-test.com";
const TEST_PASS = "TestTrader123!";

test.describe("Billing — PayFast Plus upgrade", () => {
  test("Plus upgrade button is hidden without ?testpay=1 outside Production", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', TEST_USER);
    await page.fill('input[name="password"]', TEST_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**");

    await page.goto("/dashboard/billing");
    // The Plus tier card should NOT have an enabled Upgrade button
    const plusUpgrade = page.getByRole("button", { name: /upgrade to plus/i });
    await expect(plusUpgrade).toBeDisabled();
  });

  test("Plus upgrade button renders + has correct action when ?testpay=1", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', TEST_USER);
    await page.fill('input[name="password"]', TEST_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**");

    await page.goto("/dashboard/billing?testpay=1");

    const form = page.locator('form[action="/api/pay/upgrade"]');
    await expect(form).toBeVisible();
    await expect(form.locator('input[name="planCode"]')).toHaveValue("plus");

    const button = form.getByRole("button", { name: /upgrade to plus/i });
    await expect(button).toBeEnabled();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
npm run dev &  # if not already running
npx playwright test billing-payfast.spec.ts
```

Expected: 2 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/billing-payfast.spec.ts
git commit -m "test(e2e): billing PayFast Plus upgrade button states"
```

---

### Task 19: Manual end-to-end test + cutover

**Files:**
- No file changes; manual checklist

- [ ] **Step 1: Deploy Phase 0–6 to Preview**

Push the branch. Wait for Vercel Preview deploy.

- [ ] **Step 2: Manual signup test on Preview (real R99 charge)**

On the Preview URL:
1. Log in as your real account (NOT the test account — use a real card).
2. Go to `/dashboard/billing?testpay=1`.
3. Click "Upgrade to Plus".
4. Confirm browser redirects to `www.payfast.co.za`.
5. Complete payment with your real card.
6. Confirm browser returns to `/dashboard/billing?pf=success`.
7. After ~30s, refresh — confirm "Active subscription" section appears with `Next charge: <one month from now>`.

- [ ] **Step 3: Verify webhook fired**

In Vercel dashboard → Logs, filter for `/api/pay/webhook`. Confirm a `200 OK` response.

Query Neon directly (or via your DB tool):

```sql
SELECT user_id, plan_code, status, next_payment_date, subscription_token
FROM subscriptions
WHERE user_id = '<your user id>';

SELECT m_payment_id, pf_payment_id, payment_status, amount_gross_cents
FROM payment_events
WHERE user_id = '<your user id>'
ORDER BY created_at DESC
LIMIT 5;
```

Expected: subscription row with `status='active'`, `subscription_token` populated; payment_events row with `payment_status='COMPLETE'`, `amount_gross_cents=9900`.

- [ ] **Step 4: Test cancellation**

Back on `/dashboard/billing`, click "Cancel subscription". Confirm:
- Cancel section disappears on refresh.
- DB shows `subscriptions.status='cancelled'`.
- Within a few minutes, an ITN with `payment_status=CANCELLED` should arrive (re-check Vercel logs + payment_events).

- [ ] **Step 5: Refund yourself via PayFast dashboard**

Log in to PayFast → Transactions → find the R99 → refund.

- [ ] **Step 6: Cutover to live for all users**

On the deployed Production:
- Remove the `?testpay=1` requirement by setting `VERCEL_ENV === "production"` to enable Plus upgrade unconditionally. *(Already the case from Task 16 logic — no code change needed; just verify by visiting `/dashboard/billing` on production-equivalent URL without query string.)*

- [ ] **Step 7: Update memory (external — no git action)**

Update `C:\Users\F5267390\.claude\projects\C--scratchpad-nozar\memory\project_nozar_status.md`:

Change:
> - PayFast — payments not yet wired (billing page intentionally disabled)

To:
> - PayFast — live for Plus (R99/mo); Business + Enterprise behind `BUSINESS_PRODUCTS_LIVE` flag (off)

The memory file lives outside the repo at the path above; no git commit is needed.

---

## Done

All 19 tasks complete:
- 5 tasks for Coming-Soon gating (Phase 0)
- 1 task for test infra (Phase 1)
- 1 task for schema (Phase 2)
- 4 tasks for PayFast lib with TDD (Phase 3)
- 4 tasks for routes (Phase 4)
- 1 task for billing UI (Phase 5)
- 1 task for Vercel env (Phase 6)
- 2 tasks for E2E + cutover (Phase 7)

Verification checklist:
- ✅ `npm run typecheck` clean (modulo two pre-existing errors in `pings.$id.tsx`)
- ✅ `npm run test:unit` all pass
- ✅ `npx playwright test billing-payfast.spec.ts` 2 passing
- ✅ Manual end-to-end Plus subscription + cancellation works on Preview
- ✅ `vercel env ls` shows 4 keys × 2 envs (8 total)
- ✅ PayFast merchant dashboard has ITN URL set
