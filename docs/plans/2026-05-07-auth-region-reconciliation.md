# NoZar Auth + Regional MVP Reconciliation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Converge the live NoZar codebase on the approved auth/backend + regional MVP scope by preserving working React Router/Better Auth/Google Maps behavior, closing only real source-of-truth gaps, and reconciling region UX/data rules to Western Cape + Gauteng.

**Architecture:** Treat the current codebase as the execution baseline and the March plans as product/source-of-truth constraints, not as a greenfield build guide. Keep the existing React Router route-module structure, Better Auth cookie-session flow, Drizzle/Neon persistence, and profile-anchored radar behavior, then change only the places where live code diverges from the approved scope: region slugs/copy, first-visit region gating, province editing, and any auth/backend mismatch confirmed by audit.

**Tech Stack:** React Router v7 SSR route modules, React 19, Better Auth + `@better-auth/drizzle-adapter`, Drizzle ORM + Neon PostgreSQL, Google Maps JavaScript API, Tailwind CSS v4, TypeScript strict mode, Playwright E2E.

---

### Task 1: Audit approved scope against live code before editing

**Files:**
- Review: `docs/plans/2026-03-04-nozar-implementation-plan.md`
- Review: `docs/plans/2026-03-04-auth-database-maps-plan.md`
- Review: `docs/plans/2026-03-07-regional-mvp-plan.md`
- Review: `app/lib/regions.ts:1-62`
- Review: `app/lib/map-scope.ts:1-70`
- Review: `app/routes/dashboard.tsx:24-103,122-435`
- Review: `app/components/ui/region-prompt.tsx:1-59`
- Review: `app/components/ui/location-prompt-modal.tsx:1-243`
- Review: `app/routes/dashboard/home.tsx:51-153,157-520`
- Review: `app/routes/dashboard/map.tsx:53-148,151-414`
- Review: `app/routes/dashboard/profile.tsx:72-221,265-291,874-896`
- Review if needed: `app/lib/auth.server.ts:89-197`
- Review if needed: `app/routes/api.auth.$.ts:1-73`
- Review if needed: `app/routes/login.tsx:11-184`
- Review if needed: `app/routes/register.tsx:12-205`
- Review if needed: `app/routes/dashboard/verify-phone.tsx:30-124`
- Review if needed: `app/lib/schema.ts:13-260`

**Step 1: Build a keep/change/skip checklist**

Compare the approved March documents to the live code and explicitly classify each area:
- **Keep as-is** if live code already matches the approved scope.
- **Change now** if live code clearly diverges from the approved scope.
- **Skip for this reconciliation** if the older plan is superseded by newer working behavior that still satisfies the approved direction.

**Step 2: Confirm the key convergence rules**

Lock these decisions before editing:
- Better Auth remains **email/password + Google OAuth only**.
- `/dashboard/verify-phone` stays **post-login trust verification**, not a sign-in method.
- `app/lib/schema.ts` remains the schema source of truth unless the audit proves it is missing an approved requirement.
- Google Maps stays the authenticated map stack.
- Regional MVP remains **Western Cape + Gauteng**, with profile-derived province filtering and no new `region` database column.

**Step 3: Record conditional auth/backend follow-up**

If the audit finds no auth/backend divergence, mark Task 7 as **skip** before implementation starts. Do not reopen auth/backend code just because it exists in the older plan.

**Validation:**
- No command; this is a read-first blocking task.

**Parallelization note:** This task blocks all implementation work.

---

### Task 2: Normalize region source-of-truth utilities

**Files:**
- Modify: `app/lib/regions.ts:1-62`
- Modify: `app/lib/map-scope.ts:1-70`

**Step 1: Align region slugs and labels to the approved MVP**

Update the shared region constants so the canonical public region choices are:
- `western-cape`
- `gauteng`

The displayed labels and province values must match the approved docs exactly.

**Step 2: Preserve current-code compatibility**

Do not break existing preview/location flows while renaming region slugs. Keep backwards-compatible resolution for any legacy query param or in-memory usage that still references `cape-town` or `johannesburg`, then normalize everything back to the approved provincial slugs.

**Step 3: Keep map fallback logic intact**

`getClosestRegion`, `resolveRegion`, and `resolveMapScope` must still support:
- region fallback when no coordinates are saved
- profile-anchored map behavior when coordinates are saved
- province-derived routing without adding a new database field

**Validation:**
- Run: `npm run typecheck`
- Expected: PASS

**Parallelization note:** This task blocks Tasks 3-6.

