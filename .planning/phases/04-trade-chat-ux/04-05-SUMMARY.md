---
phase: 04-trade-chat-ux
plan: 05
subsystem: ui
tags: [tailwind, react, dvh, breakpoints, trade-summary]

# Dependency graph
requires:
  - phase: 04-trade-chat-ux
    provides: balance-pile bottom sheet, pings sidebar layout, TradeSummaryCard component
provides:
  - BalancePile bottom sheet fully visible above nav bar (dvh + 80px clearance)
  - Two-column chat/status layout at 970px (min-[970px]: arbitrary breakpoint)
  - TradeSummaryCard shows listing.estimatedValueZar on page load (no items required)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use dvh (dynamic viewport height) not vh for bottom sheets — iOS Safari chrome awareness"
    - "Use min-[970px]: Tailwind arbitrary breakpoint for 970px two-column trigger"
    - "Pass listing.estimatedValueZar directly to TradeSummaryCard; use pile total as fallback for the other side"

key-files:
  created: []
  modified:
    - app/components/ui/balance-pile.tsx
    - app/routes/dashboard/pings.$id.tsx

key-decisions:
  - "dvh over vh for bottom sheets: iOS Safari reports vh as full viewport height ignoring browser chrome, causing clips"
  - "970px is between Tailwind md (768px) and lg (1024px) — use arbitrary value min-[970px]: not a named breakpoint"
  - "listing.estimatedValueZar is already selected in the loader; no query changes needed — root cause was conditional pile total (0 before items added)"

patterns-established:
  - "Bottom sheets: max-h-[calc(85dvh-80px)] + pb-[calc(env(safe-area-inset-bottom,0px)+80px)]"
  - "Non-standard breakpoints: min-[Npx]: Tailwind arbitrary value syntax"

requirements-completed:
  - SC-02
  - SC-03
  - SC-05

# Metrics
duration: 15min
completed: 2026-06-01
---

# Phase 4 Plan 05: Gap Closure Summary

**Three UAT gaps closed: dvh bottom sheet height, 970px sidebar breakpoint, and direct listing ZAR value on TradeSummaryCard**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-01T08:00:00Z
- **Completed:** 2026-06-01T10:15:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- BalancePile bottom sheet no longer clips behind bottom nav on iOS/Android (dvh + 80px padding)
- Chat sidebar two-column layout triggers at 970px via `min-[970px]:` arbitrary Tailwind breakpoint (was md/768px)
- TradeSummaryCard shows listing's estimated ZAR value immediately on load for both YOURS and THEIRS sides

## Task Commits

All three tasks committed atomically in a single fix commit:

1. **Task 1: BalancePile dvh + 80px** — `6650165`
2. **Task 2: 970px breakpoint (5 replacements)** — `6650165`
3. **Task 3: TradeSummaryCard listing.estimatedValueZar** — `6650165`

**Plan metadata:** `f848b71` (docs: gap-closure plan 05)

## Files Created/Modified
- `app/components/ui/balance-pile.tsx` — `85vh-80px` → `85dvh-80px`; `+20px` padding → `+80px`
- `app/routes/dashboard/pings.$id.tsx` — 5× `md:` → `min-[970px]:` (sidebar layout only); TradeSummaryCard `estimatedValueZar` passes `listing.estimatedValueZar ?? null` directly

## Decisions Made
- All three tasks were committed together in a single atomic commit (`6650165`) since they are independent surgical fixes across 2 files with no interdependency
- `md:left-60` and `md:bottom-0` on the outer wrapper div were intentionally left unchanged — those offset the chat area from the dashboard nav sidebar, unrelated to the chat/status two-column layout

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- All 3 UAT gaps from phase 04 are now closed
- Phase 04 UAT can be re-run to confirm: test 2 (balance sheet), test 3 (970px breakpoint), test 7 (ZAR value)
- Phase 04 is complete — ready to move to Phase 05 when planned

---
*Phase: 04-trade-chat-ux*
*Completed: 2026-06-01*
