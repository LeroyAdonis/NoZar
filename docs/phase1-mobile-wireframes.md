# Phase 1: Mobile-First Wireframe Specifications

> NoZar PWA — Mobile-First Design Document  
> Version: 1.0 | Status: Draft  
> Last Updated: 2026-04-15

---

## Design Principles

### Core Tenets

| Principle | Implementation |
|-----------|----------------|
| **Touch-First** | All interactive elements ≥ 44×44px touch targets |
| **One-Handed Operation** | Primary actions within thumb reach (bottom 60% of screen) |
| **Content-First** | Zero decorative elements on mobile; every pixel serves purpose |
| **Progressive Disclosure** | Show essentials first; reveal complexity on demand |
| **SA-Network Optimized** | Minimal payload, lazy loading, offline-capable |

### Design System Reference

```
Primary Action: emerald-500 (#10b981)
Primary Hover:  emerald-400 (#34d399)
Background:     slate-900 (#0f172a) / #030712
Text Primary:   white
Text Secondary: slate-400 (#94a3b8)
Accent:         cyan-400 (Radar), purple-400 (AI Match)
```

---

## 1. Bottom Navigation Bar

### Specification

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   🏠        🗺️         ➕        💬        👤            │
│  Index     Radar      Add      Pings      Node           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Touch Target Specifications

| Item | Width | Height | Position | Touch Zone |
|------|-------|--------|----------|------------|
| Index | 48px | 48px | Left quadrant | Full tab area |
| Radar | 48px | 48px | Left-center | Full tab area |
| **Add (FAB)** | **56px** | **56px** | **Center elevated** | **60px expanded** |
| Pings | 48px | 48px | Right-center | Full tab area |
| Node | 48px | 48px | Right quadrant | Full tab area |

### Visual Specifications

```css
/* Container */
bottom-nav {
  position: fixed;
  bottom: 0;
  height: 72px; /* + env(safe-area-inset-bottom) */
  background: rgba(3, 7, 18, 0.9);
  backdrop-filter: blur(24px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: env(safe-area-inset-bottom);
}

/* Standard Tab */
tab {
  min-width: 48px;
  min-height: 48px;
  padding: 12px;
  gap: 4px;
  flex-direction: column;
  align-items: center;
}

/* FAB (Add Button) */
fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: emerald-500;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
  margin-top: -24px; /* Elevate above nav bar */
}

fab:active {
  transform: scale(0.95);
}
```

### Active State Colors

| Tab | Active Color | Active Fill |
|-----|-------------|-------------|
| Index | emerald-400 | emerald-400/20 |
| Radar | cyan-400 | cyan-400/20 |
| Add | emerald-400 (bg) | — |
| Pings | emerald-400 | emerald-400/20 |
| Node | emerald-400 | emerald-400/20 |

### Notification Badges

- **Pings**: 8px dot, emerald-500, top-right of icon
- **Unread count**: Show when > 0, max display "99+"

---

## 2. Item List View (Feed)

### Layout Structure

```
┌─────────────────────────────────────┐
│ // Local Index                      │ ← Section label
│ NEARBY ASSETS          ✨ AI Match │ ← Header + action
├─────────────────────────────────────┤
│ ┌─────────┬───────────────────────┐ │
│ │         │ Title                 │ │
│ │  IMAGE  │ 📍 2.3km · 2h ago    │ │
│ │         │ Seeking: "laptop"    │ │
│ └─────────┴───────────────────────┘ │
│ ┌─────────┬───────────────────────┐ │
│ │         │ Title                 │ │
│ │  IMAGE  │ 📍 5.1km · 1d ago    │ │
│ │         │ Seeking: "furniture" │ │
│ └─────────┴───────────────────────┘ │
│            ... more cards           │
└─────────────────────────────────────┘
```

### Card Specifications

```css
/* Card Container */
card {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 12px;
  padding: 12px;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  min-height: 100px; /* Touch-friendly row height */
}

/* Image Thumbnail */
card-image {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  object-fit: cover;
  background: slate-800;
}

/* Touch Target */
card:active {
  transform: scale(0.98);
  border-color: emerald-500/30;
}
```

### Content Hierarchy

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Title | 14px | semibold | white |
| Distance/Time | 11px | mono | slate-400 |
| Seeking | 12px | regular | slate-500 |
| Price (if shown) | 13px | mono | emerald-400 |

### Scroll Behavior

- **Pull-to-refresh**: Native feel with loading indicator
- **Infinite scroll**: Load 20 items per batch
- **Skeleton loading**: Show 3 skeleton cards during load
- **Empty state**: Centered message + illustrative icon

### Category Pills (Horizontal Scroll)

```
┌────────────────────────────────────────────────────────────┐
│  [All]  [Electronics]  [Furniture]  [Service]  [Vehicles] │
└────────────────────────────────────────────────────────────┘
```

