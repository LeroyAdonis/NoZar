---
phase: 02-device-identity-anti-abuse
plan: "02"
subsystem: client-auth
tags: [fingerprinting, register, login, device-abuse, otp, better-auth]

# Dependency graph
requires:
  - 02-01 (device_fingerprints table, @fingerprintjs/fingerprintjs package)
provides:
  - register.tsx FingerprintJS lazy-load + fingerprintHash in signUp call
  - register.tsx DEVICE_ALREADY_REGISTERED inline phone+OTP unlock UI
  - login.tsx FingerprintJS lazy-load + fire-and-forget fingerprint POST
affects:
  - 02-03 (server-side /api/device-fingerprint + /api/device-verify routes consume these client calls)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FingerprintJS dynamic import inside useEffect for SSR-safe lazy loading"
    - "Better Auth signUp extra fields via spread (bypasses TS excess property check)"
    - "Fire-and-forget fetch POST for non-blocking fingerprint recording after login"
    - "Inline amber/red card error UI (not toast) for duplicate-device soft/hard block"

key-files:
  created: []
  modified:
    - app/routes/register.tsx (FingerprintJS useEffect, duplicate-device inline UI, handleDeviceSendOtp, handleDeviceVerifyOtp, updated handleSignUp)
    - app/routes/login.tsx (FingerprintJS useEffect, fingerprintHash state, fire-and-forget POST in onSuccess)

key-decisions:
  - "Spread syntax for deviceBypassToken in signUp.email to bypass TypeScript excess property checking (Better Auth's TS type does not declare extra fields)"
  - "Form hidden (not disabled) when deviceError is set — prevents confusing double-submit during OTP flow"
  - "Retry signUp uses token directly from fetch response (not from state) to avoid React async state issue"

# Metrics
duration: 15min
completed: 2025-07-18
---

# Phase 2 Plan 02: Device Fingerprint Collection (client-side) Summary

**FingerprintJS lazy-loaded in register+login pages; register shows inline amber/red card for DEVICE_ALREADY_REGISTERED / DEVICE_HARD_BLOCKED errors with phone+OTP unlock; login fires POST to /api/device-fingerprint after successful sign-in**

## Performance

- **Duration:** ~15 min
- **Started:** 2025-07-18T00:00:00Z
- **Completed:** 2025-07-18T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2 (register.tsx, login.tsx)

## Accomplishments

### Task 1 — register.tsx (commit `5cf3ef4`)
- Added `useEffect` import alongside `useState`
- Added 7 new state variables: `fingerprintHash`, `deviceError`, `devicePhone`, `deviceOtpSent`, `deviceOtp`, `deviceBypassToken`, `deviceVerifyLoading`, `deviceVerifyError`
- Added SSR-safe FingerprintJS `useEffect` that dynamic-imports `@fingerprintjs/fingerprintjs`, calls `fp.get()`, and stores `result.visitorId` in `fingerprintHash`
- Updated `handleSignUp` to spread `fingerprintHash` and `deviceBypassToken` into the `authClient.signUp.email()` call; updated `onError` to detect `DEVICE_ALREADY_REGISTERED` and `DEVICE_HARD_BLOCKED` error codes and set `deviceError` state instead of a generic error string
- Added `handleDeviceSendOtp`: POSTs `{ action: "sendOtp", phone }` to `/api/device-verify`, sets `deviceOtpSent` on success
- Added `handleDeviceVerifyOtp`: POSTs `{ action: "verifyOtp", phone, code }` to `/api/device-verify`; on success, retries `signUp.email()` with the bypass token directly in the call (React async state workaround), then navigates to `/dashboard` or shows verification screen
- Added inline JSX blocks:
  - Amber card (`bg-amber-500/10`) for `DEVICE_ALREADY_REGISTERED` with phone input → OTP input flow
  - Red card (`bg-red-500/10`) for `DEVICE_HARD_BLOCKED` with support contact message
- Wrapped main sign-up form in `{!deviceError && ...}` to hide it during the OTP unlock flow

