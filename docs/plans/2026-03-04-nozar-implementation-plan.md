# NoZar — Comprehensive Implementation Plan

**Date:** 2026-03-04
**Status:** Active
**Supersedes:** Individual gap analysis items from `gap-analysis.md`
**Tech Stack:** React Router v7 (SSR), Tailwind CSS v4, Vite 7, TypeScript strict

---

## Problem Statement

NoZar ("No ZAR — no cash needed") is a mobile-first PWA for the South African market enabling peer-to-peer barter trading without money. The app currently exists as a **polished frontend prototype** with a landing page, dashboard shell, asset feed, asset detail view, pings/chat UI, and a 3-stage handshake flow — all using mock data.

There is **zero backend infrastructure**: no database, no authentication, no real API calls, no persistence. The design system tokens and reusable components are being formalized now (Phase 0).

This plan covers **every remaining work item** from prototype to production MVP to growth features, organized into 8 phases with explicit dependencies, complexity estimates, and risk assessments.

### Architectural Context: React Router v7 vs. Next.js

The original platform design document assumes Next.js App Router with React Server Components and Server Actions. The actual app uses **React Router v7 with SSR**. This affects implementation patterns throughout:

| Concept | Next.js (planned) | React Router v7 (actual) |
|---|---|---|
| Data fetching | Server Components + `fetch` | `loader` functions (server-side) |
| Mutations | Server Actions | `action` functions + `<Form>` |
| Route protection | `middleware.ts` | `loader` auth checks / middleware via `entry.server.tsx` |
| API routes | `app/api/*/route.ts` | Resource routes (`.server.ts` convention) |
| Layouts | `layout.tsx` nesting | Route nesting via `routes.ts` config |
| Streaming | `loading.tsx` + Suspense | `defer()` + `<Await>` |
| Static pages | `generateStaticParams` | `prerender` in route config |

All planned features are fully achievable with React Router v7. The patterns differ but the capabilities are equivalent.

---

## Current Route Structure

```
/                           → Landing page (landing.tsx)
/dashboard                  → Dashboard layout (dashboard.tsx)
  /dashboard                → Home / asset feed (dashboard/home.tsx)
  /dashboard/asset/:id      → Asset detail (dashboard/asset.$id.tsx)
  /dashboard/pings          → Ping threads list (dashboard/pings.tsx)
  /dashboard/pings/:id      → Chat thread (dashboard/pings.$id.tsx)
  /dashboard/map            → Map stub (dashboard/map.tsx)
  /dashboard/add            → Add asset stub (dashboard/add.tsx)
  /dashboard/profile        → Profile stub (dashboard/profile.tsx)
```

---

## Dependencies Diagram

```
Phase 0 ─── Design System Foundation (IN PROGRESS)
   │
   ├──→ Phase 1 ─── Landing Page Completion
   │       │
   │       └──→ Phase 2 ─── Awwwards Animations
   │
   ├──→ Phase 3 ─── Dashboard Pages (mock data UI)
   │
   └──→ Phase 4 ─── Backend Infrastructure
            │
            ├──→ Phase 5 ─── Core Features (MVP)
            │       │
            │       └──→ Phase 6 ─── PWA & Performance
            │
            └──→ Phase 7 ─── Growth (Post-MVP)
```

**Critical path:** Phase 0 → Phase 4 → Phase 5 → Phase 6

**Parallel tracks:** Phases 1-3 can run in parallel (all frontend-only). Phase 7 runs after Phase 5.

---

## Phase 0: Design System Foundation

**Status:** 🟡 In Progress
**Estimated effort:** 1–2 days
**Dependencies:** None
**Goal:** Codify the implicit design system into formal CSS tokens, Tailwind integration, utility classes, and reusable components so all future UI work is consistent.

### Tasks

