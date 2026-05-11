# Auth + Regional MVP Reconciliation Design

## Problem
- The approved auth direction and the approved regional MVP direction both exist in the repo, but the live code has drifted into a mixed state: Better Auth is already live, `verify-phone` exists as a post-login trust flow, region logic exists in `app/lib/regions.ts`, and radar/location behavior now overlaps with region onboarding.
- The main mismatch is not whether auth or regional scoping should exist, but **which current behavior wins** across `dashboard.tsx`, `dashboard/home.tsx`, `dashboard/map.tsx`, and `dashboard/profile.tsx`.
- This design reconciles those decisions around the current codebase so NoZar behaves consistently for login, first dashboard entry, region resolution, and region-scoped browsing.

## Scope
### In scope
- Preserve Better Auth email/password and Google OAuth as the only sign-in methods.
- Preserve `/dashboard/verify-phone` as a post-login profile trust step, not a sign-in prerequisite.
- Reconcile region onboarding and region-scoped dashboard behavior across:
  - `app/routes/dashboard.tsx`
  - `app/routes/dashboard/home.tsx`
  - `app/routes/dashboard/map.tsx`
  - `app/routes/dashboard/profile.tsx`
  - `app/lib/regions.ts`
- Normalize region selection rules for valid, invalid, and legacy `?region=` values.

### Out of scope
- Replacing Better Auth.
- Adding phone-first auth or OTP login.
- Expanding MVP support beyond Western Cape and Gauteng.
- Reworking radar/location storage beyond what is needed to stop it from conflicting with region gating.

## Chosen Approach
- **Approach:** current-code convergence.
- **Source of truth:** `docs/plans/2026-03-04-nozar-implementation-plan.md`.
- **Companion plans/designs:** `docs/plans/2026-03-04-auth-database-maps-plan.md`, `docs/plans/2026-03-04-auth-database-maps-design.md`, `docs/plans/2026-03-07-regional-mvp-plan.md`, and `docs/plans/2026-03-07-regional-mvp-design.md`.
- **Convergence rule:** preserve the live Better Auth implementation and preserve the live two-region dashboard architecture, then close the gaps by making region resolution deterministic and shared.
- **Canonical MVP fallback:** Gauteng via the current Johannesburg-centered fallback already encoded in `app/lib/regions.ts`.
- **Slug reconciliation:** keep the live internal slugs (`cape-town`, `johannesburg`) for minimum churn, but treat legacy plan-era params (`western-cape`, `gauteng`) as aliases that normalize to those canonical slugs.

## Architecture & Data Flow
1. **Authentication entry**
   - `login.tsx` and `register.tsx` remain the public entry points.
   - Better Auth stays responsible for session creation, email/password, Google OAuth, and session lookup through `auth.server.ts`.
   - Explicit auth errors remain visible in the auth UI; reconciliation must not collapse them into silent redirects or generic dashboard failures.

2. **Dashboard shell gate**
   - `dashboard.tsx` remains the first protected loader after login.
   - The shell must load the authenticated user plus profile state, then determine:
     - whether the user has an MVP-valid province
     - whether a `?region=` param is valid or legacy-normalizable
     - whether the user is allowed into normal browsing yet
   - Region eligibility is evaluated **before** location/radar prompting.

3. **Shared region resolver**
   - `app/lib/regions.ts` becomes the single source for:
     - canonical MVP regions
     - alias handling for legacy params
     - province-to-region mapping
     - deterministic fallback
   - Resolution order is:
     1. valid `?region=` param wins
     2. else user province if it maps to an MVP region
     3. else deterministic MVP fallback (`johannesburg` / Gauteng)

4. **Blocked vs allowed browsing**
   - If the user has no province, or has a province outside the MVP provinces, the dashboard shell shows region selection before normal browsing.
   - After the user picks a valid MVP province, normal dashboard browsing resumes.
   - Missing `lat`/`lng` no longer outranks missing/invalid province. Radar/location remains secondary to region eligibility.

5. **Surface behavior**
   - **Home feed:** region-scoped listing queries follow the shared resolver and the normalized active region.
   - **Map:** uses the same active region; if no saved coordinates exist, the map stays in regional preview mode centered on the resolved region.
   - **Profile:** only offers MVP provinces as editable choices, while still handling legacy stored values safely until the user replaces them.

## UI & Behavior
### Auth
- Keep:
  - email/password sign-in
  - email/password registration
  - Google OAuth
  - explicit inline auth errors
- Keep `/dashboard/verify-phone` post-login and profile-linked.
- Do not require phone verification before reaching `/dashboard`.

### Region onboarding
- On first authenticated dashboard entry:
  - if `profiles.province` is missing, show region selection first
  - if `profiles.province` exists but is non-MVP, show region selection first
  - if `profiles.province` maps to an MVP region, allow normal browsing
- Region selection writes an MVP province to the profile and then unlocks normal browsing.

### Home feed
- The active region is always derived from the shared resolver.
- Region toggle changes the URL param and keeps feed browsing region-scoped.
- Invalid params do not hard-fail the page; they degrade to province or fallback behavior.

### Map
- The map uses the same resolved region as the feed.
- Users without saved coordinates can still browse the regional preview map.
- Saved coordinates continue to power radar behavior, but they do not replace the shared region-selection rule for dashboard access.

### Profile
- Province editing exposes MVP provinces only.
- If a legacy/non-MVP province is stored, the profile should not break:
  - show the current stored value safely
  - require reselection from MVP options when the user edits/saves
- Copy should make it clear that additional provinces are not yet available.

## Edge Cases
- **Valid canonical param** (`?region=cape-town` / `?region=johannesburg`): use it directly.
- **Valid legacy param** (`?region=western-cape` / `?region=gauteng`): normalize to the matching canonical region and continue.
- **Invalid param** (`?region=foo`): ignore it and fall back to province, then fallback region.
- **No province + no coords:** show region selection first; do not trap the user behind radar setup.
- **Non-MVP province + saved coords:** still require MVP region selection before normal browsing.
- **No coords after valid region selection:** allow feed browsing, keep map in regional preview, allow optional location save later.
- **Province changed from one MVP region to the other:** feed and map follow the updated province unless an explicit valid `?region=` override is present.
- **Auth/session lookup failure:** preserve explicit auth-safe error handling; unauthenticated users still redirect to `/login`.

## Verification Focus
- Auth regression:
  - email/password sign-in still works
  - Google OAuth still redirects into `/dashboard`
  - auth errors remain explicit in `login.tsx` / `register.tsx`
- Region resolver regression:
  - canonical param wins
  - legacy param normalizes cleanly
  - province mapping works
  - fallback is deterministic
- Dashboard gating:
  - no province blocks normal browsing until selection
  - non-MVP province blocks normal browsing until selection
  - valid MVP province allows normal browsing immediately
- Surface consistency:
  - home feed and map use the same active region
  - profile only exposes MVP province choices
  - `/dashboard/verify-phone` remains reachable and unaffected by region logic

## Out-of-Scope Items
- New auth providers, MFA expansion, or signup redesign.
- Province-wide rollout beyond Western Cape and Gauteng.
- Schema changes to add a dedicated `region` column on listings.
- Replacing radar/location with a new geospatial model.
- Cross-region discovery rules beyond the approved MVP toggle behavior.
