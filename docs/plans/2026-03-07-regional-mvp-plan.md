# Regional MVP (Western Cape & Gauteng) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scope the Nozar MVP to Western Cape and Gauteng by adding region-filtered feeds, a region toggle, and a first-time region selection prompt.

**Architecture:** Listings inherit their region from the owner's `profiles.province` field (no schema migration needed). The feed loader JOINs listings → profiles to filter by the listing owner's province. A `?region=` URL param allows switching between regions. Users without a province set see a fullscreen prompt to choose WC or GP.

**Tech Stack:** React Router v7 (SSR loaders/actions), Drizzle ORM + Neon PostgreSQL, Tailwind CSS v4, TypeScript, lucide-react icons.

**Design doc:** `docs/plans/2026-03-07-regional-mvp-design.md`

---

### Task 1: Create Region Constants Module

**Files:**
- Create: `app/lib/regions.ts`

**Step 1: Create the regions module**

```typescript
// app/lib/regions.ts

export const MVP_REGIONS = {
  "western-cape": {
    label: "Western Cape",
    province: "Western Cape",
    center: { lat: -33.9249, lng: 18.4241 },
    emoji: "🏔️",
  },
  gauteng: {
    label: "Gauteng",
    province: "Gauteng",
    center: { lat: -26.2041, lng: 28.0473 },
    emoji: "🏙️",
  },
} as const;

export type RegionSlug = keyof typeof MVP_REGIONS;

export const REGION_SLUGS = Object.keys(MVP_REGIONS) as RegionSlug[];

/** Map province name → region slug. Returns null if province is not an MVP region. */
export function provinceToSlug(province: string | null | undefined): RegionSlug | null {
  if (!province) return null;
  for (const [slug, config] of Object.entries(MVP_REGIONS)) {
    if (config.province === province) return slug as RegionSlug;
  }
  return null;
}

/** Resolve a region slug from URL param, falling back to user's province, then "gauteng". */
export function resolveRegion(
  paramRegion: string | null,
  userProvince: string | null | undefined,
): RegionSlug {
  // Try URL param first
  if (paramRegion && paramRegion in MVP_REGIONS) {
    return paramRegion as RegionSlug;
  }
  // Fall back to user's province
  const fromProfile = provinceToSlug(userProvince);
  if (fromProfile) return fromProfile;
  // Default
  return "gauteng";
}
```

**Step 2: Run typecheck**

Run: `npx react-router typegen && npx tsc --noEmit`
Expected: PASS — no type errors

**Step 3: Commit**

```bash
git add app/lib/regions.ts
git commit -m "feat: add MVP region constants for Western Cape and Gauteng

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Create RegionToggle Component

**Files:**
- Create: `app/components/ui/region-toggle.tsx`

**Step 1: Create the component**

```tsx
// app/components/ui/region-toggle.tsx
import { MVP_REGIONS, type RegionSlug, REGION_SLUGS } from "~/lib/regions";

type RegionToggleProps = {
  activeRegion: RegionSlug;
  onChange: (slug: RegionSlug) => void;
};

