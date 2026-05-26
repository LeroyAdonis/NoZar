---
phase: 02-device-identity-anti-abuse
plan: "03"
subsystem: server-auth-anti-abuse
tags: [fingerprinting, anti-abuse, better-auth, device-hooks, otp, two-factor, oauth-gap]

# Dependency graph
requires:
  - 02-01 (device_fingerprints + twoFactors tables, @fingerprintjs/fingerprintjs)
  - 02-02 (client sends fingerprintHash at registration + POST /api/device-fingerprint after login)
provides:
  - POST /api/device-fingerprint (authenticated upsert + OAuth duplicate detection)
  - POST /api/device-verify (sendOtp + verifyOtp + device_bypass token issuance)
  - auth.server.ts databaseHooks.user.create.before (DEVICE_ALREADY_REGISTERED / DEVICE_HARD_BLOCKED)
  - twoFactor({ issuer: 'NoZar' }) plugin registration
  - dashboard.tsx needsDeviceVerification loader flag
  - DeviceVerificationPrompt modal (OAuth gap flow)
affects:
  - 02-04+ (TOTP 2FA UI pages can now use the registered twoFactor plugin)
  - app/routes/register.tsx (already wired — server-side enforcement now active)
  - app/routes/login.tsx (POST /api/device-fingerprint endpoint now exists)

# Tech tracking
tech-stack:
  added:
    - "better-auth/plugins twoFactor (TOTP 2FA plugin, built-in)"
  patterns:
    - "databaseHooks.user.create.before with dynamic imports to avoid circular deps"
    - "One-time bypass token stored in verifications table under 'device_bypass:{uuid}' key"
    - "Dynamic import of schema inside loader to avoid SSR-import issues"
    - "AnimatePresence multi-step modal with collecting/duplicate/phone/otp/done flow"

key-files:
  created:
    - app/routes/api.device-fingerprint.ts (POST upsert + OAuth duplicate detection)
    - app/routes/api.device-verify.ts (sendOtp / verifyOtp + bypass token)
    - app/components/ui/device-verification-prompt.tsx (OAuth gap modal)
  modified:
    - app/lib/auth.server.ts (twoFactor plugin + databaseHooks.user.create.before)
    - app/routes/dashboard.tsx (needsDeviceVerification loader + DeviceVerificationPrompt render)
    - app/routes.ts (two new route registrations)

key-decisions:
  - "Dynamic imports inside databaseHooks.user.create.before avoid circular dependency with schema"
  - "Hard block (>=2 fingerprint matches in 30d) flags trustProfiles.flagged and throws FORBIDDEN"
  - "Soft block (exactly 1 match) throws BAD_REQUEST DEVICE_ALREADY_REGISTERED — client shows OTP unlock"
  - "Bypass token stored in verifications table (5-min TTL) — consumed on first use (prevents replay)"
  - "OAuth gap check uses dynamic import of accounts + deviceFingerprints inside loader"
  - "DeviceVerificationPrompt uses direct fetch (not useFetcher) for multi-step async flow"

# Metrics
duration: 25min
completed: 2025-07-18
---

# Phase 2 Plan 03: Anti-Abuse Enforcement (server-side hooks + API routes) Summary

**Server-side device fingerprint enforcement: databaseHooks.user.create.before blocks duplicate registrations, /api/device-fingerprint upserts device records, /api/device-verify issues OTP bypass tokens, twoFactor plugin registered, OAuth gap handled via DeviceVerificationPrompt modal in dashboard**

## Performance

- **Duration:** ~25 min
- **Started:** 2025-07-18T00:00:00Z
- **Completed:** 2025-07-18T00:25:00Z
- **Tasks:** 3
- **Files modified:** 3 (auth.server.ts, dashboard.tsx, routes.ts)
- **Files created:** 3 (api.device-fingerprint.ts, api.device-verify.ts, device-verification-prompt.tsx)

## Accomplishments

