# PayFast Integration & Business-Products Gating — Design Spec

**Date:** 2026-05-19
**Status:** Approved, ready for implementation plan
**Author:** Brainstorming session with Leroy Adonis

## Goals

1. Replace Paystack stubs with a working PayFast integration for the **Plus (R99/mo)** tier — the only paid product at MVP launch.
2. Hide all business-related products behind a single feature flag (`BUSINESS_PRODUCTS_LIVE = false`) and present them as "Coming soon" across landing, billing, and FAQ surfaces.
3. Add PayFast credentials to Vercel Production and Preview environments.

## Non-goals

- Business (R299) and Enterprise tiers — explicitly out of MVP launch.
- Listing-level / one-off payments — `transactions.listingId` becomes nullable but no listing-payment product ships.
- Sandbox/staging PayFast — using live credentials with opt-in guard for Preview.
- Email receipts beyond what PayFast sends — Resend integration left for a later spec.

## Decisions locked during brainstorming

| Question | Decision |
|---|---|
| MVP paid scope | Plus (R99/mo) only |
| PayFast environment | Live account, passphrase configured |
| Recurring model | Native PayFast `subscription_type=1` (auto-charge) |
| Existing Paystack code | Replace in place: delete `paystack.server.ts`, rewrite `api.pay.*` routes |
| Coming-Soon gating | Single feature flag `BUSINESS_PRODUCTS_LIVE` in `tier-limits.ts` |
| Vercel env vars | Install Vercel CLI + `vercel env add` for each var |
| Business surfaces to gate | All pricing cards (landing + billing), landing dual-economy card, FAQ Q8, Plus copy sweep |

## Section 1 — Feature flag & coming-soon surfaces

Add to `app/lib/tier-limits.ts`:
```ts
export const BUSINESS_PRODUCTS_LIVE = false; // Flip to true when business launches
```

Surfaces to gate (all branch on `BUSINESS_PRODUCTS_LIVE`):

| File | Change when `false` |
|---|---|
| `app/components/landing/pricing-section.tsx:62-90` | Business + Enterprise cards: disabled CTA pill, dim card, `Lock` icon, "Coming soon" label |
| `app/routes/dashboard/billing.tsx:44-60` | Business card in TIERS: locked / coming-soon treatment matching the existing Plus pattern |
| `app/routes/landing.tsx:462-499` | "For businesses" card: keep visible; replace "See business plans" CTA with `mailto:hello@nozar.co.za?subject=Business%20plan%20waitlist` "Notify me at launch"; add "Coming soon" badge top-right |
| `app/components/landing/faq-section.tsx:54-58` (Q8) | Rewrite answer: "Business plans are launching soon. For now NoZar is open to individual traders. Drop us a note at hello@nozar.co.za if you want to be on the waitlist." |
| `app/components/landing/faq-section.tsx:20-21` (Q2) | Strip "business tools" claim; sweep any other copy implying business is live |

Hero, trust badges, safety section — unchanged.

## Section 2 — PayFast subscription flow

### New file: `app/lib/payfast.server.ts`

Pure functions, no React:
- `buildSignedFormFields(input: PayFastFormInput): Record<string, string>`
- `verifyItnSignature(formData: URLSearchParams): boolean`
- `validateItnWithPayFast(formData: URLSearchParams): Promise<boolean>` — server-to-server POST-back
- `isPayFastSourceIp(ip: string): Promise<boolean>`
- `cancelSubscription(token: string): Promise<void>`

### Signup flow (Plus tier only at MVP)

1. User on `/dashboard/billing` clicks **Upgrade to Plus**.
2. Form POSTs to `/api/pay/upgrade` action with `planCode=plus`.
3. Action:
   - `requireAuth` → user
   - Reject if user already has `subscriptions.status='active'`
   - Generate `m_payment_id = randomUUID()`
   - Insert `transactions` row: `userId, amount=99, currency=ZAR, status='pending', providerReference=m_payment_id`
   - Build PayFast fields:
     - `merchant_id`, `merchant_key`
     - `return_url`, `cancel_url`, `notify_url` (absolute, from `BETTER_AUTH_URL`)
     - `name_first`, `email_address` (from user/profile)
     - `m_payment_id` (our UUID — primary idempotency key)
     - `amount=99.00`, `item_name=NoZar Plus (monthly)`, `item_description=Monthly Plus subscription`
     - `subscription_type=1`, `billing_date=<today YYYY-MM-DD>`, `recurring_amount=99.00`, `frequency=3` (monthly), `cycles=0` (indefinite)
     - `custom_str1=userId`, `custom_str2=plus`
     - `signature` = MD5(url-encoded sorted non-empty fields + `&passphrase=...`)