| # | Task | Status | Complexity | Notes |
|---|------|--------|------------|-------|
| 0.1 | CSS custom properties in `app.css` (`:root` block with `--nz-dark`, `--nz-surface`, `--nz-emerald`, `--nz-cyan`, `--nz-emerald-glow`, `--nz-cyan-glow`, `--ease-smooth`, `--ease-bounce`, `--duration-*`) | ✅ Done | Trivial | Source: Spatial Design System §6 |
| 0.2 | `@theme inline` Tailwind integration (map CSS vars → `bg-nz-dark`, `text-nz-emerald`, etc.) | ✅ Done | Trivial | Extends existing `@theme` block |
| 0.3 | Utility classes (`.glow-emerald`, `.nz-gradient-text`, `.nz-hero-gradient`, `.nz-grid-pattern`, `.nz-card`, `.nz-mono-label`, `.glass`, `.noise-overlay`, `.link-underline`) | ✅ Done | Trivial | 9 classes, pure CSS |
| 0.4 | Animation `@keyframes` (`float`, `pulse-glow`, `gradient-shift`, `shimmer`, `text-reveal`, `spin-slow`, `heartbeat`, `bounce-scroll`, `magnetic-ripple`) | ✅ Done | Trivial | Pure CSS |
| 0.5 | `prefers-reduced-motion` global override | ✅ Done | Trivial | Media query in `app.css` |
| 0.6 | Badge component — 13 variants, 2 sizes (`app/components/ui/badge.tsx`) | ✅ Done | Easy | Replaces scattered inline badges |
| 0.7 | Button component — 6 variants, 3 sizes (`app/components/ui/button.tsx`) | ✅ Done | Easy | `nozar`, `nozarOutline`, `primary`, `secondary`, `ghost`, `danger` |
| 0.8 | Card component — 4 variants + sub-components (`app/components/ui/card.tsx`) | ✅ Done | Easy | `nozar`, `default`, `glass`, `elevated` + Header/Title/Description/Content/Footer |
| 0.9 | Input component — 2 variants (`app/components/ui/input.tsx`) | ✅ Done | Easy | `nozar`, `default` |
| 0.10 | Legal page routes (`/legal/terms`, `/legal/privacy`, `/legal/community-guidelines`, `/legal/complaints`) | ✅ Done | Moderate | Shared `LegalLayout`, markdown rendering via `marked` |

### Decisions Made
- **Lucide React:** Kept. Tree-shakes well, ~15 icons used, minimal bundle impact. The anti-pattern rule was written for Next.js RSC context.
- **Inter font:** Kept for now. Revisit in Phase 6 performance audit. System fonts would save ~20KB.
- **Markdown rendering:** Using `marked` in `loader` functions (server-side rendering). Lightweight (~28KB).

### Risks
- **Low risk.** All pure CSS/component work. No external dependencies or infrastructure changes.

---

## Phase 1: Landing Page Completion

**Status:** ⬜ Not Started
**Estimated effort:** 3–5 days
**Dependencies:** Phase 0 (design system components)
**Goal:** Complete all remaining landing page sections specified in the landing page design document, rebranded for NoZar's spatial/tech-forward aesthetic.

### Tasks

