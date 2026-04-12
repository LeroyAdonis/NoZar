# Map Pin Hover Tooltip Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a high-quality, interactive hover popup for map pins on the `/dashboard/map` route, displaying listing details (image, title, description) and uploader info (avatar, display name) with direct links.

**Architecture:** 
1. Update `dashboard/map.tsx` loader to fetch more listing and uploader data.
2. Update `NozarMap` component in `nozar-map.tsx` to handle hover states and coordinate the custom Tailwind tooltip.
3. Create a `MapPinTooltip` component for the actual popup, using `motion/react` for smooth animations.
4. Position the tooltip using screen coordinates converted from the marker's `lat/lng`.

**Tech Stack:** React Router v7, Tailwind CSS v4, Drizzle ORM, Google Maps API, `motion/react` v12.

---

### Task 1: Update `MapPin` Type and Database Loader

**Files:**
- Modify: `app/components/map/nozar-map.tsx:6-12`
- Modify: `app/routes/dashboard/map.tsx:37-62`

**Step 1: Update `MapPin` type**

```typescript
// app/components/map/nozar-map.tsx
export type MapPin = {
  id: number;
  lat: number;
  lng: number;
  title: string;
  type: "item" | "service";
  description: string;
  imageUrl: string | null;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};
```

**Step 2: Update loader in `dashboard/map.tsx`**

```typescript
// app/routes/dashboard/map.tsx
  const activeListings = await db
    .select({
      id: listings.id,
      lat: listings.lat,
      lng: listings.lng,
      title: listings.title,
      type: listings.type,
      description: listings.description,
      imageUrl: sql<string | null>`(SELECT url FROM ${listingImages} WHERE ${listingImages.listingId} = ${listings.id} LIMIT 1)`,
      userId: profiles.userId,
      userName: profiles.displayName,
      userAvatar: profiles.avatarUrl,
    })
    .from(listings)
    .innerJoin(profiles, eq(listings.userId, profiles.userId))
    .where(
      and(
        eq(listings.status, "active"),
        isNotNull(listings.lat),
        isNotNull(listings.lng),
      ),
    );

  const pins = activeListings
    .filter(
      (l): l is typeof l & { lat: number; lng: number } =>
        l.lat !== null && l.lng !== null,
    )
    .map((l) => ({
      id: l.id,
      lat: l.lat,
      lng: l.lng,
      title: l.title,
      type: l.type as "item" | "service",
      description: l.description,
      imageUrl: l.imageUrl,
      user: {
        id: l.userId,
        name: l.userName,
        avatarUrl: l.userAvatar,
      },
    }));
```

**Step 3: Commit**

```bash
git add app/components/map/nozar-map.tsx app/routes/dashboard/map.tsx
git commit -m "feat(map): extend MapPin type and loader with listing/user info"
```

---

### Task 2: Implement Hover Logic in `NozarMap`

**Files:**
- Modify: `app/components/map/nozar-map.tsx`

**Step 1: Add hover state and listeners to `AdvancedMarkerElement`**

```typescript
// app/components/map/nozar-map.tsx
const [hoveredPin, setHoveredPin] = useState<MapPin | null>(null);
const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// Inside the useEffect where markers are created:
marker.addListener("gmp-click", () => onPinClick?.(pin.id));

// Add mouseenter/mouseleave listeners
marker.element.addEventListener("mouseenter", () => {
  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  hoverTimeoutRef.current = setTimeout(() => {
    setHoveredPin(pin);
  }, 100); // 100ms enter delay
});

marker.element.addEventListener("mouseleave", () => {
  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  hoverTimeoutRef.current = setTimeout(() => {
    setHoveredPin(null);
  }, 300); // 300ms exit delay
});
```

**Step 2: Coordinate conversion logic**

