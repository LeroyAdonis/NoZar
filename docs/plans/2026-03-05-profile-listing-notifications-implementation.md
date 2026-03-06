# Profile, Listing & Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve the authenticated dashboard UX gaps by fixing the auth blocker first, then delivering owner-safe listing management, listing/profile media capability, real unread notifications, and visible navigation loading feedback with regression coverage.

**Architecture:** This codebase uses React Router v7 loaders/actions, Better Auth resource routing, and Drizzle ORM with PostgreSQL; implementation should stay additive and route-module-centric. Notification unread state should be server-derived and deterministic, using a minimal read-tracking model to avoid dead UI controls and avoid client-only badge drift. Media and listing mutations must remain server-authorized with ownership predicates and safe validation.

**Tech Stack:** React Router v7, React 19, Better Auth, Drizzle ORM, Neon Postgres, Playwright scripts (`test_*.mjs`)

---

## Working Rules (apply to every task)

- **DRY:** Reuse shared helpers for media URL validation and unread-count computation (no duplicated regex/query fragments across routes).
- **YAGNI:** Keep MVP to URL-based media inputs and bounded notification scope; do not introduce full file-storage infrastructure in this phase.
- **TDD:** For each behavior change, add/extend the smallest failing automated check first (scripted Playwright/assertion-first step), then implement, then rerun.
- **Frequent commits:** Commit after each small, verified vertical slice (one user-visible behavior + its checks).
- **Auth gate:** No downstream task is marked complete until auth 500 is stable and reproducible.

## Documentation & Evidence Baseline

- Approved design: `docs/plans/2026-03-05-profile-listing-notifications-design.md`
- Existing dashboard/layout patterns:
  - `app/routes/dashboard.tsx`
  - `app/routes/dashboard/profile.tsx`
  - `app/routes/dashboard/add.tsx`
  - `app/routes/dashboard/pings.tsx`
  - `app/routes/dashboard/pings.$id.tsx`
- Schema baseline: `app/lib/schema.ts`, `drizzle/0000_wide_retro_girl.sql`
- Auth boundary: `app/routes/api.auth.$.ts`, `app/lib/auth.server.ts`, `app/routes/login.tsx`

---

### Task 1: Unblock auth 500 prerequisite (release gate)

**Files:**
- Modify: `app/routes/api.auth.$.ts:1-10`
- Modify: `app/lib/auth.server.ts:32-88`
- Modify: `app/routes/login.tsx:34-51`
- Optional docs note: `PLAYWRIGHT_AUTH_TEST_RESULTS.md`

**Step 1: Add/extend failing auth verification script assertion**
- Run: `node test_auth_final.mjs`
- Expected: FAIL/BLOCKED with `POST /api/auth/sign-in/email` returning 500 (baseline reproduction).

**Step 2: Instrument auth boundary and normalize failure handling**
- Ensure auth handler failures are logged with safe metadata (no secrets), and login surfaces non-500 user feedback where appropriate.

**Step 3: Re-run auth verification**
- Run: `node test_auth_final.mjs`
- Expected: login path no longer returns 500; script reaches authenticated dashboard checks (even if later feature checks still fail).

**Step 4: Commit**
- Run:
  - `git add app/routes/api.auth.$.ts app/lib/auth.server.ts app/routes/login.tsx`
  - `git commit -m "fix(auth): unblock email sign-in 500 prerequisite"`
- Expected: clean commit containing only auth prerequisite changes.

---

### Task 2: Introduce deterministic unread model (minimal schema expansion)

**Files:**
- Modify: `app/lib/schema.ts` (append read-tracking table for per-user per-trade read cursor)
- Create: `drizzle/0001_<slug>.sql`
- Modify: `drizzle/meta/_journal.json`
- Create: `app/lib/notifications.server.ts` (shared unread count + notification query helpers)

**Step 1: Define failing unread-state check scenario**
- Run: `node test_authenticated_issues.mjs`
- Expected: FAIL for notification behavior/unread correctness (current bell is inert, unread hardcoded/absent).

**Step 2: Add minimal read-tracking data model**
- Add one bounded table for unread determinism (avoid full event-platform redesign).

**Step 3: Add shared server helpers**
- Centralize unread-count query and “mark as read” target calculation for DRY usage in layout and notifications route/action.

**Step 4: Validate schema/type health**
- Run: `npm run typecheck`
- Expected: PASS with new schema types recognized.

**Step 5: Commit**
- Run:
  - `git add app/lib/schema.ts drizzle app/lib/notifications.server.ts`
  - `git commit -m "feat(notifications): add unread read-model foundation"`

---

### Task 3: Make dashboard bell actionable (no dead control)

**Files:**
- Modify: `app/routes.ts:13-21` (add notifications route under dashboard)
- Modify: `app/routes/dashboard.tsx:1-86` (bell becomes actionable and server-driven)
- Create: `app/routes/dashboard/notifications.tsx`