| # | Task | Complexity | Description |
|---|------|------------|-------------|
| 1.1 | FAQ Accordion section | Easy | 8 questions rebranded for NoZar ("What is NoZar?", "Is it really free?", "How do I stay safe?", "What can I trade?", "How does contact exchange work?", "What areas do you cover?", "Can businesses use NoZar?", "How do ratings work?"). Use `<details>/<summary>` for zero-JS fallback, enhance with `useState` for animation. Place after Security Protocol section. |
| 1.2 | Pricing section (4 tiers) | Moderate | Tier comparison grid: **Free** (R0/mo, 5 listings), **Trader Plus** (R29/mo, 20 listings, 2 boosts), **Business** (R99/mo, 100 listings, 10 boosts), **Enterprise** (R249/mo, unlimited, 30 boosts). Use Card component with `glass` variant. Highlight "Trader Plus" as popular tier. Place between Security Protocol and FAQ sections. |
| 1.3 | Testimonials section (3 SA personas) | Easy | Static cards initially: **Sipho from Soweto** (guitar → laptop stand), **Fatima from Cape Town** (preserves → garden tools), **Thabo from Durban** (web design → photography). Use Card component. CSS scroll-snap for mobile carousel. |
| 1.4 | SA Trust Signal badges | Easy | Badge grid section: POPIA Compliant, ECTA Registered, Phone-Verified Users, 5-Layer Security, Community Guidelines, "Built in Mzansi 🇿🇦". Can merge into existing Security Protocol section or standalone row. Use Badge component with appropriate variants. |
| 1.5 | Cookie/Consent Banner (POPIA) | Easy | Client component (`'use client'`): "We use essential cookies to keep you signed in. No tracking cookies." Accept / Learn More buttons. `localStorage` persistence. Render in `root.tsx`. Dismissible, fixed bottom position. |
| 1.6 | Complete footer | Moderate | Multi-column layout: Logo + "Trade without cash" tagline, Nav links (How It Works, Features, Pricing, FAQ — anchor links), Legal links (Terms, Privacy, Community Guidelines, Complaints — route links), Contact (hello@nozar.co.za), "Made with ❤️ in Mzansi 🇿🇦". Maintain spatial/brutalist aesthetic with emerald accents. |
| 1.7 | Animated stats bar | Easy | Below hero CTA: "1 000+ Listings • 5 Cities • 100% Free to Start". Use locale-aware number formatting (SA uses spaces as thousands separators). Static numbers initially; animated counters added in Phase 2. |

### Section Order (after completion)
1. Navigation Bar (existing ✅)
2. Hero Section (existing ✅)
3. How It Works (existing ✅)
4. Features Grid (existing ✅)
5. Security Protocol (existing ✅)
6. **SA Trust Signal Badges (1.4)**
7. **Pricing Section (1.2)**
8. **Testimonials (1.3)**
9. **FAQ Accordion (1.1)**
10. Final CTA (existing ✅)
11. **Complete Footer (1.6)**
12. **Cookie Banner (1.5)** — fixed overlay, not in page flow

### Risks
- **Low risk.** All static UI with mock data. No external dependencies.
- **Copy rebranding:** All text must use "NoZar" branding with the spatial/tech aesthetic, NOT the original "Barter SA" afrofuturistic direction. The Spatial Design System is the source of truth for visual language.

---

## Phase 2: Awwwards-Level Animations

**Status:** ⬜ Not Started
**Estimated effort:** 3–5 days
**Dependencies:** Phase 1 (sections must exist before animating them)
**Goal:** Elevate the landing page from "well-designed" to "award-worthy" with scroll-triggered animations, micro-interactions, and motion design.

### Tasks

| # | Task | Complexity | Description |
|---|------|------------|-------------|
| 2.1 | Install Framer Motion | Trivial | `npm install framer-motion` (~30KB). Verify React 19 + React Router v7 compatibility (Framer Motion 11+ supports React 19). |
| 2.2 | `ScrollReveal` primitive | Easy | Reusable wrapper component: fade-up on scroll intersection. Uses `motion.div` + `useInView`. Place in `app/components/motion/scroll-reveal.tsx`. Must be a client component (`'use client'`). |
| 2.3 | `StaggerChildren` primitive | Easy | Orchestrates child animations with configurable delay between siblings. Uses `motion.div` with `staggerChildren` variant. `app/components/motion/stagger-children.tsx`. |
| 2.4 | `MagneticButton` primitive | Moderate | Button that subtly follows cursor within proximity radius. Uses `useMotionValue` + `useTransform`. Touch devices: falls back to standard button (no cursor tracking). |
| 2.5 | `AnimatedCounter` primitive | Easy | Counts up from 0 to target number on scroll entry. Uses `useInView` + `useSpring`. SA number formatting (e.g., "1 000+" not "1,000+"). |
| 2.6 | Section-by-section enhancement | Moderate | Wrap each landing page section with `ScrollReveal`. Add staggered card reveals to Features Grid, Pricing, Testimonials. Add spring physics to FAQ accordion. Magnetic effect on CTAs. Animated counters on stats bar. |
| 2.7 | `prefers-reduced-motion` integration | Easy | All motion primitives must check `useReducedMotion()` from Framer Motion and disable animations accordingly. The CSS-level `prefers-reduced-motion` from Phase 0 handles keyframe animations; this handles JS-driven motion. |

