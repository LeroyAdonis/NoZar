# Radar & Real Location Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal**: Transition from province-based location selection to real coordinates (lat/lng) using browser geolocation and a "radar" system.

**Architecture**: Replace `RegionPrompt` with `LocationPromptModal` in `DashboardLayout`. Update profile schema and map logic to use `lat`/`lng` and `searchRadiusKm`. Implement "soft block" for services based on distance.

**Tech Stack**: React Router v7, Drizzle ORM, Tailwind CSS, Google Maps API.

---

### Task 1: Update Schema

**Files**:
- Modify: `app/lib/schema.ts`

**Step 1: Add isDigital to listings table**
Add `isDigital: boolean("is_digital").notNull().default(false)` to the `listings` table.

**Step 2: Generate migration**
Run: `npx drizzle-kit generate`

**Step 3: Apply migration**
Run: `npx drizzle-kit push`

**Step 4: Commit**
```bash
git add app/lib/schema.ts
git commit -m "schema: add isDigital to listings" --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
```

---

### Task 2: Update LocationPromptModal with Geolocation

**Files**:
- Modify: `app/components/ui/location-prompt-modal.tsx`

**Step 1: Implement handleEnableLocation**
Use `navigator.geolocation.getCurrentPosition` to get coordinates and call an `onSuccess` callback.

**Step 2: Add useFetcher to submit coordinates**
Update the component to use a fetcher to post `lat` and `lng` to the server.

**Step 3: Commit**
```bash
git add app/components/ui/location-prompt-modal.tsx
git commit -m "feat: implement geolocation in LocationPromptModal" --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
```

---

### Task 3: Update Dashboard Layout to use LocationPromptModal

**Files**:
- Modify: `app/routes/dashboard.tsx`

**Step 1: Replace RegionPrompt with LocationPromptModal**
Import `LocationPromptModal` and use it in the layout if `!profile.lat || !profile.lng`.

**Step 2: Update Dashboard Action**
Add a new intent `updateLocation` to handle `lat` and `lng` submissions.

**Step 3: Commit**
```bash
git add app/routes/dashboard.tsx
git commit -m "feat: show LocationPromptModal after signup" --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
```

---

### Task 4: Update Map to use Real Location

**Files**:
- Modify: `app/routes/dashboard/map.tsx`

**Step 1: Update radarCenter default**
Use `profile.lat` and `profile.lng` as the default `radarCenter`.

**Step 2: Update radiusKm storage**
Ensure the map's radius is synced with `profile.searchRadiusKm`.

**Step 3: Commit**
```bash
git add app/routes/dashboard/map.tsx
git commit -m "feat: center map on user's real location" --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
```

---

### Task 5: Implement Service Fulfillment Soft Block

**Files**:
- Modify: `app/routes/dashboard/asset.$id.tsx`

**Step 1: Calculate distance**
Implement Haversine formula to calculate distance between user and listing.

**Step 2: Disable "Ping" button for out-of-range services**
If `listing.type === 'service' && !listing.isDigital && distance > profile.searchRadiusKm`, disable the button and show a message.

**Step 3: Commit**
```bash
git add app/routes/dashboard/asset.$id.tsx
git commit -m "feat: implement service fulfillment soft block" --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
```
