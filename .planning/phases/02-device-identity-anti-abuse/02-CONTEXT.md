# Phase 2: Device Identity & Anti-Abuse — Context

**Gathered:** 2026-05-26
**Status:** Ready for planning
**Source:** User discussion + research

<domain>
## Phase Boundary

Prevent free-tier abuse (users creating multiple email accounts to circumvent the 5-listing cap) by linking authenticated users to their devices via browser fingerprinting. Add TOTP 2FA support via Authenticator apps (Google Authenticator, Authy, etc.) as both a trust signal and security hardening. Uses only open-source/zero-SaaS components.

</domain>

<decisions>
## Implementation Decisions

### Device Fingerprinting
- **D-01:** Use `@fingerprintjs/fingerprintjs` (MIT, open-source, no SaaS) for client-side browser fingerprint collection. Collect `visitorId` on the register page before form submission.
- **D-02:** Pass `fingerprintHash` as an extra field in `authClient.signUp.email({ ..., fingerprintHash })`. Better Auth's sign-up body accepts arbitrary extra fields via ZodRecord.
- **D-03:** Intercept in `databaseHooks.user.create.before` in `auth.server.ts`. If fingerprint is linked to an existing free-tier account, return a `DEVICE_ALREADY_REGISTERED` error (do NOT return `false` which gives a generic error — use an explicit error code for clean UX).
- **D-04:** After any successful login (email or OAuth), client sends fingerprint to `/api/device-fingerprint` POST route → upsert `device_fingerprints` row.

### Duplicate Device Response
- **D-05:** SOFT BLOCK — when duplicate fingerprint detected (either at registration or on first dashboard load for OAuth users), require phone OTP verification to unlock the account. Uses existing Africa's Talking OTP infrastructure (`app/lib/otp.server.ts`).
- **D-06:** OAuth (Google sign-in) gap: context is null in `user.create.before` for OAuth registrations, so fingerprint cannot be checked at creation time. Handle in dashboard loader: if user is OAuth-originated AND no verified fingerprint AND unverified phone → show `DeviceVerificationPrompt` modal (similar to LocationPromptModal pattern).
- **D-07:** Hard block (>2 accounts from same fingerprint in 30 days): return error, no phone OTP unlock. Account flagged in `trustProfiles.flagged = true`.

### DB Schema
- **D-08:** Add `device_fingerprints` table: `id`, `fingerprintHash`, `userId`, `firstSeenAt`, `lastSeenAt`, `trustLevel` (unknown|trusted|flagged), `registrationFingerprint` (bool). Indexes on `fingerprintHash` and `userId`.

### TOTP 2FA (Authenticator App)
- **D-09:** Use Better Auth's built-in `twoFactor` plugin (already in node_modules). Add `twoFactor({ issuer: "NoZar" })` to `plugins` array in `auth.server.ts`. No `otplib` or `speakeasy` needed.
- **D-10:** Add `twoFactorClient` plugin to `auth.client.ts`.
- **D-11:** Add `qrcode` npm package for QR code rendering only.
- **D-12:** Create `/dashboard/settings/security` page (new route): Enable 2FA → show QR code + backup codes. Disable 2FA with password confirmation. This is an opt-in feature, not mandatory.
- **D-13:** Create `/two-factor` page: handles the login-time 2FA challenge (6-digit code input). Better Auth's twoFactorClient redirects here automatically when 2FA is required.

### Migration
- **D-14:** Run `npx @better-auth/cli generate` to add Better Auth twoFactor plugin tables, then `npx drizzle-kit generate && npx drizzle-kit migrate`.

### the agent's Discretion
- Exact UI copy for the duplicate device warning screen
- Whether `/dashboard/settings/security` is a new sub-route or a section in `/dashboard/profile`
- Visual design of the QR code setup screen (follows project brutalist/dark theme)
- Whether to show a "trust this device" checkbox on the 2FA verify screen (`trustDevice?: true` option in Better Auth)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth & Anti-Abuse
- `app/lib/auth.server.ts` — Add twoFactor plugin, add databaseHooks.user.create.before fingerprint check
- `app/lib/schema.ts` — Add device_fingerprints table
- `app/lib/otp.server.ts` — Reuse sendOtp/verifyOtp for duplicate-device phone unlock
- `app/lib/auth.client.ts` — Add twoFactorClient plugin

### Registration & Login
- `app/routes/register.tsx` — Add FingerprintJS collection + fingerprintHash in signUp call + handle DEVICE_ALREADY_REGISTERED error
- `app/routes/login.tsx` — After successful login, send fingerprint to /api/device-fingerprint

### Dashboard Layout
- `app/routes/dashboard.tsx` — Add OAuth device verification check in loader/layout (similar to LocationPromptModal pattern)

### Styling Conventions
- Design: always-dark `#030712` base, `#0F172A` cards, emerald-500 primary, slate text. No light mode.
- Brutalist typography: `font-mono uppercase tracking-widest text-[10px]` labels, `font-black uppercase tracking-tighter` headings.
- Follow LocationPromptModal pattern (`app/components/ui/location-prompt-modal.tsx`) for the DeviceVerificationPrompt modal.

### Tier System
- `app/lib/tier-limits.ts` — Free tier is 5 listings; this phase protects that gate.

</canonical_refs>

<specifics>
## Specific Ideas

- The `DEVICE_ALREADY_REGISTERED` error should render an inline UI state in the register form — not a toast — with copy like: "This device is linked to an existing NoZar account. Verify your phone to continue."
- QR code setup screen should show the `totpURI` as a QR image (rendered via `qrcode`) PLUS manual entry key (for users who can't scan).
- Backup codes should be shown once after enabling 2FA with a "Download / copy" action — never shown again unless regenerated.
- The `/two-factor` challenge page should match the login page's visual style.
- The `trustDevice` checkbox ("Trust this device for 30 days") is a nice-to-have on the 2FA verify screen — include it if it doesn't add significant complexity.

</specifics>

<deferred>
## Deferred Ideas

- Admin UI to review flagged abuse accounts (Phase N)
- Biometric device unlock (Face ID / Touch ID via WebAuthn) — future phase
- Commercial FingerprintJS Identification (higher accuracy) — only if casual-user fingerprint proves insufficient
- Rate-limiting registration per IP address (separate concern — can be added later)

</deferred>

---

*Phase: 02-device-identity-anti-abuse*
*Context gathered: 2026-05-26*