```css
pill {
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 11px;
  font-family: mono;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-height: 36px;
  white-space: nowrap;
}

pill-active {
  background: emerald-500/10;
  color: emerald-400;
  border: 1px solid emerald-500/30;
}
```

---

## 3. Item Detail View

### Layout Structure

```
┌─────────────────────────────────────┐
│ ← Back          Item Title    ⋯    │ ← Sticky header
├─────────────────────────────────────┤
│                                     │
│        ╔═══════════════════╗       │
│        ║                   ║       │
│        ║    SWIPEABLE      ║       │
│        ║    IMAGE          ║       │
│        ║    GALLERY        ║       │
│        ║                   ║       │
│        ╚═══════════════════╝       │
│         ● ○ ○ ○  (4 images)        │ ← Pagination dots
├─────────────────────────────────────┤
│                                     │
│  Electronics · Like New            │
│  Est. R 1,500                      │
│                                     │
│  "Gaming chair in great condition, │
│   barely used. Will consider       │
│   trading for a desk or monitor."  │
│                                     │
│  Seeking: Gaming monitor, desk     │
│                                     │
│  ───────────────────────────────── │
│                                     │
│  📍 Johannesburg · 2.3km away      │
│  📅 Listed 2 hours ago             │
│                                     │
│  Posted by:                        │
│  ┌───────────────────────────────┐ │
│  │ 👤 Thabo M.  ✓ Verified       │ │
│  │ ★ 4.8 (23 trades)             │ │
│  └───────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│  [💬 Message]  [⚡ Make Offer]     │ ← Sticky CTA
└─────────────────────────────────────┘
```

### Image Gallery Specifications

```css
/* Gallery Container */
gallery {
  width: 100%;
  height: 320px; /* 80% of viewport width approx */
  background: #030712;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}

/* Individual Image */
gallery-image {
  width: 100%;
  height: 100%;
  scroll-snap-align: center;
  object-fit: contain;
}

/* Pagination Dots */
dots {
  height: 24px;
  display: flex;
  justify-content: center;
  gap: 8px;
}

dot-active { width: 8px; height: 8px; background: emerald-400; border-radius: 50%; }
dot-inactive { width: 8px; height: 8px; background: slate-600; border-radius: 50%; }
```

### Sticky CTA Bar

```css
cta-bar {
  position: fixed;
  bottom: 80px; /* Above bottom nav */
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: linear-gradient(to top, #030712, transparent);
  display: flex;
  gap: 12px;
}

cta-button {
  flex: 1;
  min-height: 48px;
  border-radius: 12px;
  font-weight: 600;
}

cta-primary {
  background: emerald-500;
  color: #030712;
}

cta-secondary {
  background: transparent;
  border: 1px solid slate-600;
  color: white;
}
```

### Touch Gestures

| Gesture | Action |
|---------|--------|
| Swipe left/right | Navigate images |
| Swipe down (from top) | Close detail view |
| Double-tap image | Zoom to fit |
| Pinch | Zoom in/out (when zoomed) |

---

## 4. Add Item Flow

### Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CAMERA    │ ──► │   PREVIEW   │ ──► │   DETAILS   │
│   FIRST     │     │   & CROP    │     │   FORM      │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │                   │                   ▼
      │                   │           ┌─────────────┐
      │                   │           │   REVIEW    │
      │                   │           │   & POST    │
      │                   │           └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
  "Take photo"      "Looks good?"      "Publish listing"
```

### Step 1: Camera-First Capture

```
┌─────────────────────────────────────┐
│  ✕                                  │ ← Close button (top-left)
│                                     │
│     ┌─────────────────────────┐    │
│     │                         │    │
│     │    CAMERA PREVIEW       │    │
│     │    (full viewport)      │    │
│     │                         │    │
│     │         ┌───┐           │    │
│     │         │ + │           │    │ ← 1:1 aspect guide
│     │         └───┘           │    │
│     │                         │    │
│     └─────────────────────────┘    │
│                                     │
│  [📷 Camera]  [📸 Capture]  [🖼️ Gallery] │
│                                     │
└─────────────────────────────────────┘
```

```css
/* Capture Button */
capture-button {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: white;
  border: 4px solid rgba(255, 255, 255, 0.3);
}

capture-button:active {
  transform: scale(0.9);
}

