# Phase 3: React Native Mobile App — Research

**Researched:** 2026-05-26
**Domain:** Turborepo monorepo migration + Expo React Native full-parity app
**Confidence:** MEDIUM-HIGH (npm versions verified; Better Auth Expo plugin and BKLIT details partially ASSUMED)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Turborepo monorepo: `/apps/web` (existing RR7 app), `/apps/mobile` (new Expo app), `/packages/shared`
- **D-02:** `packages/shared` exports: TS types, Zod schemas, tRPC router types, tier-limits, regions, utils — sourced from `app/lib/types.ts`, `tier-limits.ts`, `regions.ts`, `utils.ts`
- **D-03:** `apps/web` is the existing codebase moved; `~/lib/` shared imports point to `@nozar/shared`
- **D-04:** Expo managed workflow, `expo-router` file-based nav, EAS Build + EAS Update
- **D-05:** NativeWind v4 + React Native Reusables (headless). Same dark theme tokens: `#030712`, `#0F172A`, `emerald-500`
- **D-06:** BKLIT analytics on both web and mobile
- **D-07:** 5 tabs: Home (feed), Map, + (Add listing), Pings, Profile
- **D-08:** Stack nav nested within tabs for secondary screens
- **D-09:** tRPC router added to existing React Router server; mobile calls tRPC over HTTPS
- **D-10:** tRPC route at `/api/trpc/*` via `app/routes/api.trpc.$.ts`; router type in `packages/shared`
- **D-11:** `@tanstack/react-query` + `@trpc/react-query` as data layer on mobile
- **D-12:** Better Auth Expo SDK (`better-auth/expo`) — token-based, `expo-secure-store`
- **D-13:** Google OAuth via `expo-auth-session` + `expo-web-browser`
- **D-14:** Email/password login as native form (no WebView)
- **D-15:** SSE via polyfill — `react-native-event-source` or `@azure/fetch-event-source` (NOTE: correct package name is `@microsoft/fetch-event-source`)
- **D-16:** Chat UI mirrors `ChatWindow` + `HandshakeFlow`, rebuilt in RN with NativeWind
- **D-17:** `expo-notifications` + EAS Push
- **D-18:** New endpoint `/api/push-subscribe-mobile` accepting Expo push token, stored in DB
- **D-19:** Server sends to both VAPID and Expo push tokens
- **D-20:** PayFast via `expo-web-browser` (`WebBrowser.openAuthSessionAsync`)
- **D-21:** Deep link `nozar://billing/success` returns control after payment
- **D-22:** `expo-image-picker` → existing `/api/upload` route (Vercel Blob)
- **D-23:** `react-native-maps` with Google Maps provider; API key via `app.json` + EAS secrets

### Agent's Discretion

- Exact folder structure within `apps/mobile/` (expo-router file conventions)
- NativeWind `tailwind.config.js` — extend with project-specific tokens
- Which RN Reusables components to use per screen
- Turborepo `turbo.json` pipeline config
- tRPC procedure organization (by domain vs flat)

### Deferred Ideas (OUT OF SCOPE)

- In-app purchases (IAP) — iOS App Store / Google Play billing
- Offline mode / sync
- Mobile-specific features (AR, barcode scanner)
- Web app PWA improvements
</user_constraints>

---

## Summary

Phase 3 migrates the existing Nozar React Router v7 app into a Turborepo monorepo (`apps/web` + `apps/mobile` + `packages/shared`) and builds a full-parity Expo React Native mobile app. The critical path is:

1. **Monorepo setup first** — Move the existing app into `apps/web/`, configure Turborepo, create `packages/shared`
2. **tRPC layer on the server** — Mount a tRPC router at `/api/trpc/*` on the existing React Router server; this is the only server-side change
3. **Mobile app scaffold** — Expo SDK 56, expo-router v4 (file-based), NativeWind v4 for styling
4. **Auth** — Better Auth `expo()` plugin server-side + `expoClient()` on mobile with `expo-secure-store`
5. **Feature parity** — Screen by screen, using tRPC for data, SSE polyfill for chat, expo-notifications for push

**Critical finding:** `@azure/fetch-event-source` does NOT exist on npm. The correct package is `@microsoft/fetch-event-source@2.0.1`. Additionally, `react-native-reusables` is NOT an npm package — it is a CLI-based copy-paste component library (like shadcn/ui). Components are added via `npx react-native-reusables@latest add <component>`.

**Primary recommendation:** Use Turborepo with npm workspaces; `@microsoft/fetch-event-source` for SSE; separate `expo_push_tokens` table (not a column on `profiles`) for multi-device push; NativeWind v4.2.4 with Tailwind v3.4.x config (NativeWind 4 does NOT use Tailwind v4).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth (session/token) | API/Backend (Better Auth server) | Mobile client (expo-secure-store) | Better Auth is the authority; mobile stores tokens locally |
| Data fetching (listings, trades) | API/Backend (tRPC procedures) | Mobile client (React Query cache) | DB access is server-only; RQ handles caching/stale-while-revalidate |
| Real-time chat (SSE) | API/Backend (existing SSE route) | Mobile client (EventSource polyfill) | No server changes; polyfill handles the client side |
| Push notifications | API/Backend (expo-server-sdk) | Mobile (expo-notifications permissions) | Server initiates push; mobile registers tokens |
| Navigation | Mobile client (expo-router) | — | File-based routing in `apps/mobile/app/` |
| UI rendering | Mobile client (NativeWind + RN Reusables) | packages/shared (types/logic) | Styling and components are mobile-only; business logic shared |
| Shared logic (tiers, regions, utils) | packages/shared | apps/web + apps/mobile consumers | Pure TypeScript, no runtime deps on Node or RN |
| Payments (PayFast) | API/Backend (existing routes) | Mobile client (expo-web-browser) | Checkout URL generated server-side; mobile opens WebView |
| Maps | Mobile client (react-native-maps) | API/Backend (listing lat/lng data) | Native map rendering; data from tRPC |
| Analytics (BKLIT) | Mobile client (BKLIT SDK) | — | Event capture at the client layer |

---

## Standard Stack

### Core — Monorepo

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| turbo | 2.9.14 | Turborepo build orchestrator | Industry-standard monorepo caching + task pipeline |
| npm workspaces | (built-in) | Package linking in monorepo | No new package manager needed; npm supports workspaces natively |

### Core — Mobile

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | 56.0.5 | Expo SDK + managed workflow | Latest stable SDK; managed workflow avoids ejecting |
| expo-router | 56.2.7 | File-based navigation | Recommended navigation for Expo managed; replaces react-navigation boilerplate |
| nativewind | 4.2.4 | Tailwind CSS for React Native | Locked by D-05; matches web styling approach |
| tailwindcss | 3.4.x | Peer dep for NativeWind | NativeWind v4 targets Tailwind v3 (NOT Tailwind v4) |
| react-native | ~0.76 | Core React Native | Bundled by Expo SDK 56 |

### Core — Auth

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | 1.6.11 | Auth server (upgrade from 1.5.3) | Current version; add `expo()` plugin |
| expo-secure-store | 56.0.4 | Secure token storage on device | iOS Keychain + Android Keystore; required by better-auth/expo |
| expo-auth-session | 56.0.12 | OAuth PKCE flow on mobile | Handles Google OAuth code exchange |
| expo-web-browser | 56.0.5 | Opens browser for OAuth + PayFast | Required by expo-auth-session and PayFast WebView |

### Core — API Layer

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @trpc/server | 11.17.0 | tRPC server (added to apps/web) | Type-safe RPC; locked by D-09 |
| @trpc/client | 11.17.0 | tRPC client on mobile | Must match server version exactly |
| @trpc/react-query | 11.17.0 | React Query integration for tRPC | Locked by D-11 |
| @tanstack/react-query | 5.100.14 | Data fetching / caching | Already in web app; locked by D-11 |
| zod | ^3.x | Input validation for tRPC procedures | Standard with tRPC v11 |

