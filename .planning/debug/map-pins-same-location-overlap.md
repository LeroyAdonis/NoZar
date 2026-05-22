---
status: awaiting_human_verify
slug: map-pins-same-location-overlap
trigger: "Map shows only 1 pin (user's own listing) even though there are 4 nearby listings. All 4 listings are in the same/similar location. Used to work. User suspects pins may be overlapping."
created: 2026-05-21
updated: 2026-05-21
---

## Symptoms

- **Expected**: All 4 nearby listings should appear as pins on the map
- **Actual**: Only 1 pin is visible, and it belongs to the user's own listing
- **Error messages**: None reported
- **Timeline**: Regression — used to work at some point
- **Reproduction**: Navigate to `/dashboard/map`, observe only 1 pin despite 4 listings nearby
- **Additional context**: All 4 listings are at the same/similar location — pins may be overlapping or only one rendered per coordinate

## Current Focus

hypothesis: "All listings geocoded to the same suburb centroid share identical lat/lng, causing AdvancedMarkerElement to stack all markers at one pixel — only the topmost is visible."
test: "Confirmed by tracing add.tsx action: geocodeSuburb('Sandton') always returns the exact same centroid. Multiple listings in the same suburb → identical lat/lng in DB → identical marker positions → visual overlap."
expecting: "Fix: apply per-group circular jitter to pins sharing the same coordinate before creating markers."
next_action: "Apply applyPinJitter fix in nozar-map.tsx — add function, useMemo, and update pins effect dep array."

reasoning_checkpoint:
  hypothesis: "Suburb-level geocoding causes multiple listings to share identical lat/lng coordinates; AdvancedMarkerElement renders all at the same pixel, leaving only the topmost visible."
  confirming_evidence:
    - "add.tsx geocodeSuburb encodes suburb+', South Africa' → Geocoding API returns a single centroid lat/lng for every listing in that suburb."
    - "No per-listing coordinate variation exists in the schema or action — all listings from the same suburb get the EXACT same real lat/lng from Postgres."
    - "NozarMap renders AdvancedMarkerElement at {lat, lng} with no deduplication or jitter logic — markers at identical positions stack, only the last-rendered (highest z-order) is clickable/visible."
    - "map.tsx passes filteredPins directly to NozarMap with no overlap handling — client count shows 4 listings 'in range' but only 1 is visible on the map."
  falsification_test: "If listings had distinct lat/lng coordinates (e.g., geocoded to house-level precision or using profile coords), all pins would be individually visible — this would refute the overlap hypothesis."
  fix_rationale: "Applying a circular jitter offset to groups of pins that share identical (to 5dp) coordinates spreads them ~55 m apart on the map, making each pin individually visible and clickable without altering the underlying data."
  blind_spots: "Could also be a React cleanup race condition causing markers to never mount — but the symptom says 1 IS visible (not 0), which points to overlap not a mount failure."

## Evidence

- timestamp: 2026-05-21
  checked: "app/routes/dashboard/add.tsx action handler"
  found: "geocodeSuburb geocodes 'suburb, South Africa' via Google Geocoding API, returns the suburb centroid. All listings in the same suburb → same lat/lng stored in DB."
  implication: "Multiple listings in same suburb are at identical coordinates."

- timestamp: 2026-05-21
  checked: "app/components/map/nozar-map.tsx pins useEffect"
  found: "AdvancedMarkerElement created at {lat: pin.lat, lng: pin.lng} with no jitter or clustering — pins at identical coords stack."
  implication: "Only the topmost (last-rendered) marker is visible; the others are hidden underneath it."

- timestamp: 2026-05-21
  checked: "app/routes/dashboard/map.tsx filteredPins"
  found: "filteredPins useMemo passes all in-radius listings to NozarMap.pins — count is correct (4+) but positions are identical."
  implication: "Data flow is correct; the issue is purely rendering/display."

## Eliminated

- hypothesis: "Async cleanup race condition prevents markers from mounting"
  evidence: "Symptom is 1 pin visible (not 0). If the cleanup race prevented all renders, 0 pins would show. The 'cancelled' flag correctly gates async creation."
  timestamp: 2026-05-21

- hypothesis: "Client-side filteredPins filter removes the 4 nearby listings"
  evidence: "Server and client use identical radius/center values from loaderData. No floating-point divergence large enough to exclude nearby pins."
  timestamp: 2026-05-21

## Resolution

root_cause: "Suburb-level geocoding (geocodeSuburb in add.tsx) always returns the same centroid lat/lng for every listing in the same suburb. Multiple listings end up with identical coordinates. AdvancedMarkerElement in NozarMap renders all markers at the exact same pixel — only the topmost (last-rendered) is visible to the user."
fix: "Added applyPinJitter() to nozar-map.tsx. Before creating AdvancedMarkerElement instances, the function groups pins by coordinate (to 5dp ≈ 1m precision) and spreads any group of 2+ overlapping pins in a uniform circle with ~55m radius. Non-overlapping pins are unaffected. displayPins (the jittered array) is computed via useMemo([pins]) and used in the pins useEffect (dep array updated from `pins` to `displayPins`). The original pin.id/title/description remain intact so clicks and tooltip content are unaffected."
verification: "Typecheck passes with no new errors in nozar-map.tsx. Pre-existing 306 errors in other files are unchanged."
files_changed:
  - app/components/map/nozar-map.tsx