/* Secondary Buttons */
secondary-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}
```

### Step 2: Minimal Form Fields

```
┌─────────────────────────────────────┐
│  ← Back              New Listing    │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐ │
│  │  [Image 1]  [Image 2]  [+]   │ │ ← Horizontal scroll
│  └───────────────────────────────┘ │
│                                     │
│  Title *                            │
│  ┌───────────────────────────────┐ │
│  │ What are you trading?         │ │
│  └───────────────────────────────┘ │
│                                     │
│  Category *                         │
│  ┌───────────────────────────────┐ │
│  │ Electronics            ▼      │ │ ← Dropdown/select
│  └───────────────────────────────┘ │
│                                     │
│  Condition *                        │
│  [Like New] [Good] [Fair] [Poor]   │ ← Segmented control
│                                     │
│  Description                        │
│  ┌───────────────────────────────┐ │
│  │ Tell us more...               │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  What are you seeking?              │
│  ┌───────────────────────────────┐ │
│  │ e.g. "laptop, desk"           │ │
│  └───────────────────────────────┘ │
│                                     │
│  Est. Value (R)                     │
│  ┌───────────────────────────────┐ │
│  │ 0                             │ │ ← Number input
│  └───────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│  [     Continue →     ]            │ ← Full-width CTA
└─────────────────────────────────────┘
```

### Form Field Specifications

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Images | Upload (max 4) | Yes (min 1) | JPG/PNG, <5MB each |
| Title | Text | Yes | 3-100 chars |
| Category | Select | Yes | Predefined list |
| Condition | Segmented | Yes | Like New/Good/Fair/Poor |
| Description | Textarea | No | Max 500 chars |
| Seeking | Tags | No | Comma-separated |
| Value | Number | No | 0-1,000,000 |

### Input Specifications

```css
input {
  width: 100%;
  min-height: 48px; /* Touch target */
  padding: 12px 16px;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-size: 16px; /* Prevent zoom on iOS */
}

input:focus {
  border-color: emerald-500;
  outline: none;
}

/* Segmented Control */
segmented-control {
  display: flex;
  gap: 8px;
}

