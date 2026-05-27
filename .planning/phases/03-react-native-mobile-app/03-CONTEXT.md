# Phase 3: React Native Mobile App — Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the existing Nozar web app into a **Turborepo monorepo** (`apps/web` + `apps/mobile` + `packages/shared`) and build a **full-parity Expo React Native app** (iOS + Android) that targets the same Neon PostgreSQL backend via a new **tRPC API layer** added to the existing React Router server.

The mobile app ships with **all features** from the web dashboard: asset feed, asset detail, map view, add listing, pings (real-time chat + handshake flow), notifications, profile, billing (PayFast via WebView), and phone verification.

**UI stack:** NativeWind (Tailwind CSS for RN) + React Native Reusables (headless components) + BKLIT analytics (web + mobile).

**What this phase is NOT:** No new backend features, no new business logic, no changes to the web UI. This phase is purely the mobile client + shared infrastructure to support it.

</domain>

<decisions>
## Implementation Decisions

### Repository & Monorepo Structure
- **D-01:** Use **Turborepo** monorepo. Structure: `/apps/web` (existing React Router app), `/apps/mobile` (new Expo app), `/packages/shared` (shared logic).
- **D-02:** `packages/shared` exports: TypeScript types (`types.ts`), Zod validation schemas, tRPC router type definitions, tier-limits logic, regions constants, and utility functions. The existing `app/lib/types.ts`, `app/lib/tier-limits.ts`, `app/lib/regions.ts`, `app/lib/utils.ts` are the source files to migrate/copy into `packages/shared`.
- **D-03:** The web app at `apps/web` is the existing codebase moved. Import paths from `~/lib/` that reference shared modules will point to `@nozar/shared` package instead.

### Mobile App Foundation
- **D-04:** **Expo managed workflow** — Expo SDK (latest stable), `expo-router` for file-based navigation (v3+), EAS Build for production builds, EAS Update for OTA.
- **D-05:** Component libraries: **NativeWind v4** (Tailwind CSS for RN) matching the existing dark theme tokens (`#030712` base, `#0F172A` cards, `emerald-500` primary). **React Native Reusables** for headless UI primitives (matching shadcn/ui pattern already used on web).
- **D-06:** Analytics: **BKLIT** — integrate both in `apps/web` (if not already) and `apps/mobile`.

### Navigation
- **D-07:** **Tab bar** matching web bottom nav — 5 tabs: Home (feed), Map, + (Add listing), Pings, Profile. expo-router tab layout `(tabs)/_layout.tsx`.
- **D-08:** Secondary screens (Asset Detail, Notifications, Billing, Trade detail, Phone Verify) use stack navigation nested within tabs.

### API & Backend Communication
- **D-09:** Add a **tRPC router** to the existing React Router server (`apps/web`). Mobile app calls tRPC endpoints over HTTPS. The existing server-side DB/auth/AI modules remain server-only; tRPC procedures call them directly.
- **D-10:** tRPC router lives in `apps/web/app/lib/trpc.server.ts` (or `server/trpc/`) and is mounted as a React Router API route under `/api/trpc/*`. The mobile app imports the router type from `packages/shared` for full type safety.
- **D-11:** **React Query** (`@tanstack/react-query`) is the data-fetching layer on mobile, via `@trpc/react-query`.

### Authentication
- **D-12:** **Better Auth Expo SDK** (`better-auth/expo`) — token-based sessions stored in `expo-secure-store`. The existing Better Auth server config (`app/lib/auth.server.ts`) is extended with the Expo plugin.
- **D-13:** **Google OAuth on mobile** via `expo-auth-session` + `expo-web-browser`. The OAuth callback is handled by Better Auth's existing Google provider.
- **D-14:** Email/password login is a native form — no WebView. Tokens are refreshed transparently via Better Auth's session refresh mechanism.

### Real-time Chat
- **D-15:** **SSE via polyfill** — use `react-native-event-source` (or `@azure/fetch-event-source` with RN fetch) to consume the existing `/api/chat-stream/:tradeId` SSE endpoint. No server changes required.
- **D-16:** Chat UI mirrors the existing `ChatWindow` and `HandshakeFlow` components, rebuilt in React Native using NativeWind styling.