### Core — Features

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-notifications | 56.0.14 | Push notification permissions + token | Locked by D-17 |
| expo-server-sdk | 6.1.0 | Server-side Expo push sending | Official Expo push API wrapper |
| react-native-maps | 1.27.2 | Google Maps on mobile | Locked by D-23; works in managed workflow |
| expo-image-picker | 56.0.14 | Camera/gallery image selection | Locked by D-22 |
| @microsoft/fetch-event-source | 2.0.1 | SSE polyfill for React Native | See note below; `@azure/fetch-event-source` does NOT exist |
| expo-linking | 56.0.12 | Deep link handling (PayFast return) | Required for `nozar://` scheme handling |
| expo-constants | 56.0.16 | Access EAS build config + env | Needed for API URL injection |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-event-source | 1.1.0 | Alternative SSE polyfill (native) | Fallback if @microsoft/fetch-event-source has issues |
| expo-crypto | 56.x | Cryptographic utils | If needed for any client-side hashing |
| lucide-react-native | latest | Icons (matches lucide-react on web) | Direct RN port of the web icon set |

### ⚠️ Package Name Corrections

- **`@azure/fetch-event-source`** — does NOT exist on npm (404). The correct package is **`@microsoft/fetch-event-source`**.
- **`react-native-reusables`** — does NOT exist on npm. It is a CLI-based copy-paste library installed via `npx react-native-reusables@latest add <component>`. Components land in your own codebase under `~/components/ui/`.

### Installation

```bash
# Monorepo root
npm install turbo --save-dev

# packages/shared (no runtime deps)
# Just TypeScript + zod

# apps/mobile
npx create-expo-app@latest apps/mobile --template tabs
cd apps/mobile
npx expo install expo-router expo-secure-store expo-auth-session expo-web-browser \
  expo-notifications expo-image-picker expo-linking expo-constants expo-crypto \
  react-native-maps

npm install nativewind tailwindcss
npm install @trpc/client @trpc/react-query @tanstack/react-query
npm install @microsoft/fetch-event-source
npm install lucide-react-native

# apps/web — add to existing app
npm install @trpc/server zod
```

---

## Research Section 1: Turborepo Monorepo Migration

### 1.1 npm Workspaces + Turborepo

Turborepo works with npm, pnpm, and yarn workspaces. For npm workspaces, the root `package.json` needs: [ASSUMED — based on well-documented Turborepo behavior]

```json
{
  "name": "nozar-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.9.14"
  }
}
```

### 1.2 turbo.json (Turborepo v2 syntax)

**Critical:** Turborepo v2 (installed: 2.9.14) uses `"tasks"` not `"pipeline"`. [VERIFIED: turbo@2.9.14 is v2]

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["build/**", "dist/**", ".expo/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

- `"^build"` means: run `build` in all dependencies first (so `packages/shared` builds before `apps/web` and `apps/mobile`)
- `"persistent": true` on `dev` prevents Turbo from treating it as a finished task
- `"cache": false` on `dev` because watch processes must not be cached

### 1.3 packages/shared Setup

`packages/shared` is a TypeScript-only package with no build step — consumers (Vite and Metro) compile it directly from TypeScript source. This avoids the complexity of dual-output builds.

```
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # barrel export
    ├── types.ts          # moved from apps/web/app/lib/types.ts
    ├── tier-limits.ts    # moved from apps/web/app/lib/tier-limits.ts
    ├── regions.ts        # moved from apps/web/app/lib/regions.ts
    └── utils.ts          # moved from apps/web/app/lib/utils.ts
```

**packages/shared/package.json:**
```json
{
  "name": "@nozar/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types.ts",
    "./tier-limits": "./src/tier-limits.ts",
    "./regions": "./src/regions.ts",
    "./utils": "./src/utils.ts"
  }
}
```

**packages/shared/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### 1.4 Migrating apps/web (Critical Gotchas)

**Gotcha 1: Path alias `~/` must still resolve to `app/`**
The existing `vite-tsconfig-paths` plugin reads `tsconfig.json` paths (`"~/*": ["./app/*"]`). When the app moves to `apps/web/`, the tsconfig stays at `apps/web/tsconfig.json` — no change needed. The `~/` alias continues to resolve to `apps/web/app/`.

**Gotcha 2: `.env` file location**
React Router v7 (Vite) loads `.env` from the project root. After moving to `apps/web/`, the `.env` must live at `apps/web/.env` (or use Turbo's `dotenv` support). The monorepo root `.env` is NOT automatically loaded by Vite.

**Gotcha 3: drizzle.config.ts location**
Drizzle's config (`drizzle.config.ts`) references `app/lib/schema.ts`. After migration, it lives at `apps/web/drizzle.config.ts` and paths remain correct relative to `apps/web/`.

**Gotcha 4: node_modules hoisting**
npm workspaces hoists packages to the root `node_modules/`. This means `apps/web/node_modules/` may not have all packages — scripts that use `require()` with relative node_modules paths can break. Metro (Expo) also needs special config for hoisted modules (see Section 4).

**Gotcha 5: imports of shared modules**
Files that previously imported `~/lib/tier-limits`, `~/lib/regions`, `~/lib/utils`, `~/lib/types` must be updated to `@nozar/shared` (or `@nozar/shared/tier-limits`, etc.). This is the main refactor in `apps/web`.

**Gotcha 6: `regions.ts` imports `haversineKm` from `~/lib/utils`**
When moved to `packages/shared/src/regions.ts`, this import becomes `"./utils"` (relative). This is a required change.

### 1.5 packages/shared tRPC Type Export

The tRPC `AppRouter` type is defined in `apps/web` but consumed by `apps/mobile`. The approach is:
- Define the router in `apps/web/app/lib/trpc.server.ts`
- Export only the **type** (not the implementation) from `packages/shared/src/trpc-types.ts`:

```typescript
// packages/shared/src/trpc-types.ts
// This file is populated during build by apps/web. Keep only the type export.
import type { AppRouter } from "../../apps/web/app/lib/trpc.server";
export type { AppRouter };
```

> ⚠️ **This approach has a circular dependency risk.** The cleaner alternative is to export the router type from `apps/web` directly and import it in `apps/mobile` using workspace paths:
> `import type { AppRouter } from "@nozar/web/app/lib/trpc.server"` — but this leaks server modules.
>
> **Recommended approach:** Keep the `AppRouter` type import in `apps/mobile` pointing directly to `apps/web`:
> ```typescript
> // apps/mobile — only the TYPE is imported, no runtime code
> import type { AppRouter } from "../../apps/web/app/lib/trpc.server";
> ```
> TypeScript types are erased at compile time; Metro only bundles runtime code, so this type-only import is safe. [ASSUMED — standard TypeScript/tRPC pattern]

---

## Research Section 2: Better Auth Expo SDK

### 2.1 Server-Side `expo()` Plugin

Add the `expo()` plugin to `apps/web/app/lib/auth.server.ts`. The plugin enables:
- Bearer token authentication (alongside existing cookie sessions)
- Cross-origin token refresh
- Mobile OAuth callback handling

[ASSUMED — based on Better Auth docs at https://www.better-auth.com/docs/integrations/expo]

```typescript
import { betterAuth } from "better-auth";
import { expo } from "better-auth/plugins";
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    expo(),           // ← add this; must be before twoFactor
    twoFactor({ issuer: "NoZar" }),
  ],
  // ... all existing config unchanged
});
```

The `expo()` plugin adds:
- Ability to verify `Authorization: Bearer <token>` headers in addition to cookies
- A new endpoint for token-based session refresh
- Cross-origin policy adjustments needed for native clients

**No options are required** — the plugin works with defaults. [ASSUMED]

### 2.2 Client-Side Mobile Auth Setup

```typescript
// apps/mobile/lib/auth.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "better-auth/expo";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL, // e.g., "https://nozar.co.za"
  plugins: [
    expoClient({
      scheme: "nozar",           // must match app.json scheme
      storagePrefix: "nozar",    // prefix for SecureStore keys
      storage: SecureStore,       // uses iOS Keychain / Android Keystore
    }),
  ],
});
```

`expoClient()` automatically:
- Stores the auth token in `expo-secure-store` under `{storagePrefix}-token`
- Attaches `Authorization: Bearer <token>` header to all requests
- Refreshes tokens transparently before expiry
- Clears storage on `signOut()`

[ASSUMED — standard Better Auth Expo integration pattern]

### 2.3 Google OAuth on Mobile (expo-auth-session)

Better Auth's Google OAuth callback URL format is: `{baseURL}/api/auth/callback/google`

For mobile, you add a second authorized redirect URI in the Google Cloud Console:
`nozar://` (or `com.nozar://` — exact format depends on Expo setup) [ASSUMED]

```typescript
// apps/mobile/app/(auth)/google-oauth.tsx
import * as WebBrowser from "expo-web-browser";
import { useAuthRequest } from "expo-auth-session/providers/google";
import { authClient } from "~/lib/auth";

WebBrowser.maybeCompleteAuthSession(); // MUST be called at module level

export function GoogleSignInButton() {
  const [request, response, promptAsync] = useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    // Expo manages the redirect URI via expo-auth-session
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;
      // Exchange code via Better Auth
      authClient.signIn.social({
        provider: "google",
        code,
        idToken: response.params.id_token,
      });
    }
  }, [response]);

  return <Button onPress={() => promptAsync()} title="Sign in with Google" />;
}
```

> **Critical:** `WebBrowser.maybeCompleteAuthSession()` must be called at the top-level of the OAuth redirect screen — this resolves the session in the in-app browser. [ASSUMED]

### 2.4 expo-secure-store Setup

`expo-secure-store` is an Expo SDK package that requires no native setup in managed workflow — it is automatically included. No `app.json` config needed. It works on both iOS (Keychain) and Android (Keystore). [VERIFIED: expo-secure-store@56.0.4 exists as managed workflow package]

### 2.5 Known Issues

- **Managed workflow**: Better Auth Expo should work in managed workflow without ejecting, since `expo-secure-store` is a first-party Expo module. [ASSUMED]
- **iOS + Strict Keychain**: On iOS, SecureStore items are tied to app bundle ID. After reinstall, tokens are cleared (expected behavior). [ASSUMED]
- **Token refresh edge case**: If the app is backgrounded during token refresh, the refresh may fail. Better Auth's `expoClient` handles this with retry logic. [ASSUMED — verify with Better Auth changelog for v1.6.x]

---

## Research Section 3: tRPC with React Router v7

### 3.1 Mounting tRPC on React Router v7

React Router v7 routes export `loader` (GET) and `action` (POST). tRPC v11's `fetchRequestHandler` handles both methods internally.

**Route file: `apps/web/app/routes/api.trpc.$.ts`**

```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/lib/trpc.server";
import { createTRPCContext } from "~/lib/trpc-context.server";

const handler = ({ request }: { request: Request }) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: ({ req }) => createTRPCContext(req),
    onError: ({ error, path }) => {
      console.error(`tRPC error on ${path}:`, error);
    },
  });

export const loader = handler;
export const action = handler;
```

**Register in `apps/web/app/routes.ts`:**
```typescript
route("api/trpc/*", "routes/api.trpc.$.ts"),
```

### 3.2 tRPC Router Structure

```typescript
// apps/web/app/lib/trpc.server.ts
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { TRPCContext } from "./trpc-context.server";

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

// Domain routers
import { listingsRouter } from "./trpc/listings.server";
import { tradesRouter } from "./trpc/trades.server";
import { profileRouter } from "./trpc/profile.server";
import { notificationsRouter } from "./trpc/notifications.server";

export const appRouter = router({
  listings: listingsRouter,
  trades: tradesRouter,
  profile: profileRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
```

### 3.3 tRPC Context — Cookie vs Bearer Token

The context creation must handle both web (cookies) and mobile (Bearer token):

```typescript
// apps/web/app/lib/trpc-context.server.ts
import { auth } from "./auth.server";

export async function createTRPCContext(req: Request) {
  // Better Auth's expo() plugin makes getSession() work for both
  // cookie-based web sessions AND Bearer token mobile sessions
  const session = await auth.api.getSession({ headers: req.headers });

  return {
    session,
    userId: session?.user?.id ?? null,
    db, // import from db.server
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
```

When the mobile app sends `Authorization: Bearer <token>`, Better Auth's `expo()` plugin intercepts it in `getSession()` and returns the session. No separate token-handling code needed in the context. [ASSUMED — core feature of the expo() plugin]

### 3.4 Mobile tRPC Client

```typescript
// apps/mobile/lib/trpc.ts
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../apps/web/app/lib/trpc.server";
import { getAuthHeaders } from "./auth"; // returns { Authorization: "Bearer <token>" }

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${process.env.EXPO_PUBLIC_API_URL}/api/trpc`,
      headers: async () => {
        return getAuthHeaders(); // inject Bearer token
      },
    }),
  ],
});
```

**Wrap in `apps/mobile/app/_layout.tsx`:**
```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "~/lib/trpc";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Stack />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### 3.5 tRPC Procedure Organization (Recommendation)

