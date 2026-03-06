# Dashboard UX Gaps Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore authenticated dashboard reliability and deliver MVP fixes for listing ownership actions, listing/ avatar image uploads, notification bell behavior, and route-level loading feedback.

**Architecture:** The app is React Router v7 with server loaders/actions and Drizzle ORM against Postgres. Implement changes by extending existing dashboard route modules (`dashboard.tsx`, `dashboard/profile.tsx`, `dashboard/add.tsx`) and adding focused server actions/routes for file handling and notifications. Keep authorization checks server-side with `requireAuth` and ownership predicates in SQL.

**Tech Stack:** React Router v7, React 19, Better Auth, Drizzle ORM, Neon Postgres, Playwright (verification)

---

## Evidence Snapshot (Current State)
- Auth route delegates directly to Better Auth handler (`app/routes/api.auth.$.ts`), and sign-in uses `authClient.signIn.email` (`app/routes/login.tsx`).
- Playwright evidence reports `POST /api/auth/sign-in/email` returns 500 and blocks authenticated dashboard verification (`PLAYWRIGHT_FINAL_FINDINGS.txt`, `PLAYWRIGHT_AUTH_TEST_RESULTS.md`).
- Profile page lists user listings but has no edit/delete controls or listing action intent handling (`app/routes/dashboard/profile.tsx`).
- Add listing route inserts only into `listings`; no file field or `listing_images` insert path (`app/routes/dashboard/add.tsx`) despite schema support for `listing_images` (`app/lib/schema.ts`).
- Header bell is a non-functional `<button>` with no click behavior or data source (`app/routes/dashboard.tsx`).
- Settings cog is a `Link` to profile with no pending-nav UX (`app/routes/dashboard.tsx`), while loading components already exist (`app/components/ui/loading-indicator.tsx`).
- Avatar is display-only (`profile.avatarUrl`) with no upload/update action (`app/routes/dashboard/profile.tsx`), and `users.image` is used in other places (`dashboard/asset.$id.tsx`), indicating avatar source inconsistency.

## Cross-Cutting Priority: Authentication Blocker First
1. Add structured error logging around auth handler boundary in `api.auth.$.ts` (without leaking secrets) to capture root cause for `/sign-in/email` 500.
2. Validate runtime auth env alignment (`BETTER_AUTH_URL`, app host/port, secret presence) and DB connectivity for auth tables.
3. Add a deterministic seeded test account flow for local/CI Playwright runs so dashboard features are verifiable.

---

## Area 1 — Edit/Delete Own Listings from Profile

### Approach A: In-place actions on profile card list (recommended for MVP)
- Extend `dashboard/profile.tsx` action with intents: `archiveListing` (soft delete via `status='archived'`) and `deleteListing` (hard delete guarded by ownership).
- Add edit CTA to navigate to listing edit route (or reuse add route in edit mode).
- Ownership enforcement in SQL `where(and(eq(listings.id, id), eq(listings.userId, user.id)))`.
- **Trade-off:** Fastest path, minimal route sprawl; profile action grows in complexity.

### Approach B: Dedicated listing mutation resource routes
- Create `/dashboard/listings/:id/edit` and `/dashboard/listings/:id/delete` action endpoints.
- Profile only links/posts to dedicated handlers.
- **Trade-off:** Cleaner separation and future scalability; more files and route wiring.

### Approach C: Convert to admin-style listing management page
- New `/dashboard/my-listings` with table/cards and bulk actions.
- **Trade-off:** Better long-term UX; larger scope and delays other blockers.

**MVP Scope:** A or B with edit + archive/delete for owner-owned active listings only.
**Dependencies:** Auth fixed; listing edit form reuse decision.
**Risks:** Accidental hard deletion, stale UI after mutation, unauthorized ID tampering.
**Acceptance Criteria:**
- Owner can edit title/description/category/price and save.
- Owner can archive/delete only their own listing.
- Non-owner mutation attempts return 403/404-equivalent behavior.
- Updated listing state reflected immediately in profile and dashboard feed.

---

## Area 2 — Listing Image Upload on Add/Edit

### Approach A: URL-only image field MVP (recommended fastest)
- Accept image URL(s) in add/edit forms, write to `listing_images` table.
- Validate URL format and limit count/order.
- **Trade-off:** No binary handling/storage setup; relies on external hosting.

### Approach B: Native multipart uploads with React Router form-data parser (recommended product path)
- Use `encType='multipart/form-data'` and parse uploads in action.
- Persist files via server storage adapter, then save resulting URL in `listing_images`.
- **Trade-off:** Better UX/control; introduces storage and security overhead.

