---
name: barter-design-system
description: "Comprehensive design system for Barter SA marketplace. Use when building or redesigning UI components, pages, or layouts. Provides SA cultural design tokens (flag colors, ndebele patterns), component patterns (Button, Card, Badge, Avatar, Input, Skeleton), animation guidelines (motion/react v12), typography system, and mobile-first dark mode patterns. Triggers: any UI work, component creation, page design, styling, theming, or visual polish tasks."
---

# Barter Design System

SA cultural identity meets modern minimalism. Every UI decision reinforces that Barter is proudly South African — through color, pattern, motion, and language — while keeping the interface clean, fast, and accessible.

## Design Philosophy

1. **SA-first identity** — Flag-inspired palette (green, gold, black, red, white), ndebele geometric patterns, local language support
2. **Mobile-first** — 80%+ of SA users are on mobile; design for small screens first, enhance for desktop
3. **Dark mode native** — Respect `prefers-color-scheme`; all tokens have light/dark variants
4. **Motion with purpose** — Every animation communicates state, never decorates; respect `prefers-reduced-motion`
5. **Accessibility baseline** — WCAG 2.1 AA minimum; focus rings, semantic HTML, ARIA labels, color contrast ≥ 4.5:1

## Color System

SA flag palette is the foundation. All colors are defined as CSS custom properties in `globals.css` and exposed as Tailwind v4 theme tokens.

| Token | Light | Dark | Tailwind class |
|-------|-------|------|----------------|
| `--sa-green` | `#009739` | `#00B347` | `bg-sa-green`, `text-sa-green` |
| `--sa-gold` | `#FFB612` | `#FFC940` | `bg-sa-gold`, `text-sa-gold` |
| `--sa-black` | `#0F172A` | `#0F172A` | `bg-sa-black`, `text-sa-black` |
| `--sa-red` | `#DE3831` | `#DE3831` | `bg-sa-red`, `text-sa-red` |
| `--background` | `#ffffff` | `#0a0a0a` | `bg-background` |
| `--foreground` | `#0F172A` | `#ededed` | `text-foreground` |

**Full token reference** including semantic colors, spacing, shadows, and gradients: See [design-tokens.md](references/design-tokens.md).

## Component Patterns

Existing components follow a consistent structure:

- **Server components by default** — only add `'use client'` when interactivity is required
- **Named exports** — `export function ComponentName()`, no default exports
- **Tailwind v4 classes** — no CSS modules, no styled-components
- **Dark mode** — every component must include `dark:` variants
- **TypeScript strict** — explicit interfaces for all props, no `any`

### Quick Reference

```typescript
// Button — primary action
<button className="rounded-lg bg-sa-black px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b] disabled:opacity-50 dark:bg-white dark:text-sa-black dark:hover:bg-gray-200">
  Submit
</button>

// Card — content container
<div className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
  {/* content */}
</div>

// Input — form field
<input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sa-green focus:ring-1 focus:ring-sa-green dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
```

**Full component API** with all variants, sizes, and states: See [component-patterns.md](references/component-patterns.md).

## Animation System

All animations use `motion/react` v12 (NOT `framer-motion`). The codebase has established patterns in `src/components/landing/`.

### Key Principles

1. Import from `motion/react` — never from `framer-motion`
2. Always check `useReducedMotion()` and provide instant fallbacks
3. Use CSS custom properties for timing: `--ease-smooth`, `--duration-fast`, `--duration-normal`
4. Existing `@keyframes` in `globals.css`: `float`, `pulse-glow`, `gradient-shift`, `shimmer`, `text-reveal`, `spin-slow`, `heartbeat`, `bounce-scroll`, `magnetic-ripple`

```typescript
'use client';

import { motion, useReducedMotion } from 'motion/react';

export function FadeIn({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

**Full animation patterns** with scroll reveals, stagger, parallax, and accordion: See [animation-guidelines.md](references/animation-guidelines.md).

## Typography

System font stack — no custom font loading, zero CLS.

```css
font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Scale

