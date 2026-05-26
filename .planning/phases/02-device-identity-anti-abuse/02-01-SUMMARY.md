---
phase: 02-device-identity-anti-abuse
plan: "01"
subsystem: database
tags: [drizzle, postgresql, better-auth, fingerprinting, totp, 2fa, schema-migration]

# Dependency graph
requires: []
provides:
  - device_fingerprints table in DB (fingerprintHash, userId, trustLevel, registrationFingerprint, indexes)
  - two_factors table in DB (id, secret, backupCodes, userId) for Better Auth twoFactor plugin
  - twoFactorEnabled boolean column on users table
  - "@fingerprintjs/fingerprintjs" package importable in client code
  - "qrcode" package importable for QR code rendering
affects:
  - 02-02 (auth server plugin integration reads device_fingerprints + twoFactors)
  - 02-03 (device fingerprint API route writes to device_fingerprints)
  - 02-04 (2FA UI reads twoFactorEnabled, uses qrcode)

# Tech tracking
tech-stack:
  added:
    - "@fingerprintjs/fingerprintjs@^5.2.0 (client-side browser fingerprinting, MIT)"
    - "qrcode@^1.5.4 (QR code rendering from totpURI)"
    - "@types/qrcode@^1.5.6 (TypeScript types for qrcode)"
  patterns:
    - "Drizzle composite unique constraint with onConflictDoUpdate upsert pattern (device_fp_user_hash_uq)"
    - "Better Auth plugin schema colocated in app/lib/schema.ts with usePlural:true adapter convention"

key-files:
  created:
    - drizzle/0012_sticky_toad_men.sql (migration: CREATE TABLE device_fingerprints, CREATE TABLE two_factors, ALTER TABLE users ADD COLUMN two_factor_enabled)
    - drizzle/meta/0012_snapshot.json (Drizzle schema snapshot)
  modified:
    - app/lib/schema.ts (added index import, twoFactorEnabled on users, deviceFingerprints table, twoFactors table)
    - package.json (added 3 new packages)
    - package-lock.json

key-decisions:
  - "Used Drizzle composite unique (userId, fingerprintHash) to enable onConflictDoUpdate upsert in Wave 3 API route"
  - "twoFactors table uses text id (not serial) to match Better Auth plugin expectation with drizzleAdapter({ usePlural: true })"
  - "Better Auth CLI cross-check (Step 2.5) skipped: CLI requires DATABASE_URL at runtime; schema verified against node_modules/better-auth source in RESEARCH.md instead"
  - "trustLevel stored as unconstrained text (unknown|trusted|flagged); value validation deferred to application layer in Wave 3 (per threat model T-02-01-03)"

patterns-established:
  - "Anti-abuse tables appended after push_subscriptions section in schema.ts with section comment"
  - "Better Auth plugin tables colocated in schema.ts (not a separate file) to keep all Drizzle-managed tables visible in one snapshot"

requirements-completed:
  - REQ-DEVICE-001
  - REQ-DEVICE-002
  - REQ-TOTP-001
  - REQ-ABUSE-001

# Metrics
duration: 18min
completed: 2025-07-18
---

# Phase 2 Plan 01: DB Schema & Migration Summary

**Drizzle migration adding device_fingerprints + two_factors tables and twoFactorEnabled column to Neon PostgreSQL, with @fingerprintjs/fingerprintjs and qrcode packages installed**

## Performance

- **Duration:** ~18 min
- **Started:** 2025-07-18T00:00:00Z
- **Completed:** 2025-07-18T00:18:00Z
- **Tasks:** 2
- **Files modified:** 5 (schema.ts, package.json, package-lock.json, migration SQL, snapshot JSON)

## Accomplishments