**Step 1: Add failing UI behavior check**
- Run: `node test_authenticated_issues.mjs`
- Expected: FAIL showing bell has no meaningful action and unread badge is not server-backed.

**Step 2: Wire bell to actionable destination**
- Bell must navigate to notifications surface (route/panel equivalent), not remain inert.
- Use unread count from server helper, not static dot-only state.

**Step 3: Verify behavior**
- Run: `npm run typecheck`
- Expected: PASS with new route types generated/valid.

**Step 4: Commit**
- Run:
  - `git add app/routes.ts app/routes/dashboard.tsx app/routes/dashboard/notifications.tsx`
  - `git commit -m "feat(dashboard): wire bell to real notifications route"`

---

### Task 4: Implement read transitions and unread badge updates

**Files:**
- Modify: `app/routes/dashboard/notifications.tsx`
- Modify: `app/routes/dashboard/pings.$id.tsx:44-117,121-260` (mark thread read on open/action boundary)
- Modify: `app/routes/dashboard/pings.tsx:20-103` (unread derived, remove hardcoded `unread: false`)
- Modify: `app/components/ui/ping-thread.tsx` (render unread from real state only)

**Step 1: Add failing unread transition check**
- Run: `node test_authenticated_issues.mjs`
- Expected: FAIL for unread count not decreasing after reading a thread.

**Step 2: Implement deterministic read updates**
- Mark relevant trade/thread as read when user views/acknowledges it.
- Ensure layout unread count revalidates after read transition.

**Step 3: Re-run check**
- Run: `node test_authenticated_issues.mjs`
- Expected: unread count updates consistently after read transition.

**Step 4: Commit**
- Run:
  - `git add app/routes/dashboard/notifications.tsx app/routes/dashboard/pings.$id.tsx app/routes/dashboard/pings.tsx app/components/ui/ping-thread.tsx`
  - `git commit -m "feat(notifications): implement unread read transitions"`

---

### Task 5: Add owner-only listing edit/archive controls in profile

**Files:**
- Modify: `app/routes/dashboard/profile.tsx:51-129` (loader listing payload)
- Modify: `app/routes/dashboard/profile.tsx:134-176` (new listing intents + ownership predicates)
- Modify: `app/routes/dashboard/profile.tsx:425-478` (owner action UI)

**Step 1: Add failing ownership behavior check**
- Run: `node test_authenticated_issues.mjs`
- Expected: FAIL because listing cards expose no edit/archive controls and server ownership mutation checks are absent.

**Step 2: Add owner-only archive/edit paths**
- Add profile action intents for listing update + archive (soft lifecycle default).
- Enforce ownership in SQL predicates (`listing id + current user id`) with safe unauthorized/not-found behavior.

**Step 3: Verify**
- Run: `npm run typecheck`
- Expected: PASS; profile action/loader types valid.

**Step 4: Commit**
- Run:
  - `git add app/routes/dashboard/profile.tsx`
  - `git commit -m "feat(profile): owner-only listing edit and archive controls"`

---

### Task 6: Add listing image support on create flow (URL MVP)

**Files:**
- Modify: `app/routes/dashboard/add.tsx:98-185` (action: image validation + insert into `listing_images`)
- Modify: `app/routes/dashboard/add.tsx:302-520` (form fields for one-or-more image URLs)
- Create: `app/lib/media-validation.server.ts` (shared URL policy helper)

**Step 1: Add failing create-image check**
- Run: `node test_authenticated_issues.mjs`
- Expected: FAIL because listing creation does not persist any `listing_images` row.

**Step 2: Add validated URL media insertion**
- Persist primary/ordered URLs on successful listing create.
- Enforce URL policy and friendly validation errors.

**Step 3: Verify**
- Run: `npm run typecheck`
- Expected: PASS; add route compiles with media helper.

**Step 4: Commit**
- Run:
  - `git add app/routes/dashboard/add.tsx app/lib/media-validation.server.ts`
  - `git commit -m "feat(listings): support image urls on listing create"`

---

### Task 7: Add listing image edit support from profile listing management

**Files:**
- Modify: `app/routes/dashboard/profile.tsx` (listing update intent includes image add/replace/remove semantics)
- Modify: `app/routes/dashboard/home.tsx:75-121` (keep first-image selection stable after edits)
- Modify: `app/routes/dashboard/asset.$id.tsx:53-63` (ordered images render after edit updates)

**Step 1: Add failing edit-image check**
- Run: `node test_authenticated_issues.mjs`
- Expected: FAIL for inability to update listing images after listing creation.

**Step 2: Implement image edit semantics**
- Support replace/remove/reorder minimal MVP path from profile listing controls.
- Keep first-image feed behavior deterministic.