Organize by domain to mirror the existing web route structure:

```
apps/web/app/lib/trpc/
├── listings.server.ts    # browse, getById, create, update, delete, boost
├── trades.server.ts      # list, getById, propose, accept, updateStatus, addMessage
├── profile.server.ts     # get, update, uploadAvatar
├── notifications.server.ts # list, markRead, getUnreadCount
└── push.server.ts        # registerExpoToken, unregisterExpoToken
```

---

## Research Section 4: NativeWind v4 + Expo Setup

### 4.1 Critical NativeWind v4 Distinction

**NativeWind v4 ≠ Tailwind CSS v4.** The web app uses Tailwind CSS v4 (`@tailwindcss/vite`). NativeWind v4 is based on Tailwind CSS **v3** (specifically 3.4.x). This means:

- NativeWind's `tailwind.config.js` uses Tailwind v3 `theme.extend` format (not v4's CSS variable format)
- Class names are compatible (`.bg-emerald-500`, `.text-slate-300`, etc. all work)
- Arbitrary values like `bg-[#030712]` work in both v3 and v4
- The `packages/shared` tailwind config content globs work the same way

[VERIFIED: nativewind@4.2.4 has `tailwindcss` as a peer dep, specifically v3.x]

### 4.2 Installation Steps

```bash
cd apps/mobile
npm install nativewind@^4.2.4
npm install --save-dev tailwindcss@^3.4.0

# For TypeScript support in className
npx pod-install  # (EAS Build handles this automatically in managed workflow)
```

### 4.3 Configuration Files

**`apps/mobile/tailwind.config.js`:**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "../../packages/shared/src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#030712",
        card: "#0F172A",
        // emerald-500 is already in Tailwind default palette as #10b981
        // slate colors are in default palette
      },
      fontFamily: {
        // React Native uses system fonts; map web Inter font fallback
        mono: ["SpaceMono", "monospace"],
      },
    },
  },
  plugins: [],
};
```

**`apps/mobile/global.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`apps/mobile/babel.config.js`:**
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