export function RegionToggle({ activeRegion, onChange }: RegionToggleProps) {
  return (
    <div className="flex gap-1.5 bg-[#0F172A] border border-white/10 rounded-full p-1">
      {REGION_SLUGS.map((slug) => {
        const region = MVP_REGIONS[slug];
        const isActive = slug === activeRegion;
        return (
          <button
            key={slug}
            type="button"
            onClick={() => onChange(slug)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest transition-all ${
              isActive
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "text-slate-500 hover:text-slate-300 border border-transparent"
            }`}
          >
            <span>{region.emoji}</span>
            <span>{region.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

**Step 2: Run typecheck**

Run: `npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add app/components/ui/region-toggle.tsx
git commit -m "feat: add RegionToggle pill component

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Create RegionPrompt Component

**Files:**
- Create: `app/components/ui/region-prompt.tsx`

This is a fullscreen overlay shown when a user has no province set (or a non-MVP province). It lets them pick Western Cape or Gauteng.

**Step 1: Create the component**

```tsx
// app/components/ui/region-prompt.tsx
"use client";

import { Form } from "react-router";
import { MapPin } from "lucide-react";
import { MVP_REGIONS, REGION_SLUGS } from "~/lib/regions";

type RegionPromptProps = {
  /** Form action URL — should POST to a route that updates profiles.province */
  actionUrl?: string;
};

export function RegionPrompt({ actionUrl }: RegionPromptProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#030712]/95 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Header */}
        <div>
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
            Select Your Region
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Nozar is currently live in two regions. Pick yours to see nearby swaps.
          </p>
        </div>

        {/* Region cards */}
        <div className="grid gap-4">
          {REGION_SLUGS.map((slug) => {
            const region = MVP_REGIONS[slug];
            return (
              <Form
                key={slug}
                method="post"
                action={actionUrl}
              >
                <input type="hidden" name="intent" value="setRegion" />
                <input type="hidden" name="province" value={region.province} />
                <button
                  type="submit"
                  className="w-full bg-[#0F172A] border border-white/10 rounded-2xl p-6 flex items-center gap-4 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group text-left"
                >
                  <span className="text-4xl">{region.emoji}</span>
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">
                      {region.label}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">
                      {region.province}
                    </p>
                  </div>
                </button>
              </Form>
            );
          })}
        </div>

        {/* Coming soon note */}
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
          More provinces coming soon
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Run typecheck**

Run: `npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add app/components/ui/region-prompt.tsx
git commit -m "feat: add RegionPrompt fullscreen overlay for first-time region selection

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Add Region Filtering to Dashboard Feed

**Files:**
- Modify: `app/routes/dashboard/home.tsx`

This is the core change. The feed loader must:
1. Read the user's province from `profiles`
2. Accept `?region=` URL param
3. Resolve the active region via `resolveRegion()`
4. JOIN listings with the listing **owner's** profile to filter by province
5. Return `currentRegion` to the component
6. The component renders the `RegionToggle` and updates `?region=` on change

**Step 1: Update the loader**

In `app/routes/dashboard/home.tsx`, modify the loader function:

1. Add imports at the top:
```typescript
import { resolveRegion, MVP_REGIONS, type RegionSlug } from "~/lib/regions";
```

2. In the loader, after `const category = url.searchParams.get("category");` add:
```typescript
const regionParam = url.searchParams.get("region");
```

3. Replace the existing listings query. The key change is joining with `profiles` (aliased for the listing owner) and filtering WHERE the owner's province matches the selected region:

```typescript
// Fetch user's province for region resolution
const [userProfile] = await db
  .select({ lat: profiles.lat, lng: profiles.lng, province: profiles.province })
  .from(profiles)
  .where(eq(profiles.userId, user.id))
  .limit(1);

const currentRegion = resolveRegion(regionParam, userProfile?.province);
const regionConfig = MVP_REGIONS[currentRegion];

const rows = await db
  .select({
    id: listings.id,
    title: listings.title,
    description: listings.description,
    seekingDescription: listings.seekingDescription,
    category: listings.category,
    type: listings.type,
    estimatedValueZar: listings.estimatedValueZar,
    condition: listings.condition,
    createdAt: listings.createdAt,
    lat: listings.lat,
    lng: listings.lng,
    userName: users.name,
    isVerified: users.emailVerified,
  })
  .from(listings)
  .innerJoin(users, eq(listings.userId, users.id))
  .innerJoin(profiles, eq(listings.userId, profiles.userId))
  .where(
    and(
      eq(listings.status, "active"),
      eq(profiles.province, regionConfig.province),
    ),
  )
  .orderBy(desc(listings.createdAt))
  .limit(20);
```

4. Remove the separate `userProfileRows` query since we already fetched it above. Keep the images query as-is.

5. Update the return statement:
```typescript
return { listings: items, currentRegion, needsRegion: !userProfile?.province || !provinceToSlug(userProfile.province) };
```

Also add `provinceToSlug` to the imports from `~/lib/regions`.

**Step 2: Update the component**

Add `RegionToggle` to the UI:

1. Add imports:
```typescript
import { RegionToggle } from "~/components/ui/region-toggle";
import type { RegionSlug } from "~/lib/regions";
```

2. In the component, after `const fetcher = useFetcher<typeof action>();`, add:
```typescript
const { currentRegion } = loaderData;

function handleRegionChange(slug: RegionSlug) {
  const params = new URLSearchParams(searchParams);
  params.set("region", slug);
  params.delete("category"); // reset category when switching region
  setSearchParams(params, { preventScrollReset: true });
}
```

3. Replace the section header block (the `<div className="flex justify-between items-end pt-2">` block) with:
```tsx
{/* Region toggle */}
<div className="flex justify-center pt-2">
  <RegionToggle activeRegion={currentRegion} onChange={handleRegionChange} />
</div>

{/* Section header */}
<div className="flex justify-between items-end">
  <div>
    <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1">
      // Local Index
    </span>
    <h2 className="text-xl font-bold uppercase tracking-tight">
      Nearby Assets
    </h2>
  </div>

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
</div>
```

4. Update the empty state message to include region name:
```tsx
<p className="text-slate-600 text-xs">
  No assets found in this region
  {activeCategory !== "All" && (
    <> under <span className="font-mono text-slate-500">{activeCategory}</span></>
  )}
</p>
```

**Step 3: Run typecheck**

Run: `npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 4: Run dev server and manually verify**

Run: `npm run dev`
- Visit `/dashboard` — should see RegionToggle with WC and GP pills
- Click the other region — URL updates with `?region=...`
- Feed shows only listings from selected region's province

**Step 5: Commit**

```bash
git add app/routes/dashboard/home.tsx
git commit -m "feat: filter feed by region with toggle between Western Cape and Gauteng

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Add Region Prompt to Dashboard Layout

**Files:**
- Modify: `app/routes/dashboard.tsx`

When a user's profile has no province (or a non-MVP province), show the `RegionPrompt` overlay. The layout also needs an action handler for the `setRegion` intent.

**Step 1: Update the loader**

In the loader, add `province` to the profile select:

```typescript
const [profile] = await db
  .select({
    avatarUrl: profiles.avatarUrl,
    displayName: profiles.displayName,
    province: profiles.province,
  })
  .from(profiles)
  .where(eq(profiles.userId, user.id))
  .limit(1);
```

Also add to the return:
```typescript
return { user, unreadCount, profile: profile ?? null };
```

(The `profile` object now includes `province` — the component will check it.)

**Step 2: Add an action handler**

Add a new `action` export to `dashboard.tsx`:

```typescript
import { provinceToSlug } from "~/lib/regions";

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "setRegion") {
    const province = (formData.get("province") as string)?.trim() || null;
    if (province && provinceToSlug(province)) {
      await db
        .update(profiles)
        .set({ province, updatedAt: new Date() })
        .where(eq(profiles.userId, user.id));
    }
    return { success: true };
  }

  return { error: "Unknown intent" };
}
```

**Step 3: Update the component**

Add imports:
```typescript
import { RegionPrompt } from "~/components/ui/region-prompt";
import { provinceToSlug } from "~/lib/regions";
```

In the component, before the return, add:
```typescript
const needsRegion = !profile?.province || !provinceToSlug(profile.province);
```

In the JSX, after the `<main>` closing tag and before `<BottomNav>`, add:
```tsx
{needsRegion && <RegionPrompt />}
```

**Step 4: Run typecheck**

Run: `npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add app/routes/dashboard.tsx
git commit -m "feat: show region selection prompt for users without a province

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Update Map to Use Region-Based Defaults

**Files:**
- Modify: `app/routes/dashboard/map.tsx`

**Step 1: Update the loader to filter by region and set center**

```typescript
import { profiles } from "~/lib/schema";
import { resolveRegion, MVP_REGIONS, provinceToSlug } from "~/lib/regions";

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const url = new URL(request.url);
  const regionParam = url.searchParams.get("region");

  // Get user's province
  const [userProfile] = await db
    .select({ province: profiles.province })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const currentRegion = resolveRegion(regionParam, userProfile?.province);
  const regionConfig = MVP_REGIONS[currentRegion];

  const activeListings = await db
    .select({
      id: listings.id,
      lat: listings.lat,
      lng: listings.lng,
      title: listings.title,
      type: listings.type,
    })
    .from(listings)
    .innerJoin(profiles, eq(listings.userId, profiles.userId))
    .where(
      and(
        eq(listings.status, "active"),
        isNotNull(listings.lat),
        isNotNull(listings.lng),
        eq(profiles.province, regionConfig.province),
      ),
    );

  const pins = activeListings
    .filter(
      (l): l is typeof l & { lat: number; lng: number } =>
        l.lat !== null && l.lng !== null,
    )
    .map((l) => ({
      ...l,
      type: l.type as "item" | "service",
    }));

  return {
    listings: pins,
    apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
    regionCenter: regionConfig.center,
    currentRegion,
  };
}
```

**Step 2: Update the component**

Replace the hardcoded `JHB_CENTER` with `loaderData.regionCenter`:

```typescript
const { listings: pins, apiKey, regionCenter, currentRegion } = loaderData;
const [center, setCenter] = useState(regionCenter);
```

Update the recenter handler:
```typescript
const handleRecenter = useCallback(() => {
  setCenter({ ...regionCenter });
}, [regionCenter]);
```

Remove the `JHB_CENTER` constant since it's no longer needed.

Add the RegionToggle at the top of the map overlay:
```tsx
import { RegionToggle } from "~/components/ui/region-toggle";
import { useSearchParams } from "react-router";
import type { RegionSlug } from "~/lib/regions";
```

In the component:
```tsx
const [searchParams, setSearchParams] = useSearchParams();

function handleRegionChange(slug: RegionSlug) {
  setSearchParams({ region: slug }, { preventScrollReset: true });
}
```

Add the toggle to the map UI (absolute positioned, top-center):
```tsx
{/* Region toggle */}
<div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
  <RegionToggle activeRegion={currentRegion} onChange={handleRegionChange} />
</div>
```

**Step 3: Run typecheck**

Run: `npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add app/routes/dashboard/map.tsx
git commit -m "feat: scope map pins and center to active region

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Restrict Profile Province Selector to MVP Regions

**Files:**
- Modify: `app/routes/dashboard/profile.tsx`

**Step 1: Replace SA_PROVINCES with MVP regions**

Replace the `SA_PROVINCES` constant (lines 40–50):

```typescript
// ─── MVP regions ───────────────────────────────────────────────
import { MVP_REGIONS, REGION_SLUGS } from "~/lib/regions";

const MVP_PROVINCES = REGION_SLUGS.map((slug) => MVP_REGIONS[slug].province);
```

**Step 2: Update the province select dropdown (lines 711–723)**

Replace the province `<select>` options:

```tsx
<select
  id="province"
  name="province"
  defaultValue={profile.province ?? ""}
  className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 appearance-none cursor-pointer"
>
  <option value="">Select province</option>
  {MVP_PROVINCES.map((p) => (
    <option key={p} value={p}>
      {p}
    </option>
  ))}
</select>
<p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mt-1">
  More provinces coming soon
</p>
```

Remove the old `SA_PROVINCES` constant entirely.

**Step 3: Run typecheck**

Run: `npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add app/routes/dashboard/profile.tsx
git commit -m "feat: restrict province selector to MVP regions (WC & GP)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 8: Scope AI Match to Current Region

**Files:**
- Modify: `app/routes/dashboard/home.tsx` (action function)

The AI match action currently queries ALL other users' listings. It should be scoped to the same region.

**Step 1: Update the action**

In the `action` function, after getting the user, resolve the region and filter `otherListings` by region:

```typescript
// In the action function, after requireAuth:
const url = new URL(request.url);
const regionParam = url.searchParams.get("region");

const [userProfile] = await db
  .select({ province: profiles.province })
  .from(profiles)
  .where(eq(profiles.userId, user.id))
  .limit(1);

const currentRegion = resolveRegion(regionParam, userProfile?.province);
const regionConfig = MVP_REGIONS[currentRegion];
```

Then update the "other listings" query to join with profiles and filter by province:
```typescript
const otherListings = await db
  .select({
    id: listings.id,
    title: listings.title,
    description: listings.description,
    seekingDescription: listings.seekingDescription,
    category: listings.category,
    type: listings.type,
  })
  .from(listings)
  .innerJoin(profiles, eq(listings.userId, profiles.userId))
  .where(
    and(
      ne(listings.userId, user.id),
      eq(listings.status, "active"),
      eq(profiles.province, regionConfig.province),
    ),
  )
  .limit(50);
```

**Step 2: Run typecheck**

Run: `npx react-router typegen && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add app/routes/dashboard/home.tsx
git commit -m "feat: scope AI match results to current region

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 9: Final Typecheck and Dev Server Smoke Test

**Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: PASS — zero type errors

**Step 2: Dev server smoke test**

Run: `npm run dev`

Manually verify:
1. `/dashboard` — Region toggle visible, defaults to user's province
2. Click other region pill — feed re-fetches, URL updates
3. New user (no province) — RegionPrompt overlay appears
4. Select a region — overlay dismisses, feed loads
5. `/dashboard/map` — Map centered on region, toggle available
6. `/dashboard/profile` — Province dropdown shows only WC and GP
7. AI Match — only matches within current region

**Step 3: Commit any cleanup**

```bash
git add -A
git commit -m "chore: final cleanup for regional MVP feature

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Summary of Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `app/lib/regions.ts` | Create | Region constants, types, helpers |
| `app/components/ui/region-toggle.tsx` | Create | Reusable region pill toggle |
| `app/components/ui/region-prompt.tsx` | Create | Fullscreen region selection overlay |
| `app/routes/dashboard/home.tsx` | Modify | Region-filtered feed + toggle UI |
| `app/routes/dashboard.tsx` | Modify | Province in layout, setRegion action, prompt rendering |
| `app/routes/dashboard/map.tsx` | Modify | Region-scoped pins + center |
| `app/routes/dashboard/profile.tsx` | Modify | Restrict province dropdown to WC & GP |
