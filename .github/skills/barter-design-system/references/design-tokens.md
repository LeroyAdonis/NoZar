# Design Tokens

Complete token reference for the Barter SA design system. All tokens originate from `src/app/globals.css` and are consumed via Tailwind v4 `@theme inline` or CSS custom properties.

## Table of Contents

- [Color Palette](#color-palette)
- [Semantic Colors](#semantic-colors)
- [Spacing Scale](#spacing-scale)
- [Border Radius](#border-radius)
- [Shadows](#shadows)
- [Glow Effects](#glow-effects)
- [Gradients](#gradients)
- [Ndebele Border Pattern](#ndebele-border-pattern)
- [Animation Timing](#animation-timing)
- [Glassmorphism](#glassmorphism)

## Color Palette

### SA Flag Colors

Defined in `:root` and overridden in `@media (prefers-color-scheme: dark)`.

| Token | Light | Dark | Tailwind |
|-------|-------|------|----------|
| `--sa-green` | `#009739` | `#00B347` | `bg-sa-green`, `text-sa-green`, `border-sa-green` |
| `--sa-gold` | `#FFB612` | `#FFC940` | `bg-sa-gold`, `text-sa-gold`, `border-sa-gold` |
| `--sa-black` | `#0F172A` | `#0F172A` | `bg-sa-black`, `text-sa-black` |
| `--sa-red` | `#DE3831` | `#DE3831` | `bg-sa-red`, `text-sa-red` |
| `--sa-white` | `#FFFFFF` | `#FFFFFF` | — (use `bg-white`) |

### Surface Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `#ffffff` | `#0a0a0a` | Page background |
| `--foreground` | `#0F172A` | `#ededed` | Default text |

### Gray Scale (Tailwind defaults)

Used directly via Tailwind classes — no custom tokens needed.

| Usage | Light | Dark |
|-------|-------|------|
| Card bg | `bg-white` | `dark:bg-gray-900` |
| Borders | `border-gray-200` | `dark:border-gray-800` |
| Primary text | `text-gray-900` | `dark:text-white` |
| Secondary text | `text-gray-600` | `dark:text-gray-400` |
| Muted text | `text-gray-400` | `dark:text-gray-500` |
| Subtle bg | `bg-gray-50` | `dark:bg-gray-800` |

## Semantic Colors

Status and feedback colors follow Tailwind's palette with light/dark pairs.

### Status Badges (from trade-card.tsx)

```typescript
const STATUS_COLORS = {
  proposed:       { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  negotiating:    { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-300' },
  agreed:         { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
  contact_shared: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  completed:      { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-300' },
  cancelled:      { bg: 'bg-gray-100 dark:bg-gray-800',       text: 'text-gray-500 dark:text-gray-400' },
  disputed:       { bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-300' },
} as const;
```

### Feedback Colors

| State | Background | Text | Border | Usage |
|-------|-----------|------|--------|-------|
| Success | `bg-green-50 dark:bg-green-900/20` | `text-green-700 dark:text-green-400` | `border-green-200 dark:border-green-800` | Completed actions |
| Warning | `bg-yellow-50 dark:bg-yellow-900/20` | `text-yellow-700 dark:text-yellow-400` | `border-yellow-200 dark:border-yellow-800` | Pending attention |
| Error | `bg-red-50 dark:bg-red-900/20` | `text-red-700 dark:text-red-400` | `border-red-200 dark:border-red-800` | Validation errors |
| Info | `bg-blue-50 dark:bg-blue-900/20` | `text-blue-700 dark:text-blue-400` | `border-blue-200 dark:border-blue-800` | Informational |

### Error Banner Pattern (from listing-form.tsx)

```tsx
{error && (
  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
    {error}
  </div>
)}
```

## Spacing Scale

Follows Tailwind v4 defaults (4px base). Common patterns in the codebase:

| Token | Value | Usage |
|-------|-------|-------|
| `p-4` | 16px | Card padding, section padding on mobile |
| `px-6` | 24px | Content padding on mobile |
| `px-8` | 32px | Content padding on desktop (`sm:px-8`) |
| `gap-2` | 8px | Tight spacing between inline elements |
| `gap-4` | 16px | Standard spacing between form fields |
| `gap-8` | 32px | Section spacing |
| `mb-2` | 8px | Label-to-content gap |
| `mb-3` | 12px | Header-to-body gap in cards |
| `space-y-3` | 12px | Vertical stack of form controls |
| `space-y-6` | 24px | Vertical stack of form sections |

### Content Max Widths

| Class | Usage |
|-------|-------|
| `max-w-5xl mx-auto` | Main content container |
| `max-w-4xl mx-auto` | Hero content |
| `max-w-3xl mx-auto` | FAQ, focused content |
| `max-w-2xl mx-auto` | Stats bar, narrow sections |
| `max-w-lg mx-auto` | Subline text |

## Border Radius

| Class | Usage |
|-------|-------|
| `rounded-full` | Badges, avatars, pills |
| `rounded-2xl` | Glass panels, hero elements |
| `rounded-xl` | Cards, bottom nav highlight |
| `rounded-lg` | Buttons, inputs, form elements |
| `rounded-md` | Small selects, filter controls |

## Shadows

### Elevation Levels

| Level | Class | Usage |
|-------|-------|-------|
| 0 (flat) | — | Default cards, resting state |
| 1 (hover) | `shadow-md` | Card hover via `transition-shadow hover:shadow-md` |
| 2 (elevated) | `shadow-lg` | Dropdowns, popovers |
| 3 (overlay) | `shadow-xl` | Modals, overlays |

### Glass Shadow

The `.glass` class creates its own visual depth via `backdrop-filter: blur(24px)` plus translucent border — no traditional shadow needed.

```css
.glass {
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  background: rgba(255, 255, 255, 0.08);       /* dark mode */
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* Light mode override */
@media (prefers-color-scheme: light) {
  .glass {
    background: rgba(255, 255, 255, 0.65);
    border-color: rgba(0, 0, 0, 0.08);
  }
}
```

## Glow Effects

SA-branded glows for emphasis and hover states.

```css
/* Green glow — primary CTA hover, active states */
.glow-green {
  box-shadow: 0 0 20px 4px rgba(0, 151, 57, 0.35);
}

/* Gold glow — premium features, highlights */
.glow-gold {
  box-shadow: 0 0 20px 4px rgba(255, 182, 18, 0.35);
}

/* Pulse glow — attention-grabbing animation (use sparingly) */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0px 0px rgba(0, 151, 57, 0.4); }
  50%      { box-shadow: 0 0 30px 10px rgba(0, 151, 57, 0.25); }
}
```

### Button Glow on Hover (from magnetic-button.tsx)

```typescript
const VARIANT_STYLES = {
  primary: 'bg-sa-green text-white border border-transparent hover:shadow-[0_0_20px_4px_rgba(0,151,57,0.35)]',
  secondary: 'bg-transparent text-sa-green border border-sa-green/40 hover:border-sa-green hover:shadow-[0_0_20px_4px_rgba(0,151,57,0.15)]',
};
```

## Gradients

### Hero Gradient

```css
.sa-hero-gradient {
  background: linear-gradient(135deg, var(--sa-green) 0%, var(--sa-gold) 50%, var(--sa-black) 100%);
}
```

### Text Gradients

```css
/* Static — for headings and labels */
.gradient-text {
  background: linear-gradient(135deg, var(--sa-green), var(--sa-gold));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* Animated — cycling effect for hero text */
.gradient-text-animated {
  background: linear-gradient(90deg, var(--sa-green), var(--sa-gold), var(--sa-green));
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: gradient-shift 3s linear infinite;
}
```

### Underline Gradient (link-underline)

```css
.link-underline::after {
  background: linear-gradient(90deg, var(--sa-green), var(--sa-gold));
  /* slides from width: 0 → 100% on hover */
}
```

### Active FAQ State Gradient

```typescript
// Green left border + subtle green tint when accordion item is open
borderColor: isOpen ? 'var(--sa-green)' : 'transparent',
backgroundColor: isOpen ? 'color-mix(in srgb, var(--sa-green) 5%, transparent)' : 'transparent',
```

## Ndebele Border Pattern

A geometric repeating border inspired by Ndebele art traditions.

```css
.ndebele-border {
  border-image: repeating-linear-gradient(
    90deg,
    var(--sa-green) 0px,
    var(--sa-green) 8px,
    var(--sa-gold) 8px,
    var(--sa-gold) 16px,
    var(--sa-black) 16px,
    var(--sa-black) 24px
  ) 4;
  border-width: 4px;
  border-style: solid;
}
```

**Usage**: Bottom edge of hero section, section dividers, decorative accents.

```tsx
<div
  className="ndebele-border absolute inset-x-0 bottom-0 border-t-4 border-l-0 border-r-0 border-b-0"
  aria-hidden="true"
/>
```

## Animation Timing

CSS custom properties for consistent timing across CSS and JS animations.

```css
:root {
  --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);   /* expo-out feel */
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* playful overshoot */
  --duration-fast: 200ms;    /* micro-interactions: hover, focus */
  --duration-normal: 400ms;  /* transitions: slides, fades */
  --duration-slow: 800ms;    /* dramatic: page entrance, hero */
}
```

### Spring Configs (motion/react)

```typescript
// Snappy — expand/collapse, panel transitions
const springExpand = { type: 'spring', stiffness: 300, damping: 30 };

// Playful — icon morphs, button press
const springIcon = { type: 'spring', stiffness: 400, damping: 15 };

// Magnetic — button follow cursor
const SPRING_CONFIG = { stiffness: 300, damping: 20, mass: 0.5 };
```

## Glassmorphism

Apply the `.glass` class for frosted-glass panels. Works on both light and dark backgrounds.

```tsx
<div className="glass rounded-2xl px-6 py-5">
  {/* content with frosted background */}
</div>
```

### Noise Overlay

Adds subtle grain texture to any container. Apply to a positioned parent:

```tsx
<section className="noise-overlay relative isolate">
  {/* noise is applied via ::before pseudo-element */}
</section>
```