### Phasing Strategy (within Phase 2)
1. **First:** ScrollReveal + StaggerChildren (biggest visual impact, lowest risk)
2. **Then:** AnimatedCounter, gradient text shimmer
3. **Last:** MagneticButton, custom cursor effects (highest complexity, most SA device risk)

### Risks
- **Medium risk.** Performance on low-end SA mobile devices (Samsung A-series, Huawei Y-series). Framer Motion is well-optimized but needs testing on constrained hardware.
- **Bundle size:** Framer Motion adds ~30KB gzipped. Acceptable within the <150KB budget if other optimizations hold.
- **Mitigation:** All animations must degrade gracefully. `prefers-reduced-motion` must disable them completely. Test on throttled CPU (Chrome DevTools 4x slowdown).

---

## Phase 3: Dashboard Pages

**Status:** ⬜ Not Started
**Estimated effort:** 3–5 days
**Dependencies:** Phase 0 (design system components)
**Goal:** Replace "Coming Soon" stubs with functional UI using mock data, so the dashboard feels complete even before backend integration.

### Tasks

| # | Task | Complexity | Description |
|---|------|------------|-------------|
| 3.1 | Profile page (`/dashboard/profile`) | Moderate | Mock user profile view: avatar placeholder, display name ("Zanele A."), bio, suburb/city (Sandton, JHB), trade stats (12 completed, 4.8★ rating), verification badges (phone ✅, identity ⬜), trusted trader status, "Edit Profile" button (opens modal or inline edit with Input component). Trade history list (mock completed trades). |
| 3.2 | Add Asset page (`/dashboard/add`) | Moderate | Listing creation form using Input component: title, description (textarea), type toggle (Item / Service), category dropdown (Electronics, Home & Garden, Fashion, Skills, Vehicles, Sports, Books, Services), estimated ZAR value (number input with "R" prefix), condition selector (New / Like New / Good / Fair / Poor — items only), delivery method (Local Meetup / Delivery / Remote / Flexible), "What I'm seeking" textarea, photo upload placeholder (drag-and-drop zone, disabled with "Coming in Phase 5" label). Form validates client-side but submits to a no-op action with success toast. |
| 3.3 | Map page (`/dashboard/map`) | Easy | Enhanced placeholder: stylized illustration or CSS-rendered map background, "Map view is coming soon" messaging with feature preview (filterable pins, distance sorting, safe meetup locations), optional: static grid of nearby assets with distance labels using mock geolocation data. No actual map library yet — Leaflet/Mapbox integration deferred to Phase 7. |

### Risks
- **Low risk.** All mock data, no infrastructure. The forms establish UI patterns that Phase 5 will wire to real actions.
- **Design risk:** Profile and Add Asset pages have no explicit design mockups in any plan document. Follow the spatial design system patterns established in the existing dashboard pages (dark surfaces, emerald accents, glassmorphism cards).

---

## Phase 4: Backend Infrastructure

**Status:** ⬜ Not Started
**Estimated effort:** 2–3 weeks
**Dependencies:** Phase 0 (completed)
**Goal:** Set up the foundational backend layer: database, schema, ORM, authentication, and auth-protected routes.

### Tasks

