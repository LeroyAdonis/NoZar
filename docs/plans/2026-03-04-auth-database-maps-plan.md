# NoZar Backend Buildout — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Status:** Active — authoritative backend source of truth
**Supersedes:** Phase 4 and overlapping backend/map decisions in `docs/plans/2026-03-04-nozar-implementation-plan.md`

**Goal:** Wire every dashboard page to a real Neon PostgreSQL backend with Drizzle ORM, add Better Auth (email/password + Google OAuth), replace all mock data, and implement interactive Google Maps + Gemini AI features.

**Architecture:** React Router v7 SSR app (Vite + TypeScript strict). Routes export `loader`/`action` for server-side data, default export for components. Better Auth handles auth via a catch-all API route; a `requireAuth` helper protects dashboard loaders. Drizzle ORM connects to Neon serverless PostgreSQL via `drizzle-orm/neon-http`. Google Maps loads client-side via `@googlemaps/js-api-loader`; Gemini AI calls are server-side only (in loaders/actions).

**Tech Stack:** React Router v7.12, React 19, Drizzle ORM + Neon serverless, Better Auth, Google Maps JS API, Google Gemini SDK, Tailwind CSS v4, TypeScript 5.9 (strict + verbatimModuleSyntax)

**Design Document:** `docs/plans/2026-03-04-auth-database-maps-design.md`

---

## Reconciliation Decisions

This document is the authoritative implementation plan for NoZar backend work. When it conflicts with `docs/plans/2026-03-04-nozar-implementation-plan.md`, this plan wins.

1. **Auth scope winner:** Better Auth with **email/password + Google OAuth** is the baseline sign-in scope. Phone verification remains a **post-authenticated profile trust step** at `/dashboard/verify-phone`, backed by `profiles.phone`, `profiles.phone_verified`, and `app/lib/otp.server.ts`. It is **not** a Better Auth credential provider and **not** a prerequisite to initial sign-in.
2. **Schema winner:** The live `app/lib/schema.ts` file is authoritative for table/column shape. For MVP, keep Better Auth plural tables, keep `profiles.displayName` as the canonical profile-facing name while `users.name` remains the auth/account name, keep category as `listings.category` instead of introducing a standalone `categories` table, and keep `trade_items` alongside `trades.listingId` so structured barter offers can coexist with the anchor listing record.
3. **Map stack winner:** Google Maps JS API remains the selected map stack for the authenticated product. Later planning should extend the existing Google Maps implementation rather than re-open Leaflet/Mapbox for MVP.
4. **Migration workflow winner:** Use `drizzle-kit generate` + `drizzle-kit migrate` as the shared workflow. Do not use `drizzle-kit push` for the authoritative backend path.

---

## Conventions (Read First)

These rules apply to EVERY task in this plan:

1. **Route type imports:** `import type { Route } from "./+types/<routeName>";` — provides `Route.LoaderArgs`, `Route.ActionArgs`, `Route.MetaArgs`, `Route.ComponentProps`
2. **Type-only imports:** Always use `import type { ... }` for types (TypeScript `verbatimModuleSyntax` is enabled)
3. **Server-only files:** Use `.server.ts` suffix — React Router v7 excludes these from the client bundle
4. **Client components:** Use `"use client"` directive ONLY for components that never run on the server (e.g., map component). Routes with `loader`/`action` MUST NOT have `"use client"` at the top
5. **Path alias:** `~/` maps to `./app/`
6. **Dark theme tokens:** `#030712` (bg), `#0F172A` (surface), `emerald-500` (accent), `cyan-500` (secondary) — see `app/app.css` for design tokens
7. **Existing UI components:** `Button`, `Input`, `Card`, `Badge` in `app/components/ui/` — always prefer these over raw HTML
8. **Loader return:** Return plain objects from loaders (React Router v7 serializes automatically). Use `data()` from `react-router` only when you need to set status codes/headers
9. **Form submissions:** Use `<Form method="post">` from `react-router` + `action` function, or `authClient.signIn.email()` for Better Auth calls
10. **Redirect:** `import { redirect } from "react-router"` — throw it from loaders/actions

---

## Stream 1: Infrastructure Foundation

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install production dependencies**

Run:
```bash
npm install drizzle-orm @neondatabase/serverless better-auth @google/generative-ai @googlemaps/js-api-loader
```
Expected: Packages added to `dependencies` in `package.json`.

**Step 2: Install dev dependencies**

Run:
```bash
npm install -D drizzle-kit dotenv
```
Expected: Packages added to `devDependencies`.

**Step 3: Verify installation**

Run:
```bash
npm ls drizzle-orm @neondatabase/serverless better-auth @google/generative-ai @googlemaps/js-api-loader drizzle-kit dotenv
```
Expected: All packages listed without errors.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install backend dependencies (drizzle, better-auth, maps, gemini)"
```

---

### Task 2: Create Environment File

**Files:**
- Create: `.env`

**Step 1: Create `.env` with all required variables**

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@YOUR_HOST.neon.tech/neondb?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=GENERATE_A_RANDOM_32_CHAR_STRING_HERE
BETTER_AUTH_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# Google Maps
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY

# Gemini AI
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

**Step 2: Verify `.env` is in `.gitignore`**

Open `.gitignore` and confirm `.env` is listed (it already is — line 2).

> **Important:** Replace the placeholder values with real credentials before running the app. Do NOT commit `.env` to git.

---

### Task 3: Create Database Connection

**Files:**
- Create: `app/lib/db.server.ts`

**Step 1: Create the Neon + Drizzle connection**

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
```

