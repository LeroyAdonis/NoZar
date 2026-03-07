# Regional MVP Design: Western Cape & Gauteng

**Date**: 2026-03-07
**Status**: Draft (user review pending)

## Problem

Nozar currently shows all active listings in a single global feed with no region filtering. For the MVP launch, the platform needs to be scoped to **Western Cape (WC)** and **Gauteng (GP)** — South Africa's two largest economic hubs. Users should primarily see listings from their own region, with the option to browse the other.

## Design Decisions & Assumptions

Since the user was unavailable for interactive Q&A, these assumptions were made:

1. **Soft region scoping** — users select WC or GP, feed defaults to their region, but they can switch to browse the other region. No hard gate blocking users from other provinces.
2. **Profile-derived region** — a listing belongs to whatever region its owner's profile declares. No separate `region` column on listings.
3. **MVP provinces only** — the province dropdown on profile is limited to WC and GP, with a "coming soon" note for other provinces.
4. **Region prompt on first visit** — if a user's profile lacks a province, the dashboard shows a region selection prompt before the feed.

## Approaches Considered

### A. Profile-derived region filtering (Recommended)

Feed joins listings → profiles to get the owner's province, then filters by the user's selected region.

- **Pros**: No schema migration. Simple. Province already exists on profiles.
- **Cons**: If a user changes province, all their listings move. Listings don't have independent location.
- **Verdict**: Best for MVP — minimal changes, fast to ship.

### B. Explicit `region` column on listings

Add a `region` column to the `listings` table, auto-populated from the owner's province at creation time.

- **Pros**: Listings have independent location. More flexible for future features (cross-region listings).
- **Cons**: Requires a DB migration. Extra field to maintain.
- **Verdict**: Good future enhancement, overkill for MVP.

### C. Geofencing with lat/lng polygons

Define geographic boundaries for WC and GP, filter listings by whether their coordinates fall within.

- **Pros**: Most geographically accurate.
- **Cons**: Complex. Many listings lack coordinates. Polygon math adds latency.
- **Verdict**: Not appropriate for MVP.

## Chosen Approach: A — Profile-Derived Region Filtering

## Detailed Design

### 1. Region Constants

Create `app/lib/regions.ts` with region configuration:

```typescript
export const MVP_REGIONS = {
  "western-cape": {
    label: "Western Cape",
    province: "Western Cape",    // matches profiles.province value
    center: { lat: -33.9249, lng: 18.4241 },  // Cape Town
    emoji: "🏔️",
  },
  "gauteng": {
    label: "Gauteng",
    province: "Gauteng",
    center: { lat: -26.2041, lng: 28.0473 },  // Johannesburg
    emoji: "🏙️",
  },
} as const;

export type RegionSlug = keyof typeof MVP_REGIONS;
```

### 2. Feed Filtering (dashboard/home.tsx)

**Loader changes**:
- Accept `?region=western-cape` or `?region=gauteng` URL param
- Default to the user's own province if no param
- JOIN listings with profiles to get listing owner's province
- WHERE owner's province = selected region's province value
- Return `currentRegion` slug alongside listings

**UI changes**:
- Add a **region toggle** in the feed header (two pill buttons: "Western Cape" | "Gauteng")
- Active region is highlighted; clicking the other re-fetches with `?region=...`
- Show region name in feed heading (e.g., "Listings in Western Cape")

### 3. Region Selection Prompt

If the user's profile has no province (or a province outside WC/GP):
- Show a fullscreen overlay/modal on the dashboard: "Select your region to get started"
- Two large cards: Western Cape | Gauteng
- Selecting one updates `profiles.province` and redirects to the feed
- Below: small text "Other provinces coming soon — join the waitlist" (no actual waitlist logic for MVP)

### 4. Profile Province Restriction

**dashboard/profile.tsx changes**:
- Replace the 9-province dropdown with WC and GP only
- Add "More provinces coming soon" note below the selector
- Existing users with other provinces see their current value displayed but are encouraged to switch

### 5. Map Defaults (dashboard/map.tsx)

- Default map center based on user's region (WC → Cape Town, GP → Johannesburg)
- Filter map pins to only show listings from the user's current region
- Region toggle available on map page too

### 6. Listing Creation (dashboard/add.tsx)

- No changes needed — listings inherit region from the creator's profile
- The AI meetup location suggestions already use the user's suburb, which will naturally be region-appropriate

### 7. Components

**New: `RegionToggle`** — reusable pill toggle showing WC | GP, emits region slug on change.

**New: `RegionPrompt`** — fullscreen overlay for first-time region selection.

### 8. Data Flow

```
User visits /dashboard
  → Loader checks profile.province
  → If no province: render RegionPrompt overlay
  → If province set: resolve to region slug
  → Feed loader: JOIN listings + profiles, WHERE province = region
  → Render feed with RegionToggle in header
  → User clicks other region pill → navigate with ?region=...
```

### 9. Edge Cases

| Case | Handling |
|------|----------|
| User has province outside WC/GP | Show RegionPrompt to select WC or GP |
| User has no province set | Show RegionPrompt |
| Listing owner changes province | Listing moves to new region (acceptable for MVP) |
| No listings in selected region | Show empty state: "No listings yet in {region}. Be the first!" |
| URL has invalid region param | Fall back to user's own region |

### 10. What's NOT in Scope

- Hard blocking users from other provinces
- Waitlist functionality
- Cross-region listing visibility
- Region-based search/discovery beyond the toggle
- Multiple region selection
- Region-specific pricing or tier differences
