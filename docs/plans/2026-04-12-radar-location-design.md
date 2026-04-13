# Design Doc: Radar & Real Location Integration (2026-04-12)

## Overview

Transition from province-based location selection to real coordinates (lat/lng) using browser geolocation and a "radar" system. This location will be used to show the user's distance from other traders and to enforce a "soft block" for physical services outside the user's selected radius.

## Architecture

### Signup & Onboarding Flow
- Replace the `RegionPrompt` (province selection) in `DashboardLayout` with `LocationPromptModal`.
- On reaching the dashboard, if the user's `lat`/`lng` is missing, the `LocationPromptModal` will appear.
- The modal uses `navigator.geolocation.getCurrentPosition` to fetch the user's coordinates.
- On success, coordinates are sent to the server (via a `useFetcher`) to update the user's profile.
- On failure (e.g., location denied), a user-friendly error is shown.

### Profile & Session
- `profiles` table: `lat` and `lng` are the primary source of truth for the radar center.
- `province` is kept for now but is no longer the primary way to center the map.
- `searchRadiusKm`: Stores the user's active radar radius (10, 25, 50, 100km).

### Map & Radar Logic
- `NozarMap` uses the user's `lat`/`lng` as the center.
- The radar rings represent the current `searchRadiusKm`.
- All listings on the map will have their distance from the user calculated.

## Components & UI

### LocationPromptModal
- "ENABLE LOCATION & START RADAR" button: Triggers browser geolocation.
- Handles success and error states (denied, timeout, etc.).

### Dashboard Layout
- Conditional rendering: Shows `LocationPromptModal` if `!profile.lat || !profile.lng`.

### Asset Details (Listing Page)
- Distance Badge: Displays "X km away" based on the user's current location.
- Digital Badge: Displays if the service is "Digital Only".
- "Ping" Button: Disabled for non-digital services if `distance > radarRadius`.

## Data & Schema

### Drizzle Schema (`app/lib/schema.ts`)
- `listings`: Add `isDigital` (boolean, default: `false`).
- `profiles`: Keep `lat`, `lng`, and `searchRadiusKm`.

### Logic
- **Distance Calculation**: Using the Haversine formula on both client and server.
- **Service Fulfillment Check**:
  ```typescript
  if (listing.type === 'service' && !listing.isDigital && distance > userRadius) {
    disablePing = true;
    blockMessage = "Service is outside your trade radius.";
  }
  ```

## Testing Plan
- Verify `LocationPromptModal` shows up for new users.
- Verify coordinates are correctly saved to the profile.
- Verify the map centers on the user's location.
- Verify "Ping" button is disabled for physical services outside the radar radius.
- Verify digital services are still accessible regardless of distance.
