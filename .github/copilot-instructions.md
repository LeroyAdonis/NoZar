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

- `npm run dev` — Start dev server with HMR (http://localhost:5173)
- `npm run build` — Production build via React Router
- `npm run start` — Serve production build
- `npm run typecheck` — Run typegen + TypeScript compiler

No test runner is configured yet.

## Architecture

- **React Router v7** with SSR enabled (`react-router.config.ts` → `ssr: true`). This is the Remix successor — routes export `loader`/`action`/`meta`/`links` functions, not classic React Router `<Route>` elements.
- **Route configuration** lives in `app/routes.ts` using the `RouteConfig` API (not file-system routing). Add new routes there. Uses `route()` (not `layout()`) for the `/dashboard` prefix so child routes get the `/dashboard/*` URL namespace.
- **Auto-generated route types**: Each route gets types via `./+types/<routeName>` (e.g., `import type { Route } from "./+types/home"`). Run `react-router typegen` (part of `npm run typecheck`) to regenerate.
- **Vite** bundler with `@react-router/dev/vite` plugin, Tailwind CSS plugin, and `vite-tsconfig-paths`.
- **Tailwind CSS v4** — uses `@import "tailwindcss"` and `@theme` directive in `app/app.css`, not a `tailwind.config` file.
- **Path alias**: `~/` maps to `./app/` (configured in `tsconfig.json`).
- **Icons**: `lucide-react` for iconography.

### Route Structure

```
/                     → app/routes/landing.tsx (public landing page)
/dashboard            → app/routes/dashboard.tsx (layout with header + bottom nav)
  /dashboard          → app/routes/dashboard/home.tsx (asset feed)
  /dashboard/asset/:id → app/routes/dashboard/asset.$id.tsx (asset detail)
  /dashboard/pings    → app/routes/dashboard/pings.tsx (conversation list)
  /dashboard/pings/:id → app/routes/dashboard/pings.$id.tsx (chat + handshake)
  /dashboard/map      → app/routes/dashboard/map.tsx (stub)
  /dashboard/add      → app/routes/dashboard/add.tsx (stub)
  /dashboard/profile  → app/routes/dashboard/profile.tsx (stub)
```

### Key Directories

- `app/lib/` — Shared types (`types.ts`) and mock data (`mock-data.ts`)
- `app/components/ui/` — Reusable UI components (AssetCard, BottomNav, TierBadge, VerificationBadge, PingThread)
- `app/routes/` — Route modules
- `prototype.jsx` — Full UI prototype with mock data (reference only, not imported by the app)

## Conventions

- TypeScript strict mode. Use `type` imports (`import type { ... }`) — `verbatimModuleSyntax` is enabled.
- Route modules follow React Router v7 conventions: named exports for `meta`, `loader`, `action`, `links`, `ErrorBoundary`, and a default export for the component.
- Client-side routes (with hooks like `useState`, `useNavigate`) use `"use client"` directive at the top.
- Always-dark theme: `#030712` base, `#0F172A` card backgrounds, emerald-500 primary accent, slate text. No light mode.
- Brutalist typography: `font-mono uppercase tracking-widest text-[10px]` for labels, `font-black uppercase tracking-tighter` for headings.
- Inter font loaded via Google Fonts CDN in `root.tsx`.