> **Note:** The `.server.ts` suffix ensures this file is never bundled into the client. Neon's HTTP driver is ideal for serverless/SSR — each query is a single HTTP request, no persistent connection pool needed.

---

### Task 4: Create Database Schema

**Files:**
- Create: `app/lib/schema.ts`

**Step 1: Define the full schema**

This file defines ALL tables — both Better Auth managed tables AND NoZar app tables. Better Auth requires specific table/column names. We use `usePlural: true` in the adapter, so table names are plural. Start from the live `app/lib/schema.ts` in this repository and keep this plan aligned to that file rather than re-deriving schema from older design docs.

```ts
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";

// ─── Better Auth Managed Tables ────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ─── NoZar App Tables ──────────────────────────────────────────

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  suburb: text("suburb"),
  city: text("city"),
  province: text("province"),
  lat: real("lat"),
  lng: real("lng"),
  searchRadiusKm: integer("search_radius_km").notNull().default(10),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  estimatedValueZar: integer("estimated_value_zar"),
  condition: text("condition"),
  deliveryMethod: text("delivery_method"),
  seekingDescription: text("seeking_description"),
  type: text("type").notNull().default("item"), // "item" | "service"
  status: text("status").notNull().default("active"), // "active" | "paused" | "traded"
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const listingImages = pgTable("listing_images", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  blurHash: text("blur_hash"),
  order: integer("order").notNull().default(0),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  initiatorId: text("initiator_id")
    .notNull()
    .references(() => users.id),
  responderId: text("responder_id")
    .notNull()
    .references(() => users.id),
  listingId: integer("listing_id")
    .notNull()
    .references(() => listings.id),
  status: text("status").notNull().default("proposed"),
  // Status values: proposed → negotiating → agreed → contact_shared → completed
  // Also: cancelled, disputed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id),
  text: text("text").notNull(),
  type: text("type").notNull().default("text"), // "text" | "offer" | "system"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id),
  raterId: text("rater_id")
    .notNull()
    .references(() => users.id),
  rateeId: text("ratee_id")
    .notNull()
    .references(() => users.id),
  score: integer("score").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contactDisclosures = pgTable("contact_disclosures", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  disclosedFields: jsonb("disclosed_fields").notNull(), // e.g. { phone: "...", email: "..." }
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

> **Note:** Better Auth column names (like `email_verified`, `provider_id`, `account_id`) must match exactly what Better Auth expects. The schema above follows the Better Auth Drizzle adapter conventions. If you encounter column name mismatches, run `npx @better-auth/cli generate` to see what Better Auth expects.

> **Authority note:** The code sample above is illustrative, but the repository's `app/lib/schema.ts` is the final authority. That means:
> - `users`, `sessions`, `accounts`, and `verifications` stay aligned to Better Auth's plural-table Drizzle adapter shape.
> - `profiles.displayName` is the canonical profile display label; `users.name` remains the account/auth name.
> - `listings.category` stays inline for MVP; do **not** add a separate `categories` table unless a later plan explicitly reintroduces it.
> - `trade_items` stays in scope for structured barter offers, even though `trades.listingId` remains the anchor listing reference.
> - Phone verification lives on the profile (`phone`, `phoneVerified`) after sign-in rather than inside the auth credential surface.

---

### Task 5: Create Drizzle Config

**Files:**
- Create: `drizzle.config.ts`

**Step 1: Create drizzle.config.ts at project root**

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

### Task 6: Generate and Apply Initial Migration

**Step 1: Generate the initial migration**

Run:
```bash
npx drizzle-kit generate
```
Expected: A SQL migration is created under `drizzle/` from the current `app/lib/schema.ts`.

**Step 2: Apply the migration**

Run:
```bash
npx drizzle-kit migrate
```
Expected: The generated migration is applied to Neon and all planned tables exist.

**Step 3: Verify in Drizzle Studio (optional)**

Run:
```bash
npx drizzle-kit studio
```
Expected: Opens Drizzle Studio at `https://local.drizzle.studio`. Verify the Better Auth tables plus the current NoZar application tables from `app/lib/schema.ts`, including core MVP tables such as `profiles`, `listings`, `listing_images`, `trades`, `trade_items`, `messages`, `ratings`, and `contact_disclosures`.

**Step 4: Commit**

```bash
git add app/lib/db.server.ts app/lib/schema.ts drizzle.config.ts drizzle
git commit -m "feat: add Neon PostgreSQL schema with Drizzle ORM

- db.server.ts: Neon HTTP connection + Drizzle instance
- schema.ts: Better Auth tables + NoZar application tables
- drizzle.config.ts: migration config
- drizzle/: generated SQL migrations"
```

> **Warning:** Do NOT commit `.env` with real credentials. The `.gitignore` already excludes `.env`. If you staged it by accident, unstage it before committing.

---

## Stream 2: Authentication

### Task 7: Create Better Auth Server Instance

**Files:**
- Create: `app/lib/auth.server.ts`

**Step 1: Create the auth server config + requireAuth helper**

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { redirect } from "react-router";
import { db } from "./db.server";
import * as schema from "./schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
});

/**
 * Require authentication in a loader/action.
 * Returns { user, session } if authenticated.
 * Throws redirect("/login") if not.
 */
export async function requireAuth(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    throw redirect("/login");
  }

  return session;
}

/**
 * Optional auth check — returns session or null.
 * Use for pages that show different content based on auth state (e.g., landing page).
 */
