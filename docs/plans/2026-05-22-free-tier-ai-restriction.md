# Free-Tier AI Restriction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent free-tier users from accessing AI features (description generation, smart matching, and AI chat), while keeping the AI meetup spot suggester open to all tiers.

**Architecture:** Central `canUseAiFeature(tier, feature)` helper lives in `tier-limits.ts`. Each restricted server action calls this helper before invoking AI — returning `{ error: "ai_tier_restricted" }` / HTTP 403 for free-tier users. Loaders expose `canUseAi*` booleans to the UI for upgrade prompts. The meetup feature in `pings.$id.tsx` is untouched.

**Tech Stack:** React Router v7 (SSR), Drizzle ORM / Neon, TypeScript strict mode, Vitest for unit tests.

---

## Task 1: Add AI feature-access map and helper to `tier-limits.ts`

**Files:**
- Modify: `app/lib/tier-limits.ts`
- Create: `app/lib/tier-limits.test.ts`

### Step 1: Write the failing unit test

Create `app/lib/tier-limits.test.ts`:

```ts
import { describe, test, expect } from "vitest";
import { canUseAiFeature } from "./tier-limits";

describe("canUseAiFeature", () => {
  test("free tier is blocked from ai_description", () => {
    expect(canUseAiFeature("free", "ai_description")).toBe(false);
  });
  test("free tier is blocked from ai_matching", () => {
    expect(canUseAiFeature("free", "ai_matching")).toBe(false);
  });
  test("free tier is blocked from ai_chat", () => {
    expect(canUseAiFeature("free", "ai_chat")).toBe(false);
  });
  test("null planCode defaults to free (blocked)", () => {
    expect(canUseAiFeature(null, "ai_description")).toBe(false);
  });
  test("plus tier can use ai_description", () => {
    expect(canUseAiFeature("plus", "ai_description")).toBe(true);
  });
  test("business tier can use ai_matching", () => {
    expect(canUseAiFeature("business", "ai_matching")).toBe(true);
  });
  test("enterprise tier can use ai_chat", () => {
    expect(canUseAiFeature("enterprise", "ai_chat")).toBe(true);
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm run test:unit
```

Expected: FAIL — `canUseAiFeature` is not exported from `tier-limits.ts`.

### Step 3: Add `AI_FEATURE_TIERS` and `canUseAiFeature` to `app/lib/tier-limits.ts`

Append to the end of the existing file (after the `BUSINESS_PRODUCTS_LIVE` export):

```ts
export const AI_FEATURE_TIERS = {
  ai_description: ["plus", "business", "enterprise"],
  ai_matching:    ["plus", "business", "enterprise"],
  ai_chat:        ["plus", "business", "enterprise"],
} satisfies Record<string, TierCode[]>;

export type AiFeature = keyof typeof AI_FEATURE_TIERS;

/**
 * Returns true if the given plan tier can access the named AI feature.
 * The AI meetup spot suggester is intentionally NOT in this map — it is open to all tiers.
 */
export function canUseAiFeature(
  planCode: string | null | undefined,
  feature: AiFeature,
): boolean {
  const tier = normalizeTierCode(planCode);
  return (AI_FEATURE_TIERS[feature] as TierCode[]).includes(tier);
}
```

### Step 4: Run test to verify it passes

```bash
npm run test:unit
```

Expected: All 7 tests PASS.

### Step 5: Typecheck

```bash
npm run typecheck
```

Expected: No new errors.

### Step 6: Commit

```bash
git add app/lib/tier-limits.ts app/lib/tier-limits.test.ts
git commit -m "feat: add canUseAiFeature helper and AI_FEATURE_TIERS to tier-limits

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Add `getUserTier()` to `tier-limits.server.ts`

**Files:**
- Modify: `app/lib/tier-limits.server.ts`

This lightweight helper fetches only the `planCode` for a user — used by routes that don't already load `ListingUsage`.

### Step 1: Add the import and function

At the top of `app/lib/tier-limits.server.ts`, the existing imports are:
```ts
import { and, count, eq } from "drizzle-orm";
import { db } from "./db.server";
import { listings, subscriptions } from "./schema";
import { listingLimitFor, normalizeTierCode, type ListingUsage } from "./tier-limits";
```

Add `type TierCode` to the import from `./tier-limits`:
```ts
import { listingLimitFor, normalizeTierCode, type ListingUsage, type TierCode } from "./tier-limits";
```

Then append this function after the existing `getListingUsage` export:

```ts
/**
 * Lightweight helper that fetches only the user's tier code from subscriptions.
 * Use this when you don't need the full ListingUsage object.
 */