### Task 1 — API Routes + routes.ts (commit `b9b7cde`)

**`app/routes/api.device-fingerprint.ts`** (new):
- `requireAuth` gate — userId always from verified session, never from request body (T-02-03-05)
- Validates `fingerprintHash` against `/^[a-zA-Z0-9]{1,64}$/` regex (T-02-03-01)
- Checks for same fingerprint linked to a DIFFERENT free-tier user in last 30 days
- Returns `{ duplicate: true, reason: "DEVICE_ALREADY_REGISTERED" }` when another free-tier account shares the fingerprint
- Upserts `device_fingerprints` row (insert + `onConflictDoUpdate` updating `lastSeenAt`)
- Returns `{ ok: true }` on success

**`app/routes/api.device-verify.ts`** (new):
- Unauthenticated endpoint (phone OTP bypass needed before account creation)
- `action: "sendOtp"`: normalizes SA phone via `normalizeZaPhone`, calls `sendOtp`, returns `{ sent: true }`
- `action: "verifyOtp"`: validates 6-digit code format, calls `verifyOtp`, issues one-time `device_bypass:{uuid}` token with 5-min TTL in verifications table, returns `{ bypassToken: uuid }`

**`app/routes.ts`**: added `api/device-fingerprint` and `api/device-verify` routes after `api/push-subscribe`

### Task 2 — auth.server.ts (commit `bf74c40`)

- Added `import { twoFactor } from "better-auth/plugins"`
- Added `plugins: [twoFactor({ issuer: "NoZar" })]` to `betterAuth()` call (D-09)
- Added `databaseHooks.user.create.before` hook:
  - Extracts `fingerprintHash` and `deviceBypassToken` from `context.body` via typed narrowing
  - Validates hash against regex (T-02-03-01); skips check entirely if no hash (OAuth/no-JS)
  - Bypass token check: looks up `device_bypass:{token}` in verifications table, consumes on match, returns early (T-02-03-03)
  - Fingerprint check: queries `deviceFingerprints` for last 30 days, limit 3
  - 0 matches → allow (new device)
  - 1 match → throw `APIError("BAD_REQUEST", { message: "DEVICE_ALREADY_REGISTERED" })` (D-05 soft block)
  - 2+ matches → flag `trustProfiles.flagged = true` for all, throw `APIError("FORBIDDEN", { message: "DEVICE_HARD_BLOCKED" })` (D-07 hard block)
- Existing `after` hook preserved verbatim (referral code + profile creation)

### Task 3 — DeviceVerificationPrompt + dashboard.tsx (commit `11b0fca`)

**`app/components/ui/device-verification-prompt.tsx`** (new):
- Follows `LocationPromptModal` pattern: AnimatePresence + backdrop + motion card
- 5-step flow: `collecting → duplicate → phone → otp → done`
- On open: lazy-loads `@fingerprintjs/fingerprintjs`, POSTs to `/api/device-fingerprint`
  - `{ ok: true }` → closes (device registered, no duplicate)
  - `{ duplicate: true }` → shows phone input step
  - Error → shows error + duplicate step
- `handleSendOtp`: POSTs to `/api/device-verify` with `action: "sendOtp"`
- `handleVerifyOtp`: POSTs to `/api/device-verify` with `action: "verifyOtp"`, `onSuccess` called on valid bypass token
- Amber accent for warning states, emerald for success states; Ndebele pattern strip at bottom

**`app/routes/dashboard.tsx`**:
- Added `DeviceVerificationPrompt` import
- Added `count` to drizzle-orm imports
- Loader: dynamic-imports `accounts` and `deviceFingerprints` from schema
- Queries `userAccounts` for the session user, computes `isOAuthOnly`
- If OAuth-only: counts device_fingerprints rows; sets `needsDeviceVerification = true` when count === 0
- Returns `needsDeviceVerification` in loader response
- Component: added `isDevicePromptDismissed` state, `showDevicePrompt` flag
- Renders `<DeviceVerificationPrompt>` after `<LocationPromptModal>` with dismiss/success handlers

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| T1 | API routes + routes.ts | `b9b7cde` | app/routes/api.device-fingerprint.ts, app/routes/api.device-verify.ts, app/routes.ts |
| T2 | twoFactor plugin + before hook | `bf74c40` | app/lib/auth.server.ts |
| T3 | DeviceVerificationPrompt + dashboard OAuth check | `11b0fca` | app/components/ui/device-verification-prompt.tsx, app/routes/dashboard.tsx |

