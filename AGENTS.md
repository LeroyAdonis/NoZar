# AGENTS.md

## Quick Start

1. Copy `.env.example` to `.env.local` and fill in values (required before `npm run dev`)
2. `npm install` then `npm run dev` (dev server: `http://localhost:5173`)

## Dev Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run typecheck    # Type check (must pass before committing)
npm run start        # Start production server
```

## Testing (Playwright)

```bash
npm test                        # Run all E2E tests
npm run test:headed             # Run with visible browser
npx playwright test auth.spec.ts    # Run single test file
npx playwright test landing.spec.ts -g "test name"  # Run specific test
npm run test:report             # Open HTML report
```

**Prerequisites**: `npm run test:install` to install browsers first.

Tests auto-start dev server (`webServer.command: 'npm run dev'` in `playwright.config.ts`). Tests default to `http://localhost:3000` but dev server is on port 5173 — this is intentional (webServer reuses existing server in non-CI).

**Test location**: `e2e/*.spec.ts` (not `tests/` or `__tests__/`).

## Database (Drizzle + Neon)

```bash
npx drizzle-kit generate  # Generate migration from schema changes
npx drizzle-kit migrate   # Apply migrations
npx drizzle-kit push      # Push schema directly (dev only)
```

Schema: `app/lib/schema.ts` — edit this file, then generate migrations.
Migrations: `drizzle/*.sql` — applied in order, tracked in `drizzle/meta/_journal.json`.

## Architecture

- **Framework**: React Router v7 (SSR enabled via `react-router.config.ts`)
- **Styling**: Tailwind CSS v4 with `@tailwindcss/vite` plugin
- **Database**: Neon PostgreSQL (serverless) with Drizzle ORM
- **Auth**: Better Auth (Google OAuth, email/password, phone OTP via Africa's Talking)
- **AI**: Google Gemini for "safe meetup spot" generation
- **Maps**: Google Maps JavaScript API
- **File Storage**: Vercel Blob

**Route structure**: `app/routes.ts` defines all routes. Nested routes under `/dashboard` and `/legal`.

**Entry points**:
- `app/root.tsx` — app shell, providers, global layout
- `app/routes/landing.tsx` — public homepage
- `app/routes/dashboard.tsx` — authenticated dashboard layout

<!-- opensrc:start -->

## Source Code Reference

Source code for dependencies is available in `opensrc/` for deeper understanding of implementation details.

See `opensrc/sources.json` for the list of available packages and their versions.

Use this source code when you need to understand how a package works internally, not just its types/interface.

### Fetching Additional Source Code

To fetch source code for a package or repository you need to understand, run:

```bash
npx opensrc <package>          # npm package (e.g., npx opensrc zod)
npx opensrc pypi:<package>     # Python package (e.g., npx opensrc pypi:requests)
npx opensrc crates:<package>   # Rust crate (e.g., npx opensrc crates:serde)
npx opensrc <owner>/<repo>     # GitHub repo (e.g., npx opensrc vercel/ai)
```

<!-- opensrc:end -->