**Step 3: Verify**
- Run: `npm run typecheck`
- Expected: PASS; image edit flow type-safe.

**Step 4: Commit**
- Run:
  - `git add app/routes/dashboard/profile.tsx app/routes/dashboard/home.tsx app/routes/dashboard/asset.$id.tsx`
  - `git commit -m "feat(listings): add image edit flow for owned listings"`

---

### Task 8: Add avatar set/update/remove with canonical source alignment

**Files:**
- Modify: `app/routes/dashboard/profile.tsx` (avatar intents + fields + removal)
- Modify: `app/routes/dashboard.tsx:50-74` (header avatar reads canonical source)
- Modify: `app/routes/dashboard/pings.tsx` and/or `app/routes/dashboard/pings.$id.tsx` (counterparty/self avatar rendering consistency)
- Optional: `app/routes/dashboard/asset.$id.tsx:171-185` (align owner avatar source if needed)

**Step 1: Add failing avatar consistency check**
- Run: `node test_authenticated_issues.mjs`
- Expected: FAIL for avatar upload/update gap and cross-surface drift.

**Step 2: Implement canonical avatar behavior**
- Choose one canonical avatar source for dashboard surfaces and enforce read/write consistency.
- Support remove action with initials fallback.

**Step 3: Verify**
- Run: `npm run typecheck`
- Expected: PASS with consistent avatar data usage across surfaces.

**Step 4: Commit**
- Run:
  - `git add app/routes/dashboard/profile.tsx app/routes/dashboard.tsx app/routes/dashboard/pings.tsx app/routes/dashboard/pings.$id.tsx app/routes/dashboard/asset.$id.tsx`
  - `git commit -m "feat(profile): add avatar management with canonical rendering"`

---

### Task 9: Add navigation loading indicators (settings cog emphasized)

**Files:**
- Modify: `app/routes/dashboard.tsx:1-86`
- Reuse: `app/components/ui/loading-indicator.tsx`

**Step 1: Add failing pending-navigation check**
- Run: `node test_authenticated_issues.mjs`
- Expected: FAIL indicating missing/insufficient loading feedback during settings/profile navigation.

**Step 2: Implement global + local pending affordances**
- Use React Router pending navigation state for header-level feedback.
- Add settings-link pending treatment and prevent repeated click spam while pending.
- Ensure ARIA loading semantics remain present.

**Step 3: Verify**
- Run: `npm run typecheck`
- Expected: PASS.

**Step 4: Commit**
- Run:
  - `git add app/routes/dashboard.tsx`
  - `git commit -m "feat(dashboard): add pending navigation indicators for utility controls"`

---

### Task 10: Full verification pass (including Playwright regression)

**Files:**
- Modify: `test_authenticated_issues.mjs` (if assertions need stabilization for new behavior)
- Optional docs update: `PLAYWRIGHT_TEST_SUMMARY.md`

**Step 1: Static quality gate**
- Run: `npm run typecheck`
- Expected: PASS.

**Step 2: Build gate**
- Run: `npm run build`
- Expected: PASS with production bundle generated.

**Step 3: Auth + dashboard regression**
- Run: `node test_auth_final.mjs`
- Expected: no auth 500 blocker; reaches authenticated flows.

**Step 4: Targeted feature regression**
- Run: `node test_authenticated_issues.mjs`
- Expected: pass/green evidence for:
  - owner listing edit/archive access
  - listing image create/edit behavior
  - avatar set/update/remove behavior
  - functional bell + unread updates
  - settings/navigation pending indicators

**Step 5: Final commit**
- Run:
  - `git add -A`
  - `git commit -m "test: verify profile/listing/notification dashboard regressions"`

---

## Edge Cases to Explicitly Validate During Execution

- Tampered listing IDs in profile actions must not mutate non-owned records.
- Archive vs hard delete safety: archive is default destructive path; hard delete remains explicit/secondary.
- Invalid/unsafe image/avatar URLs (bad scheme, malformed URL, oversized payload strings) return user-friendly errors.
- Existing listings with no images still render stable fallback in feed/detail.
- Unread count semantics are stable under concurrent messages and repeated page refreshes.
- Read transitions are idempotent (re-marking read does not break count).
- Pending indicator flicker on fast transitions should not cause inaccessible ARIA noise.
- Auth transient DB failures (Neon wake-up) do not regress to unhandled 500.

## Open Questions

- **Unread semantics granularity:** per-message vs per-thread unread count.  
  **Safe assumption for MVP:** per-thread unread using latest message timestamp/cursor (bounded and cheaper).
- **Canonical avatar source:** `profiles.avatarUrl` vs `users.image`.  
  **Safe assumption for MVP:** treat `profiles.avatarUrl` as canonical in dashboard surfaces and keep fallback initials; only touch `users.image` if explicitly required by Better Auth profile flows.

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-03-05-profile-listing-notifications-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
