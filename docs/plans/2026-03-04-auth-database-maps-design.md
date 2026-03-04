# NoZar — Authentication, Database & Maps Design

**Date:** 2026-03-04
**Status:** Approved
**Approach:** Full Schema + Parallel Feature Tracks (Approach B)
**Scope:** Better Auth + Neon/Drizzle ORM + Dashboard wiring + Google Maps + Gemini AI

---

## Problem Statement

NoZar is a polished frontend prototype with zero backend infrastructure. All dashboard data is hardcoded mock data, there's no authentication, no persistence, and the map page is a stub. This design covers the complete backend buildout: authentication, database schema, wiring every dashboard page to real data, and implementing interactive maps with AI-powered features.

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth provider | Better Auth | Modern, TypeScript-first, supports React Router v7 SSR |
| Login methods | Email/password + Google OAuth | Covers most SA users; phone OTP deferred |
| Database | Neon PostgreSQL (existing project) | Already provisioned, serverless, generous free tier |
| ORM | Drizzle ORM | Type-safe, lightweight, excellent Neon support |
| Map library | Google Maps JavaScript API | Rich feature set, familiar to users |
| AI features | Google Gemini SDK | Smart suggestions, description assist, trade matching |
| Default map area | Johannesburg / Gauteng | Primary target market |
| Architecture | Approach B — Full schema first, parallel features | Enables parallel work, clean cutover from mock data |

---

## Section 1: Infrastructure Layer (Drizzle + Neon)

### Connection Setup

- `app/lib/db.server.ts` — Neon serverless driver (`@neondatabase/serverless`) with Drizzle ORM using `drizzle-orm/neon-http`
- `.env` file with `DATABASE_URL` (never committed, already in `.gitignore`)
- `drizzle.config.ts` — schema path, `pg` dialect, Neon connection

### Schema (`app/lib/schema.ts`)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `users` | id, email, name, image, emailVerified, createdAt | Better Auth managed |
| `sessions` | id, userId, token, expiresAt | Better Auth managed |
| `accounts` | id, userId, provider, providerAccountId | Better Auth managed (Google OAuth) |
| `verifications` | id, identifier, value, expiresAt | Better Auth managed |
| `profiles` | userId (FK), displayName, bio, suburb, city, province, lat, lng, searchRadiusKm, avatarUrl | Extended user profile |
| `listings` | id, userId, title, description, category, estimatedValueZar, condition, deliveryMethod, seekingDescription, type (item/service), status, lat, lng, createdAt | Asset listings |
| `listing_images` | id, listingId, url, blurHash, order | Multiple images per listing |
| `trades` | id, initiatorId, responderId, listingId, status, createdAt | Trade state machine |
| `messages` | id, tradeId, senderId, text, type (text/offer/system), createdAt | Chat messages |
| `ratings` | id, tradeId, raterId, rateeId, score (1-5), comment, createdAt | Post-trade ratings |
| `contact_disclosures` | id, tradeId, userId, disclosedFields (jsonb), expiresAt | Selective contact sharing |

### Migrations

- `drizzle-kit push` for development (direct schema sync)
- `drizzle-kit generate` + `drizzle-kit migrate` for production

### Seed Script

- `scripts/seed.ts` — 3 SA users (Zanele/Sandton, Sipho/Soweto, Sarah/Braamfontein), 6+ listings, 2 active trades with messages
- Run via `npx tsx scripts/seed.ts`

---

## Section 2: Authentication Layer (Better Auth)

### Server Instance (`app/lib/auth.ts`)

- Database adapter: Drizzle ORM adapter pointing to Neon
- Email/password: enabled with optional email verification
- Google OAuth: enabled (`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env`)
- Session: cookie-based, `sameSite: lax`, `httpOnly: true`, 30-day expiry
- Base URL: `BETTER_AUTH_URL` env var

### Client Instance (`app/lib/auth.client.ts`)

- Used in login/register forms for `signIn.email()`, `signIn.social()`, `signUp.email()`

### Auth API Route

- `app/routes/api.auth.$.ts` — catch-all resource route forwarding to Better Auth handler
- Handles all `/api/auth/*` endpoints

### Auth Pages

| Route | File | Description |
|-------|------|-------------|
| `/login` | `app/routes/login.tsx` | Email + password form, Google OAuth button, link to register |
| `/register` | `app/routes/register.tsx` | Email + password + display name, Google OAuth, link to login |

- Dark theme, existing Input/Button components, emerald accents
- Redirect to `/dashboard` on success
- Redirect to `/dashboard` if already logged in
- Inline error messages for invalid credentials

### Session Helper (`app/lib/auth.server.ts`)

- `requireAuth(request)` utility:
  1. Calls `auth.api.getSession({ headers: request.headers })`
  2. Returns `{ user, session }` if valid
  3. Throws `redirect("/login")` if not authenticated

---

## Section 3: Route Protection & User Context

### Public vs Protected Routes

| Route | Access | Behavior |
|-------|--------|----------|
| `/` (landing) | Public | Show "Go to Dashboard" if logged in |
| `/login`, `/register` | Public | Redirect to `/dashboard` if logged in |
| `/legal/*` | Public | No auth check |
| `/dashboard/*` | Protected | Redirect to `/login` if not authenticated |
| `/api/auth/*` | Public | Better Auth handles its own auth |