### Approach C: Hybrid (URL + upload)
- Allow URL fallback while supporting direct upload for progressive rollout.
- **Trade-off:** Maximum flexibility; more validation paths and complexity.

**MVP Scope:** Approach A now, with clear extension seam toward B.
**Dependencies:** Storage decision (if B/C), file-size/type policy, abuse controls.
**Risks:** Broken external URLs (A), oversized file uploads, malicious file types, orphaned images on listing delete/edit.
**Acceptance Criteria:**
- User can add at least one image while creating listing.
- Existing listing images can be replaced/reordered/removed in edit flow.
- Feed card and asset detail render first image from `listing_images` reliably.
- Invalid image input returns friendly validation error.

---

## Area 3 — Functional Notification Bell in Dashboard

### Approach A: Derived notifications from existing data (recommended MVP)
- Compute badge/count from unread message/trade events using current `messages/trades` tables.
- Bell opens dropdown/panel linking to `pings` and relevant threads.
- **Trade-off:** No schema migration, quick value; limited notification types.

### Approach B: Introduce dedicated `notifications` table
- Persist event entries (type, actor, entity, readAt) and read-state transitions.
- **Trade-off:** Scalable and extensible; new writes/event fanout work needed.

### Approach C: Client-only faux bell state
- UI toggles only with static or session-derived count.
- **Trade-off:** Very fast demo; low product value and likely rework.

**MVP Scope:** Approach A with unread count + navigation to source context.
**Dependencies:** Clarify unread semantics (per message/per thread).
**Risks:** Incorrect unread counts, expensive aggregate queries on each request.
**Acceptance Criteria:**
- Bell click performs visible action (panel/menu or route).
- Badge count reflects server data and clears/updates on read behavior.
- No dead controls in authenticated header.

---

## Area 4 — Navigation Loading Indicators (e.g., settings cog)

### Approach A: Global header pending state via `useNavigation` (recommended MVP)
- In `dashboard.tsx`, show spinner/progress when `navigation.state !== 'idle'` for route transitions.
- Add pending affordance to settings cog and optionally disable repeated clicks.
- **Trade-off:** Minimal changes, consistent UX; less granular per-link messaging.

### Approach B: Route-level skeletons with `HydrateFallback`/pending UI per page
- Add per-route skeletons for heavy routes.
- **Trade-off:** Better perceived performance per view; more implementation overhead.

### Approach C: Optimistic transition only (no visible indicator)
- Use immediate route prefetch/transition styles without explicit spinner.
- **Trade-off:** Cleaner UI, but can still feel unresponsive on slow network.

**MVP Scope:** Approach A, optionally with small cog spinner swap.
**Dependencies:** Navigation state wiring in layout.
**Risks:** Indicator flicker on very fast transitions.
**Acceptance Criteria:**
- Clicking settings shows immediate pending state feedback.
- Pending state clears on navigation completion/error.
- Accessibility: loading indicator has appropriate ARIA semantics.

---

## Area 5 — Avatar Upload Feature

### Approach A: Avatar URL field in profile edit (recommended fastest MVP)
- Add `avatarUrl` input in profile form; persist to `profiles.avatarUrl`.
- Normalize usage to read from `profiles.avatarUrl` across dashboard surfaces (or sync into `users.image`).
- **Trade-off:** Fast and low infra; user-hosted URL dependency.

### Approach B: Multipart avatar upload + stored file URL (recommended long-term)
- Dedicated profile avatar upload action and storage pipeline.
- **Trade-off:** Better UX and consistency; storage/security complexity.

### Approach C: Reuse Better Auth `users.image` as canonical avatar only
- Store/update only `users.image` and deprecate `profiles.avatarUrl`.
- **Trade-off:** Single source of truth; migration effort from existing profile usage.

**MVP Scope:** Approach A plus canonical-source decision to avoid split-brain avatar data.
**Dependencies:** Decide canonical avatar column (`profiles.avatarUrl` vs `users.image`).
**Risks:** Divergent avatar values across views, invalid URLs, privacy issues (external hosts).
**Acceptance Criteria:**
- User can set/update/remove avatar from profile.
- Avatar displays consistently in profile, header/user cards, and ping contexts.
- Fallback initials render when no avatar available.

---

## Recommended Delivery Sequence (MVP)
1. Fix/unblock auth 500 and establish reliable seeded user for Playwright.
2. Implement listing ownership actions (edit/archive/delete) with strict ownership predicates.
3. Implement image capability (URL-based MVP) for add/edit flows tied to `listing_images`.
4. Make bell functional using derived unread message/thread signals.
5. Add global navigation pending indicators in dashboard layout.
6. Add avatar URL management and unify avatar read model.
7. Re-run Playwright authenticated regression for all five issue areas.