**`apps/mobile/metro.config.js`:**
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo support — critical for npm workspaces
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
```

**Import in `apps/mobile/app/_layout.tsx`:**
```typescript
import "../global.css"; // must be first import
```

### 4.4 Dark Theme Token Mapping

| Web (Tailwind v4 / CSS) | Mobile NativeWind v4 equivalent |
|-------------------------|---------------------------------|
| `bg-[#030712]` | `bg-[#030712]` (arbitrary values work) |
| `bg-[#0F172A]` | `bg-[#0F172A]` |
| `text-emerald-500` | `text-emerald-500` |
| `text-slate-300` | `text-slate-300` |
| `border-white/10` | `border-white/10` |
| `font-black uppercase tracking-tighter` | `font-black uppercase tracking-tighter` |
| `font-mono uppercase tracking-widest text-[10px]` | `font-mono uppercase tracking-widest text-[10px]` |

> **Note:** React Native does not support all CSS properties. Specifically:
> - `text-shadow`, `box-shadow` → not supported natively (use `shadow-*` RN props instead)
> - `backdrop-blur` → not supported on Android (iOS only via `BlurView`)
> - `position: sticky` → not applicable in RN
> - Web gradients via Tailwind → use `expo-linear-gradient` instead

### 4.5 Known Issues with NativeWind v4 + expo-router

- **New Architecture**: NativeWind v4 requires the New Architecture to be enabled (default in Expo SDK 52+). Expo SDK 56 has New Architecture on by default — no action needed. [ASSUMED based on Expo SDK progression]
- **className on custom components**: Must use `cssInterop` or the component must forward the `className` prop correctly. [ASSUMED]
- **Hot reload**: NativeWind v4 CSS changes may require a Metro cache clear (`npx expo start --clear`) after initial setup. [ASSUMED]

---

## Research Section 5: React Native Reusables

### 5.1 What It Is

React Native Reusables is **NOT an npm package**. It is a CLI-based copy-paste component library (same pattern as shadcn/ui). Components are added to your project's source code — you own them entirely.

[VERIFIED: `npm view react-native-reusables` returns 404]

Website: https://reactnativereusables.com/

### 5.2 Installation

```bash
# Initialize (run in apps/mobile/)
npx react-native-reusables@latest init

# This creates:
# - ~/components/ui/ (component directory)
# - ~/lib/utils.ts (cn() helper with clsx + tailwind-merge)
# - Installs peer deps: class-variance-authority, clsx, tailwind-merge

# Add individual components (examples)
npx react-native-reusables@latest add button
npx react-native-reusables@latest add input
npx react-native-reusables@latest add dialog
npx react-native-reusables@latest add sheet
npx react-native-reusables@latest add card
npx react-native-reusables@latest add badge
npx react-native-reusables@latest add avatar
npx react-native-reusables@latest add tabs
```

### 5.3 Available Components (Web-to-Mobile Mapping)

| Web Component (shadcn/ui style) | RN Reusables equivalent | Notes |
|----------------------------------|-------------------------|-------|
| `Button` | `button` | Matches CVA variants |
| `Input` | `input` | TextInput-based |
| `Dialog` / Modal | `dialog` | Uses `@gorhom/bottom-sheet` internally |
| Bottom Sheet | `sheet` | Native bottom sheet |
| `Card` | `card` | View with border/rounded |
| `Badge` | `badge` | Text badge with variants |
| `Avatar` | `avatar` | Image with fallback initials |
| `Tabs` | `tabs` | Context-based tab switching |
| `Select` | `select` | Uses bottom sheet for options |
| `Progress` | `progress` | Animated progress bar |
| `Separator` | `separator` | Horizontal divider |
| `Label` | `label` | Accessible text label |

### 5.4 Dependency: @gorhom/bottom-sheet

Several components (Dialog, Sheet, Select) depend on `@gorhom/bottom-sheet`. Install via:
```bash
npx expo install @gorhom/bottom-sheet react-native-gesture-handler react-native-reanimated
```

**`app.json` config plugin needed:**
```json
{
  "expo": {
    "plugins": [
      ["react-native-reanimated/plugin"]
    ]
  }
}
```

And `babel.config.js` must include `react-native-reanimated/plugin` (it must be last):
```javascript
plugins: ["react-native-reanimated/plugin"]
```

### 5.5 Setup Gotchas

- Components land in `apps/mobile/components/ui/` — NOT a separate package. This is intentional (you customize them).
- The `cn()` utility in `apps/mobile/lib/utils.ts` (from RN Reusables) uses `tailwind-merge` and `clsx`. This is separate from `packages/shared/src/utils.ts` which also has `cn()` using just `clsx`. Keep them separate — `packages/shared` doesn't need `tailwind-merge` since it has no styling code.
- Some components require `GestureHandlerRootView` at the root of the app. [ASSUMED]

---

## Research Section 6: SSE Polyfill for React Native

### 6.1 Package Correction

**`@azure/fetch-event-source` does NOT exist on npm.** [VERIFIED: npm 404]

The correct Microsoft package is `@microsoft/fetch-event-source@2.0.1`. [VERIFIED: exists on npm]

### 6.2 Recommendation: `@microsoft/fetch-event-source`

Use `@microsoft/fetch-event-source` over `react-native-event-source` because:
1. JavaScript-only (no native module) → works in managed workflow without any native config
2. Uses the Fetch API which React Native 0.71+ supports
3. Supports `AbortController` for clean disconnection
4. Has retry / reconnection logic built in
5. Actively maintained by Microsoft

`react-native-event-source@1.1.0` is a native module that hasn't been updated recently and may not be compatible with Expo SDK 56's New Architecture. [ASSUMED based on version staleness]

### 6.3 Consuming the SSE Endpoint

The existing endpoint: `GET /api/chat-stream/:tradeId` (SSE, requires cookie auth)

For mobile, the endpoint must accept Bearer token. Since Better Auth's `expo()` plugin makes `getSession()` work with Bearer tokens, the SSE route just needs to call `requireAuth(request)` as it already does — this will work for mobile too. [ASSUMED — depends on whether the expo() plugin intercepts headers on GET requests too]

```typescript
// apps/mobile/hooks/useChatStream.ts
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useEffect, useRef } from "react";
import { authClient } from "~/lib/auth";

export function useChatStream(
  tradeId: number,
  onMessage: (data: unknown) => void,
) {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const token = authClient.getToken?.(); // get stored Bearer token

    fetchEventSource(
      `${process.env.EXPO_PUBLIC_API_URL}/api/chat-stream/${tradeId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: ctrl.signal,
        onmessage(ev) {
          if (ev.data) {
            try {
              onMessage(JSON.parse(ev.data));
            } catch {
              // raw text message
            }
          }
        },
        onerror(err) {
          console.warn("[SSE] error, retrying...", err);
          // fetchEventSource auto-retries by default
        },
        onclose() {
          console.log("[SSE] connection closed");
        },
      },
    );

    return () => ctrl.abort();
  }, [tradeId]);
}
```

### 6.4 Reconnection Support

`@microsoft/fetch-event-source` has automatic reconnection built in:
- Retries with exponential backoff on error
- Respects `retry:` field from the SSE server
- `onerror` callback can throw to prevent retry
- `AbortController` cleanly stops reconnection

### 6.5 Potential Issue: Streaming Fetch in RN

React Native's `fetch()` may not support streaming responses in all versions. For Expo SDK 56 (RN ~0.76), this should work. If streaming is problematic, fall back to polling via tRPC `notifications.list` query. [ASSUMED — RN streaming support varies by version]

---

## Research Section 7: Expo Push Notifications (EAS)

### 7.1 Full Setup Flow

**Step 1: App side (expo-notifications)**
```typescript
// apps/mobile/lib/push.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulator has no push token

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data; // "ExponentPushToken[xxxxxx]"
}
```

**Step 2: Send token to server**
After getting the token, call a tRPC mutation or the `/api/push-subscribe-mobile` endpoint:
```typescript
await trpc.push.registerExpoToken.mutate({ token: pushToken });
```

**Step 3: EAS project config in `app.json`**
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    },
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#10b981",
        "androidMode": "default"
      }]
    ]
  }
}
```

### 7.2 `/api/push-subscribe-mobile` Endpoint

This tRPC procedure (or REST route) accepts an Expo push token:

```typescript
// In trpc/push.server.ts
export const pushRouter = router({
  registerExpoToken: protectedProcedure
    .input(z.object({ token: z.string().startsWith("ExponentPushToken") }))
    .mutation(async ({ ctx, input }) => {
      await db
        .insert(expoPushTokens)
        .values({
          userId: ctx.session.user.id,
          token: input.token,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: expoPushTokens.token,
          set: { userId: ctx.session.user.id },
        });
      return { success: true };
    }),
});
```

### 7.3 Schema Design: Separate Table (Recommended)

**Recommendation: separate `expo_push_tokens` table**, not a column on `profiles`.

**Rationale:**
- A user may have multiple devices (phone + tablet)
- A column on `profiles` can only store one token
- The separate table supports multi-device naturally

```typescript
// Add to apps/web/app/lib/schema.ts
export const expoPushTokens = pgTable(
  "expo_push_tokens",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("expo_push_tokens_user_idx").on(t.userId)],
);
```

