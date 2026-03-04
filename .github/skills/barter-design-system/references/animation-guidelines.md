# Animation Guidelines

Motion patterns for the Barter SA marketplace using `motion/react` v12. All animation code lives in client components (`'use client'`).

## Table of Contents

- [Core Rules](#core-rules)
- [Imports](#imports)
- [Reduced Motion](#reduced-motion)
- [CSS Keyframes (globals.css)](#css-keyframes)
- [Page Entrance: Staggered Fade-Up](#page-entrance-staggered-fade-up)
- [Scroll Reveal](#scroll-reveal)
- [Card Hover](#card-hover)
- [Button Press Feedback](#button-press-feedback)
- [Magnetic Button](#magnetic-button)
- [Accordion Expand/Collapse](#accordion-expandcollapse)
- [Loading States](#loading-states)
- [Parallax Scrolling](#parallax-scrolling)
- [Gradient Text Animation](#gradient-text-animation)
- [Timing Reference](#timing-reference)

## Core Rules

1. **Import from `motion/react`** — never `framer-motion` (deprecated package name)
2. **Always check `useReducedMotion()`** — provide instant fallbacks for every animation
3. **Use established easing** — `[0.16, 1, 0.3, 1]` (expo-out) matches `--ease-smooth`
4. **Animate layout properties sparingly** — prefer `opacity`, `transform` (`x`, `y`, `scale`, `rotate`)
5. **Keep animations under 600ms** — unless choreographed hero sequences
6. **CSS keyframes for looping animations** — `float`, `pulse-glow`, `shimmer` etc. from globals.css
7. **motion/react for interactive/triggered animations** — scroll reveals, hover, press, expand

## Imports

```typescript
'use client';

// Standard imports
import { motion, useReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';

// Scroll-driven
import { motion, useInView, useReducedMotion } from 'motion/react';

// Parallax
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';

// Spring-based
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

// Presence animations (mount/unmount)
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
```

## Reduced Motion

Every animated component MUST respect user preference:

```typescript
const prefersReducedMotion = useReducedMotion();
const reduced = !!prefersReducedMotion;

// Pattern 1: Conditional initial/animate values
<motion.div
  initial={reduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: reduced ? 0 : 0.5 }}
>

// Pattern 2: Conditional variants
const variants: Variants = {
  hidden: reduced ? { opacity: 1 } : { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// Pattern 3: Skip whileHover/whileTap
<motion.div
  whileHover={reduced ? undefined : { scale: 1.04 }}
  whileTap={reduced ? undefined : { scale: 0.97 }}
>
```

CSS-level fallback already in globals.css:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
    transition-duration: 0.01ms;
    scroll-behavior: auto;
  }
}
```

## CSS Keyframes

Available `@keyframes` in `globals.css` — use via `style={{ animation: '...' }}` or Tailwind's `animate-*`:

| Name | Duration | Usage |
|------|----------|-------|
| `float` | 4-8s, infinite | Floating decorative shapes |
| `pulse-glow` | — | Attention-grabbing green glow |
| `gradient-shift` | 3s, infinite | Cycling gradient text |
| `shimmer` | 1.5s, infinite | Skeleton loading shimmer |
| `text-reveal` | — | Text entrance (opacity + translateY) |
| `spin-slow` | — | Slow rotation for loaders |
| `heartbeat` | — | Subtle scale pulse |
| `bounce-scroll` | 1.8s, infinite | Scroll indicator bounce |
| `magnetic-ripple` | 0.6s | Button click ripple expanding circle |

```tsx
// Using CSS keyframe in JSX
<div style={{ animation: reduced ? 'none' : 'float 6s ease-in-out infinite' }} />

// Using Tailwind animate class
<div className="animate-pulse" />  // Built-in Tailwind pulse
```

## Page Entrance: Staggered Fade-Up

Use `StaggerChildren` wrapper for lists of cards or content blocks:

```typescript
'use client';

import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';

const containerVariants: Variants = {
  hidden: {},
  visible: (staggerDelay: number) => ({
    transition: { staggerChildren: staggerDelay, delayChildren: 0.1 },
  }),
};

const childVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export function StaggerChildren({
  children,
  staggerDelay = 0.1,
  className,
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px 0px' });
  const reduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      custom={reduced ? 0 : staggerDelay}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={reduced ? { hidden: { opacity: 1 }, visible: { opacity: 1 } } : childVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

## Scroll Reveal

Fade-in with directional offset when element enters viewport:

```typescript
'use client';

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';

type Direction = 'up' | 'down' | 'left' | 'right';

const OFFSETS: Record<Direction, { x: number; y: number }> = {
  up:    { x: 0, y: 40 },
  down:  { x: 0, y: -40 },
  left:  { x: 40, y: 0 },
  right: { x: -40, y: 0 },
};

export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
}: {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px 0px' });
  const reduced = useReducedMotion();
  const offset = OFFSETS[direction];

  return (
    <motion.div
      ref={ref}
      initial={reduced ? { opacity: 1 } : { opacity: 0, ...offset }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : reduced ? { opacity: 1 } : { opacity: 0, ...offset }}
      transition={{
        duration: reduced ? 0 : duration,
        delay: reduced ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
```

**Key settings:**
- `once: true` — only animate once per page load
- `margin: '-80px 0px'` — trigger 80px before element is fully visible
- Ease `[0.16, 1, 0.3, 1]` — matches `--ease-smooth`

## Card Hover

Cards use CSS-only hover transitions (no motion/react needed):

```tsx
// Standard card hover — shadow elevation
<div className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">

// Enhanced card hover — scale + shadow (for special cards)
<motion.div
  className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
  whileHover={reduced ? undefined : { scale: 1.02, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
>
```

## Button Press Feedback

```typescript
// Scale down on press, scale up on hover
<motion.button
  whileHover={reduced ? undefined : { scale: 1.04 }}
  whileTap={reduced ? undefined : { scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  Click Me
</motion.button>
```

## Magnetic Button

Cursor-following button that pulls toward the mouse pointer:

```typescript
const MAGNETIC_RADIUS = 20;
const SPRING_CONFIG = { stiffness: 300, damping: 20, mass: 0.5 };

// Track cursor position relative to button center
const x = useMotionValue(0);
const y = useMotionValue(0);
const springX = useSpring(x, SPRING_CONFIG);
const springY = useSpring(y, SPRING_CONFIG);

// On mousemove: clamp delta to MAGNETIC_RADIUS
// On mouseleave: reset to 0
// On click: spawn ripple with magnetic-ripple animation

<motion.div
  style={{ x: springX, y: springY }}
  whileHover={reduced ? undefined : { scale: 1.04 }}
  whileTap={reduced ? undefined : { scale: 0.97 }}
>
```

See full implementation: `src/components/landing/magnetic-button.tsx`

## Accordion Expand/Collapse

Uses `AnimatePresence` for mount/unmount animation:

```typescript
const springExpand = { type: 'spring' as const, stiffness: 300, damping: 30 };

<AnimatePresence initial={false}>
  {isOpen && (
    <motion.div
      initial={reduced ? undefined : { height: 0, opacity: 0 }}
      animate={reduced ? undefined : { height: 'auto', opacity: 1 }}
      exit={reduced ? undefined : { height: 0, opacity: 0 }}
      transition={reduced ? undefined : {
        height: springExpand,
        opacity: { duration: 0.25, delay: 0.08 },
      }}
      style={{ overflow: 'hidden' }}
    >
      {/* content */}
    </motion.div>
  )}
</AnimatePresence>
```

### Icon Morph (+ → ×)

```typescript
const springIcon = { type: 'spring' as const, stiffness: 400, damping: 15 };

<motion.span
  animate={reduced ? undefined : { rotate: isOpen ? 45 : 0, scale: isOpen ? 1.15 : 1 }}
  transition={reduced ? undefined : springIcon}
>
  +
</motion.span>
```

## Loading States

### Skeleton Shimmer

Use Tailwind's `animate-pulse` for simple cases:

```tsx
<div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
```

For richer shimmer, use the `shimmer` keyframe:

```tsx
<div className="relative overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
  <div
    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
    style={{ animation: 'shimmer 1.5s infinite' }}
  />
</div>
```

### Spinner

```tsx
<svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
</svg>
```

### Pending State (form actions)

```tsx
const [isPending, startTransition] = useTransition();

<button disabled={isPending} className="disabled:opacity-50">
  {isPending ? 'Saving…' : 'Submit'}
</button>
```

## Parallax Scrolling

Scroll-driven vertical offset for decorative elements:

```typescript
const containerRef = useRef<HTMLDivElement>(null);
const { scrollYProgress } = useScroll({
  target: containerRef,
  offset: ['start end', 'end start'],
});

const range = parallaxFactor * 120; // 0.2–0.8 factor
const y = useTransform(scrollYProgress, [0, 1], [range, -range]);

<motion.div style={{ y: reduced ? 0 : y }}>
  {/* parallax content */}
</motion.div>
```

See full implementation: `src/components/landing/floating-shapes.tsx`

## Gradient Text Animation

```typescript
'use client';

import { useReducedMotion } from 'motion/react';

export function GradientText({
  children,
  as: Tag = 'span',
  animate = false,
  className,
}: {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'span';
  animate?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const gradientClass = animate && !reduced ? 'gradient-text-animated' : 'gradient-text';

  return (
    <Tag className={`${gradientClass} ${className ?? ''}`}>
      {children}
    </Tag>
  );
}
```

## Timing Reference

### Easing Curves

| Name | Value | Usage |
|------|-------|-------|
| Smooth (expo-out) | `[0.16, 1, 0.3, 1]` | Most transitions, scroll reveals |
| Bounce | `[0.68, -0.55, 0.265, 1.55]` | Playful micro-interactions |
| Linear | `linear` | Looping gradients, infinite spins |

### Duration Guidelines

| Duration | Usage |
|----------|-------|
| 0–200ms | Hover states, focus, micro-feedback |
| 200–400ms | Panel transitions, slides |
| 400–600ms | Scroll reveals, fade-ins |
| 600ms+ | Hero choreography only (staggered sequences) |

### Spring Presets

| Name | Config | Usage |
|------|--------|-------|
| Expand | `{ stiffness: 300, damping: 30 }` | Height animations, panels |
| Icon | `{ stiffness: 400, damping: 15 }` | Icon morphs, small elements |
| Magnetic | `{ stiffness: 300, damping: 20, mass: 0.5 }` | Cursor follow |
| Button | `{ stiffness: 400, damping: 17 }` | Hover/press scale |

### Choreography Pattern (Hero)

For complex entrance sequences, define timing constants:

```typescript
const TIMING = {
  wordStagger: 0.09,     // per-word delay
  line2Delay: 0.55,      // second headline line
  sublineDelay: 1.15,    // supporting text
  ctaDelay: 1.55,        // action buttons
  ctaStagger: 0.15,      // between buttons
  statsDelay: 2.0,       // stats bar
  scrollDelay: 2.6,      // scroll indicator
} as const;
```

See full implementation: `src/components/landing/animated-hero.tsx`
