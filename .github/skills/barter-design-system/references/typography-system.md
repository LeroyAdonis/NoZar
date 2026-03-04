# Typography System

Typography patterns for the Barter SA marketplace. Uses a system font stack with no custom font loading — zero CLS, instant rendering.

## Table of Contents

- [Font Stack](#font-stack)
- [Heading Scale](#heading-scale)
- [Body Text](#body-text)
- [Text Color Hierarchy](#text-color-hierarchy)
- [Font Weights](#font-weights)
- [Line Heights](#line-heights)
- [Gradient Text](#gradient-text)
- [Text Animations](#text-animations)
- [Legal Prose](#legal-prose)
- [Common Patterns](#common-patterns)

## Font Stack

Defined on `body` in `globals.css`:

```css
font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

Applied globally via:
```tsx
<body className="antialiased">
```

No `next/font` — the system font stack provides native feel on every OS without font loading delays.

## Heading Scale

| Role | Tailwind Classes | Responsive | Example Usage |
|------|-----------------|------------|---------------|
| Hero headline | `text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl` | ✅ | Landing page hero |
| Page title | `text-2xl font-bold tracking-tight sm:text-3xl` | ✅ | Top of page, `<h1>` |
| Section heading | `text-xl font-bold sm:text-2xl` | ✅ | Section dividers, `<h2>` |
| Subsection | `text-lg font-semibold` | — | Card group headers |
| Card title | `text-base font-semibold` | — | Card header, inline heading |
| Label | `text-sm font-medium` | — | Form labels, nav items |
| Caption | `text-xs` | — | Timestamps, metadata |
| Tiny | `text-[11px] sm:text-xs` | ✅ | Stats labels, fine print |

### Examples

```tsx
// Hero headline
<h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl">
  Trade What You Have.
</h1>

// Page title
<h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-gray-900 dark:text-white">
  My Listings
</h1>

// Section heading
<h2 className="text-xl font-bold sm:text-2xl text-gray-900 dark:text-white">
  How It Works
</h2>

// Card title
<h3 className="text-base font-semibold text-gray-900 dark:text-white">
  Rate this Trade
</h3>

// FAQ question
<span className="text-base font-semibold text-sa-black dark:text-white sm:text-lg">
  What is Barter SA?
</span>
```

## Body Text

| Size | Class | Usage |
|------|-------|-------|
| Default | `text-sm` | Most body text, form inputs, card content |
| Large | `text-base sm:text-lg md:text-xl` | Hero subline, feature descriptions |
| Small | `text-xs` | Captions, timestamps, helper text, badges |

```tsx
// Hero subline — larger with line-height
<p className="text-base leading-relaxed text-white/75 sm:text-lg md:text-xl">
  South Africa's first peer-to-peer barter platform.
</p>

// Card body
<p className="text-sm text-gray-600 dark:text-gray-400">
  Description text here
</p>

// FAQ answer
<p className="text-sm leading-relaxed text-gray-600 sm:text-base dark:text-gray-400">
  Answer text here
</p>

// Truncated preview
<p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
  Long text that truncates after 2 lines
</p>
```

## Text Color Hierarchy

| Level | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| Primary | `text-gray-900` | `dark:text-white` | Headings, titles, primary content |
| Secondary | `text-gray-600` | `dark:text-gray-400` | Body text, labels, descriptions |
| Muted | `text-gray-500` | `dark:text-gray-400` | Helper text, secondary labels |
| Faint | `text-gray-400` | `dark:text-gray-500` | Timestamps, inactive items |
| Inverted | `text-white` | — | Text on dark/colored backgrounds |
| SA Primary | `text-sa-black` | `dark:text-white` | SA-branded headings |
| SA Accent | `text-sa-green` | — | Links, active indicators |
| Value | `text-green-700` | `dark:text-green-400` | ZAR amounts, positive values |
| Danger | `text-red-500` | — | Required asterisks, errors |

### On Colored Backgrounds

```tsx
// On hero gradient
<p className="text-white/75">Semi-transparent white text</p>
<span className="text-white/50">More subtle white text</span>
<span className="text-white/60 uppercase tracking-wider">Labels on dark</span>
```

## Font Weights

| Weight | Class | Usage |
|--------|-------|-------|
| `800` | `font-extrabold` | Hero headlines only |
| `700` | `font-bold` | Page titles, section headings |
| `600` | `font-semibold` | Card titles, nav items, button text |
| `500` | `font-medium` | Form labels, badges, body emphasis |
| `400` | (default) | Body text, descriptions |
| `300` | `font-light` | Accordion icon (+), decorative |

## Line Heights

| Class | Value | Usage |
|-------|-------|-------|
| `leading-[1.1]` | 1.1 | Hero headlines (tight) |
| `leading-tight` | 1.25 | Compact headings |
| `leading-normal` | 1.5 | Default body text |
| `leading-relaxed` | 1.625 | Long-form text, FAQ answers, sublines |
| `line-height: 1.75` | 1.75 | Legal prose (`.legal-prose p`) |

## Gradient Text

### Static Gradient

Green → gold gradient applied to text. Use for emphasis headings and brand callouts.

```tsx
// CSS class (from globals.css)
<span className="gradient-text">Barter SA</span>

// React component (with reduced-motion awareness)
import { GradientText } from '@/components/landing/gradient-text';

<GradientText as="h2">Featured Trades</GradientText>
```

### Animated Gradient

Cycling green → gold → green effect. Use sparingly — only for hero headlines.

```tsx
<GradientText as="span" animate>
  Trade What You Have
</GradientText>
```

CSS behind it:
```css
.gradient-text-animated {
  background: linear-gradient(90deg, var(--sa-green), var(--sa-gold), var(--sa-green));
  background-size: 200% auto;
  animation: gradient-shift 3s linear infinite;
}
```

## Text Animations

### Text Reveal

Entrance animation for headings — opacity + translateY:

```css
@keyframes text-reveal {
  0%   { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

### Word-by-Word Reveal (Hero)

Choreographed word entrance using motion/react variants:

```typescript
const wordVariants: Variants = {
  hidden: { opacity: 0, y: 32, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

// Each word staggered by 0.09s
<motion.span
  variants={wordVariants}
  initial="hidden"
  animate="visible"
  transition={{ delay: baseDelay + i * 0.09 }}
>
  {word}
</motion.span>
```

### Animated Underline

Slides in from left on hover — for links:

```tsx
<a className="link-underline" href="#">
  Learn more
</a>
```

CSS:
```css
.link-underline::after {
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--sa-green), var(--sa-gold));
  transition: width var(--duration-normal) var(--ease-smooth);
}
.link-underline:hover::after {
  width: 100%;
}
```

## Legal Prose

For legal/policy pages, apply `.legal-prose` to the container:

```tsx
<div className="legal-prose">
  <h2>Terms of Service</h2>
  <p>Long-form legal text with comfortable line-height (1.75)...</p>
  <ul>
    <li>List items with matching line-height</li>
  </ul>
</div>
```

CSS:
```css
.legal-prose h2 { scroll-margin-top: 5rem; }
.legal-prose p  { line-height: 1.75; }
.legal-prose ul, .legal-prose ol { line-height: 1.75; }
```

## Common Patterns

### Price/Value Display

```tsx
<span className="font-medium text-green-700 dark:text-green-400">
  R 2,500
</span>
```

### Metadata Row

```tsx
<div className="flex flex-wrap items-center gap-2 text-sm">
  <span className="font-medium text-green-700 dark:text-green-400">R 500</span>
  <span className="text-gray-500 dark:text-gray-400">· Like New</span>
  <span className="text-gray-500 dark:text-gray-400">· Local Meetup</span>
</div>
```

### Location with Icon

```tsx
<div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
  <svg className="h-3.5 w-3.5" ...>{/* map pin */}</svg>
  Sandton
</div>
```

### Timestamp

```tsx
<span className="text-xs text-gray-400">2h ago</span>
```

### Stats Label

```tsx
<span className="text-[11px] font-medium tracking-wider uppercase text-white/60 sm:text-xs">
  Listings
</span>
```

### Scroll Indicator Text

```tsx
<span className="text-xs tracking-widest uppercase text-white/50">
  Scroll to explore
</span>
```

### "Looking for" Preview

```tsx
<p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
  <span className="font-medium">Looking for:</span> Description of what they want
</p>
```

### Form Required Asterisk

```tsx
<label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
  Title <span className="text-red-500">*</span>
</label>
```

### Screen Reader Only Text

```tsx
<span className="sr-only">Close menu</span>
```