| # | Task | Complexity | Description |
|---|------|------------|-------------|
| 4.1 | Neon PostgreSQL project setup | Easy | Create Neon project, get connection string, add to `.env` (never committed). Both pooled (for serverless) and direct (for migrations) connection strings. |
| 4.2 | Drizzle ORM installation & config | Easy | Install `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`. Create `drizzle.config.ts`. Create `app/lib/db.ts` with connection pool. |
| 4.3 | Schema implementation | High | Create `app/lib/schema.ts` with all tables from Platform Design §7: `users`, `profiles`, `listings`, `listing_images`, `categories`, `trades`, `trade_items`, `messages`, `ratings`, `contact_disclosures`. Run initial migration. |
| 4.4 | Better Auth integration | High | Install `better-auth`. Create `app/lib/auth.ts` with Better Auth config. Create `app/lib/auth.server.ts` for server-side session validation in loaders/actions. Verify React Router v7 SSR adapter compatibility. Start with email/password — phone OTP added in 4.6. |
| 4.5 | Auth pages (UI) | Moderate | Create 3 new routes: `/login` (email + password form), `/register` (email + password + display name), `/verify-phone` (OTP input, skip option for MVP). Use Input and Button components. Redirect to `/dashboard` on success. |
| 4.6 | Phone OTP via Africa's Talking | High | Set up Africa's Talking sandbox account. Create phone verification API route (resource route). OTP generation, SMS sending, verification flow. Integrate with Better Auth as custom credential provider. Cost: ~R0.10/SMS. |
| 4.7 | Route protection | Moderate | Auth check in dashboard layout `loader` — redirect to `/login` if no session. Replace hardcoded "Zanele A." with actual user data from session. Protect all `/dashboard/*` routes. |
| 4.8 | Seed data script | Easy | Create `scripts/seed.ts` with realistic SA mock data: 3 users (different cities), 10 listings (mix of items/services), 2 active trades, sample messages. Run via `npx tsx scripts/seed.ts`. |

### React Router v7–Specific Patterns

```typescript
// Route protection in loader (replaces Next.js middleware)
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw redirect("/login");
  return { user: session.user };
}

// Mutation in action (replaces Next.js Server Actions)
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  // validate + insert via Drizzle
  return redirect("/dashboard");
}
```

### Risks
- **High risk.** This is the most complex phase. Multiple new dependencies, external services, and security-critical code.
- **Better Auth + React Router v7:** Better Auth is relatively new. Verify SSR compatibility before committing. Fallback: implement auth manually with session cookies + bcrypt.
- **Africa's Talking:** External dependency. Sandbox for development, production requires funded account. SMS delivery to SA numbers is reliable but test thoroughly.
- **Security:** Auth implementation must be correct from day one. Session validation on every protected loader/action. No shortcutting.
- **Mitigation:** Start with email/password auth only (4.4). Add phone OTP (4.6) as a separate step. This way the app is functional even if OTP integration takes longer.

---

## Phase 5: Core Features (MVP)

**Status:** ⬜ Not Started
**Estimated effort:** 3–4 weeks
**Dependencies:** Phase 4 (database + auth must be operational)
**Goal:** Replace all mock data with real database-backed features. Implement the full barter loop: list → discover → chat → propose → agree → exchange contact → complete → rate.

### Tasks