export async function getOptionalSession(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  return session;
}
```

> **Auth scope note:** Keep sign-in limited to Better Auth email/password plus Google OAuth. Phone verification should reuse the authenticated profile flow (`/dashboard/verify-phone`) and `app/lib/otp.server.ts`; do not fold Africa's Talking OTP into the primary Better Auth credential surface.

---

### Task 8: Create Better Auth Client Instance

**Files:**
- Create: `app/lib/auth.client.ts`

**Step 1: Create the client auth instance**

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

> **Note:** Import from `better-auth/react` (not `better-auth/client`) for React hooks support. No configuration needed — it auto-discovers `/api/auth` endpoint on the same origin.

---

### Task 9: Create Auth API Catch-All Route

**Files:**
- Create: `app/routes/api.auth.$.ts`

**Step 1: Create the catch-all resource route**

This route forwards ALL `/api/auth/*` requests to Better Auth's handler. It handles login, signup, session, OAuth callbacks, etc.

```ts
import type { Route } from "./+types/api.auth.$";
import { auth } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  return auth.handler(request);
}

export async function action({ request }: Route.ActionArgs) {
  return auth.handler(request);
}
```

> **Important:** This is a resource route (no default export component). It only exports `loader` and `action`.

---

### Task 10: Create Login Page

**Files:**
- Create: `app/routes/login.tsx`

**Step 1: Create the login route with loader + component**

The loader redirects to `/dashboard` if already logged in. The component is a client-rendered form that calls `authClient.signIn.email()` and `authClient.signIn.social()`.

```tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/login";
import { getOptionalSession } from "~/lib/auth.server";
import { authClient } from "~/lib/auth.client";
import { redirect } from "react-router";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Repeat } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalSession(request);
  if (session) {
    throw redirect("/dashboard");
  }
  return {};
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login — Nozar" },
    { name: "description", content: "Sign in to your Nozar account" },
  ];
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => {
          navigate("/dashboard");
        },
        onError: (ctx) => {
          setError(ctx.error.message ?? "Invalid credentials");
          setLoading(false);
        },
      },
    );
  };

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 transition-all">
              <Repeat className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">
            Sign In
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Access your barter network
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono text-center">
            {error}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Button
            type="submit"
            variant="nozar"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Or
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google OAuth */}
        <Button
          variant="nozarOutline"
          size="lg"
          className="w-full"
          onClick={handleGoogleSignIn}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Register link */}
        <p className="text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

### Task 11: Create Register Page

**Files:**
- Create: `app/routes/register.tsx`

**Step 1: Create the registration route**

Same pattern as login — loader redirects if already authenticated, component uses `authClient.signUp.email()`.

```tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/register";
import { getOptionalSession } from "~/lib/auth.server";
import { authClient } from "~/lib/auth.client";
import { redirect } from "react-router";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Repeat } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalSession(request);
  if (session) {
    throw redirect("/dashboard");
  }
  return {};
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Register — Nozar" },
    { name: "description", content: "Create your Nozar account" },
  ];
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await authClient.signUp.email(
      { email, password, name },
      {
        onSuccess: () => {
          navigate("/dashboard");
        },
        onError: (ctx) => {
          setError(ctx.error.message ?? "Registration failed");
          setLoading(false);
        },
      },
    );
  };

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 transition-all">
              <Repeat className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">
            Create Account
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Join the barter network
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono text-center">
            {error}
          </div>
        )}

        {/* Sign-Up Form */}
        <form onSubmit={handleSignUp} className="space-y-4">
          <Input
            label="Display Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Zanele A."
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            minLength={8}
            required
          />
          <Button
            type="submit"
            variant="nozar"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Or
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google OAuth */}
        <Button
          variant="nozarOutline"
          size="lg"
          className="w-full"
          onClick={handleGoogleSignIn}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </Button>

        {/* Login link */}
        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

### Task 12: Update Route Config

**Files:**
- Modify: `app/routes.ts`

**Step 1: Add login, register, and api/auth routes**

Add three new routes to the routes config. The `api.auth.$` route uses a splat (`*`) to catch all `/api/auth/*` paths.

The updated `routes.ts` should be:

```ts
import {
  type RouteConfig,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/landing.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),
  route("dashboard", "routes/dashboard.tsx", [
    index("routes/dashboard/home.tsx"),
    route("asset/:id", "routes/dashboard/asset.$id.tsx"),
    route("pings", "routes/dashboard/pings.tsx"),
    route("pings/:id", "routes/dashboard/pings.$id.tsx"),
    route("map", "routes/dashboard/map.tsx"),
    route("add", "routes/dashboard/add.tsx"),
    route("profile", "routes/dashboard/profile.tsx"),
  ]),
  route("legal", "routes/legal.tsx", [
    route("terms", "routes/legal/terms.tsx"),
    route("privacy", "routes/legal/privacy.tsx"),
    route("community-guidelines", "routes/legal/community-guidelines.tsx"),
    route("complaints", "routes/legal/complaints.tsx"),
  ]),
] satisfies RouteConfig;
```

**Step 2: Generate route types**

Run:
```bash
npx react-router typegen
```
Expected: Types generated for new routes in `.react-router/types/`.

---

### Task 13: Wire Dashboard Layout with Auth

**Files:**
- Modify: `app/routes/dashboard.tsx`

**Step 1: Add loader with requireAuth and replace hardcoded user**

Key changes:
1. **Remove** `"use client"` from line 1 (needed for loader to work server-side)
2. **Add** a `loader` that calls `requireAuth(request)` and returns user data
3. **Replace** hardcoded "Zanele A." with `loaderData.user.name`
4. **Replace** hardcoded "Node Verified" with dynamic verification status
5. **Add** logout functionality via settings button

The component signature changes from `DashboardLayout()` to `DashboardLayout({ loaderData }: Route.ComponentProps)` to receive the typed loader data.

```tsx
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { Bell, Repeat, Settings, ShieldCheck, LogOut } from "lucide-react";
import type { Route } from "./+types/dashboard";
import { requireAuth } from "~/lib/auth.server";
import { BottomNav } from "~/components/ui/bottom-nav";

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  return { user };
}

function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/dashboard/map")) return "map";
  if (pathname.startsWith("/dashboard/add")) return "add";
  if (pathname.startsWith("/dashboard/pings")) return "messages";
  if (pathname.startsWith("/dashboard/profile")) return "profile";
  return "home";
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);
  const { user } = loaderData;

  // Get initials for display
  const displayName = user.name ?? "User";

  return (
    <div className="min-h-screen bg-[#030712] text-slate-50 font-sans pb-28 selection:bg-emerald-500/30">
      {/* Ambient background glow */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[30%] rounded-full bg-emerald-900/10 blur-[120px]" />
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-[#030712]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 group cursor-pointer text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-300">
            <Repeat className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
          </div>
          <span className="hidden sm:block font-black text-xl tracking-tighter uppercase text-white group-hover:text-emerald-400 transition-colors">
            NoZar.
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-right">
            <div>
              <h1 className="font-bold text-sm leading-tight text-white">
                {displayName}
              </h1>
              <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-mono text-[10px] uppercase tracking-widest mt-0.5">
                <ShieldCheck className="w-3 h-3" />
                <span>{user.emailVerified ? "Verified" : "Unverified"}</span>
              </div>
            </div>
          </div>

          <button className="relative w-10 h-10 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors">
            <Bell className="w-5 h-5 text-slate-400" />
          </button>

          <Link
            to="/dashboard/profile"
            className="w-10 h-10 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors"
          >
            <Settings className="w-5 h-5 text-slate-400" />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 p-6 max-w-2xl mx-auto">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav activeTab={activeTab} />
    </div>
  );
}
```

**Step 2: Verify auth flow**

Run:
```bash
npm run dev
```
Expected: Navigating to `/dashboard` redirects to `/login`. After signing up/in, you reach the dashboard and see your display name in the header.

**Step 3: Commit**

```bash
git add app/lib/auth.server.ts app/lib/auth.client.ts app/routes/api.auth.$.ts app/routes/login.tsx app/routes/register.tsx app/routes.ts app/routes/dashboard.tsx
git commit -m "feat: add Better Auth authentication