### Task 2 — login.tsx (commit `af73f6b`)
- Added `useEffect` import
- Added `fingerprintHash` state variable
- Added FingerprintJS `useEffect` (same SSR-safe pattern as register.tsx)
- Updated `handleEmailSignIn` `onSuccess` callback to POST `{ fingerprintHash }` to `/api/device-fingerprint` (fire-and-forget, does not block `navigate("/dashboard")`)

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| T1 | FingerprintJS + duplicate-device inline UI in register.tsx | `5cf3ef4` | app/routes/register.tsx |
| T2 | FingerprintJS + post-login fingerprint POST in login.tsx | `af73f6b` | app/routes/login.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript excess property check for `deviceBypassToken`**
- **Found during:** Task 1 — tsc check after initial implementation
- **Issue:** `deviceBypassToken: data.bypassToken` as a direct property key in the retry `signUp.email()` call failed TypeScript's excess property check (`TS2353: Object literal may only specify known properties`). Better Auth's `signUp.email` type does not declare extra fields as known properties.
- **Fix:** Changed to spread syntax `...(data.bypassToken ? { deviceBypassToken: data.bypassToken } : {})` — same pattern used for `fingerprintHash`. Spread operators bypass excess property checking in TypeScript.
- **Files modified:** `app/routes/register.tsx` (line 171)
- **Commit:** `5cf3ef4` (fix applied in same commit)

## Verification Results

- ✅ `grep "DEVICE_ALREADY_REGISTERED" app/routes/register.tsx` → **4 occurrences**
- ✅ `grep "fingerprintjs" app/routes/register.tsx` → dynamic import line found
- ✅ `grep "fingerprintHash" app/routes/register.tsx` → **4 occurrences**
- ✅ `grep "deviceBypassToken" app/routes/register.tsx` → **4 occurrences**
- ✅ `grep "handleDeviceSendOtp" app/routes/register.tsx` → **2 occurrences** (def + JSX)
- ✅ `grep "handleDeviceVerifyOtp" app/routes/register.tsx` → **2 occurrences** (def + JSX)
- ✅ `grep "fingerprintjs" app/routes/login.tsx` → dynamic import line found
- ✅ `grep "device-fingerprint" app/routes/login.tsx` → fetch POST line found
- ✅ `grep "fingerprintHash" app/routes/login.tsx` → **4 occurrences**
- ✅ `grep "D-04" app/routes/login.tsx` → comment found
- ✅ `tsc --noEmit` → **0 errors in app/** (pre-existing context-mode/ errors remain out of scope)

## Known Stubs

- `/api/device-verify` — endpoint called by register.tsx but not yet created (Wave 3: 02-03)
- `/api/device-fingerprint` — endpoint called by login.tsx but not yet created (Wave 3: 02-03)

These are intentional Wave 2 stubs per the plan architecture. Wave 3 (02-03) will create both API routes. The client code is wired and ready; calling these endpoints before Wave 3 will return 404s (which are handled gracefully — registration proceeds without fingerprint check when server-side hook is absent).

## Threat Surface Scan

No new network endpoints introduced in this plan. Two new client-to-server call patterns:
- `POST /api/device-verify` — unauthenticated, phone OTP send/verify. Rate-limiting deferred per CONTEXT.md (T-02-02-04 accepted).
- `POST /api/device-fingerprint` — authenticated (session cookie required). Created in Wave 3.

Both surfaces are documented in the plan's STRIDE threat register.

## Self-Check: PASSED

- [x] `app/routes/register.tsx` contains `DEVICE_ALREADY_REGISTERED`, `fingerprintjs`, `fingerprintHash`, `deviceBypassToken`, `handleDeviceSendOtp`, `handleDeviceVerifyOtp`
- [x] `app/routes/login.tsx` contains `fingerprintjs`, `device-fingerprint`, `fingerprintHash`, `D-04`
- [x] Commits `5cf3ef4` (T1) and `af73f6b` (T2) exist in git log
- [x] 0 TypeScript errors in `app/` scope

---
*Phase: 02-device-identity-anti-abuse*
*Completed: 2025-07-18*
