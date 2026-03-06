# 2026-03-05 Profile, Listing & Notifications Design

## Objective
Deliver a focused dashboard UX uplift for authenticated users by defining Utility Console behavior, owner-only listing controls, image/avatar capability, real unread notifications, and visible navigation loading feedback.

## Scope
### In Scope
- Utility Console direction for dashboard actions and status visibility.
- Owner-only listing edit/archive rules in profile surfaces.
- Listing image + avatar upload capability (MVP path + guardrails).
- Functional notification bell with server-backed unread state.
- Navigation loading indicators for dashboard transitions.
- Phased delivery plan with auth `POST /api/auth/sign-in/email` 500 prerequisite.

### Out of Scope
- Full notification event platform redesign.
- Bulk listing management redesign.
- Non-dashboard IA overhaul.

## Utility Console Direction
- Establish the dashboard header/tool area as a **Utility Console**: quick actions, notification bell, profile/settings, and loading state feedback.
- Utility Console must avoid dead controls: each icon/button either opens an actionable panel/route or is removed.
- Interaction rule: user receives immediate response (panel open, badge update, or pending indicator) within one click.

## UX Behavior (Approved Sections)
### 1) Owner-Only Listing Edit/Archive Rules
- Edit/archive actions appear only on listings owned by the authenticated user.
- Archive is default destructive action (soft state) for safer recovery; hard delete remains explicit and secondary.
- Server enforces ownership in mutation predicates; tampered IDs return unauthorized/not-found-safe responses.

### 2) Listing + Avatar Upload Capability
- **Listings:** support at least one image attachment path (MVP can start URL-based with migration seam to direct upload).
- **Avatar:** allow set/update/remove avatar from profile settings.
- Canonical avatar source must be single and consistent across header, profile, and social/pings surfaces.

### 3) Functional Notification Bell (Real Unread State)
- Bell click opens actionable destination (dropdown/panel/route), never inert.
- Unread badge is derived from server state (messages/trade events or notifications source), not client-only mock state.
- Read actions update unread count deterministically after navigation or marking read.

### 4) Navigation Loading Indicators
- Show pending feedback for dashboard route transitions (especially settings/profile navigation).
- Pending indicators should be visible but lightweight; disable repeated clicks while transition is active where appropriate.
- Include accessible loading semantics (e.g., ARIA live/busy usage).

## Data & Safety Constraints
- Authorization is server-side and mandatory for all listing mutations.
- Prefer soft archive for listing lifecycle safety; hard delete must be explicit and auditable.
- Validate image/avatar inputs (type/format/size or URL policy), reject unsafe/malformed input.
- Prevent cross-surface avatar drift via canonical-source rule.
- Notification unread queries must be bounded to prevent dashboard latency spikes.

## Acceptance Criteria
- Authenticated owner can edit and archive their own listings; non-owner attempts fail safely.
- Listing creation/edit supports image association and renders first image reliably.
- User can update/remove avatar and sees consistent avatar across dashboard contexts.
- Bell displays real unread count and performs meaningful action on click.
- Navigation feedback appears during route transitions and clears on completion/error.
- No dead header controls remain in authenticated dashboard.

## Risks & Mitigations
- **Auth blocker remains unresolved:** gate all feature verification behind auth fix; do not mark downstream done without login path reliability.
- **Unread count correctness drift:** define unread semantics early (per message vs per thread).
- **Image abuse/broken media:** enforce validation and fallback rendering.
- **State inconsistency after mutations:** refresh/rehydrate affected loaders post-action.

## Rollout Phases
### Phase 0 — Prerequisite (Must Pass)
- Resolve auth sign-in 500 and validate deterministic authenticated test path.

### Phase 1 — Ownership & Utility Baseline
- Deliver owner-only listing edit/archive controls.
- Enforce Utility Console no-dead-control baseline.

### Phase 2 — Media Capability
- Deliver listing image support + avatar management with canonical avatar decision.

### Phase 3 — Notification Reality
- Wire bell to real unread server state and read-state transitions.

### Phase 4 — Navigation Feedback & Stabilization
- Add dashboard navigation loading indicators.
- Run authenticated regression for listings, media, bell, and loading UX.

## Implementation Readiness Notes
- Keep scope MVP-first and additive; avoid schema expansion unless required for unread-state fidelity.
- Treat auth prerequisite as release gate for all post-login UX acceptance.