- auth.server.ts: Better Auth config with Drizzle adapter, requireAuth helper
- auth.client.ts: Client-side auth instance
- api.auth.$.ts: Catch-all API route for Better Auth
- login.tsx: Email/password + Google OAuth login page
- register.tsx: Registration page
- dashboard.tsx: Protected layout with real user data in header
- routes.ts: Added login, register, api/auth routes"
```

---

## Stream 3: Dashboard Wiring

### Task 14: Align Types with Database Schema

**Files:**
- Modify: `app/lib/types.ts`

**Step 1: Update types to reflect DB schema**

Replace the mock-oriented types with types inferred from Drizzle schema. Keep backward-compatible aliases where components still use the old types.

```ts
import type { InferSelectModel } from "drizzle-orm";
import type {
  users,
  profiles,
  listings,
  listingImages,
  trades,
  messages,
  ratings,
} from "./schema";

// ─── Drizzle-inferred types ─────────────────────────────────

export type User = InferSelectModel<typeof users>;
export type Profile = InferSelectModel<typeof profiles>;
export type Listing = InferSelectModel<typeof listings>;
export type ListingImage = InferSelectModel<typeof listingImages>;
export type Trade = InferSelectModel<typeof trades>;
export type Message = InferSelectModel<typeof messages>;
export type Rating = InferSelectModel<typeof ratings>;

// ─── View models for components ─────────────────────────────

/** Listing card data as displayed in the feed */
export type ListingCard = {
  id: number;
  title: string;
  description: string;
  seekingDescription: string | null;
  category: string;
  type: string;
  estimatedValueZar: number | null;
  condition: string | null;
  distance: string; // computed from lat/lng, e.g. "2.4km"
  timeAgo: string; // computed from createdAt
  userName: string;
  isVerified: boolean;
  imageUrl: string | null;
};

/** Trade thread as displayed in pings list */
export type TradeThread = {
  id: number;
  counterpartyName: string;
  listingTitle: string;
  status: string;
  unread: boolean;
  lastMessage: string | null;
  lastMessageTime: string | null;
  timeAgo: string;
};

/** Trade detail for chat view */
export type TradeDetail = {
  trade: Trade;
  listing: Listing;
  counterparty: { name: string; image: string | null; emailVerified: boolean };
  messages: Message[];
};

/** Handshake stage — matches trade status progression */
export type HandshakeStage =
  | "proposed"
  | "negotiating"
  | "agreed"
  | "contact_shared"
  | "completed"
  | "cancelled"
  | "disputed";
