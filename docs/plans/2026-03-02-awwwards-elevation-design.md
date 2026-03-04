# Barter SA — Awwwards-Level UI/UX Elevation Design

**Date:** 2026-03-02
**Status:** Approved
**Current Score:** 4.8/10 → **Target:** 8.5+/10

## Problem

Landing page has excellent information architecture and SA branding but feels static. Zero scroll animations, no micro-interactions, basic hover states, flat visual depth.

## Approach

Component-by-Component Enhancement — enhance each section in-place with Framer Motion scroll reveals, parallax, micro-interactions. Keep Server Component page structure, extract interactive sections to client components.

## Dependencies

- **Framer Motion** (~30KB) — scroll reveals, layout animations, gestures

## Foundation

- CSS @keyframes: float, pulse-glow, gradient-shift, shimmer, text-reveal
- Custom easing: smooth-decel [0.16, 1, 0.3, 1], bounce [0.68, -0.55, 0.265, 1.55]
- Glass morphism, glow effects, gradient text, noise overlay
- Reusable primitives: ScrollReveal, StaggerChildren, MagneticButton, GradientText, AnimatedCounter, CustomCursor, FloatingShapes, ParallaxLayer

## Section Upgrades

### Hero
- Staggered word-by-word headline reveal
- Animated gradient text shimmer
- Floating Ndebele SVG shapes with parallax
- Magnetic CTA buttons with glow + ripple
- Animated counter stats bar
- Bouncing scroll indicator
- Cursor-following radial light

### How It Works
- Scroll-triggered staggered card reveal
- SVG connector lines drawing on scroll
- Active step highlighting

### Features Grid
- Glass morphism cards with 3D tilt hover
- Staggered wave reveal
- Glow shadow on hover

### Pricing
- Glass morphism, hover scale + glow
- Popular tier pulse glow border
- Animated price counters

### Testimonials
- Carousel with Framer AnimatePresence + drag
- Auto-rotate 5s, swipe on mobile
- Animated avatar rings, staggered stars

### FAQ
- Spring physics expand with content fade
- Active question green border + highlight
- Smooth icon morph (+ → ×)

### Final CTA
- Animated shifting gradient background
- Gradient text shimmer headline
- Oversized magnetic CTA with glow

### Footer
- Animated ndebele border color cycling
- Link underline slide animation
- Heartbeat emoji

## Constraints
- System fonts only
- Mobile-first responsive
- Dark mode support
- prefers-reduced-motion respected
- will-change on animated elements
- Touch devices: no custom cursor, swipe for carousel
