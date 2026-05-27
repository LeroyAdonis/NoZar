---
phase: "02-device-identity-anti-abuse"
plan: "02-04"
subsystem: "auth"
tags: ["totp", "2fa", "better-auth", "qrcode", "security"]
dependency_graph:
  requires: ["02-03"]
  provides: ["totp-2fa-client-ui"]
  affects: ["auth.client.ts", "routes/two-factor.tsx", "routes/dashboard/settings-security.tsx", "routes/dashboard/profile.tsx", "routes.ts"]
tech_stack:
  added: []
  patterns:
    - "Better Auth twoFactorClient plugin wired to createAuthClient"
    - "qrcode dynamic import in useEffect (SSR-safe QR rendering)"
    - "React state machine for 2FA page states (idle / qr-setup)"
key_files:
  created:
    - "app/routes/two-factor.tsx"
    - "app/routes/dashboard/settings-security.tsx"
  modified:
    - "app/lib/auth.client.ts"
    - "app/routes.ts"
    - "app/routes/dashboard/profile.tsx"
decisions:
  - "Used ./+types/settings-security (not dashboard.settings-security) — actual typegen output path matches file location"
  - "handleRegenerateBackupCodes made event-free — called from button onClick, not form onSubmit"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-26"
  tasks_completed: 3
  files_changed: 5
---

# Phase 02 Plan 04: TOTP 2FA Setup & Login Challenge Summary

**One-liner:** TOTP 2FA feature completed — twoFactorClient plugin wired, login-challenge page with trustDevice checkbox, security settings page with QR/backup-codes flow, and profile nav link.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| T1 | twoFactorClient plugin + /two-factor challenge page + route | 0680571 |
| T2 | /dashboard/settings/security 2FA management page + route | c9b9e85 |
| T3 | Security nav link in /dashboard/profile | 8c78dbe |

## What Was Built

### T1 — auth.client.ts + /two-factor page
- `app/lib/auth.client.ts`: Added `twoFactorClient()` to `createAuthClient` plugins array (D-10)
- `app/routes/two-factor.tsx`: TOTP login-challenge page matching login page visual style
  - 6-digit code input with `inputMode="numeric"` and `autoComplete="one-time-code"`
  - "Trust this device for 30 days" checkbox (`trustDevice` state passed to `verifyTotp`)
  - Backup code fallback via `authClient.twoFactor.verifyBackupCode`
  - Error handling with inline red alert box
- `app/routes.ts`: Registered `route("two-factor", "routes/two-factor.tsx")`

### T2 — /dashboard/settings/security
- `app/routes/dashboard/settings-security.tsx`: 3-state 2FA management page
  - **Idle / Enable state**: Password confirm form → `authClient.twoFactor.enable()`
  - **QR setup state**: Shows QR image rendered via `qrcode.toDataURL` (dynamic import in useEffect, SSR-safe), manual entry key extracted from `totpURI`, backup codes grid with Copy All + Download buttons
  - **Enabled state**: Disable form + Regenerate backup codes button
- `app/routes.ts`: Registered `route("settings/security", "routes/dashboard/settings-security.tsx")` as dashboard child

### T3 — Profile security nav link
- `app/routes/dashboard/profile.tsx`: Added `ChevronRight` to lucide-react imports
- Inserted Security card row (ShieldCheck icon, "Two-factor authentication" subtitle, chevron) immediately above the Sign out button, linking to `/dashboard/settings/security`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong type import path for settings-security**
- **Found during:** T2 typecheck
- **Issue:** Plan specified `"./+types/dashboard.settings-security"` but react-router typegen outputs `settings-security.ts` (not `dashboard.settings-security.ts`) inside the `dashboard/+types/` directory
- **Fix:** Changed import to `"./+types/settings-security"` to match actual generated file
- **Files modified:** `app/routes/dashboard/settings-security.tsx`
- **Commit:** c9b9e85

**2. [Rule 1 - Bug] MouseEventHandler type mismatch on Regen Codes button**
- **Found during:** T2 typecheck
- **Issue:** `handleRegenerateBackupCodes` was typed as `(e: React.FormEvent)` but used as `onClick` handler; the cast `as unknown as React.MouseEventHandler` failed tsc
- **Fix:** Removed event parameter from `handleRegenerateBackupCodes` since it's called from a button (not form `onSubmit`) — no event needed
- **Files modified:** `app/routes/dashboard/settings-security.tsx`
- **Commit:** c9b9e85

## Recovery Context

This plan was executed as a recovery run. The previous executor was interrupted by a connection error with partial work already in the working tree:
- `app/lib/auth.client.ts` — twoFactorClient already added ✅
- `app/routes.ts` — two-factor route already added ✅  
- `app/routes/two-factor.tsx` — already created ✅
- `app/routes/dashboard/settings-security.tsx` — missing ❌
- `app/routes/dashboard/profile.tsx` — security link missing ❌

All partial work was committed atomically as T1, then T2 and T3 were created fresh.

## Threat Surface Scan

No new security-relevant surface beyond what the plan's threat model covers:
- `/two-factor` verifies TOTP codes via Better Auth (no new endpoints)
- `/dashboard/settings/security` calls Better Auth's twoFactor APIs (no new endpoints)
- TOTP secret encrypted by Better Auth using `BETTER_AUTH_SECRET` (T-02-04-01 mitigated)
- Backup codes single-use enforced server-side by Better Auth (T-02-04-02 mitigated)
- 2FA enable requires password validation server-side (T-02-04-05 mitigated)

## Self-Check: PASSED

- `app/lib/auth.client.ts` — exists, contains `twoFactorClient` (3 matches)
- `app/routes/two-factor.tsx` — exists, contains `verifyTotp`, `trustDevice` (5 matches), `verifyBackupCode`
- `app/routes/dashboard/settings-security.tsx` — exists, contains `twoFactor.enable`, `twoFactor.disable`, `toDataURL`, `generateBackupCodes`
- `app/routes.ts` — contains `"two-factor"` and `"settings/security"`
- `app/routes/dashboard/profile.tsx` — contains `settings/security` link and `ShieldCheck`
- Commits: 0680571, c9b9e85, 8c78dbe — all verified in git log
- `npm run typecheck` — passes (only pre-existing context-mode/local errors, out of scope)