```

---

### Task 15: Wire Home Feed with Real Data

**Files:**
- Modify: `app/routes/dashboard/home.tsx`

**Step 1: Replace mock data with loader**

Key changes:
1. **Remove** `"use client"` from line 1
2. **Remove** import of `MOCK_ASSETS`
3. **Add** `loader` that queries `listings` table, joins with `users` for owner info
4. **Add** URL search param support for category filtering (server-side)
5. **Update** component to use `loaderData` instead of `MOCK_ASSETS`
6. **Update** `AssetCard` usage to match new data shape (or adapt the card component)

The loader should:
- Query `listings` with `status = 'active'`, ordered by `createdAt DESC`
- Join `users` table on `listings.userId` to get owner name and verification status
- Left join `listingImages` to get the first image
- Accept `?category=` search param for filtering
- Return `{ listings: ListingCard[] }`

Compute `distance` as a placeholder string (e.g., "~5km") since we don't have the user's location yet. In Stream 4, we'll replace this with real Haversine calculation when the user has a profile with lat/lng.

Compute `timeAgo` from `createdAt` using a simple relative time helper (create a utility `app/lib/utils.ts` with a `timeAgo(date: Date): string` function).

The `AssetCard` component currently expects the old `Asset` type. Either:
- **(Option A)** Update `AssetCard` to accept `ListingCard` props — **preferred**
- **(Option B)** Map the loader data to match the old `Asset` shape

**Prefer Option A:** Update `AssetCard` to accept the new type. This means also updating `app/components/ui/asset-card.tsx`.

**New utility file** `app/lib/utils.ts`:

```ts
/**
 * Compute a human-readable relative time string.
 */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Haversine distance between two lat/lng points in km.
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Format distance for display.
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}
```

**Updated loader pattern** for `home.tsx`:

```ts
import { eq, desc } from "drizzle-orm";
import type { Route } from "./+types/home";
import { db } from "~/lib/db.server";
import { listings, users, listingImages } from "~/lib/schema";
import { timeAgo } from "~/lib/utils";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");

  let query = db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      seekingDescription: listings.seekingDescription,
      category: listings.category,
      type: listings.type,
      estimatedValueZar: listings.estimatedValueZar,
      condition: listings.condition,
      lat: listings.lat,
      lng: listings.lng,
      createdAt: listings.createdAt,
      userName: users.name,
      isVerified: users.emailVerified,
    })
    .from(listings)
    .innerJoin(users, eq(listings.userId, users.id))
    .where(eq(listings.status, "active"))
    .orderBy(desc(listings.createdAt))
    .limit(20);

  // Apply category filter if provided (Drizzle doesn't support conditional .where chaining easily,
  // so build conditions array)
  // NOTE: For category filtering, use Drizzle's `and()` to combine conditions.

  const rows = await query;

  const items = rows
    .filter((r) => !category || category === "All" || r.category === category)
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      seekingDescription: r.seekingDescription,
      category: r.category,
      type: r.type,
      estimatedValueZar: r.estimatedValueZar,
      condition: r.condition,
      distance: "~5km", // placeholder until user profile has lat/lng
      timeAgo: timeAgo(new Date(r.createdAt)),
      userName: r.userName,
      isVerified: r.isVerified,
      imageUrl: null, // images loaded separately or joined
    }));

  return { listings: items };
}
```

**Updated component** uses `loaderData.listings` and filters via URL search params (using `useSearchParams` from `react-router`). Category pills now link to `?category=Electronics` etc. instead of local state.

Update `AssetCard` to accept the `ListingCard` shape (modify `app/components/ui/asset-card.tsx`).

---

### Task 16: Wire Asset Detail with Loader + Action

**Files:**
- Modify: `app/routes/dashboard/asset.$id.tsx`

**Step 1: Replace mock data with loader + add ping action**

Key changes:
1. **Remove** `"use client"` from line 1
2. **Remove** import of `MOCK_ASSETS`
3. **Add** `loader` that fetches a single listing by `params.id` + owner info
4. **Add** `action` for the "Initialize Ping" button — creates a `trade` record + initial message, redirects to the chat
5. **Use** `loaderData` in component instead of `MOCK_ASSETS.find()`
6. **Return** 404 (throw `data(null, { status: 404 })`) if listing not found

The loader queries:
- `listings` by `id` where `status = 'active'`
- Join `users` for owner info
- Left join `listingImages` for images

The action:
- Requires auth (call `requireAuth(request)`)
- Gets the listing ID from params
- Creates a new `trade` record: `{ initiatorId: user.id, responderId: listing.userId, listingId, status: "proposed" }`
- Creates an initial system message: `"Trade initiated by {user.name}"`
- Redirects to `/dashboard/pings/{tradeId}`

---

### Task 17: Build Add Asset Form

**Files:**
- Modify: `app/routes/dashboard/add.tsx`

**Step 1: Replace "Coming Soon" stub with full form + action**

This is a full rewrite. The form includes:
- Title (text input)
- Description (textarea)
- Type toggle: Item / Service
- Category dropdown: Electronics, Home & Garden, Fashion, Skills, Vehicles, Sports, Books, Services
- Estimated Value (ZAR number input)
- Condition dropdown: New, Like New, Good, Fair, Poor (hidden for services)
- Delivery method: Pickup, Delivery, Either
- Seeking description (textarea — "What are you looking for in exchange?")
- Submit button

The `action`:
- Calls `requireAuth(request)` to get the user
- Parses `formData` from the request
- Validates required fields (title, description, category, type)
- Inserts into `listings` table
- Redirects to `/dashboard/asset/{newId}` or `/dashboard`

Use the existing `Input` and `Button` components. Create a `Textarea` component or use raw `<textarea>` styled with NoZar tokens.

> **Note:** AI-assisted description and smart location suggestions are added in Stream 4 (Tasks 24-25).

---

### Task 18: Build Profile Page

**Files:**
- Modify: `app/routes/dashboard/profile.tsx`

**Step 1: Replace "Coming Soon" stub with real profile page**

The `loader`:
- Calls `requireAuth(request)` to get the user
- Queries `profiles` for user profile (create if doesn't exist)
- Queries `trades` for trade count and completed count
- Queries `ratings` for average score
- Queries `listings` for user's active listings
- Returns `{ user, profile, stats: { tradeCount, completedCount, avgRating }, listings }`

The `action` handles two intents via hidden `<input name="intent">`:
- `"updateProfile"` — updates display name, bio, suburb, city, province
- `"logout"` — calls `auth.api.signOut()` and redirects to `/`

The component displays:
- Profile card with avatar, display name, bio
- Stats grid: total trades, completed trades, average rating
- Verification badges
- User's active listings
- Edit form (toggled with state)
- Logout button

---

### Task 19: Wire Pings List with Real Data

**Files:**
- Modify: `app/routes/dashboard/pings.tsx`

**Step 1: Replace mock data with loader**

Key changes:
1. **Remove** import of `MOCK_PINGS`
2. **Add** `loader` that queries trades where user is participant
3. **Update** component to use `loaderData`

The loader:
- Calls `requireAuth(request)` to get the user
- Queries `trades` where `initiatorId = user.id OR responderId = user.id`
- Joins `users` to get counterparty name
- Joins `listings` to get listing title
- Left joins `messages` to get the latest message per trade (subquery or order + limit)
- Orders by most recent activity
- Returns `{ threads: TradeThread[] }`

Update `PingThread` component (`app/components/ui/ping-thread.tsx`) to accept `TradeThread` instead of `Ping`.

---

### Task 20: Wire Chat + Handshake with Real Data

**Files:**
- Modify: `app/routes/dashboard/pings.$id.tsx`

**Step 1: Replace mock data with loader + add message/state actions**

This is a substantial rewrite. Key changes:
1. **Remove** all `useState` for messages and handshake stage
2. **Add** `loader` that fetches trade + messages + counterparty
3. **Add** `action` with multiple intents:
   - `"sendMessage"` — inserts into `messages` table
   - `"proposeHandshake"` — updates trade status to `negotiating`, inserts system message
   - `"acceptHandshake"` — updates trade status to `agreed`, inserts system message
   - `"shareContact"` — updates trade status to `contact_shared`, creates `contact_disclosures` record
   - `"completeTrade"` — updates trade status to `completed`

The loader:
- Calls `requireAuth(request)` to get the user
- Fetches trade by `params.id` — verify user is a participant (else 403)
- Fetches all messages for this trade
- Fetches counterparty profile
- Returns `{ trade, messages, counterparty, listing, currentUserId }`

The component:
- Uses `loaderData` for initial render
- Uses `<Form method="post">` with hidden intent fields for actions
- Chat messages render from `loaderData.messages`
- Handshake stage derived from `trade.status`
- Client-side polling (see Task 21) for new messages

---

### Task 21: Create Message Polling Resource Route

**Files:**
- Create: `app/routes/api.messages.$tradeId.ts`
- Modify: `app/routes.ts` (add route)

**Step 1: Create the resource route**

```ts
import type { Route } from "./+types/api.messages.$tradeId";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { messages, trades } from "~/lib/schema";
import { eq, and, gt } from "drizzle-orm";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const tradeId = Number(params.tradeId);

  // Verify user is a participant in this trade
  const trade = await db
    .select()
    .from(trades)
    .where(eq(trades.id, tradeId))
    .limit(1);

  if (
    !trade[0] ||
    (trade[0].initiatorId !== user.id && trade[0].responderId !== user.id)
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  // Get messages since timestamp (from search params)
  const url = new URL(request.url);
  const since = url.searchParams.get("since");

  let query;
  if (since) {
    query = db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.tradeId, tradeId),
          gt(messages.createdAt, new Date(since)),
        ),
      )
      .orderBy(messages.createdAt);
  } else {
    query = db
      .select()
      .from(messages)
      .where(eq(messages.tradeId, tradeId))
      .orderBy(messages.createdAt);
  }

  const msgs = await query;
  return Response.json(msgs);
}
```

**Step 2: Add route to config**

In `app/routes.ts`, add after the `api/auth/*` route:

```ts
route("api/messages/:tradeId", "routes/api.messages.$tradeId.ts"),
```

**Step 3: Client-side polling in pings.$id.tsx**

Add a `useEffect` in the chat component that polls every 5 seconds:

```ts
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch(
      `/api/messages/${tradeId}?since=${lastMessageTime}`,
    );
    if (res.ok) {
      const newMsgs = await res.json();
      if (newMsgs.length > 0) {
        // Update messages state or use router.revalidate()
      }
    }
  }, 5000);
  return () => clearInterval(interval);
}, [tradeId, lastMessageTime]);
```

> **Note:** For MVP, simple polling is fine. SSE (Server-Sent Events) can be added post-MVP.

**Step 4: Commit Stream 3**

```bash
git add app/lib/types.ts app/lib/utils.ts app/routes/dashboard/ app/components/ui/ app/routes/api.messages.$tradeId.ts app/routes.ts
git commit -m "feat: wire all dashboard pages to real database

- types.ts: Drizzle-inferred types + view models
- utils.ts: timeAgo, haversine distance helpers
- home.tsx: Real listings from DB with category filtering
- asset.\$id.tsx: Real listing detail + ping action creates trade
- add.tsx: Full asset creation form with validation
- profile.tsx: Real profile, stats, edit form, logout
- pings.tsx: Real trade threads from DB
- pings.\$id.tsx: Real chat + trade state machine actions
- api.messages.\$tradeId.ts: Message polling resource route"
```

---

## Stream 4: Map + Gemini AI

### Task 22: Create Google Maps Client Component

**Files:**
- Create: `app/components/map/nozar-map.tsx`

**Step 1: Create the dark-styled map component**

This is a `"use client"` component that uses `@googlemaps/js-api-loader` to load Google Maps with a custom dark style matching the NoZar aesthetic.

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

type MapPin = {
  id: number;
  lat: number;
  lng: number;
  title: string;
  type: "item" | "service";
};

type NozarMapProps = {
  apiKey: string;
  pins: MapPin[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onPinClick?: (id: number) => void;
};

// Dark map style matching #030712 aesthetic
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0a0f1a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0f1a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a5568" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1a2332" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a5568" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#030712" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
];

// Default center: Johannesburg CBD
const JHB_CENTER = { lat: -26.2041, lng: 28.0473 };

export function NozarMap({
  apiKey,
  pins,
  center = JHB_CENTER,
  zoom = 12,
  onPinClick,
}: NozarMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const loader = new Loader({
      apiKey,
      version: "weekly",
    });

    loader
      .importLibrary("maps")
      .then(({ Map }) => {
        const map = new Map(mapRef.current!, {
          center,
          zoom,
          styles: DARK_MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        setMapInstance(map);
      })
      .catch((err) => {
        setError("Failed to load map");
        console.error("Google Maps load error:", err);
      });
  }, [apiKey]);

  // Add markers when map or pins change
  useEffect(() => {
    if (!mapInstance) return;

    pins.forEach((pin) => {
      const marker = new google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map: mapInstance,
        title: pin.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: pin.type === "service" ? "#06B6D4" : "#10B981",
          fillOpacity: 0.9,
          strokeColor: "#030712",
          strokeWeight: 2,
        },
      });

      if (onPinClick) {
        marker.addListener("click", () => onPinClick(pin.id));
      }
    });
  }, [mapInstance, pins, onPinClick]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#030712] text-slate-500 text-sm">
        {error}
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full" />;
}
```

---

### Task 23: Rewrite Map Route with Real Data

**Files:**
- Modify: `app/routes/dashboard/map.tsx`

**Step 1: Replace "Coming Soon" with real map page**

The `loader`:
- Calls `requireAuth(request)` for auth
- Queries `listings` with `status = 'active'` that have `lat` and `lng` values
- Returns `{ listings, apiKey: process.env.GOOGLE_MAPS_API_KEY }`

> **Security Note:** The Google Maps API key MUST be restricted to the Maps JavaScript API and specific HTTP referrers in Google Cloud Console. It's safe to send to the client — it's a browser-side key by design.

The component:
- Renders `NozarMap` full-screen within the dashboard layout
- Passes listing pins from `loaderData`
- Floating filter chips at top
- Click pin → navigate to `/dashboard/asset/{id}`
- "Recenter" button

---

### Task 24: Add Gemini AI to Add Asset Form

**Files:**
- Modify: `app/routes/dashboard/add.tsx`

**Step 1: Add AI description assistant**

Add an "AI Assist" button next to the description textarea. When clicked, it submits a form action with `intent: "aiDescription"`. The action:
- Takes the title, category, and any existing description
- Calls Gemini API server-side to generate a compelling 2-3 sentence description in SA English
- Returns the suggestion as `actionData.aiSuggestion`

The component shows the suggestion inline; user can accept/edit it.

**Gemini server-side call pattern:**

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function generateDescription(
  title: string,
  category: string,
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(
    `Write a compelling 2-3 sentence listing description for a South African barter platform.
     Item: "${title}" (Category: ${category}).
     Use natural SA English. Be specific about condition and value. Keep it concise.`,
  );
  return result.response.text();
}
```

**Step 2: Add smart location suggestions**

Add a "Suggest Safe Meetup Spots" button. When the user enters a suburb, the action calls Gemini to suggest 3 safe public meetup locations nearby (malls, police stations, community centres). Show suggestions as clickable chips.

---

### Task 25: Add Gemini Trade Matching to Home Feed (Optional)

**Files:**
- Modify: `app/routes/dashboard/home.tsx`

**Step 1: Add optional AI matching**

This is an enhancement — skip if time-constrained. Add an "AI Match" button that:
- Sends the user's listings + seeking descriptions to Gemini
- Ranks available listings by match quality
- Shows "AI Matched" badge on results

Rate limit: cache results for 5 minutes per user using a simple in-memory Map.

**Step 2: Commit Stream 4**

```bash
git add app/components/map/ app/routes/dashboard/map.tsx app/routes/dashboard/add.tsx app/routes/dashboard/home.tsx
git commit -m "feat: add Google Maps + Gemini AI features

- nozar-map.tsx: Dark-styled Google Maps client component
- map.tsx: Full interactive map with listing pins
- add.tsx: Gemini description assistant + location suggestions
- home.tsx: Optional AI trade matching"
```

---

## Stream 5: Seed Data & Verification

### Task 26: Create Seed Script

**Files:**
- Create: `scripts/seed.ts`

**Step 1: Create a seed script with realistic SA data**

The seed script creates:
- 3 users: Zanele (Sandton), Sipho (Soweto), Sarah (Braamfontein)
- Profiles for each with SA suburbs and lat/lng
- 6+ listings across different categories
- 2 active trades with messages

```ts
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../app/lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("🌱 Seeding NoZar database...");

  // Note: Better Auth manages user creation via its auth flow.
  // For seeding, we insert directly into the tables.
  // Password hashing must match Better Auth's format.
  // Alternative: use Better Auth's server API to create users.

  // 1. Create users using Better Auth's internal API
  //    OR insert directly with pre-hashed passwords.
  //    For simplicity, insert directly. Password = bcrypt hash of "password123"
  //    Better Auth uses scrypt by default, so we need to hash correctly.
  //    Safest approach: use auth.api.signUpEmail() server-side.

  // ... (full seed data with SA locations, realistic listings, trades, messages)

  console.log("✅ Seeding complete!");
}

seed().catch(console.error);
```

> **Important:** For password hashing, use Better Auth's `auth.api.signUpEmail()` to create seed users, OR hash passwords using the same algorithm Better Auth uses (scrypt by default). Do NOT use raw plaintext or a different hashing algorithm.

Run:
```bash
npx tsx scripts/seed.ts
```

---

### Task 27: Update Landing Page with Auth Check

**Files:**
- Modify: `app/routes/landing.tsx`

**Step 1: Add optional auth check in loader**

Add a `loader` that checks if the user is logged in. If yes, pass `isLoggedIn: true` to the component. The CTA button changes from "Get Started Free" to "Go to Dashboard".

```ts
import { getOptionalSession } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getOptionalSession(request);
  return { isLoggedIn: !!session };
}
```

In the hero section, conditionally render:
- If logged in: `<Link to="/dashboard">Go to Dashboard</Link>`
- If not logged in: `<Link to="/register">Get Started Free</Link>`

---

### Task 28: End-to-End Verification

**Step 1: Typecheck**

Run:
```bash
npx react-router typegen && npx tsc --noEmit
```
Expected: No type errors.

**Step 2: Build**

Run:
```bash
npm run build
```
Expected: Build succeeds with no errors.

**Step 3: Manual test flow**

Run:
```bash
npm run dev
```

Test sequence:
1. Visit `/` — see landing page, click "Get Started Free"
2. Register with email/password → redirects to `/dashboard`
3. See your name in header
4. Navigate to Add Asset → create a listing
5. Navigate to Home → see your listing in the feed
6. Navigate to Map → see your listing pin
7. Navigate to Profile → see your stats, edit profile
8. Logout → redirects to landing page
9. Login again → reaches dashboard
10. Visit `/` → see "Go to Dashboard" button

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete NoZar backend buildout

- Neon PostgreSQL + Drizzle ORM schema
- Better Auth (email/password + Google OAuth)
- All dashboard pages wired to real data
- Google Maps with dark styling
- Gemini AI description assistant
- Seed data script
- Landing page auth awareness"
```

---

## Edge Cases & Error Handling

- **No profile exists:** When a user first signs up, they won't have a `profiles` row. The dashboard and profile page should handle this gracefully — create a default profile on first access (use `INSERT ... ON CONFLICT DO NOTHING` or check-and-create in the profile loader).
- **Trade participant validation:** Every trade action (send message, change status) must verify the current user is either `initiatorId` or `responderId`. Return 403 otherwise.
- **Listing not found:** The `asset.$id.tsx` loader should return a 404 response if the listing doesn't exist or is not active.
- **Self-ping prevention:** The "Initialize Ping" action should check that the user isn't trying to trade with themselves.
- **Duplicate trade prevention:** Check if an active trade already exists between the same user pair for the same listing before creating a new one.
- **Race conditions in trade status:** Use optimistic locking or status preconditions in UPDATE queries (e.g., `UPDATE trades SET status = 'agreed' WHERE id = ? AND status = 'negotiating'`).
- **Empty states:** Every list page (home, pings, profile listings) should show appropriate empty states when no data exists.
- **Google Maps API key restriction:** The Maps API key is exposed to the browser (by design). Restrict it in Google Cloud Console to: Maps JavaScript API only, specific HTTP referrers (`localhost:5173` for dev, production domain for prod).
- **Gemini rate limiting:** Cache AI responses per user (5 min TTL). Handle API errors gracefully — show fallback UI if Gemini is unavailable.
- **Session expiry during chat:** If a session expires while the user is chatting, the next message send (action) will fail. The action should catch the redirect and the client should handle this gracefully.
- **Password requirements:** Better Auth enforces minimum password length. Display clear error messages on the registration form if validation fails.
- **Google OAuth callback:** Ensure `BETTER_AUTH_URL` matches the actual running URL. For dev, this is `http://localhost:5173`. The Google OAuth redirect URI in Google Cloud Console must be set to `{BETTER_AUTH_URL}/api/auth/callback/google`.

---

## Open Questions

1. **Image upload:** The schema includes `listing_images` but the plan doesn't cover file upload infrastructure. For MVP, listings can use placeholder images. Image upload (Cloudinary, S3, etc.) should be a separate task.
2. **Email verification flow:** Better Auth supports email verification but it requires an email sending service (Resend, SendGrid, etc.). For MVP, `emailVerified` defaults to `false` and doesn't block access. Enable email verification in a follow-up task.
3. **Google OAuth setup:** The user must create a Google Cloud project, enable the OAuth consent screen, and create OAuth 2.0 credentials. The redirect URI must be `http://localhost:5173/api/auth/callback/google`. This is a manual setup step outside the codebase.
4. **Neon database provisioning:** The user must have a Neon project with a database. The connection string goes in `.env`. If not yet provisioned, create one at `neon.tech`.

---

## Dependency Graph

```
Stream 1: [T1] → [T2] → [T3,T4,T5] → [T6]
Stream 2: [T6] → [T7,T8] → [T9] → [T10,T11] → [T12] → [T13]
Stream 3: [T13] → [T14] → [T15,T17,T18,T19] → [T16,T20] → [T21]
Stream 4: [T13] → [T22] → [T23] ; [T17] → [T24] ; [T15] → [T25]
Stream 5: [T6] → [T26] ; [T13] → [T27] ; [ALL] → [T28]
```