### 7.4 Server-Side Push Sending (expo-server-sdk@6.1.0)

```typescript
// apps/web/app/lib/webpush.server.ts — extend existing file
import Expo from "expo-server-sdk";

const expoClient = new Expo();

export async function sendExpoPushNotification(
  userId: string,
  message: { title: string; body: string; data?: Record<string, unknown> },
) {
  const tokens = await db
    .select({ token: expoPushTokens.token })
    .from(expoPushTokens)
    .where(eq(expoPushTokens.userId, userId));

  const messages = tokens
    .filter(({ token }) => Expo.isExpoPushToken(token))
    .map(({ token }) => ({
      to: token,
      sound: "default" as const,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
    }));

  if (messages.length === 0) return;

  const chunks = expoClient.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    await expoClient.sendPushNotificationsAsync(chunk);
  }
}
```

The existing web push code (`webpush.server.ts`) sends VAPID notifications. Extend that module to ALSO call `sendExpoPushNotification()` wherever push is triggered, satisfying D-19.

### 7.5 Multiple Devices

The `expo_push_tokens` table handles multiple devices automatically. The server queries all tokens for a user and sends to each. Dead tokens (device uninstalled) should be cleaned up by checking `expo-server-sdk` receipt errors (`DeviceNotRegistered`) and deleting stale tokens. [ASSUMED — standard Expo push hygiene pattern]

---

## Research Section 8: PayFast WebView (expo-web-browser)

### 8.1 `WebBrowser.openAuthSessionAsync` Flow

```typescript
// apps/mobile/app/(tabs)/billing.tsx
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

async function handleUpgrade(planCode: string) {
  // 1. Get PayFast checkout URL from tRPC (existing /api/pay/upgrade logic)
  const { checkoutUrl } = await trpc.billing.getUpgradeUrl.query({ planCode });

  // 2. Open system browser (Safari/Chrome Custom Tab)
  const result = await WebBrowser.openAuthSessionAsync(
    checkoutUrl,
    "nozar://billing/success", // redirect URL PayFast should return to
  );

  // 3. Handle result
  if (result.type === "success") {
    // result.url is "nozar://billing/success?..."
    // React Query will refetch subscription status automatically
    queryClient.invalidateQueries({ queryKey: ["subscription"] });
  }
}
```

### 8.2 Deep Link Setup

**`apps/mobile/app.json`:**
```json
{
  "expo": {
    "scheme": "nozar",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "nozar",
              "host": "billing"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

**Handle the deep link in `apps/mobile/app/billing/success.tsx`:**
```typescript
import { useLocalSearchParams } from "expo-router";

export default function BillingSuccessScreen() {
  // expo-router parses the deep link automatically
  // Navigate to billing tab and show success state
  return <BillingSuccessView />;
}
```

### 8.3 PayFast + expo-web-browser Known Considerations

- **SFSafariViewController (iOS)**: `openAuthSessionAsync` uses this on iOS, which shares cookies with Safari. PayFast's session cookies should work correctly. [ASSUMED]
- **Chrome Custom Tab (Android)**: Same approach on Android. [ASSUMED]
- **Redirect URL format**: The PayFast `return_url` in the server-side checkout form must be `nozar://billing/success` — ensure this is passed when the tRPC procedure constructs the PayFast form. The existing server code at `api.pay.upgrade.ts` needs this URL added as `return_url` when called from mobile.
- **Webhook is unaffected**: PayFast webhook (`/api/pay/webhook`) runs server-to-server and is not affected by the mobile client. No changes needed. [VERIFIED from CONTEXT.md D-20]

---

## Research Section 9: react-native-maps (Google Maps)

### 9.1 Expo Managed Workflow Config

`react-native-maps` works in Expo managed workflow via its Expo config plugin (included in the package). [VERIFIED: react-native-maps@1.27.2 includes an Expo config plugin]

**`apps/mobile/app.json`:**
```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "ANDROID_GOOGLE_MAPS_API_KEY"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "IOS_GOOGLE_MAPS_API_KEY"
      }
    },
    "plugins": [
      [
        "react-native-maps",
        {
          "googleMapsApiKey": "IOS_GOOGLE_MAPS_API_KEY"
        }
      ]
    ]
  }
}
```

### 9.2 EAS Secrets for API Keys (Recommended)

**Do NOT hardcode API keys in `app.json`**. Use EAS secrets:

```bash
# Set secrets via EAS CLI
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY_ANDROID --value "AIza..."
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY_IOS --value "AIza..."
```

Then reference in `app.config.js` (dynamic config):
```javascript
// apps/mobile/app.config.js
export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
      },
    },
  },
  ios: {
    ...config.ios,
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS,
    },
  },
});
```

Use `app.config.js` instead of `app.json` to support dynamic env var injection.

### 9.3 Displaying Listing Pins + Tap Handlers

```typescript
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

function ListingsMap({ listings }: { listings: ListingCard[] }) {
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={{ flex: 1 }}
      initialRegion={{
        latitude: -26.2041,  // Default: Johannesburg
        longitude: 28.0473,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
    >
      {listings
        .filter((l) => l.lat && l.lng)
        .map((listing) => (
          <Marker
            key={listing.id}
            coordinate={{ latitude: listing.lat!, longitude: listing.lng! }}
            title={listing.title}
            description={listing.seekingDescription ?? ""}
            onPress={() => router.push(`/asset/${listing.id}`)}
          />
        ))}
    </MapView>
  );
}
```

### 9.4 Android vs iOS Provider

- **Android**: Must use `PROVIDER_GOOGLE`. Default provider is not available on Android. [ASSUMED]
- **iOS**: Can use `PROVIDER_GOOGLE` or default Apple Maps. Use Google for consistency with web. [ASSUMED]

---

## Research Section 10: BKLIT Analytics

### 10.1 Current State

BKLIT (`https://ui.bklit.com/`) is referenced in the CONTEXT.md as a locked analytics decision. However:
- No npm package found under obvious names [VERIFIED: not a major npm package]
- Documentation was not accessible during this research session

**Confidence: LOW** — BKLIT integration details require consulting their official docs directly.

### 10.2 What to Track (Events Recommendation)

Regardless of SDK, these events align with Nozar's key metrics:

| Event | Trigger | Properties |
|-------|---------|------------|
| `screen_view` | Each screen navigation | `screen_name`, `user_id` |
| `listing_create` | After successful listing POST | `category`, `type`, `plan_code` |
| `listing_browse` | Feed scroll / filter change | `category_filter`, `region` |
| `ping_start` | Trade proposed | `listing_id`, `is_ai_match` |
| `message_send` | Message submitted in chat | `trade_id`, `trade_status` |
| `handshake_advance` | Trade status changes | `from_status`, `to_status` |
| `subscription_upgrade` | PayFast checkout opened | `plan_code` |
| `subscription_success` | Deep link return success | `plan_code` |
| `push_permission` | Notification permission result | `granted: boolean` |
| `map_view` | Map tab opened | — |
| `login` | Successful sign-in | `provider: google|email` |

### 10.3 Integration Pattern (Generic, to Validate Against BKLIT Docs)

```typescript
// apps/mobile/lib/analytics.ts
// Replace with actual BKLIT SDK calls once docs are consulted

export function trackEvent(name: string, props?: Record<string, unknown>) {
  // TODO: Replace with BKLIT.track(name, props)
  if (__DEV__) console.log("[analytics]", name, props);
}

export function identifyUser(userId: string) {
  // TODO: Replace with BKLIT.identify(userId)
}
```

> ⚠️ **BLOCKER**: BKLIT SDK for React Native/Expo must be confirmed by consulting https://ui.bklit.com/ before the mobile implementation wave. If BKLIT has no RN SDK, use their web SDK via `expo-web-browser` or a JavaScript-only wrapper.

---

## Architecture Patterns

### System Architecture Diagram