4. Action returns a self-submitting HTML form pointing at `https://www.payfast.co.za/eng/process`.
5. User completes payment on PayFast hosted page.
6. PayFast browser-redirects to `return_url` = `/dashboard/billing?pf=success` → page shows pending banner.
7. PayFast server-POSTs ITN to `notify_url` = `/api/pay/webhook`. **ITN is the source of truth**, not the return URL.

### Renewal flow

PayFast auto-charges monthly and fires an ITN with `payment_status=COMPLETE` and the original `m_payment_id` + a new `pf_payment_id`. Webhook treats it as a renewal: bump `nextPaymentDate`, refill `boostTokens` (existing logic stays).

### Cancellation flow

User clicks **Cancel** on `/dashboard/billing` → new action `/api/pay/cancel` calls PayFast `PUT /subscriptions/{token}/cancel`. ITN fires with cancellation; webhook sets `subscriptions.status='cancelled'`.

### Files touched

- **New:** `app/lib/payfast.server.ts`
- **Rewrite:** `app/routes/api.pay.upgrade.ts` (action body only; keep filename)
- **Rewrite:** `app/routes/api.pay.webhook.ts` (action body only; keep filename)
- **New:** `app/routes/api.pay.cancel.ts`
- **Update:** `app/routes/dashboard/billing.tsx` (wire Plus upgrade to real form POST; add cancel button when active)
- **Delete:** `app/lib/paystack.server.ts`

## Section 3 — Webhook security & validation

PayFast requires four independent checks per ITN. Skipping any is exploitable.

**1. Signature check (cheap, first gate)**
- Sort non-empty form fields alphabetically (exclude `signature`).
- PHP-style URL-encode each value (`%20` for space, uppercase hex).
- Concatenate `key=value&…`, append `&passphrase=<urlencoded PAYFAST_PASSPHRASE>`.
- `MD5(...)` must equal the incoming `signature`.

**2. Source IP allowlist (cheap, second gate)**
- Resolve `www.payfast.co.za`, `sandbox.payfast.co.za`, `w1w.payfast.co.za`, `w2w.payfast.co.za` at runtime.
- Compare to `x-forwarded-for` first hop (Vercel).

**3. Amount check (cheap, third gate)**
- Look up `transactions` row by `m_payment_id`. Compare `amount_gross` to stored amount. Mismatch → 400.

**4. POST-back validation (network, final gate)**
- POST full ITN body to `https://www.payfast.co.za/eng/query/validate`. Must respond `VALID`.

### Idempotency

- Primary key: `m_payment_id` (UUID we generated at signup).
- Composite dedup key for renewals: `(m_payment_id, pf_payment_id)` — stored in new `payment_events` table.
- Webhook handler: if dedup row exists → return 200 immediately (PayFast retries non-200).

### ITN payload handling

| `payment_status` | Action |
|---|---|
| `COMPLETE` (first) | Insert `subscriptions` row (status=active), set `nextPaymentDate`, refill `boostTokens` |
| `COMPLETE` (subsequent) | Update `subscriptions.nextPaymentDate`, refill `boostTokens` |
| `FAILED` | Log only; PayFast retries; after N fails it cancels |
| `CANCELLED` | Set `subscriptions.status='cancelled'` |

### Explicit non-behaviours

- Browser return URL never mutates state — UX only.
- PayFast subscription tokens never logged in plaintext.

## Section 4 — Data flow & schema

Existing tables (`subscriptions`, `boostTokens`, `transactions`) stay. One migration adds the audit log.

### New table: `payment_events`

```ts
export const paymentEvents = pgTable("payment_events", {
  id: serial("id").primaryKey(),
  mPaymentId: text("m_payment_id").notNull(),
  pfPaymentId: text("pf_payment_id"),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  paymentStatus: text("payment_status").notNull(),
  amountGross: integer("amount_gross_cents").notNull(),
  rawPayload: jsonb("raw_payload").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  unique("payment_events_dedup_uq").on(t.mPaymentId, t.pfPaymentId),
]);
```

### Edits to existing tables

- `subscriptions`: add `subscriptionToken text` (PayFast recurring token; needed for cancel API). Keep `subscriptionCode` (Paystack-legacy; drop in a later cleanup).
- `transactions`: drop `listingId` `notNull` constraint — make nullable. Subscription transactions aren't tied to a listing.

### Data flow — first successful charge

```
ITN → webhook
  → verify (sig, IP, amount, postback)
  → INSERT payment_events (dedup check)
  → UPSERT subscriptions (status=active, token, nextPaymentDate)
  → UPDATE transactions (status=completed, providerReference=pf_payment_id)
  → UPDATE boostTokens (balance += 10 for plus)
  → 200 OK
```