---

### Task 3: Restore first-visit region gating at the dashboard layout level

**Files:**
- Modify: `app/routes/dashboard.tsx:24-103,122-435`
- Modify: `app/components/ui/region-prompt.tsx:1-59`
- Modify: `app/components/ui/location-prompt-modal.tsx:35-50`

**Step 1: Add an explicit `needsRegion` decision in the dashboard layout**

The layout already computes location state, but the approved regional MVP requires a **province-first** onboarding step. Make the layout derive whether the user has:
- no province, or
- a province outside the MVP list.

**Step 2: Render `RegionPrompt` before the geolocation modal**

The approved flow is:
1. pick Western Cape or Gauteng first
2. then optionally save precise device location

Do not let `LocationPromptModal` steal focus before region selection is complete.

**Step 3: Reconcile `setRegion` persistence**

Keep `setRegion` lightweight:
- accept only MVP provinces
- upsert the profile if needed
- preserve existing lat/lng and other profile data
- update only province-related fields unless a missing profile must be created

**Step 4: Fix prompt copy to match the approved scope**

`RegionPrompt` must stop implying full national rollout. Replace copy like “All 9 provinces available” with WC/GP-only MVP messaging and a coming-soon note for the rest of South Africa.

**Validation:**
- Run: `npm run typecheck`
- Expected: PASS
- Run: `npm run build`
- Expected: PASS

**Parallelization note:** After Task 2 lands, this task can run in parallel with Tasks 4-6 because it owns the dashboard layout/prompt layer.

---

### Task 4: Reconcile dashboard home feed to the approved region model

**Files:**
- Modify: `app/routes/dashboard/home.tsx:51-153,157-520`

**Step 1: Keep the correct data model**

Preserve the current JOIN-based approach where listings inherit scope from the owner's `profiles.province`. Do not add a `region` column to `listings`.

**Step 2: Normalize region switching**

Update feed region handling so:
- URL params use approved slugs
- invalid/legacy params safely normalize
- the selected region survives search/category changes
- switching region does not accidentally clear unrelated supported filters unless that reset is intentional and documented

**Step 3: Reconcile feed copy and empty states**

Make the feed speak in province terms (“Western Cape”, “Gauteng”), not city-slug terms, and ensure the empty state reflects region scoping rather than a generic no-results message when no listings exist in the selected MVP region.

**Step 4: Keep current backend behavior that is already correct**

Do not regress:
- exclusion of the current user's own listings
- distance formatting when saved coordinates exist
- AI match flow scoped to the selected region
- search/category filtering

**Validation:**
- Run: `npm run typecheck`
- Expected: PASS
- Run: `npm run build`
- Expected: PASS

**Parallelization note:** Safe to run in parallel with Tasks 5 and 6 after Task 2.

---

### Task 5: Reconcile the map page without breaking profile-anchored radar

**Files:**
- Modify: `app/routes/dashboard/map.tsx:53-148,151-414`
- Modify if needed: `app/lib/map-scope.ts:1-70`

**Step 1: Preserve the current anchored-vs-preview split**

The live code already has a valuable distinction:
- saved coordinates => profile-anchored radar
- no saved coordinates => fallback preview mode

Keep that behavior. The reconciliation should adjust region semantics, not remove the anchored radar model.

**Step 2: Normalize map region labels and query params**

Update all map-region labels, preview text, CTA copy, and toggle behavior to use the approved provincial scope.

**Step 3: Keep region toggle behavior safe**

Only allow free region switching in preview/fallback mode. Saved-location mode should continue to derive the active region from persisted coordinates/profile data rather than pretending the user moved by clicking a pill toggle.

**Step 4: Keep pin filtering aligned with the approved model**

Ensure the map continues to show only listings that belong to the active profile-derived region and fall within the active scoped radius.

**Validation:**
- Run: `npm run typecheck`
- Expected: PASS
- Run: `npm run build`
- Expected: PASS

**Parallelization note:** Safe to run in parallel with Tasks 4 and 6 after Task 2.

---

### Task 6: Reconcile profile province editing with the MVP restriction

**Files:**
- Modify: `app/routes/dashboard/profile.tsx:42-43,265-291,874-896`

**Step 1: Keep province selection limited to WC and GP**

The profile editor must remain constrained to the MVP provinces only, matching the approved regional design.

**Step 2: Handle legacy/non-MVP province values safely**

If a user already has a non-MVP province saved:
- do not silently destroy it in the UI
- show the current value clearly
- guide the user to switch to an MVP province
- avoid a broken `<select>` state

