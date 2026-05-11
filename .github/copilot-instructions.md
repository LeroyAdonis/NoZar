# Copilot Instructions for Nozar

## Terminal & File System Guardrails

1. **Workspace Boundary**: You are strictly confined to the current workspace directory for autonomous operations.
2. **Auto-Approve Criteria**: You may only auto-approve or execute terminal commands and file edits that target paths within the current project root.
3. **External Action Protocol**: If a task requires reading, writing, or executing commands outside of the current workspace:
    - **HALT** all autonomous execution.
    - **EXPLAIN** clearly why access to the external path (e.g., global config, system directories, or other folders) is necessary.
    - **REQUEST PERMISSION** explicitly in the chat interface.
    - **WAIT** for manual approval before generating or running the specific command.
4. **Dangerous Command Ban**: Regardless of location, the following actions are strictly forbidden from auto-approval and require explicit manual confirmation:
    - Destructive commands: `rm -rf`, `shred`, or recursive deletions.
    - Database modifications: `DROP`, `TRUNCATE`, or `DELETE` without a `WHERE` clause.
    - System-level changes: Any command utilizing `sudo`, `chmod 777`, or modifying `/etc/` or `~/.ssh/`.
    - Network tools: Unsolicited use of `curl`, `wget`, or `netcat` to external unknown IPs.
5. **No Bypassing**: Never attempt to bypass directory restrictions using `../` shortcuts or absolute system paths without the step-by-step approval process outlined above.

## What is Nozar

Nozar is a South African barter/swap platform ("No ZAR" — no cash needed). Users list assets (goods or services), browse nearby listings, "ping" each other to negotiate, and complete swaps via a handshake flow. The app uses a tier system (TIER_01, TIER_02, TIER_03) for asset valuation and trust. See `prototype.jsx` for the full UI prototype with mock data covering the landing page, dashboard, feed, pings/messaging, and handshake flows.

## Commands

- `npm run dev` — Start the app locally (React Router dev server at `http://localhost:5173`)
- `npm run build` — Build production server/client bundles
- `npm run start` — Serve built app from `./build/server/index.js`
- `npm run typecheck` — Generate route types + run TypeScript checks

### Testing (Playwright E2E)

- `npm run test:install` — Install Playwright browsers (first-time setup)
- `npm test` — Run full E2E suite (`e2e/*.spec.ts`)
- `npm run test:headed` — Run E2E tests with a visible browser
- Single file: `npm run test:auth` (or `npm run test:landing`, `npm run test:dashboard`, `npm run test:chat`, `npm run test:profile`, `npm run test:legal`)
- Single spec by name: `npx playwright test landing.spec.ts -g "test name"`
- `npm run test:report` — Open Playwright HTML report

### Linting

- There is currently no dedicated lint script in `package.json`.
- Use `npm run typecheck` as the required static validation command.

## Architecture

- **App framework**: React Router v7 + SSR (`react-router.config.ts` has `ssr: true`), with route modules using loader/action/meta exports.
- **Routing model**: Central route config in `app/routes.ts` (not file-based conventions). This defines public auth/legal routes plus nested `/dashboard/*` and `/api/*` endpoints.
- **Data layer**: Neon PostgreSQL over `@neondatabase/serverless`, queried via Drizzle ORM (`app/lib/db.server.ts`, `app/lib/schema.ts`).
- **Auth stack**: Better Auth with Drizzle adapter (`app/lib/auth.server.ts`), supporting Google OAuth and email/password; auth routes are under `api/auth/*`.
- **Client/server boundary**: `.server.ts` modules hold server-only integrations (db/auth/email/payments/blob/AI). Route loaders/actions call these modules.
- **Styling/build**: Tailwind v4 via `@tailwindcss/vite`, React Router Vite plugin, and `vite-tsconfig-paths` aliasing `~/` to `app/`.
- **E2E test setup**: Playwright tests in `e2e/`; config auto-starts `npm run dev` through `webServer`.

### Route Structure