```typescript
const [tooltipPosition, setTooltipPosition] = useState<{ x: number, y: number } | null>(null);

useEffect(() => {
  if (!hoveredPin || !mapInstance) {
    setTooltipPosition(null);
    return;
  }

  const updatePosition = () => {
    const projection = mapInstance.getProjection();
    const bounds = mapInstance.getBounds();
    if (!projection || !bounds) return;

    const latLng = new google.maps.LatLng(hoveredPin.lat, hoveredPin.lng);
    const point = projection.fromLatLngToPoint(latLng);
    if (!point) return;

    // Convert world point to pixel point within the map container
    const topRight = projection.fromLatLngToPoint(bounds.getNorthEast())!;
    const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest())!;
    const scale = Math.pow(2, mapInstance.getZoom()!);

    const x = (point.x - bottomLeft.x) * scale;
    const y = (point.y - topRight.y) * scale;
    
    setTooltipPosition({ x, y });
  };

  updatePosition();
  const listener = mapInstance.addListener("bounds_changed", updatePosition);
  return () => google.maps.event.removeListener(listener);
}, [hoveredPin, mapInstance]);
```

**Step 3: Commit**

```bash
git add app/components/map/nozar-map.tsx
git commit -m "feat(map): implement hover logic and coordinate sync"
```

---

### Task 3: Create `MapPinTooltip` Component

**Files:**
- Create: `app/components/map/map-pin-tooltip.tsx`
- Modify: `app/components/map/nozar-map.tsx` (to render the tooltip)

**Step 1: Write `MapPinTooltip` with Tailwind and `motion/react`**

```typescript
// app/components/map/map-pin-tooltip.tsx
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router";
import type { MapPin } from "./nozar-map";

export function MapPinTooltip({ pin, x, y, onMouseEnter, onMouseLeave }: { 
  pin: MapPin; 
  x: number; 
  y: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute z-50 w-64 overflow-hidden rounded-xl border border-gray-800 bg-sa-black/90 p-0 shadow-2xl backdrop-blur-md"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%) translateY(-20px)' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Link to={`/dashboard/asset/${pin.id}`} className="block">
        {pin.imageUrl ? (
          <img src={pin.imageUrl} alt={pin.title} className="h-32 w-full object-cover" />
        ) : (
          <div className="h-32 w-full bg-gray-800 flex items-center justify-center text-gray-500">No Image</div>
        )}
      </Link>
      <div className="p-3">
        <Link to={`/dashboard/asset/${pin.id}`} className="hover:underline">
          <h4 className={`text-sm font-bold ${pin.type === 'service' ? 'text-sa-gold' : 'text-sa-green'}`}>
            {pin.title}
          </h4>
        </Link>
        <p className="mt-1 text-xs text-gray-400 line-clamp-2">{pin.description}</p>
        <div className="mt-3 flex items-center gap-2">
          <Link to={`/dashboard/profile/${pin.user.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {pin.user.avatarUrl ? (
              <img src={pin.user.avatarUrl} className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <div className="h-5 w-5 rounded-full bg-sa-green/20" />
            )}
            <span className="text-xs font-medium text-gray-300">{pin.user.name}</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/map/map-pin-tooltip.tsx
git commit -m "feat(map): add MapPinTooltip component"
```

---

### Task 4: Final Integration and Polish

**Files:**
- Modify: `app/components/map/nozar-map.tsx`

**Step 1: Render `MapPinTooltip` in `NozarMap`**

```typescript
// app/components/map/nozar-map.tsx
{tooltipPosition && hoveredPin && (
  <MapPinTooltip
    pin={hoveredPin}
    x={tooltipPosition.x}
    y={tooltipPosition.y}
    onMouseEnter={() => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    }}
    onMouseLeave={() => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredPin(null);
      }, 300);
    }}
  />
)}
```

**Step 2: Verification**
- Check for type errors in the build.
- Verify the coordinate math logic.
- Ensure all links are correct.

**Step 3: Commit**

```bash
git add app/components/map/nozar-map.tsx
git commit -m "feat(map): integrate MapPinTooltip into NozarMap"
```