### Push Notifications
- **D-17:** **Expo Push Notifications** (`expo-notifications`) + EAS Push service. Expo handles APNs (iOS) and FCM (Android) transparently.
- **D-18:** Add a new API endpoint `/api/push-subscribe-mobile` (or extend the existing `/api/push-subscribe`) that accepts an Expo push token and stores it in the DB (new `expoPushTokens` column on `profiles` or separate table).
- **D-19:** Server-side notification dispatch (trade updates, new pings) must check for both web VAPID subscriptions and Expo tokens and send to whichever exists.

### Payments
- **D-20:** **WebView-based PayFast** — use `expo-web-browser` (`WebBrowser.openAuthSessionAsync`) to open the PayFast checkout URL. The existing `/api/pay/upgrade` and `/api/pay/webhook` routes are reused unchanged.
- **D-21:** After payment completes, PayFast redirects to a deep link (`nozar://billing/success` or similar) that returns control to the app. Deep links configured via `app.json` scheme.

### Image Upload
- **D-22:** Use `expo-image-picker` for camera/gallery access. Upload directly to the existing `/api/upload` route (Vercel Blob). Reuse the same upload endpoint — no server changes.

### Maps
- **D-23:** **react-native-maps** with Google Maps provider (matches web Google Maps). Requires Google Maps API key in `app.json` (Android) and `AppDelegate` (iOS via EAS secrets).

### Agent's Discretion
- Exact folder structure within `apps/mobile/` (expo-router file conventions).
- NativeWind Tailwind config — extend with project-specific tokens.
- Which React Native Reusables components to use per screen — agent picks based on the web component's equivalent.
- Turborepo pipeline config (`turbo.json`) — agent sets up `build`, `dev`, `typecheck` tasks with appropriate dependencies.
- Whether tRPC procedures are organized by domain (listings, trades, users, notifications) or flat — agent chooses the cleanest grouping.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Shared Logic (to migrate to packages/shared)
- `app/lib/types.ts` — All TypeScript view models and domain types (ListingCard, TradeThread, TradeDetail, HandshakeStage, etc.)
- `app/lib/tier-limits.ts` — LISTING_LIMITS, TierCode, getEffectivePlanCode, canUseAiFeature, BUSINESS_PRODUCTS_LIVE flag
- `app/lib/regions.ts` — MVP_REGIONS (Cape Town, Johannesburg), resolveRegion, provinceToSlug
- `app/lib/utils.ts` — haversineKm, formatDistance, timeAgo, and other shared utilities

### Existing Server Modules (NOT shared — server-only)
- `app/lib/auth.server.ts` — Better Auth config; extend with `expo()` plugin for mobile token support
- `app/lib/db.server.ts` — Drizzle DB client; stays server-only
- `app/lib/ai.server.ts` — Gemini AI; stays server-only
- `app/lib/blob.server.ts` — Vercel Blob; stays server-only (called via tRPC or existing /api/upload)
- `app/lib/schema.ts` — Drizzle schema; stays server-only but informs shared types

### Existing API Routes (to expose via tRPC or reuse as-is)
- `app/routes/api.chat-stream.$tradeId.ts` — SSE endpoint; consumed by mobile via polyfill, no changes
- `app/routes/api.upload.ts` — Image upload to Vercel Blob; consumed by mobile directly, no changes
- `app/routes/api.push-subscribe.ts` — Web Push subscribe; a mobile equivalent is needed for Expo tokens
- `app/routes/api.pay.upgrade.ts` + `api.pay.webhook.ts` — PayFast; reused via WebView, no changes

### Existing Web UI (reference for mobile screen design)
- `app/routes/dashboard/home.tsx` — Feed with category chips, AI match badge, distance filter
- `app/routes/dashboard/pings.$id.tsx` — Chat + handshake flow; source of truth for trade state machine
- `app/routes/dashboard/map.tsx` — Map with listing pins
- `app/routes/dashboard/add.tsx` — Add listing form with image upload
- `app/routes/dashboard/profile.tsx` — Profile settings, tier badge, phone verification link
- `app/routes/dashboard/billing.tsx` — Subscription tier display + PayFast upgrade CTA

### Existing Components (reference for mobile rebuilds)
- `app/components/ui/asset-card.tsx` — Card layout for listing feed
- `app/components/ui/ChatWindow.tsx` + `ChatComposer.tsx` — Chat UI pattern
- `app/components/ui/HandshakeFlow.tsx` — Handshake stage progression UI
- `app/components/ui/bottom-nav.tsx` — Tab navigation reference (5 tabs)
- `app/components/ui/tier-badge.tsx` + `trust-badge.tsx` + `verification-badge.tsx` — Badge components to recreate in RN