```
/                     → app/routes/landing.tsx (public landing page)
/login                → app/routes/login.tsx
/forgot-password      → app/routes/forgot-password.tsx
/reset-password       → app/routes/reset-password.tsx
/register             → app/routes/register.tsx
/refer                → app/routes/refer.tsx
/r/:referralCode      → app/routes/r.$referralCode.tsx
/api/auth/*           → app/routes/api.auth.$.ts
/api/messages/:tradeId → app/routes/api.messages.$tradeId.ts
/api/pay/upgrade      → app/routes/api.pay.upgrade.ts
/api/pay/webhook      → app/routes/api.pay.webhook.ts
/api/refer            → app/routes/api.refer.ts
/api/upload           → app/routes/api.upload.ts
/dashboard            → app/routes/dashboard.tsx (layout with header + bottom nav)
  /dashboard          → app/routes/dashboard/home.tsx (asset feed)
  /dashboard/asset/:id → app/routes/dashboard/asset.$id.tsx (asset detail)
  /dashboard/pings    → app/routes/dashboard/pings.tsx (conversation list)
  /dashboard/pings/:id → app/routes/dashboard/pings.$id.tsx (chat + handshake)
  /dashboard/notifications → app/routes/dashboard/notifications.tsx
  /dashboard/map      → app/routes/dashboard/map.tsx (stub)
  /dashboard/add      → app/routes/dashboard/add.tsx (stub)
  /dashboard/trade/:id → app/routes/dashboard/trade.$id.tsx
  /dashboard/profile  → app/routes/dashboard/profile.tsx (stub)
  /dashboard/verify-phone → app/routes/dashboard/verify-phone.tsx
/legal                → app/routes/legal.tsx
  /legal/terms        → app/routes/legal/terms.tsx
  /legal/privacy      → app/routes/legal/privacy.tsx
  /legal/community-guidelines → app/routes/legal/community-guidelines.tsx
  /legal/complaints   → app/routes/legal/complaints.tsx
/*                    → app/routes/$.tsx (404 catch-all)
```

### Key Directories

- `app/lib/` — Shared types (`types.ts`) and mock data (`mock-data.ts`)
- `app/lib/*.server.ts` — Server-only modules (auth, db, email, payments, blob, AI, OTP, notifications)
- `app/components/ui/` — Reusable UI components (AssetCard, BottomNav, TierBadge, VerificationBadge, PingThread)
- `app/routes/` — Route modules
- `prototype.jsx` — Full UI prototype with mock data (reference only, not imported by the app)

## Conventions

- TypeScript strict mode. Use `type` imports (`import type { ... }`) — `verbatimModuleSyntax` is enabled.
- Route modules follow React Router v7 conventions: named exports for `meta`, `loader`, `action`, `links`, `ErrorBoundary`, and a default component export.
- Route type safety is generated per route under `./+types/*`; keep `npm run typecheck` green after route changes.
- Use `requireAuth(request)` for protected loaders/actions and `getOptionalSession(request)` when rendering should work for guests and logged-in users.
- Keep DB schema changes in `app/lib/schema.ts`, then generate/apply migrations via Drizzle (`drizzle/*.sql` is migration history).
- Always-dark theme: `#030712` base, `#0F172A` card backgrounds, emerald-500 primary accent, slate text. No light mode.
- Brutalist typography: `font-mono uppercase tracking-widest text-[10px]` for labels, `font-black uppercase tracking-tighter` for headings.
- Inter font is loaded from Google Fonts in `app/root.tsx`.

<!-- GSD Configuration — managed by get-shit-done installer -->
# Instructions for GSD

- Use the get-shit-done skill when the user asks for GSD or uses a `gsd-*` command.
- Treat `/gsd-...` or `gsd-...` as command invocations and load the matching file from `.github/skills/gsd-*`.
- When a command says to spawn a subagent, prefer a matching custom agent from `.github/agents`.
- Do not apply GSD workflows unless the user explicitly asks for them.
- After completing any `gsd-*` command (or any deliverable it triggers: feature, bug fix, tests, docs, etc.), ALWAYS: (1) offer the user the next step by prompting via `ask_user`; repeat this feedback loop until the user explicitly indicates they are done.
<!-- /GSD Configuration -->
