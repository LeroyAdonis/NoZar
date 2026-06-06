# NoZar — Trade Without Cash

> South Africa's barter platform. Swap your stuff, skills, and services with people near you. No money changes hands.

NoZar ("No ZAR") is a peer-to-peer barter and swap platform for South Africans. Users list goods and services, browse nearby matches, negotiate through "pings" (trade conversations), and complete exchanges via a trust-aware handshake flow — all without cash.

**MVP launch regions:** Cape Town (Western Cape) 🏔️ and Johannesburg (Gauteng) 🏙️

---

## Features

- 🗂️ **Asset listings** — List physical items or services with photos, estimated value, and what you're seeking in return
- 📍 **Location-based feed** — Browse swaps near you with a configurable radius; map view powered by Google Maps
- 💬 **Pings (trade conversations)** — Real-time SSE chat with a structured handshake flow to agree, share contact info, and mark trades complete
- 🤝 **Handshake flow** — Step-by-step trade lifecycle: `proposed → negotiating → agreed → contact_shared → completed`
- 🛡️ **Trust system** — Tiered trust levels (newcomer → verified → trusted) built from completed trades, ratings, and verification signals
- ✅ **Phone verification** — OTP via Africa's Talking for verified-phone badge
- 🤖 **AI assistance** — NVIDIA-powered listing descriptions, chat moderation, and AI-suggested safe meetup spots
- 🔔 **Push notifications** — Web Push (VAPID) for new messages and trade updates
- 📧 **Email notifications** — Transactional emails via Resend for key trade events
- 📊 **Subscription tiers** — Free · Plus · Business · Enterprise (gating listing counts and features via PayFast)
- 🔗 **Referral system** — Unique referral codes and `/r/:referralCode` landing pages
- 🚨 **Trade reporting** — Report harassment, scams, or no-shows; auto-freeze mechanism for flagged accounts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Router v7 (SSR) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | Neon PostgreSQL (serverless) |
| ORM | Drizzle ORM |
| Auth | Better Auth (Google OAuth + email/password) |
| Phone OTP | Africa's Talking |
| AI | NVIDIA NIM API |
| Maps | Google Maps JavaScript API |
| File storage | Vercel Blob |
| Email | Resend |
| Push notifications | Web Push (VAPID via `web-push`) |
| Payments | PayFast |
| Animations | Motion (React) |
| Testing | Playwright (E2E) + Vitest (unit) |

---

## Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- A **Neon PostgreSQL** database ([neon.tech](https://neon.tech))
- The third-party API keys listed in the [Environment Variables](#environment-variables) section

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in every value in `.env.local` — see [Environment Variables](#environment-variables) below.

### 3. Set up the database

Apply all migrations to your Neon database:

```bash
npx drizzle-kit migrate
```

### 4. Generate VAPID keys (first time only)

```bash
node scripts/generate-vapid.mjs
```

Paste the output into `.env.local` as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.

### 5. Start the development server

```bash
npm run dev
```

App is available at **http://localhost:5173**.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in real values. **Never commit `.env.local`.**

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `BETTER_AUTH_URL` | ✅ | Base URL the server is reachable on (e.g. `http://localhost:5173`) |
| `BETTER_AUTH_SECRET` | ✅ | Random secret — generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `AFRICASTALKING_API_KEY` | ✅ | Africa's Talking API key (use sandbox for local dev) |
| `AFRICASTALKING_USERNAME` | ✅ | Africa's Talking username (`sandbox` for local dev) |
| `AFRICASTALKING_SANDBOX` | ✅ | `true` for local dev, `false` in production |
| `NVIDIA_API_KEY` | ✅ | NVIDIA NIM API key for AI features |
| `GOOGLE_MAPS_API_KEY` | ✅ | Google Maps JavaScript API key |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Vercel Blob read/write token |
|| `BREVO_API_KEY` | ✅ | Brevo (Sendinblue) API key for transactional email + SMS |
| `VAPID_PUBLIC_KEY` | ✅ | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | ✅ | VAPID private key for Web Push |
| `VAPID_SUBJECT` | ✅ | VAPID subject (e.g. `mailto:hello@nozar.co.za`) |

**Google OAuth redirect URI** — register the following in Google Cloud Console:
- Local: `http://localhost:5173/api/auth/callback/google`
- Production: `https://your-domain.com/api/auth/callback/google`

---

## Commands

### Development

```bash
npm run dev          # Start dev server with HMR at http://localhost:5173
npm run build        # Production build (server + client bundles)
npm run start        # Serve the production build
npm run typecheck    # Generate route types + run TypeScript checks (must pass before committing)
```

### Database

```bash
npx drizzle-kit generate   # Generate a new migration from schema changes
npx drizzle-kit migrate    # Apply pending migrations
npx drizzle-kit push       # Push schema directly — dev only, skips migration history
```

Edit `app/lib/schema.ts` first, then `generate` and `migrate`.

### Testing

```bash
npm run test:install        # Install Playwright browsers (first-time setup)
npm test                    # Run full E2E suite
npm run test:headed         # Run E2E tests with a visible browser

# Run a single spec file
npm run test:auth
npm run test:landing
npm run test:dashboard
npm run test:chat
npm run test:profile
npm run test:legal

# Run a single test by name
npx playwright test landing.spec.ts -g "test name"

npm run test:report         # Open the Playwright HTML report
npm run test:unit           # Run Vitest unit tests
npm run test:unit:watch     # Vitest in watch mode
```

E2E tests live in `e2e/` and auto-start the dev server via `playwright.config.ts`.

---

## Project Structure

```
app/
  components/
    landing/        # Landing page sections (pricing, FAQ, trust badges, footer)
    motion/         # Animation wrappers (ScrollReveal, MagneticButton)
    ui/             # Shared UI components (AssetCard, ChatWindow, HandshakeFlow, …)
  lib/
    *.server.ts     # Server-only modules (db, auth, email, AI, payments, blob, OTP, push)
    auth.client.ts  # Browser-side Better Auth client
    schema.ts       # Drizzle ORM schema — source of truth for all DB tables
    regions.ts      # MVP region definitions (Cape Town, Johannesburg)
    tier-limits.ts  # Subscription tier limits + BUSINESS_PRODUCTS_LIVE flag
    types.ts        # Shared TypeScript types
    utils.ts        # Shared utilities
  routes/
    landing.tsx          # Public homepage
    login.tsx            # Email/password + Google OAuth login
    register.tsx         # Registration
    dashboard.tsx        # Authenticated layout (auth gate, header, bottom nav, location prompt)
    dashboard/
      home.tsx           # Asset feed
      asset.$id.tsx      # Asset detail page
      pings.tsx          # Conversation list
      pings.$id.tsx      # Chat thread + handshake flow
      notifications.tsx  # Notification centre
      map.tsx            # Map view
      add.tsx            # Create listing
      trade.$id.tsx      # Trade detail
      profile.tsx        # User profile
      billing.tsx        # Subscription management
      verify-phone.tsx   # Phone OTP verification
    refer.tsx            # Referral dashboard
    legal/               # Terms, privacy, guidelines, complaints
    api.*.ts             # API route handlers
  root.tsx               # App shell, providers, global layout
drizzle/                 # Migration SQL files + meta journal
e2e/                     # Playwright E2E test files
public/                  # Static assets
scripts/                 # One-off scripts (VAPID generation, etc.)
```

---

## Architecture

- **Routing** — Central route config in `app/routes.ts` (not file-based conventions). All routes are defined explicitly.
- **SSR** — React Router v7 with `ssr: true`. Route modules export `loader`, `action`, `meta`, and a default component.
- **Client/server boundary** — `.server.ts` modules are server-only. Never import them from client code.
- **Real-time** — SSE via native `ReadableStream` + `new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })`. React Router v7 does **not** export `eventStream`.
- **Multi-intent actions** — A hidden `intent` field in forms is switched on in action handlers (see `dashboard.tsx`).
- **Auth** — `requireAuth(request)` for protected loaders/actions; `getOptionalSession(request)` where guests and authenticated users both need access.
- **Dark theme only** — `#030712` base, `#0F172A` cards, emerald-500 primary accent. No light mode.

---

## Trade Lifecycle

```
proposed → negotiating → agreed → contact_shared → completed
                                                 ↘ cancelled / disputed
```

1. **proposed** — Initiator pings a listing owner
2. **negotiating** — Both parties chat; trade items can be added or adjusted
3. **agreed** — Both parties flag ready; handshake begins
4. **contact_shared** — Contact details disclosed for meetup coordination (AI suggests safe meetup spots)
5. **completed** — Trade confirmed; ratings can be submitted
6. **cancelled / disputed** — Either party exits; disputes can trigger trust profile actions

---

## Subscription Tiers

| Tier | Active Listings | Notes |
|---|---|---|
| Free | 5 | Default for all new users |
| Plus | 20 | |
| Business | 100 | Gated behind `BUSINESS_PRODUCTS_LIVE` flag |
| Enterprise | Unlimited | Gated behind `BUSINESS_PRODUCTS_LIVE` flag |

> **Note:** `BUSINESS_PRODUCTS_LIVE` in `app/lib/tier-limits.ts` is currently `false`. Flip it to `true` when business/enterprise tier UI is ready to ship.

Subscriptions are processed via [PayFast](https://www.payfast.co.za/).

---

## Deployment

### Vercel (recommended)

The app is configured for Vercel deployment via `vercel.json`. Set all environment variables in the Vercel project dashboard and deploy from the repository.

### Docker

```bash
docker build -t nozar .
docker run -p 3000:3000 --env-file .env.local nozar
```

The multi-stage `Dockerfile` produces a minimal production image. Compatible with any Docker-capable host (AWS ECS, Google Cloud Run, Fly.io, Railway, etc.).

### DIY Node

```bash
npm run build
npm run start   # serves build/server/index.js
```

Ensure all environment variables are set in the production environment before starting.

---

## Contributing

1. Run `npm run typecheck` — it must pass before committing.
2. Keep `.server.ts` modules server-only; never import them from client components.
3. Add migrations via `npx drizzle-kit generate` after schema changes — do not edit migration files by hand.
4. Write E2E tests for new user-facing flows in `e2e/`.
5. The dark theme and brutalist typography are intentional — do not add light mode or change the design system without discussion.