export async function getUserTier(userId: string): Promise<TierCode> {
  const [sub] = await db
    .select({ planCode: subscriptions.planCode })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return normalizeTierCode(sub?.planCode);
}
```

### Step 2: Typecheck

```bash
npm run typecheck
```

Expected: No new errors.

### Step 3: Commit

```bash
git add app/lib/tier-limits.server.ts
git commit -m "feat: add getUserTier helper to tier-limits.server

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Server-side guard in `add.tsx` — AI description action

**Files:**
- Modify: `app/routes/dashboard/add.tsx`

Currently the `aiDescription` intent branch (line 149) runs before `requireAuth`. This is also a pre-existing auth bug. This task fixes both.

### Step 1: Move `requireAuth` to the top of the action and add the tier guard

In `app/routes/dashboard/add.tsx`:

1. Add `canUseAiFeature` and `getUserTier` imports. Find the existing imports:

```ts
import { getListingUsage } from "~/lib/tier-limits.server";
import type { ListingUsage } from "~/lib/tier-limits";
```

Change to:

```ts
import { getListingUsage, getUserTier } from "~/lib/tier-limits.server";
import type { ListingUsage } from "~/lib/tier-limits";
import { canUseAiFeature } from "~/lib/tier-limits";
```

2. In the `action` function, after `const formData = await request.formData();` and `const intent = formData.get("intent") as string | null;`, the current code jumps straight into `if (intent === "aiDescription")` without authenticating. Add `requireAuth` before the intent switch.

Find this block (lines ~145–149):
```ts
  const formData = await request.formData();
  const intent = formData.get("intent") as string | null;

  // ── AI Description ────────────────────────────────────────
  if (intent === "aiDescription") {
```

Replace with:
```ts
  const formData = await request.formData();
  const intent = formData.get("intent") as string | null;

  // Auth gate for all intents (requireAuth throws redirect to /login if not authenticated)
  const { user } = await requireAuth(request);

  // ── AI Description ────────────────────────────────────────
  if (intent === "aiDescription") {
```

3. Inside the `aiDescription` block, add the tier guard right after the `!title.trim()` check. Find:

```ts
    if (!title.trim()) {
      return { aiError: "Enter a title first so the AI can help." };
    }

    try {
      const aiSuggestion = await generateDescription(
```

Replace with:

```ts
    if (!title.trim()) {
      return { aiError: "Enter a title first so the AI can help." };
    }

    const tier = await getUserTier(user.id);
    if (!canUseAiFeature(tier, "ai_description")) {
      return { aiError: "ai_tier_restricted" };
    }

    try {
      const aiSuggestion = await generateDescription(
```

4. Further down in the action, there is a duplicate `requireAuth` call for the create-listing path (line ~175). Remove it:

Find:
```ts
  // ── Create Listing (default) ──────────────────────────────
  const { user } = await requireAuth(request);
```

Replace with:
```ts
  // ── Create Listing (default) ──────────────────────────────
```

(The `user` variable is now available from the top-level auth call.)

### Step 2: Typecheck

```bash
npm run typecheck
```

Expected: No new errors.

### Step 3: Commit

```bash
git add app/routes/dashboard/add.tsx
git commit -m "feat: add tier guard to AI description action in add.tsx

Also fixes pre-existing auth bypass for the aiDescription intent.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Server-side guard in `home.tsx` — AI matching action

**Files:**
- Modify: `app/routes/dashboard/home.tsx`

### Step 1: Add imports

At the top of `app/routes/dashboard/home.tsx`, add to imports:

```ts
import { getUserTier } from "~/lib/tier-limits.server";
import { canUseAiFeature } from "~/lib/tier-limits";
```

### Step 2: Add tier guard in the action

In the `action` function, `requireAuth` is currently called on line 206, after the `"aiMatch"` intent check but before any DB queries. Add the tier check right after `requireAuth`:

Find:
```ts
  const { user } = await requireAuth(request);

  const url = new URL(request.url);
  const regionParam = url.searchParams.get("region");
```

Replace with:
```ts
  const { user } = await requireAuth(request);

  const tier = await getUserTier(user.id);
  if (!canUseAiFeature(tier, "ai_matching")) {
    return { error: "ai_tier_restricted" };
  }

  const url = new URL(request.url);
  const regionParam = url.searchParams.get("region");