| Role | Classes | Usage |
|------|---------|-------|
| Page title | `text-3xl font-extrabold tracking-tight sm:text-4xl` | Top of page, hero |
| Section heading | `text-xl font-bold sm:text-2xl` | Section starts |
| Card title | `text-base font-semibold` | Card headers |
| Body | `text-sm` | Default content |
| Caption | `text-xs text-gray-500 dark:text-gray-400` | Timestamps, metadata |

**Full typography reference** with gradient text, text-reveal, and hierarchy: See [typography-system.md](references/typography-system.md).

## Mobile-First Principles

1. **Bottom navigation** — fixed nav at bottom with safe area padding (`env(safe-area-inset-bottom)`)
2. **Touch targets** — minimum 44×44px for interactive elements
3. **Breakpoints** — `sm:` (640px), `md:` (768px), `lg:` (1024px); design at default (mobile) first
4. **Content padding** — `px-4` on mobile, `px-6 sm:px-8` on desktop
5. **Max width** — `max-w-5xl mx-auto` for main content areas
6. **Viewport** — `maximumScale: 1` to prevent zoom on iOS inputs
7. **PWA** — installable with service worker, offline indicator, manifest

## Dark Mode

Uses `prefers-color-scheme` media query — no manual toggle (follows system).

### Pattern

```tsx
// Light/dark pairs for common surfaces
<div className="bg-white dark:bg-gray-900">          {/* card bg */}
<div className="border-gray-200 dark:border-gray-800"> {/* borders */}
<p className="text-gray-900 dark:text-white">          {/* primary text */}
<p className="text-gray-600 dark:text-gray-400">       {/* secondary text */}
<p className="text-gray-400 dark:text-gray-500">       {/* muted text */}
```

### SA Token Adjustments

In dark mode, `--sa-green` brightens from `#009739` → `#00B347` and `--sa-gold` brightens from `#FFB612` → `#FFC940` for contrast on dark backgrounds.

## Accessibility

1. **Focus rings** — `focus-visible:ring-2 focus-visible:ring-sa-green focus-visible:ring-offset-2 focus-visible:outline-none`
2. **Semantic HTML** — `<nav>`, `<main>`, `<section>`, `<button>`, `<fieldset>`, `<legend>`
3. **ARIA** — `aria-label` on icon-only buttons, `aria-expanded` on accordions, `aria-controls` linking triggers to panels
4. **Reduced motion** — CSS `@media (prefers-reduced-motion: reduce)` zeroes all animation durations; JS components check `useReducedMotion()`
5. **Color contrast** — never rely on color alone; pair with icons, text, or patterns
6. **Screen readers** — `sr-only` class for visually hidden but accessible text

## Utility Classes (globals.css)

| Class | Purpose |
|-------|---------|
| `.ndebele-border` | Geometric green/gold/black repeating border |
| `.glass` | Glassmorphism — blur + transparency (light & dark) |
| `.glow-green` | SA green box-shadow glow |
| `.glow-gold` | SA gold box-shadow glow |
| `.gradient-text` | Green→gold gradient text |
| `.gradient-text-animated` | Animated cycling gradient text |
| `.sa-hero-gradient` | Full hero background gradient |
| `.noise-overlay` | Subtle grain texture via SVG filter |
| `.link-underline` | Animated underline on hover |
| `.legal-prose` | Typography for legal/policy pages |

## Reference Files

- **[design-tokens.md](references/design-tokens.md)** — Full token reference: colors, spacing, shadows, borders, gradients, glows
- **[component-patterns.md](references/component-patterns.md)** — Component API: Button, Card, Badge, Avatar, Input, Skeleton with all variants
- **[animation-guidelines.md](references/animation-guidelines.md)** — Motion patterns: scroll reveal, stagger, parallax, accordion, loading
- **[typography-system.md](references/typography-system.md)** — Type scale, weights, line heights, gradient text, hierarchy