### Data flow — renewal

```
ITN → webhook → verify → dedup → UPDATE subscriptions.nextPaymentDate
                                → UPDATE boostTokens (+10)
                                → 200 OK
```

### Migrations

- `npx drizzle-kit generate` → creates SQL
- `npx drizzle-kit migrate` → applies to Neon
- Additive + one column nullability change. Safe to run live.

## Section 5 — Vercel env vars + rollout

### Env vars to add (Production + Preview)

| Key | Value | Env |
|---|---|---|
| `PAYFAST_MERCHANT_ID` | `35020909` | Production, Preview |
| `PAYFAST_MERCHANT_KEY` | `puaoft0qaqwi9` | Production, Preview |
| `PAYFAST_PASSPHRASE` | *(provided separately)* | Production, Preview |
| `PAYFAST_MODE` | `live` | Production, Preview |

`PAYFAST_MODE=live` flips the lib between `https://www.payfast.co.za` and `https://sandbox.payfast.co.za`.

### Preview safety

Preview hits live PayFast, so any Upgrade click is a real R99 charge. **Mitigation:** require `?testpay=1` query param on `/dashboard/billing` for the Upgrade button to render in Preview/non-Production envs. Avoids surprise charges from preview-deploy testing.

### Derived URLs (runtime)

- `NOTIFY_URL` = `${BETTER_AUTH_URL}/api/pay/webhook`
- `RETURN_URL` = `${BETTER_AUTH_URL}/dashboard/billing?pf=success`
- `CANCEL_URL` = `${BETTER_AUTH_URL}/dashboard/billing?pf=cancel`

### Rollout commands

After `npm i -g vercel`, `vercel login`, `vercel link`:

```sh
vercel env add PAYFAST_MERCHANT_ID production   # paste 35020909
vercel env add PAYFAST_MERCHANT_ID preview      # paste 35020909
vercel env add PAYFAST_MERCHANT_KEY production  # paste puaoft0qaqwi9
vercel env add PAYFAST_MERCHANT_KEY preview     # paste puaoft0qaqwi9
vercel env add PAYFAST_PASSPHRASE production    # paste passphrase
vercel env add PAYFAST_PASSPHRASE preview       # paste passphrase
vercel env add PAYFAST_MODE production          # paste "live"
vercel env add PAYFAST_MODE preview             # paste "live"
```

Then `vercel env pull .env.local` to mirror locally (gitignored).

### PayFast merchant dashboard

- Add `https://nozar.co.za/api/pay/webhook` as the ITN URL on merchant settings.
- Confirm IPN notifications enabled with `hello@nozar.co.za`.

### Phased deployment

1. **Phase 0 — Coming Soon gating (Section 1).** Ship first; zero risk, unblocks launch positioning. Single commit, easy revert.
2. **Phase 1 — PayFast core (Sections 2–4).** Schema migration → lib → routes → billing wiring. Until manual E2E passes, the Plus Upgrade button stays gated behind the existing "Coming soon" treatment (don't wire it to the new action yet).
3. **Phase 2 — Cutover.** Replace the Plus Upgrade button's `disabled` state with the real form POST. Manual end-to-end test: real R99 charge from your own account, refund via PayFast dashboard. Then announce.

### Testing

- **Unit tests:** `payfast.server.ts` signature builder vs PayFast doc golden fixtures.
- **Integration tests:** webhook handler with crafted ITN payloads — valid signature, invalid signature, replay attempt.
- **Manual E2E:** Preview deploy with `?testpay=1` and a real R99 charge, refunded.

## Risks

| Risk | Mitigation |
|---|---|
| Preview deploys hit live PayFast → accidental charges | `?testpay=1` query-string guard on the Upgrade button outside Production |
| ITN arrives before browser redirect (race) | Treat ITN as truth; `/dashboard/billing?pf=success` page shows pending state until DB shows active |
| User abandons mid-flow with `pending` transaction row | Sweep + expire pending transactions after 24h (cron — not in MVP scope, accept stale rows for now) |
| Schema migration on live DB | Additive + one nullability change; both safe under concurrent writes |
| Forgot to set PayFast ITN URL on merchant dashboard | Pre-launch checklist item; verify with a manual sandbox-style test |
| Business surface missed in gating sweep | `Grep` for `business`, `Business`, `CIPC`, `SARS` after Section 1 implementation |

## Out of scope (later specs)

- Email receipts via Resend after successful payment.
- Cron sweep for stale `pending` transactions.
- Self-serve plan downgrades / upgrades between Plus/Business.
- Refund handling automation (manual via PayFast dashboard for MVP).
- Sandbox environment with separate credentials.
- Business tier launch (re-enabling the feature flag).