```

### Step 3: Expose `canUseAiMatching` from the loader

In the `loader` function, `getUserTier` also needs to be called so the UI can conditionally render the AI Match button. Find the loader:

```ts
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const url = new URL(request.url);
```

And find the `return` at the end of the loader (lines ~185–193):

```ts
  return {
    listings: taggedItems,
    hasListings: ownListings.length > 0,
    currentRegion,
    needsRegion: !userProfile?.province || !provinceToSlug(userProfile.province),
    needsLocation: !userProfile?.lat || !userProfile?.lng,
    searchQuery: searchQuery ?? null,
    scope,
  };
```

Change to:

```ts
  const tier = await getUserTier(user.id);

  return {
    listings: taggedItems,
    hasListings: ownListings.length > 0,
    currentRegion,
    needsRegion: !userProfile?.province || !provinceToSlug(userProfile.province),
    needsLocation: !userProfile?.lat || !userProfile?.lng,
    searchQuery: searchQuery ?? null,
    scope,
    canUseAiMatching: canUseAiFeature(tier, "ai_matching"),
  };
```

### Step 4: Typecheck

```bash
npm run typecheck
```

Expected: No new errors (route types will regenerate to include `canUseAiMatching`).

### Step 5: Commit

```bash
git add app/routes/dashboard/home.tsx
git commit -m "feat: add tier guard to AI matching action and loader in home.tsx

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Server-side guard in `api.chat.ts` — AI chat action

**Files:**
- Modify: `app/routes/api.chat.ts`

### Step 1: Add imports and tier guard

The full current file is short — replace it entirely with:

```ts
import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { AiServiceError } from "~/lib/ai.server";
import { handleChat } from "~/lib/chat.server";
import { getUserTier } from "~/lib/tier-limits.server";
import { canUseAiFeature } from "~/lib/tier-limits";

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);

  const tier = await getUserTier(user.id);
  if (!canUseAiFeature(tier, "ai_chat")) {
    return new Response(
      JSON.stringify({ error: "ai_tier_restricted" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await request.json();
  const { sessionId, tradeId, input } = body;
  try {
    const result = await handleChat({ user, sessionId, tradeId, input });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("/api/chat error:", err);
    const error =
      err instanceof AiServiceError
        ? err.code
        : err?.message || "server_error";
    return new Response(JSON.stringify({ error }), { status: 500 });
  }
}
```

### Step 2: Typecheck

```bash
npm run typecheck
```

Expected: No new errors.

### Step 3: Commit