### Auth & Session
- `app/lib/auth.server.ts` §Better Auth config — add `expo()` plugin; read existing Google OAuth setup to match on mobile
- Better Auth Expo docs: https://www.better-auth.com/docs/integrations/expo (external)

### Design System
- `.github/copilot-instructions.md` §Conventions — design tokens: `#030712` base, `#0F172A` cards, `emerald-500` primary, always-dark, brutalist typography
- NativeWind docs: https://www.nativewind.dev/ (external)
- React Native Reusables: https://reactnativereusables.com/ (external)
- BKLIT analytics: https://ui.bklit.com/ (external)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/lib/types.ts` — Direct move to `packages/shared/types.ts`. No changes needed, pure TypeScript types.
- `app/lib/tier-limits.ts` — Move to `packages/shared/tier-limits.ts`. Contains no server dependencies.
- `app/lib/regions.ts` — Move to `packages/shared/regions.ts`. Pure constants.
- `app/lib/utils.ts` — Move to `packages/shared/utils.ts`. Pure functions (haversineKm, timeAgo).
- `/api/upload` route — Reusable as-is for mobile image uploads. No changes.
- `/api/chat-stream/:tradeId` SSE route — Reusable as-is for mobile chat. SSE polyfill needed on mobile side only.
- PayFast routes (`/api/pay/upgrade`, `/api/pay/webhook`) — Reusable as-is via WebView.

### Established Patterns
- **Trade lifecycle:** `proposed` → `negotiating` → `agreed` → `contact_shared` → `completed` (or `cancelled`/`disputed`). Mobile HandshakeFlow must match this exactly.
- **Auth guard:** `requireAuth(request)` in loaders. Mobile equivalent: check token on app startup, redirect to login stack if missing.
- **Tier gating:** `canUseAiFeature()` and `getEffectivePlanCode()` from tier-limits. Mobile uses same logic from `packages/shared`.
- **MVP regions:** Only Cape Town (Western Cape) and Johannesburg (Gauteng). `resolveRegion()` in packages/shared enforces this on mobile too.
- **Multi-intent actions:** Web uses hidden `intent` field in forms. Mobile tRPC procedures replace this with named mutations.
- **Real-time pattern:** SSE `ReadableStream` endpoint at `/api/chat-stream/:tradeId` — mobile polyfills `EventSource` to connect.

### Integration Points
- **Turborepo setup:** Current `package.json` at root becomes the Turborepo workspace root. `apps/web/package.json` wraps the existing app. `apps/mobile/package.json` is the new Expo app.
- **Better Auth Expo extension:** `auth.server.ts` needs `expo()` plugin added. Mobile client uses `createAuthClient({ plugins: [expoClient()] })`.
- **Push token storage:** `profiles` table needs an `expoPushToken` column (or new `expo_push_tokens` table) — small schema migration required.
- **tRPC mount point:** New React Router API route `app/routes/api.trpc.$.ts` handles all `POST /api/trpc/*` requests. The tRPC router file lives alongside other server libs.

</code_context>

<specifics>
## Specific Ideas

- **Design language:** NativeWind config should mirror web Tailwind config exactly — same color tokens (`bg-[#030712]`, `bg-[#0F172A]`, `text-emerald-500`). This means the dark theme looks identical on web and mobile.
- **Tab icons:** Match web bottom nav icons (lucide-react icons → equivalent lucide-react-native or expo vector icons).
- **"No ZAR" branding:** Mobile splash/icon should match web — emerald-on-black aesthetic.
- Component libraries chosen for their shadcn/ui-like developer experience, matching the headless approach already used on web.
- BKLIT analytics covers both web and mobile — single analytics dashboard for cross-platform insights.

</specifics>

<deferred>
## Deferred Ideas

- **In-app purchases (IAP):** iOS App Store / Google Play billing. Deferred — WebView PayFast ships first; IAP adds 30% platform cut and significant complexity.
- **Offline mode / sync:** Deferred to a future phase.
- **Mobile-specific features** (e.g., AR preview, barcode scanner for listings): Deferred — full parity first.
- **Web app PWA improvements** inspired by mobile work: Deferred to separate phase.

</deferred>

---

*Phase: 3-react-native-mobile-app*
*Context gathered: 2026-05-26*
