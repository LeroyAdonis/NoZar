---
status: fixing
trigger: "Email verification not enforced — unverified users can log in; verification email may not send correctly."
created: 2025-01-01T00:00:00Z
updated: 2025-01-01T00:00:00Z
---

## Current Focus

hypothesis: Better Auth's `requireEmailVerification: true` flag is absent, so Better Auth never blocks sign-in for unverified users. Additionally, `sendVerificationEmail` in auth.server.ts lacks a try/catch, so Resend failures silently propagate and can break sign-up.
test: Read auth.server.ts config block
expecting: Confirmed missing flag and missing error handling
next_action: Apply two fixes to auth.server.ts

reasoning_checkpoint:
  hypothesis: "Missing `requireEmailVerification: true` in emailVerification config causes Better Auth to allow unverified users to sign in"
  confirming_evidence:
    - "auth.server.ts emailVerification block has no `requireEmailVerification` key"
    - "login.tsx already has isEmailNotVerifiedError UI handler — it was written expecting BA to return that error, but BA never returns it because enforcement is off"
    - "register.tsx already handles verificationSent path — UI is ready, auth enforcement is the gap"
  falsification_test: "If requireEmailVerification were true, Better Auth would return an email_not_verified error and login.tsx would show the resend UI"
  fix_rationale: "Adding requireEmailVerification:true makes Better Auth reject sign-in for unverified users at the auth layer (server-side enforcement)"
  blind_spots: "Better Auth's exact error message string — covered by login.tsx's isEmailNotVerifiedError which checks multiple variants"

## Symptoms

expected: Unverified users should be blocked from logging in; verification email should be sent on signup and failures logged.
actual: Unverified users can log in successfully; Resend send failures in sendVerificationEmail are unhandled.
errors: No runtime error — silent misconfiguration
reproduction: Sign up with email/password, skip email verification, try to log in — succeeds when it should not.
started: Always (config was never set)

## Eliminated

- hypothesis: Login route doesn't enforce verification manually
  evidence: Login route is client-side only (no server action). Better Auth handles blocking — UI in login.tsx already has the full "not verified" error path ready.
  timestamp: 2025-01-01T00:00:00Z

- hypothesis: emailVerified field missing from schema
  evidence: schema.ts line 19 shows `emailVerified: boolean("email_verified").notNull().default(false)` — field exists.
  timestamp: 2025-01-01T00:00:00Z

- hypothesis: sendVerificationEmail not wired up at all
  evidence: auth.server.ts lines 191-208 show sendVerificationEmail IS implemented and calls Resend. The email template exists (lines 93-128).
  timestamp: 2025-01-01T00:00:00Z

## Evidence

- timestamp: 2025-01-01T00:00:00Z
  checked: auth.server.ts emailVerification block (lines 190-212)
  found: emailVerification config has sendVerificationEmail and autoSignIn but NO requireEmailVerification key
  implication: Better Auth defaults requireEmailVerification to false — unverified users are allowed to sign in

- timestamp: 2025-01-01T00:00:00Z
  checked: auth.server.ts sendVerificationEmail (lines 196-207)
  found: resend.emails.send() result is awaited with no try/catch wrapper; if Resend throws, error propagates unhandled
  implication: A wrong Resend domain or API key error will bubble up and may break the sign-up response

- timestamp: 2025-01-01T00:00:00Z
  checked: login.tsx isEmailNotVerifiedError (lines 29-36)
  found: UI already handles EMAIL_NOT_VERIFIED case with "resend verification email" button
  implication: UI is ready; only the server-side enforcement flag is missing

- timestamp: 2025-01-01T00:00:00Z
  checked: register.tsx onSuccess handler (lines 62-66)
  found: Correctly branches on ctx.data?.session presence — shows verificationSent UI when no session returned
  implication: Register flow is already correct for when requireEmailVerification blocks auto-sign-in

## Resolution

root_cause: |
  1. PRIMARY: `requireEmailVerification: true` is absent from the Better Auth `emailVerification` config in auth.server.ts.
     Better Auth defaults this to false, so it issues a valid session even for unverified users.
  2. SECONDARY: `sendVerificationEmail` callback has no error handling — a Resend API failure
     (e.g., wrong domain) will throw an unhandled exception that can break the sign-up response instead of logging gracefully.

fix: |
  1. Added `requireEmailVerification: true` to the emailVerification config block in auth.server.ts.
  2. Wrapped the resend.emails.send() call in sendVerificationEmail with a .catch() for graceful error logging.
  3. Applied same graceful error handling to sendResetPassword for consistency.

verification: typecheck passes, no new TS errors introduced
files_changed:
  - app/lib/auth.server.ts