```bash
git add app/routes/api.chat.ts
git commit -m "feat: add tier guard to AI chat action

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: UI upgrade prompt in `add.tsx`

**Files:**
- Modify: `app/routes/dashboard/add.tsx`

### Step 1: Pass `canUseAiDescription` to `AddAssetForm`

In `AddAsset` default export (around line 263), find:

```tsx
export default function AddAsset({ loaderData, actionData }: Route.ComponentProps) {
  const { usage } = loaderData;

  if (usage.atLimit) {
    return <LimitReachedPanel usage={usage} />;
  }

  return <AddAssetForm actionData={actionData} />;
}
```

Replace with:

```tsx
export default function AddAsset({ loaderData, actionData }: Route.ComponentProps) {
  const { usage } = loaderData;

  if (usage.atLimit) {
    return <LimitReachedPanel usage={usage} />;
  }

  const canUseAiDescription = canUseAiFeature(usage.planCode, "ai_description");
  return <AddAssetForm actionData={actionData} canUseAiDescription={canUseAiDescription} />;
}
```

### Step 2: Update `AddAssetForm` to accept and use the prop

Find the `AddAssetForm` function signature (around line 341):

```tsx
function AddAssetForm({
  actionData,
}: {
  actionData: Route.ComponentProps["actionData"];
}) {
```

Replace with:

```tsx
function AddAssetForm({
  actionData,
  canUseAiDescription,
}: {
  actionData: Route.ComponentProps["actionData"];
  canUseAiDescription: boolean;
}) {
```

### Step 3: Replace the AI Assist button with a gated version

Find the AI Assist button section (around line 572):

```tsx
              <button
                type="button"
                onClick={handleAiAssist}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-400 hover:text-purple-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                {isAiLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {isAiLoading ? "Generating…" : "AI Assist"}
              </button>
```

Replace with:

```tsx
              {canUseAiDescription ? (
                <button
                  type="button"
                  onClick={handleAiAssist}
                  disabled={isAiLoading}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-400 hover:text-purple-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                  {isAiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {isAiLoading ? "Generating…" : "AI Assist"}
                </button>
              ) : (
                <Link
                  to="/dashboard/billing"
                  className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-400 transition-colors"
                  title="Upgrade to Plus to use AI Assist"
                >
                  <Lock className="w-3 h-3" />
                  Plus only
                </Link>
              )}
```

> Note: `Lock` and `Link` are already imported in `add.tsx`.

### Step 4: Handle the `ai_tier_restricted` error in the UI

Find the block that handles `aiData?.aiError` (look for `aiError` in the component — it renders the error message). Add handling for the sentinel. Look for the AI suggestion panel and aiError display. It may look like this already:

```tsx
{aiData && "aiError" in aiData && (
  <p className="mt-2 text-xs text-red-400">{aiData.aiError}</p>
)}
```

If found, replace the error text with a friendly message when the error is the tier sentinel:

```tsx
{aiData && "aiError" in aiData && (
  <p className="mt-2 text-xs text-red-400">
    {aiData.aiError === "ai_tier_restricted"
      ? "AI Assist is available on Plus and above. "
      : aiData.aiError}
    {aiData.aiError === "ai_tier_restricted" && (
      <Link to="/dashboard/billing" className="underline text-emerald-400 hover:text-emerald-300">
        Upgrade plan →
      </Link>
    )}
  </p>
)}
```

> Check the exact rendering location in the file before applying — search for `aiError` in the JSX.

### Step 5: Typecheck

```bash
npm run typecheck
```

Expected: No new errors.

### Step 6: Commit

```bash
git add app/routes/dashboard/add.tsx
git commit -m "feat: show upgrade prompt for AI Assist on free tier in add.tsx

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: UI upgrade prompt in `home.tsx`

**Files:**
- Modify: `app/routes/dashboard/home.tsx`

The loader now returns `canUseAiMatching`. Use it in the component to replace the AI Match button with an upgrade nudge for free-tier users.

### Step 1: Destructure `canUseAiMatching` from `loaderData`

In `DashboardHome` component, find:
```tsx
  const { currentRegion, searchQuery } = loaderData;
```

Replace with:
```tsx
  const { currentRegion, searchQuery, canUseAiMatching } = loaderData;
```

### Step 2: Replace the AI Match button block

Find the AI Match button section (around line 436–447):

```tsx
        {/* AI Match button */}
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="aiMatch" />
          <button
            type="submit"
            disabled={isMatching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest border transition-all disabled:opacity-50 disabled:cursor-wait bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50"
          >
            {isMatching ? <Spinner className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
            {isMatching ? "Matching…" : "AI Match"}
          </button>
        </fetcher.Form>
```

Replace with:

```tsx
        {/* AI Match button */}
        {canUseAiMatching ? (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="aiMatch" />
            <button
              type="submit"
              disabled={isMatching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest border transition-all disabled:opacity-50 disabled:cursor-wait bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50"
            >
              {isMatching ? <Spinner className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
              {isMatching ? "Matching…" : "AI Match"}
            </button>
          </fetcher.Form>
        ) : (
          <Link
            to="/dashboard/billing"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest border bg-white/[0.03] text-slate-500 border-white/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
            title="Upgrade to Plus to use AI Match"
          >
            <Lock className="w-3 h-3" />
            AI Match — Plus only
          </Link>
        )}
```

> `Link` needs to be imported from `"react-router"` — check current imports in `home.tsx`. If `Lock` is not already imported from `"lucide-react"`, add it.

### Step 3: Handle `ai_tier_restricted` in the match error display

Find the match error rendering (around line 479):

```tsx
      {matchError && matchError !== "no_listings" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400 font-mono">
          {matchError}
        </div>
      )}
```

Replace with:

```tsx
      {matchError && matchError !== "no_listings" && matchError !== "ai_tier_restricted" && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400 font-mono">
          {matchError}
        </div>
      )}
```

(The `ai_tier_restricted` error should never reach the UI via the form since the button is hidden, but this defensively prevents leaking the sentinel string as a red error message if it does.)

### Step 4: Typecheck

```bash
npm run typecheck
```

Expected: No new errors.

### Step 5: Commit

```bash
git add app/routes/dashboard/home.tsx
git commit -m "feat: show upgrade prompt for AI Match on free tier in home.tsx

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: Add loader + upgrade gate to `chat.$tradeId.tsx`

**Files:**
- Modify: `app/routes/dashboard/chat.$tradeId.tsx`

Currently this route is entirely client-side with no loader. Add a loader to check the user's tier, and gate the UI.

### Step 1: Rewrite `chat.$tradeId.tsx` with a loader and upgrade gate

Replace the full file content with:

```tsx
import { Link, useLoaderData } from "react-router";
import { Lock } from "lucide-react";
import type { LoaderFunctionArgs } from "react-router";
import { useEffect, useState } from "react";
import ChatWindow from "~/components/ui/ChatWindow";
import ChatComposer from "~/components/ui/ChatComposer";
import { requireAuth } from "~/lib/auth.server";
import { getUserTier } from "~/lib/tier-limits.server";
import { canUseAiFeature } from "~/lib/tier-limits";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const tier = await getUserTier(user.id);
  return { canUseAiChat: canUseAiFeature(tier, "ai_chat") };
}

export default function TradeChat({ params }: any) {
  const { canUseAiChat } = useLoaderData<typeof loader>();
  const tradeId = Number(params.tradeId);
  const [messages, setMessages] = useState<Array<any>>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/messages/${tradeId}`);
      const data = await res.json();
      setMessages(data);
    }
    load();
  }, [tradeId]);

  async function onSend(text: string) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId, input: text }),
    });
    if (res.ok) {
      const json = await res.json();
      setMessages((m) => [
        ...m,
        { text, role: "user" },
        { text: json.message.text, role: "assistant" },
      ]);
    } else {
      console.error("send failed");
    }
  }

  if (!canUseAiChat) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-4 text-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
          <Lock className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
            Plus feature
          </p>
          <h2 className="text-base font-black uppercase tracking-tight text-white mb-2">
            AI Chat Assistant
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
            AI-powered chat is available on Plus and above. Upgrade to get smart trade assistance.
          </p>
        </div>
        <Link
          to="/dashboard/billing"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-[#030712] text-[11px] font-mono font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors"
        >
          Upgrade plan →
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      <ChatWindow messages={messages} />
      <ChatComposer onSend={onSend} />
    </div>
  );
}
```

> Remove the `"use client"` directive at the top — it is not a React Server Components project and React Router v7 doesn't use it.

### Step 2: Typecheck

```bash
npm run typecheck
```

Expected: No new errors.

### Step 3: Commit

```bash
git add app/routes/dashboard/chat.$tradeId.tsx
git commit -m "feat: add loader and upgrade gate to AI chat route

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: Final validation

### Step 1: Run unit tests

```bash
npm run test:unit
```

Expected: All tests pass (including the 7 `canUseAiFeature` tests from Task 1).

### Step 2: Run typecheck

```bash
npm run typecheck
```

Expected: No errors introduced by these changes. (Pre-existing errors in `context-mode/`, `local/`, and a known `offerText` bug in `pings.$id.tsx` are not regressions.)

### Step 3: Run E2E smoke test for dashboard routing

```bash
npx playwright test e2e/dashboard-routing.spec.ts --project=chromium
```

Expected: All existing routing tests pass.

### Step 4: Commit final doc update

```bash
git add docs/plans/2026-05-22-free-tier-ai-restriction-design.md
git commit -m "docs: mark free-tier AI restriction design as implemented

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Summary of Changed Files

| File | Change |
|---|---|
| `app/lib/tier-limits.ts` | Add `AI_FEATURE_TIERS`, `AiFeature` type, `canUseAiFeature()` |
| `app/lib/tier-limits.test.ts` | New — unit tests for `canUseAiFeature` |
| `app/lib/tier-limits.server.ts` | Add `getUserTier()` |
| `app/routes/dashboard/add.tsx` | Move `requireAuth` to top of action; add tier guard + UI prompt |
| `app/routes/dashboard/home.tsx` | Add tier guard in action; expose `canUseAiMatching` from loader; UI prompt |
| `app/routes/api.chat.ts` | Add tier guard (HTTP 403 for free tier) |
| `app/routes/dashboard/chat.$tradeId.tsx` | Add `loader`; render upgrade gate when restricted |

## Files NOT Changed

| File | Reason |
|---|---|
| `app/routes/dashboard/pings.$id.tsx` | Meetup AI is open to all tiers — intentionally untouched |
| `app/lib/ai.server.ts` | No tier logic in the AI service layer |
| `app/lib/nvidia.server.ts` | No tier logic in the AI service layer |