```
[Mobile App (Expo RN)]
       │
       ├── Bearer Token (expo-secure-store)
       │         │
       ├─────────┼──── HTTPS ─────────────────────────────────────────────┐
       │         │                                                          │
       │    GET /api/chat-stream/:tradeId (SSE)                   [React Router v7 Server]
       │    POST /api/trpc/* (tRPC batch)                                  │
       │    POST /api/upload (Vercel Blob)                         ┌────────┴────────┐
       │    GET  /api/pay/upgrade (PayFast redirect)               │   tRPC Router   │
       │                                                           │  listings       │
       │                                                           │  trades         │
       │                                                           │  profile        │
       │                                                           │  notifications  │
       │                                                           │  push           │
       │                                                           └────────┬────────┘
       │                                                                    │
       │                                              Better Auth (cookie + bearer token)
       │                                                                    │
       │                                                           ┌────────┴────────┐
       │                                                           │  Neon PostgreSQL │
       │                                                           │  (Drizzle ORM)   │
       │                                                           └────────┬────────┘
       │                                                                    │
[packages/shared]                                            Expo Push Service (EAS)
  types.ts                                                          │
  tier-limits.ts                                              APNs (iOS) / FCM (Android)
  regions.ts                                                        │
  utils.ts                                               [Mobile device notification]
```

### Recommended Project Structure

```
/ (monorepo root)
├── turbo.json
├── package.json          # workspaces: ["apps/*", "packages/*"]
├── apps/
│   ├── web/              # existing React Router app (MOVED here)
│   │   ├── app/
│   │   │   ├── lib/
│   │   │   │   ├── trpc.server.ts          # NEW: tRPC router root
│   │   │   │   ├── trpc-context.server.ts  # NEW: tRPC context
│   │   │   │   ├── trpc/                   # NEW: domain routers
│   │   │   │   │   ├── listings.server.ts
│   │   │   │   │   ├── trades.server.ts
│   │   │   │   │   ├── profile.server.ts
│   │   │   │   │   ├── notifications.server.ts
│   │   │   │   │   └── push.server.ts
│   │   │   │   ├── auth.server.ts          # MODIFIED: add expo() plugin
│   │   │   │   └── schema.ts               # MODIFIED: add expo_push_tokens table
│   │   │   └── routes/
│   │   │       └── api.trpc.$.ts           # NEW: tRPC mount point
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── mobile/           # NEW: Expo app
│       ├── app/           # expo-router file-based routes
│       │   ├── _layout.tsx              # Root layout (QueryClient, tRPC, auth)
│       │   ├── (auth)/
│       │   │   ├── login.tsx
│       │   │   ├── register.tsx
│       │   │   └── google-oauth.tsx
│       │   └── (tabs)/
│       │       ├── _layout.tsx          # Tab bar
│       │       ├── index.tsx            # Home/Feed
│       │       ├── map.tsx              # Map
│       │       ├── add.tsx              # Add Listing
│       │       ├── pings.tsx            # Pings list
│       │       ├── pings/
│       │       │   └── [id].tsx         # Chat + Handshake
│       │       └── profile.tsx          # Profile
│       ├── components/
│       │   └── ui/                      # React Native Reusables components (copied)
│       ├── lib/
│       │   ├── auth.ts                  # createAuthClient + expoClient
│       │   ├── trpc.ts                  # tRPC client setup
│       │   ├── push.ts                  # registerForPushNotifications
│       │   └── analytics.ts             # BKLIT wrapper
│       ├── hooks/
│       │   └── useChatStream.ts         # SSE hook
│       ├── app.config.js                # Dynamic Expo config (replaces app.json)
│       ├── babel.config.js
│       ├── metro.config.js              # NativeWind + monorepo support
│       ├── global.css                   # Tailwind directives
│       ├── tailwind.config.js           # NativeWind config
│       └── package.json
└── packages/
    └── shared/
        ├── src/
        │   ├── index.ts                 # barrel
        │   ├── types.ts                 # from apps/web/app/lib/types.ts
        │   ├── tier-limits.ts           # from apps/web/app/lib/tier-limits.ts
        │   ├── regions.ts               # from apps/web/app/lib/regions.ts (import fix)
        │   └── utils.ts                 # from apps/web/app/lib/utils.ts
        ├── tsconfig.json
        └── package.json
```

### Anti-Patterns to Avoid

- **Don't import server modules in packages/shared**: `auth.server.ts`, `db.server.ts`, etc. must never be imported from `packages/shared`. Only pure TypeScript (types + functions with no runtime deps on Node APIs) belongs there.
- **Don't use Tailwind v4 config syntax in NativeWind**: NativeWind v4 uses Tailwind v3 `tailwind.config.js` format. The web app's `@tailwindcss/vite` plugin uses the new v4 format. They are different configs in different apps — do not try to share the tailwind config.
- **Don't use `app.json` for API keys in production**: Always use `app.config.js` + EAS secrets for any sensitive values.
- **Don't use `pipeline` in turbo.json**: Turborepo v2 (2.9.14) uses `tasks`, not `pipeline`. Using `pipeline` would silently fail or error.
- **Don't share `cn()` utility via packages/shared**: The `cn()` in `packages/shared/utils.ts` uses only `clsx` (per the existing code). The RN app's `cn()` (from RN Reusables) uses `clsx + tailwind-merge`. Keep them separate to avoid pulling `tailwind-merge` into the web bundle.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE in React Native | Custom fetch + ReadableStream streaming | `@microsoft/fetch-event-source` | Handles reconnection, retries, error backoff, abort |
| Token storage on device | AsyncStorage (unencrypted) | `expo-secure-store` | Hardware-backed encryption; required by Better Auth expo plugin |
| Push notification delivery | Direct APNs/FCM API calls | `expo-server-sdk` + EAS Push | Expo normalizes APNs + FCM; no certificates to manage |
| OAuth PKCE on mobile | Custom code verifier generation | `expo-auth-session` | Handles PKCE, state, code verifier, cross-platform browser |
| In-app browser for OAuth/PayFast | Custom WebView | `expo-web-browser` | SFSafariViewController (iOS) / Chrome Custom Tab (Android) — shares cookies, higher trust |
| Maps | Custom WebView wrapping Google Maps JS | `react-native-maps` | Native map rendering, gesture handling, clustering |
| Bottom sheets/modals | Custom RN Modal with pan gesture | `@gorhom/bottom-sheet` (via RN Reusables) | Battle-tested, performance-optimized, accessible |
| Monorepo build caching | Custom CI scripts | `turbo` | Incremental builds, remote cache, correct dependency ordering |

---

## Common Pitfalls

### Pitfall 1: NativeWind v4 vs Tailwind v4 Confusion

**What goes wrong:** Developer uses Tailwind v4 config syntax (CSS variables, `@theme {}`) in NativeWind's `tailwind.config.js`.
**Why it happens:** The web app uses Tailwind v4; NativeWind is named "v4" but uses Tailwind v3 internally.
**How to avoid:** Use standard `module.exports = { theme: { extend: {} } }` format in `apps/mobile/tailwind.config.js`. Do NOT use `@tailwindcss/vite` in the mobile app.
**Warning signs:** Metro build fails with "theme is not a function" or styles are undefined.

### Pitfall 2: turbo.json `pipeline` vs `tasks`

**What goes wrong:** Using `"pipeline"` key in turbo.json instead of `"tasks"`.
**Why it happens:** Training data and older tutorials reference v1 syntax.
**How to avoid:** turbo 2.9.14 requires `"tasks"`. Check with `npx turbo --version` and use the correct schema.
**Warning signs:** `turbo run build` ignores the pipeline and runs all tasks without caching.

### Pitfall 3: Metro Cannot Resolve Hoisted node_modules

**What goes wrong:** Metro bundler fails with "Unable to resolve module @nozar/shared" even though the package is linked.
**Why it happens:** npm workspaces hoist packages to the monorepo root `node_modules/`, but Metro's default resolver only looks in the app's `node_modules/`.
**How to avoid:** Configure `metro.config.js` with `watchFolders: [monorepoRoot]` and `resolver.nodeModulesPaths` pointing to both the app and monorepo root `node_modules/`.
**Warning signs:** Only affects Expo/Metro build, not TypeScript type checking.

### Pitfall 4: `@azure/fetch-event-source` 404

