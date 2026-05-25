# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## debug-email-verification — Better Auth not blocking unverified users from sign-in
- **Date:** 2025-01-01
- **Error patterns:** email verification, requireEmailVerification, unverified, sign-in, login, resend, sendVerificationEmail
- **Root cause:** `requireEmailVerification: true` was absent from the Better Auth `emailVerification` config block. Better Auth defaults this to false, so verified users receive a valid session. Secondarily, `sendVerificationEmail` and `sendResetPassword` callbacks lacked error handling — Resend API failures (wrong domain, bad key) would propagate as unhandled exceptions.
- **Fix:** Added `requireEmailVerification: true` to the `emailVerification` config in `app/lib/auth.server.ts`. Added `.catch()` error handlers to both `sendVerificationEmail` and `sendResetPassword` to log failures gracefully without breaking the user flow.
- **Files changed:** app/lib/auth.server.ts
---