- Added `device_fingerprints` table with composite unique constraint for upsert pattern and two performance indexes
- Added `two_factors` table matching Better Auth twoFactor plugin's Drizzle adapter schema (`usePlural: true`)
- Added `twoFactorEnabled` boolean column on `users` table for Better Auth to manage
- Migration `0012_sticky_toad_men.sql` generated and applied to Neon database
- Installed `@fingerprintjs/fingerprintjs`, `qrcode`, and `@types/qrcode`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add deviceFingerprints, twoFactors, twoFactorEnabled to schema.ts** - `df0be51` (feat)
2. **Task 2: Install npm packages and run Drizzle migration** - `4c3275b` (chore)

**Plan metadata:** _(docs commit follows — see final commit)_

## Files Created/Modified

- `app/lib/schema.ts` — Added `index` import, `twoFactorEnabled` on users, `deviceFingerprints` table with indexes + unique constraint, `twoFactors` table
- `drizzle/0012_sticky_toad_men.sql` — Migration SQL: CREATE TABLE device_fingerprints, CREATE TABLE two_factors, ALTER TABLE users ADD COLUMN two_factor_enabled
- `drizzle/meta/0012_snapshot.json` — Drizzle schema snapshot updated to reflect 30 tables
- `package.json` — Added @fingerprintjs/fingerprintjs, qrcode, @types/qrcode
- `package-lock.json` — Updated lockfile

## Decisions Made

- **Composite unique on (userId, fingerprintHash):** Enables `onConflictDoUpdate` upsert pattern in the Wave 3 `/api/device-fingerprint` route without a separate SELECT.
- **twoFactors.id as text (not serial):** Better Auth generates its own IDs; serial would conflict with plugin internals.
- **Better Auth CLI cross-check skipped:** The CLI requires `DATABASE_URL` at invocation time; it exited without producing output. Schema was verified against `node_modules/better-auth` source documented in `02-RESEARCH.md`.
- **trustLevel as unconstrained text column:** No `CHECK` constraint added at DB level; per threat model T-02-01-03, validation of accepted values (unknown|trusted|flagged) is deferred to application layer in Wave 3 hooks.

## Deviations from Plan

None — plan executed exactly as written. Step 2.5 (Better Auth CLI) produced no output (no DATABASE_URL in CLI context) and was skipped per the plan's fallback instruction.

## Issues Encountered

- **Better Auth CLI (Step 2.5):** `npx @better-auth/cli@latest generate` timed out without creating `ba-schema-tmp.ts`. Root cause: CLI requires DATABASE_URL to introspect the live DB. Per plan instructions, this is an expected failure mode — proceeded with manual schema verified against `node_modules/better-auth` source.
- **typecheck pre-existing failures:** `npm run typecheck` exits non-zero due to pre-existing errors in `local/` and `context-mode/` subdirectories. Zero errors in `app/` scope. These are out-of-scope and were present before this plan.

## Threat Surface Scan

No new network endpoints or auth paths introduced in this plan. The `two_factors.secret` column is encrypted at rest by Better Auth using `BETTER_AUTH_SECRET` (AES-256) — never stored plaintext.

## Known Stubs

None — this plan is DB schema only; no UI or runtime code stubs.

## User Setup Required

None — migration applied directly to Neon database using existing `DATABASE_URL` from `.env.local`.

## Next Phase Readiness

- `device_fingerprints` and `two_factors` tables exist in the database — Wave 2 (auth server plugin integration) can proceed
- `@fingerprintjs/fingerprintjs` is installed — Wave 3 client-side fingerprint collection can proceed
- `qrcode` is installed — Wave 4 TOTP setup UI can proceed
- No blockers for 02-02

## Self-Check: PASSED

- [x] `app/lib/schema.ts` contains deviceFingerprints, twoFactors, twoFactorEnabled
- [x] `drizzle/0012_sticky_toad_men.sql` exists and contains device_fingerprints + two_factors
- [x] `package.json` contains @fingerprintjs/fingerprintjs, qrcode, @types/qrcode
- [x] Commits df0be51 (T1) and 4c3275b (T2) exist in git log
- [x] Migration applied to Neon DB (idempotent second run confirmed)

---
*Phase: 02-device-identity-anti-abuse*
*Completed: 2025-07-18*