**What goes wrong:** `npm install @azure/fetch-event-source` fails.
**Why it happens:** The correct package name is `@microsoft/fetch-event-source`, not `@azure/`.
**How to avoid:** Use `@microsoft/fetch-event-source@2.0.1`.

### Pitfall 5: react-native-reusables Not on npm

**What goes wrong:** `npm install react-native-reusables` fails with 404.
**Why it happens:** It's a CLI-based copy-paste library, not an npm package.
**How to avoid:** Use `npx react-native-reusables@latest init` and `npx react-native-reusables@latest add <component>`.

### Pitfall 6: expo() Plugin Must Be First in Better Auth plugins Array

**What goes wrong:** Bearer token auth silently fails or conflicts with twoFactor plugin.
**Why it happens:** Plugin ordering matters in Better Auth; `expo()` should precede other plugins.
**How to avoid:** Place `expo()` first in the `plugins` array. [ASSUMED]

### Pitfall 7: SSE Endpoint Requires Bearer Token Header (Not Just Cookie)

**What goes wrong:** Mobile's SSE hook connects but immediately disconnects with 401.
**Why it happens:** The existing SSE route uses `requireAuth(request)` which reads cookie. On mobile, there's no cookie — only `Authorization: Bearer` header.
**How to avoid:** Confirm that Better Auth's `expo()` plugin enables `getSession()` to read Bearer tokens on GET requests (SSE). If not, add a small adapter in the SSE route that also checks the Authorization header. [ASSUMED — needs validation]

### Pitfall 8: Push Token Column on profiles (Wrong Approach)

**What goes wrong:** Only the last registered device receives push notifications.
**Why it happens:** If `expoPushToken` is a single column on `profiles`, the second device overwrites the first.
**How to avoid:** Use the `expo_push_tokens` table with one row per device. The schema already has space for this.

### Pitfall 9: Deep Links Not Configured for Android

**What goes wrong:** PayFast payment completes but the app is not brought back to foreground on Android.
**Why it happens:** Android requires `intentFilters` in `app.json` for deep links, unlike iOS which just needs the `scheme`.
**How to avoid:** Configure both `scheme` and `android.intentFilters` in `app.config.js`.

### Pitfall 10: tRPC `AppRouter` Type Import Causes Metro to Bundle Server Code

**What goes wrong:** Metro includes Neon/Drizzle/server modules in the mobile bundle.
**Why it happens:** Importing `AppRouter` from `apps/web/app/lib/trpc.server.ts` may cause Metro to follow transitive server-only imports.
**How to avoid:** The import must be `import type { AppRouter }` (type-only). TypeScript erases types; Metro only bundles runtime imports. Always use `import type` for the router type. [ASSUMED — standard TypeScript/Metro behavior]

---

## Code Examples

### tRPC Mount Route (React Router v7)

```typescript
// apps/web/app/routes/api.trpc.$.ts
// Source: tRPC fetchRequestHandler docs [ASSUMED — verified pattern]
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/lib/trpc.server";
import { createTRPCContext } from "~/lib/trpc-context.server";

const handler = ({ request }: { request: Request }) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: ({ req }) => createTRPCContext(req),
  });

export const loader = handler;
export const action = handler;
```

### Metro Config for Monorepo

```javascript
// apps/mobile/metro.config.js
// Source: Expo docs + NativeWind docs [ASSUMED]
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
```

### Better Auth Server Extension

```typescript
// Minimal diff to apps/web/app/lib/auth.server.ts
import { expo } from "better-auth/plugins"; // add import

export const auth = betterAuth({
  plugins: [
    expo(),                           // add as first plugin
    twoFactor({ issuer: "NoZar" }),   // existing
  ],
  // ... all other existing config unchanged
});
```

### Expo Push Token Registration

```typescript
// apps/mobile/lib/push.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[push] Skipping — not a physical device");
    return null;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error("EAS projectId not found in app config");

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token; // "ExponentPushToken[xxx]"
}
```

---

## Runtime State Inventory

> This is a migration phase — moving existing code into a new monorepo structure.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Neon PostgreSQL — no renames; same DB, same tables | None — DB stays unchanged |
| Live service config | Vercel deployment: project root is currently `./` (now `apps/web/`) | Update Vercel root directory to `apps/web/` in Vercel dashboard |
| OS-registered state | No OS-level registrations found | None |
| Secrets/env vars | All `.env` vars at root → must move to `apps/web/.env` | Copy `.env` to `apps/web/.env`; add EAS secrets for mobile |
| Build artifacts | `build/` directory at root → becomes `apps/web/build/` | Update any CI references to build path |

**Vercel config change required:** `vercel.json` at root may need updating — or move it to `apps/web/` and set "Root Directory" to `apps/web` in Vercel project settings. [ASSUMED — Vercel mono-repo support docs should be consulted]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `turbo.json "pipeline"` | `turbo.json "tasks"` | Turborepo v2.0 | Using `pipeline` in v2 causes silent failures |
| Expo SDK 50-53 file-based routing via separate packages | expo-router is first-class in Expo SDK 51+ | SDK 51 | expo-router is now the canonical navigation choice |
| react-navigation v6 manual setup | expo-router v3+ (file-based, built-in) | 2024 | expo-router preferred for Expo managed |
| `expo-notifications` + Firebase manually | EAS Push handles APNs/FCM abstraction | EAS Push GA | No need for Firebase SDK in managed workflow |
| `@azure/fetch-event-source` | Does not exist — use `@microsoft/fetch-event-source` | N/A (naming confusion) | Always was Microsoft, not Azure |
| NativeWind v2 (bare workflow) | NativeWind v4 (managed + New Architecture) | NativeWind v4 GA | v4 supports Expo managed workflow fully |
| `"pipeline"` in turbo v1 | `"tasks"` in turbo v2 | turbo 2.0 | Breaking config change |

**Deprecated/outdated:**
- `react-navigation` for new Expo projects: prefer `expo-router` (file-based, cleaner stack integration)
- Bare workflow for NativeWind: v4 works in managed workflow; no eject needed
- Adding `expo()` plugin in the middle of the plugins array: should be first

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `expo()` plugin in Better Auth must be first in plugins array | §2.1 | Two-factor auth may conflict; test with integration |
| A2 | Better Auth's `getSession()` with `expo()` plugin reads `Authorization: Bearer` on GET requests (SSE) | §2.3, §6.3 | SSE endpoint returns 401; need to add manual Bearer token check in the SSE route |
| A3 | `import type { AppRouter }` from the web server file is safe in Metro (type-only, no bundling) | §3.5 | Metro bundles server code into mobile app; use a types-only shim file instead |
| A4 | NativeWind v4 requires New Architecture (enabled by default in Expo SDK 52+) | §4.5 | App crashes on old architecture; check `expo.newArchEnabled` in app.config.js |
| A5 | `expoClient()` plugin in `createAuthClient` auto-injects `Authorization: Bearer` headers | §2.2 | Manual header injection needed in tRPC client httpBatchLink |
| A6 | Better Auth's `expoClient()` exposes a `getToken()` method for manual SSE token injection | §6.3 | Must use SecureStore directly to read the token |
| A7 | `react-native-reusables` CLI works with Expo SDK 56 + NativeWind v4.2.4 | §5.2 | CLI generates incompatible code; components need manual adjustment |
| A8 | Turborepo v2 with npm workspaces supports TypeScript-source packages without build step | §1.3 | Metro or Vite fails to resolve `@nozar/shared` without a compiled output |
| A9 | Vercel requires "Root Directory" set to `apps/web` after monorepo migration | §Runtime State | Vercel builds from monorepo root and fails |
| A10 | BKLIT has a React Native / Expo SDK | §10 | No RN SDK exists; requires alternative approach (web SDK wrapped in WebView, or custom HTTP calls to analytics endpoint) |

---

## Open Questions

1. **BKLIT React Native SDK**
   - What we know: BKLIT is the locked analytics choice (D-06); website at https://ui.bklit.com/
   - What's unclear: Whether a React Native / Expo SDK exists vs. web-only
   - Recommendation: Consult BKLIT docs before the analytics implementation wave; stub the calls until then