**Step 3: Add/keep server-side validation**

The profile update action should reject or normalize province submissions outside the MVP list so the UI restriction is backed by server logic.

**Step 4: Leave unrelated profile behavior alone**

Do not regress:
- `displayName` ↔ `users.name` sync
- avatar upload/remove flows
- listing management flows
- phone verification entry points

**Validation:**
- Run: `npm run typecheck`
- Expected: PASS

**Parallelization note:** Safe to run in parallel with Tasks 4 and 5 after Task 2.

---

### Task 7: Conditionally fix auth/backend source-of-truth gaps only if the audit proves they exist

**Files:**
- Modify only if needed: `app/lib/auth.server.ts:89-197`
- Modify only if needed: `app/routes/api.auth.$.ts:1-73`
- Modify only if needed: `app/routes/login.tsx:11-184`
- Modify only if needed: `app/routes/register.tsx:12-205`
- Modify only if needed: `app/routes/dashboard/verify-phone.tsx:30-124`
- Modify only if needed: `app/lib/schema.ts:13-260`
- Modify only if needed: `drizzle.config.ts:1-11`
- Create/Modify only if needed: `drizzle/*.sql`

**Step 1: Re-check auth scope against the approved source of truth**

Only make auth changes if the audit found a real mismatch. The approved auth baseline is:
- Better Auth
- email/password
- Google OAuth
- cookie-based session flow
- phone verification after login, inside the dashboard/profile trust flow

**Step 2: Re-check schema/migration gaps**

Use the live schema as the authority, but close any audited gaps that are explicitly called out by the approved plans and still missing in live code. Keep this minimal and evidence-based.

**Step 3: Avoid speculative rewrites**

Do not refactor auth pages, handlers, or schema “for cleanliness.” Only change code that fails the reconciliation checklist from Task 1.

**Step 4: If schema changes are required, keep them migration-backed**

If this task touches the schema:
- update `app/lib/schema.ts`
- generate the migration
- keep migration history additive
- verify no existing route code is left behind on old column/table assumptions

**Validation:**
- If schema changed, run: `npx drizzle-kit generate`
- Expected: SQL migration generated successfully
- If schema changed and a local database is available, run: `npx drizzle-kit migrate`
- Expected: migration applies cleanly
- Run: `npm run typecheck`
- Expected: PASS
- Run: `npm run build`
- Expected: PASS

**Parallelization note:** Only start this task if Task 1 explicitly marked auth/backend work as required.

---

### Task 8: Add regression coverage for the reconciled region and auth flows

**Files:**
- Modify: `e2e/dashboard-routing.spec.ts:1-89`
- Modify if needed: `e2e/verification.spec.ts`
- Create only if Task 7 changes auth behavior: `e2e/auth-reconciliation.spec.ts`

**Step 1: Cover the first-visit dashboard path**

Add or update E2E coverage for:
- new user with no province
- region prompt appearing before location prompt
- selecting a region successfully persisting province
- fallback preview behavior still working after region selection

**Step 2: Cover region normalization**

Add a regression case for invalid/legacy region params so the app falls back safely instead of rendering a broken feed/map state.

**Step 3: Cover auth only if auth changed**

If Task 7 changed auth behavior, add targeted coverage for the exact changed path only (for example, login/register redirect handling or verify-phone placement). Do not add broad auth tests if auth code was untouched.

**Validation:**
- Run: `npm test`
- Expected: PASS

---

### Task 9: Run final convergence validation and capture what changed

**Files:**
- No source file ownership; this is the final verification pass.

**Step 1: Run the full supported validation sequence**

Run the repo-supported checks in this order:
1. `npm run typecheck`
2. `npm run build`
3. `npm test`

If Task 7 changed the schema, include the Drizzle command(s) from Task 7 before the final app validation pass.

**Step 2: Smoke-check the high-risk routes manually**

Manually verify these routes after the automated checks pass:
- `/login`
- `/register`
- `/dashboard`
- `/dashboard/map`
- `/dashboard/profile`
- `/dashboard/verify-phone`

**Step 3: Capture the final reconciliation summary in the PR description**

Document:
- what was changed
- what was deliberately preserved from current code
- whether Task 7 was skipped or executed
- any follow-up work intentionally left out of this reconciliation

**Validation:**
- Run: `npm run typecheck`
- Expected: PASS
- Run: `npm run build`
- Expected: PASS
- Run: `npm test`
- Expected: PASS