segment {
  flex: 1;
  min-height: 44px;
  border-radius: 8px;
  font-size: 13px;
}
```

---

## 5. Trade/Offer Flow

### Split-Screen Design

```
┌─────────────────────────────────────┐
│  ← Back           Make an Offer     │
├─────────────────────────────────────┤
│                                     │
│  THEIR ITEM                         │
│  ┌───────────────────────────────┐ │
│  │ [IMG]  Gaming Chair           │ │
│  │        R 1,500 · Like New     │ │
│  └───────────────────────────────┘ │
│                                     │
│         ▼ THEY WANT ▼              │
│                                     │
│  YOUR ITEM                          │
│  ┌───────────────────────────────┐ │
│  │ [IMG]  Samsung Monitor        │ │
│  │        R 1,200 · Good         │ │
│  └───────────────────────────────┘ │
│                                     │
│  ───────────────────────────────── │
│                                     │
│  Trade Difference:                  │
│  ┌───────────────────────────────┐ │
│  │ You receive: R 300            │ │ ← Auto-calculated
│  └───────────────────────────────┘ │
│                                     │
│  Add a message (optional):          │
│  ┌───────────────────────────────┐ │
│  │ "Happy to meet in Braam..."   │ │
│  └───────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│  [     Send Offer →     ]          │
└─────────────────────────────────────┘
```

### Item Selection (Your Items)

```
┌─────────────────────────────────────┐
│  Select Your Item                    │
├─────────────────────────────────────┤
│  ┌─────────┬───────────────────────┐│
│  │ [IMG]   │ Samsung Monitor       ││
│  │         │ R 1,200 · Electronics ││
│  └─────────┴───────────────────────┘│
│  ┌─────────┬───────────────────────┐│
│  │ [IMG]   │ Study Desk            ││
│  │         │ R 800 · Furniture     ││
│  └─────────┴───────────────────────┘│
│  ┌─────────┬───────────────────────┐│
│  │ [IMG]   │+ Add New Item         ││
│  └─────────┴───────────────────────┘│
└─────────────────────────────────────┘
```

### Trade Value Calculation

```typescript
interface TradeCalculation {
  theirItem: number;    // R 1,500
  yourItem: number;     // R 1,200
  difference: number;   // R 300 (you receive)
  direction: 'receive' | 'pay'; // Based on sign
}
```

### Touch Interactions

| Element | Action |
|---------|--------|
| Item card | Tap to select |
| Selected item | Checkmark overlay |
| Swap button | Exchange positions |
| Value badge | Tap for breakdown |

---

## 6. Responsive Breakpoints

### Progressive Disclosure Matrix

| Element | Mobile (<640px) | Tablet (640-1024px) | Desktop (>1024px) |
|---------|-----------------|---------------------|-------------------|
| Bottom Nav | Fixed, visible | Hidden | Hidden |
| Sidebar Nav | Hidden | Hidden | Fixed, left |
| Item Grid | 1 column | 2 columns | 3 columns |
| Image Gallery | Swipeable | Thumbnails + main | Lightbox |
| Form Layout | Single column | Two columns | Centered card |
| Trade View | Stacked | Split-screen | Side-by-side |

### Breakpoint Specifications

```css
/* Mobile First */
@media (min-width: 640px) { /* sm: tablet */ }
@media (min-width: 768px) { /* md: small desktop */ }
@media (min-width: 1024px) { /* lg: desktop */ }
@media (min-width: 1280px) { /* xl: large desktop */ }
```

---

## 7. Accessibility Specifications

### Touch Target Compliance

| Element | Min Size | Actual Size | Status |
|---------|----------|-------------|--------|
| Nav tabs | 44×44 | 48×48 | ✅ Pass |
| FAB (Add) | 44×44 | 56×56 | ✅ Pass |
| Cards | 44×44 | 100×100 | ✅ Pass |
| Buttons | 44×44 | 48×48 | ✅ Pass |
| Input fields | 44×44 | 48px height | ✅ Pass |
| Category pills | 44×44 | 36px (scroll) | ⚠️ Add padding |

### Color Contrast

| Element | Foreground | Background | Ratio | Status |
|---------|------------|------------|-------|--------|
| Card title | white | #0f172a | 15.3:1 | ✅ AAA |
| Card meta | slate-400 | #0f172a | 5.2:1 | ✅ AA |
| Active tab | emerald-400 | #030712 | 6.8:1 | ✅ AA |
| CTA button | #030712 | emerald-500 | 8.1:1 | ✅ AAA |

### Screen Reader Support

- All images require `alt` text
- Icons require `aria-label`
- Navigation requires `aria-current="page"`
- Forms require proper `<label>` association

---

## 8. Performance Constraints

### Network Optimization (SA Conditions)

| Metric | Target | Strategy |
|--------|--------|----------|
| First Contentful Paint | <2s | Skeleton screens |
| Largest Contentful Paint | <3s | Lazy load images |
| Time to Interactive | <4s | Code splitting |
| Total Bundle (gzipped) | <150KB | Tree shaking |

### Image Optimization

```typescript
const IMAGE_CONFIG = {
  thumbnail: { width: 200, quality: 60, format: 'webp' },
  card: { width: 400, quality: 70, format: 'webp' },
  detail: { width: 800, quality: 80, format: 'webp' },
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxImages: 4,
};
```

### Offline Strategy

- Cache navigation shell
- Cache last 20 viewed items
- Queue offers for sync when online
- Show offline indicator in header

---

## 9. Animation Specifications

### Micro-Interactions

| Element | Animation | Duration |
|---------|-----------|----------|
| Card tap | scale(0.98) | 100ms |
| FAB press | scale(0.95) | 100ms |
| Screen enter | slide-in-from-right | 200ms |
| Modal open | fade + scale | 150ms |
| Pull-to-refresh | native elastic | — |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Outdoor Readability

### Bright Sunlight Considerations

| Element | Standard | Outdoor Mode |
|---------|----------|--------------|
| Background | #0f172a | #ffffff |
| Text | white | #0f172a |
| Primary | emerald-500 | emerald-600 |
| Contrast boost | — | +20% |

### Auto-Detection

```typescript
// Use AmbientLightSensor API where available
if ('AmbientLightSensor' in window) {
  const sensor = new AmbientLightSensor();
  sensor.onreading = () => {
    if (sensor.illuminance > 1000) {
      document.body.classList.add('high-contrast');
    }
  };
}
```

---

## Appendix A: Component Reference

### Existing Components (Implementation Ready)

| Component | Path | Wireframe Section |
|-----------|------|-------------------|
| BottomNav | `app/components/ui/bottom-nav.tsx` | Section 1 |
| AssetCard | `app/components/ui/asset-card.tsx` | Section 2 |
| RegionToggle | `app/components/ui/region-toggle.tsx` | Section 2 |

### Components to Build

| Component | Priority | Wireframe Section |
|-----------|----------|-------------------|
| ImageGallery | High | Section 3 |
| CameraCapture | High | Section 4 |
| TradeSplitView | High | Section 5 |
| SegmentedControl | Medium | Section 4 |
| StickyCTA | Medium | Section 3 |

---

## Appendix B: User Flow Summary

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Index   │◄───►│  Radar   │     │  Pings   │
│  (Home)  │     │  (Map)   │     │(Messages)│
└────┬─────┘     └──────────┘     └──────────┘
     │
     │ tap card
     ▼
┌──────────┐     ┌──────────┐
│  Item    │────►│  Trade   │
│  Detail  │     │  Offer   │
└──────────┘     └──────────┘
     │
     │ back
     ▼
┌──────────┐     ┌──────────┐
│  Index   │◄───►│  Add     │
│  (Home)  │     │  Item    │
└──────────┘     └──────────┘
```

---

*Document ends. Ready for implementation review.*
