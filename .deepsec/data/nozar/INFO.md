# nozar

## What this codebase does

NoZar is a South African barter/swap marketplace. Users list goods or
services, browse nearby listings, "ping" each other, negotiate in
trade-scoped chat, and move through a handshake flow before meeting or
sharing contact details.

The app is a React Router SSR app backed by Better Auth, Neon Postgres,
and Drizzle. Project-specific integrations include Paystack billing,
Vercel Blob uploads, browser push subscriptions, Africa's Talking SMS
OTP, and AI-generated meetup spot suggestions.

The most sensitive data is trade chat, contact disclosures, location and
profile data, phone verification state, subscription/payment state, and
trust/report/freeze state on trades.

## Auth shape

- `requireAuth(request)` is the normal gate for protected loaders and
  actions across dashboard routes and API endpoints.
- `getOptionalSession(request)` is used on public pages that render
  differently for signed-in users, like landing/login/register flows.
- `/api/auth/*` is delegated to Better Auth via `auth.handler(request)`;
  OAuth errors are redirected back to `/login` instead of returning raw
  500s.
- Trade-scoped handlers are supposed to do a second check after auth:
  compare the current user to `trades.initiatorId` /
  `trades.responderId`.
- `verifyPaystackSignature()` is the trust gate for the intended-public
  Paystack webhook.

## Threat model

The highest-impact bug class here is cross-trade access: reading or
posting in another user's negotiation, revealing phone/email before the
handshake gates pass, or changing trust/report/freeze state for someone
else's trade.

Account/session compromise is also high impact because it grants access
to listings, pings, profile/location data, phone verification flows, and
billing actions. Secondary abuse is resource or billing misuse through
intended-public endpoints like uploads, auth callbacks, and webhooks.

## Project-specific patterns to flag

- New trade-scoped endpoints should not stop at `requireAuth()`. They
  also need the manual participant check used in
  `api.messages.$tradeId`, `api.chat-stream.$tradeId`,
  `api.handshake.$tradeId`, and `dashboard/pings.$id`.
- Blind-chat protections live in `dashboard/pings.$id.tsx`: phone
  numbers and emails are redacted while trade status is `proposed` or
  `negotiating`, and `contactDisclosures` should only matter after
  `agreed` plus both `readinessFlags` set.
- Phone verification is custom: `normalizeZaPhone()`, `sendOtp()`,
  `verifyOtp()`, and `profiles.phoneVerified`. Code that flips verified
  phone state outside that path is suspicious.
- Billing/webhook flow is custom: checkout goes through
  `initializePaystackTransaction()`, while the webhook verifies
  `x-paystack-signature` against raw `request.text()`.
- Upload and push flows have narrow allowed shapes: `api.upload` only
  issues image upload tokens up to 5 MB, and `api.push-subscribe`
  stores browser push keys by endpoint for the signed-in user.

## Known false-positives

- `/api/auth/*` is intentionally public; auth is delegated to Better
  Auth rather than a repo-local session wrapper.
- `/api/pay/webhook` is intentionally public; request trust comes from
  `verifyPaystackSignature()`, not a user session.
- `/api/upload` is intentionally public for the Vercel Blob client
  handshake; the app server does not receive file bytes directly.
- `/r/:referralCode` and `/api/refer` are intended referral surfaces;
  `api.refer` returns the current signed-in user's referral code.
- `dashboard/verify-phone.tsx` logs OTP codes only outside production or
  in Africa's Talking sandbox to support local testing.