## Deviations from Plan

None — plan executed exactly as written. All three tasks implemented per spec with no architectural changes required.

## Verification Results

- ✅ `grep "DEVICE_ALREADY_REGISTERED" app/lib/auth.server.ts` → 1 line
- ✅ `grep "DEVICE_HARD_BLOCKED" app/lib/auth.server.ts` → 1 line
- ✅ `grep "twoFactor" app/lib/auth.server.ts` (excluding twoFactorEnabled/twoFactors) → 2 lines
- ✅ `grep "better-auth/plugins" app/lib/auth.server.ts` → 1 line
- ✅ `grep "device_bypass:" app/lib/auth.server.ts` → 1 line (bypass token lookup)
- ✅ `grep "device_bypass:" app/routes/api.device-verify.ts` → 2 lines (token creation)
- ✅ `test -f app/routes/api.device-fingerprint.ts` → PASS
- ✅ `test -f app/routes/api.device-verify.ts` → PASS
- ✅ `grep "api/device-fingerprint" app/routes.ts` → 1 line
- ✅ `grep "api/device-verify" app/routes.ts` → 1 line
- ✅ `grep "needsDeviceVerification" app/routes/dashboard.tsx` → 5 lines
- ✅ `grep "DeviceVerificationPrompt" app/routes/dashboard.tsx` → 2 lines (import + JSX)
- ✅ `tsc --noEmit` → 0 errors in app/ scope (pre-existing context-mode/ + local/ errors unrelated)

## Known Stubs

None — all endpoints are fully implemented and wired.

## Threat Surface Scan

All surfaces covered by the plan's STRIDE threat register:
- T-02-03-01: fingerprintHash regex validation — ✅ implemented in both api.device-fingerprint.ts and auth.server.ts
- T-02-03-02: OTP replay prevention — ✅ otp.server.ts deletes record on first successful use
- T-02-03-03: bypass token tampering — ✅ token verified in verifications table, deleted on use
- T-02-03-04: context.body injection — ✅ typed narrowing + regex validation applied
- T-02-03-05: fingerprint recording another user's device — ✅ requireAuth gates the route; userId from session
- T-02-03-06: OTP spam DoS — accepted (deferred to future rate-limiting per CONTEXT.md)

## Self-Check: PASSED

- [x] `app/routes/api.device-fingerprint.ts` exists with `onConflictDoUpdate`, `requireAuth`, regex validation
- [x] `app/routes/api.device-verify.ts` exists with `device_bypass:` token creation, `bypassToken` in response
- [x] `app/lib/auth.server.ts` has `twoFactor` plugin, `DEVICE_ALREADY_REGISTERED`, `DEVICE_HARD_BLOCKED`, `device_bypass:`, `APIError`
- [x] `app/components/ui/device-verification-prompt.tsx` exists with `DeviceVerificationPrompt` export, `/api/device-fingerprint` fetch
- [x] `app/routes/dashboard.tsx` has `needsDeviceVerification` (5 refs), `DeviceVerificationPrompt` (2 refs), `isOAuthOnly` (2 refs)
- [x] `app/routes.ts` has `api/device-fingerprint` and `api/device-verify` routes
- [x] Commits `b9b7cde` (T1), `bf74c40` (T2), `11b0fca` (T3) exist in git log
- [x] 0 TypeScript errors in `app/` scope

---
*Phase: 02-device-identity-anti-abuse*
*Completed: 2025-07-18*