### Dashboard Layout Changes

- `dashboard.tsx` gets a `loader` calling `requireAuth(request)`
- Replace hardcoded "Zanele A." with `user.name`
- Replace hardcoded "Node Verified" with profile verification status
- Logout button in settings/profile

---

## Section 4: Dashboard Wiring (Replacing Mock Data)

### 4a. Home Feed (`/dashboard`)

- **Loader:** Query `listings` with pagination (20/page), join `profiles`, calculate distance via Haversine. Filter by category/type/value via URL search params.
- **Component:** Replace `MOCK_ASSETS` with loader data.

### 4b. Asset Detail (`/dashboard/asset/:id`)

- **Loader:** Single listing by ID + user profile + images. 404 if not found.
- **Action:** "Ping" creates trade record (status: `proposed`) + initial message → redirect to chat.

### 4c. Add Asset (`/dashboard/add`)

- **Action:** Validate → insert into `listings`. Categories: Electronics, Home & Garden, Fashion, Skills, Vehicles, Sports, Books, Services.
- **Component:** Full form with title, description, type toggle, category dropdown, value, condition, delivery method, seeking textarea, AI assist button, smart location suggestions.

### 4d. Profile (`/dashboard/profile`)

- **Loader:** User profile, trade count, average rating, active listings.
- **Action:** Update profile fields, handle edit form.
- **Component:** Profile card, stats, verification badges, trade history, own listings, edit form, logout.

### 4e. Pings List (`/dashboard/pings`)

- **Loader:** Trades where user is participant, join latest message, order by recent activity.
- **Component:** Replace `MOCK_PINGS` with real trade threads.

### 4f. Chat + Handshake (`/dashboard/pings/:id`)

- **Loader:** Trade + messages + listing + counterparty profile.
- **Action:** Message send, state transitions (proposed → negotiating → agreed → contact_shared → completed), rating.
- **Component:** Chat UI with DB-backed state machine replacing useState mock flow.

### 4g. Message Polling

- Resource route: `app/routes/api.messages.$tradeId.ts`
- Returns new messages since timestamp (JSON)
- Client polls every 5 seconds
- Upgrade to SSE post-MVP

---

## Section 5: Map + Gemini AI Integration

### Google Maps JavaScript API

- **Package:** `@googlemaps/js-api-loader`
- **Map Component:** `app/components/map/nozar-map.tsx` (client component)
  - Default center: Johannesburg CBD (-26.2041, 28.0473), zoom 12
  - Custom dark map style matching `#030712` aesthetic
  - Emerald pins for items, cyan for services
  - User location pulsing dot with search radius circle
  - Click marker → listing preview card
  - Marker clustering at lower zoom levels

- **Route (`/dashboard/map`):**
  - **Loader:** Active listings with lat/lng within user's search radius
  - **Component:** Full-screen map, floating filter chips, listing pins, recenter button

### Gemini AI Features

- **Package:** `@google/generative-ai`
- **Server-side only** — calls in `loader`/`action`, never client
- **API Key:** `GEMINI_API_KEY` in `.env`

**Smart Location Suggestions (Add Asset form):**
- User types suburb → server action sends to Gemini → suggests 3 safe meetup locations (malls, police stations, community centres)
- Shows as clickable chips, saves coordinates to listing

**Smart Trade Matching (Home Feed):**
- Optional: sends user's listings + seeking descriptions to Gemini
- Ranks available listings by match quality
- Rate-limited: 1 call per user per 5 minutes (cached)
- Shows "AI Matched" badge

**Smart Description Assistant (Add Asset form):**
- "AI Assist" button next to description textarea
- Generates compelling 2-3 sentence description in SA English
- User can edit the suggestion

---

## New Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `better-auth` | Authentication framework | ~50KB |
| `drizzle-orm` | ORM for Neon PostgreSQL | ~30KB |
| `drizzle-kit` (dev) | Schema migrations | Dev only |
| `@neondatabase/serverless` | Neon driver | ~15KB |
| `@googlemaps/js-api-loader` | Google Maps loading | ~5KB |
| `@google/generative-ai` | Gemini SDK | ~20KB |
| `dotenv` | Environment variables | ~5KB |

---

## New Environment Variables

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=<random-32-char-string>
BETTER_AUTH_URL=http://localhost:5173
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
GOOGLE_MAPS_API_KEY=<from-google-console>
GEMINI_API_KEY=<from-google-ai-studio>
```

---

## New Route Structure

```
/                           → Landing page (existing, modified)
/login                      → Login page (NEW)
/register                   → Registration page (NEW)
/api/auth/$                 → Better Auth catch-all (NEW)
/api/messages/:tradeId      → Message polling endpoint (NEW)
/dashboard                  → Dashboard layout (modified — auth + real user)
  /dashboard                → Home feed (modified — real DB data)
  /dashboard/asset/:id      → Asset detail (modified — real DB data)
  /dashboard/pings          → Ping threads (modified — real DB data)
  /dashboard/pings/:id      → Chat + handshake (modified — real DB data)
  /dashboard/map            → Interactive map (rewritten — Google Maps)
  /dashboard/add            → Add asset form (rewritten — full form + Gemini)
  /dashboard/profile        → User profile (rewritten — real data + edit)
/legal/*                    → Legal pages (unchanged)
```
