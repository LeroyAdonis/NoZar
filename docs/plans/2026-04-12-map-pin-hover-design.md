# Design Doc: Map Pin Hover Tooltip (2026-04-12)

## Overview
Implement an interactive hover tooltip for map pins on the `/dashboard/map` route. The tooltip will display listing details (image, title, description) and uploader information (avatar, display name) and provide direct links to the listing and profile.

## Architecture & Data Flow

### 1. Data Fetching
- **File:** `app/routes/dashboard/map.tsx`
- **Loader Update:** Join the `listings` table with `listing_images` (first image) and `profiles` (uploader info).
- **New Fields in `MapPin`:**
    - `imageUrl`: string | null
    - `description`: string
    - `user`: { id: string, name: string, avatarUrl: string | null }

### 2. State Management
- **File:** `app/components/map/nozar-map.tsx`
- **Hovered State:** Use a `hoveredPinId` state to track which pin is being hovered.
- **Coordinates:** Convert the pin's `lat/lng` to screen pixels using Google Maps' `Projection.fromLatLngToPoint()` within a `useMemo` or `useEffect` that listens to map pan/zoom.

## Component Design

### `MapPinTooltip` (New Component)
- **Styling:** Follows `barter-design-system`.
- **Theme:** Dark mode native (`bg-slate-900/90`, `backdrop-blur-md`).
- **Border:** Cyan (for services) or Emerald (for items) accent border with subtle glow.
- **Layout:**
    - **Header:** Aspect-ratio controlled image with a gradient overlay.
    - **Body:** Listing title in Cyan, truncated description in Slate-300.
    - **Footer:** Uploader avatar and display name with hover effects.
- **Interactions:**
    - Click image/title -> `/dashboard/asset/${id}`
    - Click avatar/name -> `/dashboard/profile/${userId}`

## Interaction & Motion
- **Hover Behavior:**
    - Enter delay: 100ms (prevents flicker on fast movement).
    - Exit delay: 300ms (allows mouse to move into the tooltip).
- **Animations:**
    - Uses `motion/react` v12.
    - Scale-up (0.95 -> 1.0) and fade-in (0 -> 1) on enter.
    - Respects `prefers-reduced-motion`.

## Testing & Verification
- Verify that hovering a pin shows the correct listing info.
- Verify that moving the mouse into the tooltip keeps it open.
- Verify that clicking the links navigates to the correct routes.
- Verify responsive behavior (ensure tooltip stays within viewport).