2. **Better Auth `expo()` plugin on GET requests (SSE)**
   - What we know: The `expo()` plugin enables Bearer token auth; SSE is a GET request
   - What's unclear: Whether the plugin intercepts Bearer tokens on GET (not just POST)
   - Recommendation: Add an integration test early: authenticate mobile client → call SSE endpoint → verify session. If it fails, add manual `Authorization` header parsing in the SSE route.

3. **Vercel Monorepo Deployment Config**
   - What we know: Current `vercel.json` is at repo root; post-migration it should point to `apps/web`
   - What's unclear: Whether Vercel project settings need to be updated or if `vercel.json` can redirect
   - Recommendation: Set "Root Directory" to `apps/web` in Vercel project settings

4. **EAS Project ID**
   - What we know: `expo-notifications` requires the EAS `projectId`
   - What's unclear: Whether an EAS project exists for Nozar; if not, `eas init` is required
   - Recommendation: Run `eas init` in `apps/mobile/` during Wave 0 to get the project ID

5. **tRPC AppRouter type sharing approach**
   - What we know: Type-only imports are erased by TypeScript; Metro only bundles runtime
   - What's unclear: Whether Metro's resolver in practice follows type-only imports and pulls server deps
   - Recommendation: Validate in Wave 1 by checking the mobile bundle output; create a types-only shim in `packages/shared` if Metro is overly aggressive

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Turborepo + web app | ✓ | (current) | — |
| npm | Workspace management | ✓ | (current) | — |
| EAS CLI | Expo builds + push setup | ❓ | Unknown | Install: `npm install -g eas-cli` |
| Expo Go app | Dev testing on device | ❓ | Unknown | Use iOS/Android simulator |
| Google Maps API key (Android) | react-native-maps | ❓ | Unknown (need mobile-specific key) | Cannot fall back; required for map screen |
| Google Maps API key (iOS) | react-native-maps | ❓ | Unknown (need mobile-specific key) | Cannot fall back; required for map screen |
| EAS Project | expo-notifications + EAS Build | ❓ | Unknown — need to run `eas init` | Cannot fall back; required for push |
| BKLIT account / SDK | Analytics (D-06) | ❓ | Unknown | Stub analytics calls until confirmed |

**Missing dependencies with no fallback:**
- Google Maps API keys for mobile (Android + iOS) — must be provisioned before map screen can be tested
- EAS project initialization — must run `eas init` before push notifications work

**Missing dependencies with fallback:**
- EAS CLI — install via npm; not blocking for development
- Expo Go — simulator is usable for most development except push notifications

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (web unit tests, already configured) + Playwright (web E2E) |
| Mobile testing | No mobile test framework established yet (Wave 0 gap) |
| Config file | `apps/web/vitest.config.ts` (after move) |
| Quick run (web) | `npm run test:unit` (from `apps/web/`) |
| Full suite (web) | `npm test` (Playwright E2E from `apps/web/`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Status |
|--------|----------|-----------|-------------------|--------|
| D-01/D-02/D-03 | Monorepo builds; shared package resolves | Build smoke | `turbo run build` | ❌ Wave 0 |
| D-09/D-10 | tRPC route returns 200 for valid query | Integration | `npm run test:unit` (tRPC route unit test) | ❌ Wave 0 |
| D-12 | Better Auth expo() plugin accepts Bearer token | Integration | Manual / API test | ❌ Wave 0 |
| D-17 | Push token stored in DB after registration | Unit | `npm run test:unit` | ❌ Wave 0 |
| D-21 | Deep link `nozar://billing/success` handled | Manual | Expo dev client | ❌ Manual |
| Existing | Web E2E tests continue passing after monorepo move | E2E | `npm test` (from `apps/web/`) | ✓ (existing) |

### Wave 0 Gaps

- [ ] `apps/web/app/lib/trpc/listings.server.test.ts` — unit tests for listings tRPC procedures
- [ ] `apps/web/app/lib/trpc/push.server.test.ts` — unit test for push token registration
- [ ] Confirm Playwright config works from `apps/web/` after monorepo move
- [ ] Establish mobile unit test framework (Vitest with `@testing-library/react-native` or Jest + Expo)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Better Auth `expo()` plugin; Bearer tokens in expo-secure-store |
| V3 Session Management | Yes | Token expiry + refresh via Better Auth; hardware-backed storage |
| V4 Access Control | Yes | `protectedProcedure` middleware in tRPC; all data endpoints require valid session |
| V5 Input Validation | Yes | Zod schemas on all tRPC procedure inputs |
| V6 Cryptography | Partial | expo-secure-store uses hardware crypto; no custom crypto needed |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token theft from AsyncStorage | Information disclosure | Use expo-secure-store (hardware-backed), never AsyncStorage for auth tokens |
| Man-in-the-middle API calls | Tampering | HTTPS enforced; React Native rejects HTTP in production |
| Replay attack on tRPC mutations | Tampering | Better Auth token expiry + rotation; short-lived sessions |
| Expo push token spoofing | Elevation of privilege | Validate token starts with `ExponentPushToken[` before storing; tokens are user-scoped |
| Deep link hijacking | Spoofing | Use `openAuthSessionAsync` not `openBrowserAsync`; the former enforces redirect URL matching |
| Server modules bundled in mobile app | Information disclosure | `import type` only for AppRouter; validate Metro bundle doesn't contain Drizzle/Neon |
| Hardcoded API keys in app.config.js | Information disclosure | All API keys via EAS secrets + environment variables; never in source |

---

## Sources

### Primary (HIGH confidence)
- npm registry — turbo@2.9.14, expo@56.0.5, expo-router@56.2.7, nativewind@4.2.4, better-auth@1.6.11, @trpc/server@11.17.0, @trpc/react-query@11.17.0, @tanstack/react-query@5.100.14, react-native-maps@1.27.2, expo-notifications@56.0.14, expo-secure-store@56.0.4, expo-server-sdk@6.1.0, @microsoft/fetch-event-source@2.0.1, react-native-event-source@1.1.0 [VERIFIED]
- npm 404 errors — confirmed `react-native-reusables` NOT on npm; `@azure/fetch-event-source` NOT on npm [VERIFIED]
- Codebase inspection — `auth.server.ts`, `schema.ts`, `types.ts`, `tier-limits.ts`, `regions.ts`, `utils.ts`, `package.json`, `tsconfig.json`, `react-router.config.ts`, `auth.client.ts` [VERIFIED]
- CONTEXT.md decisions D-01 through D-23 [VERIFIED]

### Secondary (MEDIUM confidence)
- Turborepo v2 `tasks` vs `pipeline` breaking change — well-documented community knowledge [ASSUMED]
- NativeWind v4 uses Tailwind CSS v3 internally — inferred from peer dependency `tailwindcss@^3.x` [VERIFIED via npm peerDependencies for nativewind@4.2.4]
- tRPC `fetchRequestHandler` adapter for React Router v7 — standard adapter documented in tRPC docs [ASSUMED]

### Tertiary (LOW confidence)
- Better Auth `expo()` plugin API (`expo()`, `expoClient()`, options) — based on training knowledge of better-auth@1.x expo integration [ASSUMED — verify against https://www.better-auth.com/docs/integrations/expo]
- React Native Reusables CLI commands and component list — based on training knowledge of the project [ASSUMED — verify at https://reactnativereusables.com/]
- BKLIT React Native SDK — not researched; LOW confidence on existence [ASSUMED — must consult https://ui.bklit.com/]
- Metro monorepo configuration pattern — standard Expo monorepo docs pattern [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack (versions): HIGH — npm registry verified
- Package name corrections (@azure vs @microsoft; react-native-reusables): HIGH — npm 404 verified
- Architecture patterns (monorepo, tRPC mount, metro config): MEDIUM — training knowledge, standard patterns
- Better Auth Expo plugin API details: LOW-MEDIUM — training knowledge; must validate against current docs
- BKLIT analytics integration: LOW — no npm package found; needs docs consultation

**Research date:** 2026-05-26
**Valid until:** 2026-07-01 (Expo SDK releases every ~3 months; better-auth is actively versioned)