| # | Task | Complexity | Description |
|---|------|------------|-------------|
| 5.1 | Listing CRUD | High | Wire `/dashboard/add` form to `action` that inserts into `listings` table. Wire `/dashboard` feed to `loader` that queries from database. Add edit and delete for own listings. Pagination (20 items/page). |
| 5.2 | Full-text search | Moderate | Add search input to dashboard feed. Implement using PostgreSQL `tsvector`/`tsquery` (Neon supports it) via Drizzle raw SQL helper or `pg_trgm` for fuzzy matching. Search across title, description, seeking_description. |
| 5.3 | Category & value-range filters | Moderate | Filter dropdowns/toggles in feed UI. Server-side filtering in loader query. Category filter (8 categories), value range slider (R0–R10 000+), type filter (Item/Service), delivery method filter. |
| 5.4 | Geolocation-based filtering | High | Request user location via Geolocation API (with permission). Calculate distances using Haversine formula in SQL (Neon supports math functions). Sort by distance. Show distance labels on asset cards. Respect user's `searchRadiusKm` setting. |
| 5.5 | Trade state machine | Very High | Implement the full trade lifecycle: `proposed → negotiating → agreed → contact_shared → completed` (+ `cancelled`, `disputed`). Server-side state transition validation in actions (can't skip stages, both parties must agree at each gate). Update `pings.$id.tsx` to persist state via actions instead of `useState`. |
| 5.6 | Real-time chat (SSE/polling) | High | Persist messages to `messages` table via `action`. Load message history via `loader`. Implement new message polling (short-poll every 3s initially, upgrade to SSE via resource route later). Support message types: text, offer, counter_offer, agreement, system. |
| 5.7 | Contact disclosure system | Very High | The core innovation. Implement `contact_disclosures` table operations. Selective disclosure based on trade method (public_meetup: first name + suburb; delivery: first name + address; remote: first name only). 72-hour auto-expiry (cron job or check-on-read pattern). Masked phone relay via Africa's Talking (if funded) or in-app-only for MVP. |
| 5.8 | Mutual rating system | Moderate | Post-trade rating UI (1–5 stars + optional comment). Enforce mutual requirement: both parties must rate to unlock next trade. Calculate and display completion rate and average rating on profiles. Award "Trusted Trader" badge at 10+ completed trades with 4.5+ average. |
| 5.9 | Image upload pipeline | High | Set up storage (Cloudflare R2 or Vercel Blob). Create upload resource route with file validation (max 5MB, image types only). Server-side conversion to WebP via Sharp (80% quality). Generate blur hash thumbnails. Update AssetCard and asset detail to render real images. Max 3 images on Free tier, 10 on paid tiers. |
| 5.10 | New account rate limiting | Easy | Trust gates for new users: 1 active listing until first successful trade, then 5 (free tier limit). Max 1 trade agreement/day for first 2 weeks. Enforced in actions, not just UI. |

### Trade State Machine Detail

```
                 ┌──────────┐
                 │ proposed │ ← Initiator sends trade proposal
                 └────┬─────┘
                      │ responder accepts/counters
                 ┌────▼──────────┐
                 │ negotiating   │ ← Back-and-forth offers
                 └────┬──────────┘
                      │ both confirm terms
                 ┌────▼──────┐
                 │  agreed   │ ← Trade contract locked
                 └────┬──────┘
                      │ system discloses contact info
            ┌─────────▼───────────┐
            │  contact_shared     │ ← Contact details visible (72h timer starts)
            └─────────┬───────────┘
                      │ both confirm trade happened
                 ┌────▼───────┐
                 │ completed  │ ← Ratings unlocked
                 └────────────┘

Side transitions:
  Any state → cancelled (by either party, before contact_shared)
  agreed/contact_shared → disputed (either party flags issue)
```

### Risks
- **Very high risk.** This is the core product functionality. Each feature depends on the previous.
- **Trade state machine (5.5):** Most complex business logic. State transitions must be atomic (database transactions). Race conditions possible if both parties act simultaneously.
- **Contact disclosure (5.7):** Security-critical. Bugs here expose user PII. Needs thorough testing, especially the 72-hour expiry logic.
- **Real-time chat (5.6):** SSE in React Router v7 requires resource routes that return `ReadableStream`. Polling is simpler for MVP.
- **Image uploads (5.9):** External storage dependency. Sharp requires native binaries — verify Neon/hosting platform compatibility.
- **Mitigation:** Build features in order (5.1 → 5.2 → 5.3 → ... → 5.10). Each task should be independently deployable. Use feature flags if needed.

---

## Phase 6: PWA & Performance

**Status:** ⬜ Not Started
**Estimated effort:** 1–2 weeks
**Dependencies:** Phase 5 (app must be functional before caching strategies make sense)
**Goal:** Make NoZar installable, offline-capable, and performant on SA mobile networks (3G/EDGE common).

### Tasks

| # | Task | Complexity | Description |
|---|------|------------|-------------|
| 6.1 | Web manifest | Easy | Create `public/manifest.json`: name "NoZar", short_name "NoZar", description "Trade without cash", start_url "/dashboard", display "standalone", orientation "portrait", theme_color "#030712", background_color "#030712". Generate PWA icons (192px, 512px, maskable) in WebP. |
| 6.2 | Service worker setup | High | Use Workbox (not Serwist — Serwist is Next.js-focused, lacks React Router v7 adapter). Register SW in `entry.client.tsx`. Configure caching strategies per resource type (see table below). |
| 6.3 | Offline cache strategies | Moderate | See strategy table. Key: app shell cache-first, listing images cache-first with 7-day expiry, API feed network-first with cache fallback, chat network-only, static assets cache-first immutable. |
| 6.4 | Offline indicator | Easy | Client component: detect `navigator.onLine` changes, show/hide banner "You're offline — showing cached data" with amber styling. |
| 6.5 | Install prompt | Easy | Listen for `beforeinstallprompt` event. Show custom install banner on second visit. "Add NoZar to your home screen for the best experience." |
| 6.6 | Performance audit | Moderate | Lighthouse audit targeting: Performance 90+, Accessibility 95+, Best Practices 95+, PWA 100. Address any issues. Target <150KB first load (compressed, excluding images). |
| 6.7 | Font decision | Easy | Performance audit will determine: keep Inter (adds ~20KB) or switch to system fonts (saves 20KB). If switching, remove Google Fonts preconnects from `root.tsx`, verify visual consistency. |

### Service Worker Caching Strategy

| Resource | Strategy | Rationale |
|---|---|---|
| App shell (HTML, CSS, JS) | Stale-while-revalidate | Instant loads on repeat visits, updates in background |
| Listing images | Cache-first, 7-day expiry | Images rarely change; save mobile data |
| API: Feed/listings | Network-first, cache fallback | Fresh data when online; cached when offline |
| API: Chat messages | Network-only | Must be real-time; stale messages are dangerous |
| Static assets (fonts, icons) | Cache-first, immutable | Versioned by build hash, never changes |
| Search results | Network-only | Stale search results are misleading |

### Risks
- **Medium risk.** Service worker bugs can break the app (stale cache serving old code). Needs careful versioning strategy.
- **Workbox + React Router v7:** Verify Workbox can intercept React Router's server-rendered responses correctly. May need custom route matching.
- **Data budget:** The <150KB target is ambitious with Framer Motion (~30KB) already in the bundle. Tree-shaking and code splitting are essential.
- **Mitigation:** Service worker uses a "safe" strategy — network-first for HTML ensures users always get the latest code. Only images and static assets are cached aggressively.

---

## Phase 7: Growth (Post-MVP)

**Status:** ⬜ Not Started
**Estimated effort:** Ongoing (2+ months)
**Dependencies:** Phase 5 (working MVP)
**Goal:** Features that drive growth after the core barter loop is proven with ~100 completed trades.

### Tasks

| # | Task | Complexity | Priority | Description |
|---|------|------------|----------|-------------|
| 7.1 | Business accounts | High | P1 | Separate profile structure for businesses: company name, CIPC registration number, business type, operating hours, service areas. Different verification flow. Different listing limits per tier. |
| 7.2 | Monetization (Polar.sh) | High | P1 | Integrate Polar.sh for: subscription tiers (recurring billing), boost token bundles (one-time purchases). Create subscription management UI. Implement boost token spending (24hr priority placement in feed). Paywall enforcement for tier limits. |
| 7.3 | Interactive map | High | P2 | Integrate Leaflet (free, open-source) or Mapbox. Filterable pins for active listings. User location dot with search radius circle. Safe meetup location pins (police stations, shopping malls). Cluster pins at zoom levels. Click-to-view listing detail. |
| 7.4 | WebRTC in-app calling | Very High | P2 | Replace masked phone relay with in-app voice/video calling. Requires STUN/TURN servers. Only available after trade reaches `contact_shared` state. Eliminates Africa's Talking per-call costs. |
| 7.5 | CIPC business verification | Moderate | P2 | Validate business registration numbers against CIPC database. Award "Verified Business" badge. May require manual verification initially (CIPC API is unreliable). |
| 7.6 | Advanced abuse detection | High | P2 | Harvester detection: flag accounts initiating 5+ trades but completing <20%. Geographic anomaly: flag "in-person" trades between different cities. Automated reporting: 3 reports → manual review, 5 → automatic suspension. ML-based pattern detection (future). |
| 7.7 | Trade analytics | Moderate | P3 | Dashboard for paid tiers: trade volume over time, most viewed listings, average time to trade completion, geographic heatmap of interest. |
| 7.8 | Multi-city expansion | Easy | P3 | Add Cape Town and Durban to city options. Update safe meetup locations. Expand seed data. Marketing landing pages per city. |

### Risks
- **High risk across the board.** Each feature is substantial and may require architectural changes.
- **Polar.sh (7.2):** Verify SA Rand support, webhook handling, subscription lifecycle management.
- **WebRTC (7.4):** Extremely complex. Needs STUN/TURN infrastructure. NAT traversal issues common on SA mobile networks. Consider using a service (Daily.co, Livekit) instead of raw WebRTC.
- **CIPC (7.5):** The CIPC website/API is notoriously unreliable. Plan for manual verification fallback.

---

## Open Decisions

| # | Decision | Options | Recommendation | Phase |
|---|----------|---------|----------------|-------|
| 1 | Inter font vs. system fonts | Keep Inter (better visual) vs. remove (20KB savings) | Keep until Phase 6 perf audit decides | 6 |
| 2 | Lucide React vs. inline SVGs | Migrate (plan compliance) vs. keep (ergonomics) | Keep Lucide — tree-shakes well, ~5KB impact | — |
| 3 | Chat transport for MVP | SSE (real-time) vs. polling (simple) | Short-polling (3s) for MVP, upgrade to SSE after launch | 5 |
| 4 | Image storage provider | Cloudflare R2 (cheap) vs. Vercel Blob (integrated) | Depends on hosting platform — decide in Phase 5 | 5 |
| 5 | Map library | Leaflet (free, open-source) vs. Mapbox (polished, costs) | Leaflet for MVP — free, sufficient for pin display | 7 |
| 6 | Service worker library | Workbox (established) vs. raw SW (full control) | Workbox — proven, good React Router v7 support | 6 |
| 7 | Contact expiry mechanism | Cron job vs. check-on-read | Check-on-read for MVP (no cron infra needed), cron later | 5 |

---

## Summary

| Phase | Name | Effort | Status | Depends On |
|-------|------|--------|--------|------------|
| 0 | Design System Foundation | 1–2 days | 🟡 In Progress | — |
| 1 | Landing Page Completion | 3–5 days | ⬜ Not Started | Phase 0 |
| 2 | Awwwards Animations | 3–5 days | ⬜ Not Started | Phase 1 |
| 3 | Dashboard Pages | 3–5 days | ⬜ Not Started | Phase 0 |
| 4 | Backend Infrastructure | 2–3 weeks | ⬜ Not Started | Phase 0 |
| 5 | Core Features (MVP) | 3–4 weeks | ⬜ Not Started | Phase 4 |
| 6 | PWA & Performance | 1–2 weeks | ⬜ Not Started | Phase 5 |
| 7 | Growth (Post-MVP) | 2+ months | ⬜ Not Started | Phase 5 |

**Total estimated time to MVP (Phases 0–6):** 8–12 weeks
**Critical path:** Phase 0 → Phase 4 → Phase 5 → Phase 6
