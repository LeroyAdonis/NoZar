# NoZar: Spatial Design System

> **Single source of truth for all agents.** Every UI decision flows from this document.
> Dark-first. Mobile-first. No light mode. No exceptions.

---

## Quick Reference (Copy-Paste Cheat Sheet)

```
BACKGROUND:   bg-[#030712]           | var(--nz-dark)      | gray-950
SURFACE:      bg-[#0F172A]           | var(--nz-surface)   | slate-900
SURFACE-2:    bg-[#1E293B]           |                     | slate-800
PRIMARY:      text-emerald-500       | var(--nz-emerald)   | #10B981
SECONDARY:    text-cyan-500          | var(--nz-cyan)      | #06B6D4
WARNING:      text-amber-500         |                     | #F59E0B
TEXT-HIGH:    text-slate-50          |                     | #F8FAFC
TEXT-MED:     text-slate-400         |                     | #94A3B8
TEXT-LOW:     text-slate-600         |                     | #475569
BORDER:       border-white/10
BORDER-HOVER: border-white/20
CARD:         rounded-3xl bg-[#0F172A]/80 border border-white/10 backdrop-blur-sm
```

---

## 1. Color Palette

### Base (The Void)

| Role | Hex | Tailwind | CSS Variable | Usage |
|------|-----|----------|-------------|-------|
| Background | `#030712` | `gray-950` | `var(--nz-dark)` | Page background, pure deep space |
| Surface 1 | `#0F172A` | `slate-900` | `var(--nz-surface)` | Card backgrounds, elevated panels |
| Surface 2 | `#1E293B` | `slate-800` | — | Hover states, input fields, active surfaces |

### Accents (The Energy)

| Role | Hex | Tailwind | CSS Variable | Usage |
|------|-----|----------|-------------|-------|
| Primary (Value) | `#10B981` | `emerald-500` | `var(--nz-emerald)` | CTAs, verified status, successful trades, positive actions |
| Secondary (Tech) | `#06B6D4` | `cyan-500` | `var(--nz-cyan)` | Ambient lighting, data viz, B2B elements, secondary actions |
| Warning (Risk) | `#F59E0B` | `amber-500` | — | Pending states, alerts, awaiting actions |

### Typography Colors (The Signal)

| Role | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| High Contrast | `#F8FAFC` | `slate-50` | Main headings, important content |
| Medium | `#94A3B8` | `slate-400` | Body copy, descriptions, labels |
| Low / Muted | `#475569` | `slate-600` | Borders, dividers, timestamps, metadata |

### Glow Values (for `box-shadow` and ambient effects)

| Name | Value | CSS Variable |
|------|-------|-------------|
| Emerald Glow | `rgba(16, 185, 129, 0.4)` | `var(--nz-emerald-glow)` |
| Cyan Glow | `rgba(6, 182, 212, 0.3)` | `var(--nz-cyan-glow)` |

---

## 2. Typography Strategy

### Display / Headings
```html
<h1 class="text-5xl font-black tracking-tighter text-slate-50 md:text-7xl">
  Trade without money.
</h1>
```
- Sans-serif (system default via Tailwind)
- `font-black` (`900` weight) — massive, confident statements
- `tracking-tighter` — compressed for visual impact
- Always `text-slate-50`

### Body Copy
```html
<p class="text-base font-medium leading-relaxed text-slate-400 md:text-lg">
  Exchange skills, goods, and services directly.
</p>
```
- `font-medium` (`500` weight) — not thin, high legibility on mobile OLED
- `leading-relaxed` — generous line height for readability
- `text-slate-400` for body, `text-slate-50` for emphasis within body

### Technical / UI Meta (System Labels)
```html
<span class="nz-mono-label">[ VERIFIED ID ]</span>
<span class="nz-mono-label">SYS.LOG_01</span>
<span class="nz-mono-label">TIER_03 // ACTIVE</span>
```
- Uses `.nz-mono-label` utility class (see §7)
- `font-mono`, `uppercase`, `tracking-widest`, `text-[10px]`
- Creates "system terminal" aesthetic — reinforces this is a tool, not a toy

---

## 3. The "Bento" Layout Grid

### Concept
Information is chunked into distinct bordered blocks — like a bento box or a dashboard. Each block is self-contained. The grid creates visual hierarchy through size variation, not color variation.

### Implementation
```html
<!-- Bento Grid Container -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  
  <!-- Standard Bento Block -->
  <div class="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
    <!-- content -->
  </div>

  <!-- Feature Block (spans 2 cols) -->
  <div class="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8 md:col-span-2">
    <!-- content -->
  </div>

</div>
```

### Rules
- **Borders**: `border border-white/10 rounded-2xl` or `rounded-3xl`
- **Inner glow**: `bg-gradient-to-br from-white/5 to-transparent`
- **Padding**: Minimum `p-6`, prefer `p-8` for feature blocks
- **Mobile**: Grid collapses to single column (`grid-cols-1`)
- **Gap**: `gap-4` standard, `gap-6` for hero sections
- **Ambient light**: Use radial gradients behind blocks for 3D depth:

```html
<!-- Ambient glow behind a card -->
<div class="relative">
  <div class="absolute -inset-4 rounded-3xl bg-emerald-500/5 blur-2xl"></div>
  <div class="relative nz-card p-8">
    <!-- content -->
  </div>
</div>
```

---

## 4. UI Components & Motifs

### 4.1 Glassmorphism (Use Sparingly)
**Only for**: sticky nav, modals, floating overlays.
```html
<nav class="fixed top-0 z-50 w-full backdrop-blur-xl bg-gray-950/70 border-b border-white/10">
  <!-- nav content -->
</nav>
```
Or use the `.glass` utility class for the standard glass effect.

### 4.2 Badges
Pill-shaped, mono-font, glowing borders for status. Import from `@/components/ui/badge`.

```tsx
import { Badge } from "@/components/ui/badge";

<Badge variant="verified">VERIFIED</Badge>
<Badge variant="tier_01">TIER 01</Badge>
<Badge variant="awaiting_reply">AWAITING</Badge>
```

**All Variants:**

| Variant | Style Summary | Use Case |
|---------|--------------|----------|
| `tier_01` | Purple bg/text, purple border, mono uppercase | Premium tier label |
| `tier_02` | Cyan bg/text, cyan border, mono uppercase | Mid tier label |
| `tier_03` | Emerald bg/text, emerald border, mono uppercase | Entry tier label |
| `verified` | Emerald bg/text, emerald border, mono 9px | Identity verified |
| `unverified` | White/5 bg, slate-500 text, mono 9px | Not yet verified |
| `handshake_ready` | Emerald bg/text, emerald border, mono 9px | Ready to trade |
| `awaiting_reply` | Amber bg/text, amber border, mono 9px | Waiting on response |
| `proposed` | Amber-900/30 bg, amber-300 text | Trade proposed |
| `negotiating` | Blue-900/30 bg, blue-300 text | In negotiation |
| `agreed` | Indigo-900/30 bg, indigo-300 text | Terms agreed |
| `contact_shared` | Purple-900/30 bg, purple-300 text | Contact info shared |
| `completed` | Green-900/30 bg, green-300 text | Trade completed |
| `cancelled` | Red-900/30 bg, red-300 text | Trade cancelled |
| `disputed` | Rose-900/30 bg, rose-300 text | Trade disputed |

> **NoZar-style badges** (tier_01–03, verified, unverified, handshake_ready, awaiting_reply) use `font-mono text-[9px] or text-[10px] uppercase tracking-widest` — the system terminal aesthetic.

### 4.3 Buttons
Import from `@/components/ui/button`.

```tsx
import { Button } from "@/components/ui/button";

{/* Primary CTA — dark text on emerald, bold and loud */}
<Button variant="nozar" size="lg">START TRADING</Button>

{/* Secondary — ghost with subtle border */}
<Button variant="nozarOutline" size="md">Learn More</Button>
```

**All Variants:**

| Variant | Classes | Use Case |
|---------|---------|----------|
| `nozar` | `bg-emerald-500 text-[#030712] font-black uppercase tracking-widest hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]` | Primary CTA, key actions |
| `nozarOutline` | `bg-white/5 text-white border border-white/10 hover:bg-white/10 backdrop-blur-md` | Secondary actions |
| `primary` | `bg-sa-green text-white hover:brightness-110` | Legacy SA-branded actions |
| `secondary` | `border border-gray-300 bg-transparent` | Tertiary actions |
| `ghost` | `bg-transparent hover:bg-gray-800` | Minimal UI actions |
| `danger` | `bg-sa-red text-white hover:brightness-110` | Destructive actions |

**Sizes:** `sm` (px-3 py-1.5), `md` (px-4 py-2), `lg` (px-6 py-3)

> **For new NoZar pages, use `nozar` and `nozarOutline` exclusively.** The `primary`/`secondary`/`ghost` variants exist for legacy compatibility.

### 4.4 Cards
Import from `@/components/ui/card`.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

<Card variant="nozar">
  <CardHeader>
    <CardTitle>Trade Offer</CardTitle>
    <CardDescription>Web design for photography</CardDescription>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>
```

**All Variants:**

| Variant | Classes | Use Case |
|---------|---------|----------|
| `nozar` | `rounded-3xl bg-[#0F172A]/80 border border-white/10 backdrop-blur-sm hover:border-white/20 transition-all duration-500` | All new NoZar UI |
| `default` | `rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800` | Legacy pages |
| `glass` | `rounded-xl glass` | Overlays |
| `elevated` | `rounded-xl shadow-md hover:shadow-lg` | Legacy elevated panels |

> **For new NoZar pages, always use `variant="nozar"`.** Never use `bg-white` card backgrounds.

### 4.5 Inputs
Import from `@/components/ui/input`.

```tsx
import { Input } from "@/components/ui/input";

<Input variant="nozar" label="Email" placeholder="you@example.com" />
```

**Variants:**

| Variant | Key Classes | Notes |
|---------|-------------|-------|
| `nozar` | `rounded-xl bg-[#0F172A] border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/25` | Dark input with emerald focus ring |
| `default` | Standard light/dark input | Legacy |

### 4.6 Micro-interactions
```html
<!-- Hover: increase border brightness -->
<div class="border border-white/10 hover:border-emerald-500/50 transition-colors duration-300">

<!-- Hover: subtle scale on images -->
<div class="overflow-hidden rounded-2xl">
  <img class="transition-transform duration-500 hover:scale-105" />
</div>

<!-- Hover: glow effect on cards -->
<div class="nz-card hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-shadow duration-500">
```

---

## 5. Anti-Patterns (DO NOT USE)

These patterns are **banned** from all new NoZar UI code. Agents must flag and refuse to generate them.

| ❌ Anti-Pattern | ✅ Correct Pattern | Reason |
|----------------|-------------------|--------|
| `gray-*` color scale | `slate-*` exclusively | Warmer, more refined palette |
| `bg-white` on cards/containers | `bg-[#0F172A]` or `bg-[#030712]` | Dark-first design, no light surfaces |
| `dark:` prefix overrides | Direct dark values | Design is dark-only, `dark:` is redundant |
| `rounded-lg` | `rounded-2xl` or `rounded-3xl` | Larger radii = more spatial, modern feel |
| Light mode patterns | N/A | No light mode exists |
| "Barter" / "Barter SA" branding | "NoZar." | Brand name in UI is always "NoZar." |
| Old SA tokens (`sa-green`, `sa-gold`, `sa-red`) | `emerald-500`, `cyan-500`, `amber-500` | Legacy palette; new code uses NoZar palette |
| Icon libraries (Lucide, Heroicons, etc.) | Inline SVG | Full control over styling, no bundle bloat |
| `clsx` / `tailwind-merge` | Template literals | Simpler dependency; no merge ambiguity |
| `console.log` | `lib/logger.ts` | Structured logging only |

---

## 6. CSS Custom Properties (`globals.css`)

### NoZar Design Tokens
```css
:root {
  --nz-dark: #030712;
  --nz-surface: #0F172A;
  --nz-emerald: #10B981;
  --nz-cyan: #06B6D4;
  --nz-emerald-glow: rgba(16, 185, 129, 0.4);
  --nz-cyan-glow: rgba(6, 182, 212, 0.3);
}
```

### Tailwind Theme Integration (via `@theme inline`)
```css
@theme inline {
  --color-nz-dark: var(--nz-dark);
  --color-nz-surface: var(--nz-surface);
  --color-nz-emerald: var(--nz-emerald);
  --color-nz-cyan: var(--nz-cyan);
}
```
This enables `bg-nz-dark`, `text-nz-emerald`, `border-nz-cyan` etc. in Tailwind classes.

### Animation Easing
```css
:root {
  --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --duration-fast: 200ms;
  --duration-normal: 400ms;
  --duration-slow: 800ms;
}
```

### Legacy SA Tokens (do NOT use in new code)
```css
:root {
  --sa-green: #009739;   /* → use emerald-500 instead */
  --sa-gold: #FFB612;    /* → use amber-500 instead */
  --sa-black: #0F172A;   /* → use slate-900 instead */
  --sa-red: #DE3831;     /* → use rose-500 instead */
}
```

---

## 7. Utility Classes (`globals.css`)

### `.glow-emerald`
Emerald box-shadow glow for cards and buttons.
```css
.glow-emerald {
  box-shadow: 0 0 20px 4px rgba(16, 185, 129, 0.35);
}
```
```html
<div class="glow-emerald rounded-3xl bg-[#0F172A] p-6">Glowing card</div>
```

### `.nz-gradient-text`
Emerald→Cyan gradient text effect.
```css
.nz-gradient-text {
  background: linear-gradient(to right, #10B981, #06B6D4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```
```html
<h2 class="nz-gradient-text text-4xl font-black tracking-tighter">NoZar.</h2>
```

### `.nz-hero-gradient`
White-to-transparent gradient text for hero headings.
```css
.nz-hero-gradient {
  background: linear-gradient(to bottom, white, rgba(255, 255, 255, 0.5));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```
```html
<h1 class="nz-hero-gradient text-7xl font-black tracking-tighter">
  Trade without money.
</h1>
```

### `.nz-grid-pattern`
Subtle grid background pattern for sections.
```css
.nz-grid-pattern {
  background-image:
    linear-gradient(to right, rgba(79, 79, 79, 0.18) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(79, 79, 79, 0.18) 1px, transparent 1px);
  background-size: 4rem 4rem;
}
```
```html
<section class="nz-grid-pattern min-h-screen bg-[#030712]">
  <!-- Hero content over grid -->
</section>
```

### `.nz-card`
Pre-built card styling (alternative to Card component with `variant="nozar"`).
```css
.nz-card {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.5rem;
  backdrop-filter: blur(8px);
}
```
```html
<div class="nz-card p-6 hover:border-white/20 transition-colors">
  <!-- content -->
</div>
```

### `.nz-mono-label`
System-style monospace label for categories, tags, metadata.
```css
.nz-mono-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
```
```html
<span class="nz-mono-label text-slate-400">[ VERIFIED ID ]</span>
<span class="nz-mono-label text-emerald-400">TIER_03 // ACTIVE</span>
```

### `.glass`
General-purpose glassmorphism.
```css
.glass {
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
```

### `.noise-overlay`
Subtle film grain texture overlay via SVG noise filter.
```html
<div class="noise-overlay">
  <!-- content gets subtle texture -->
</div>
```

### `.link-underline`
Animated underline on hover using SA gradient (emerald→gold).
```html
<a class="link-underline text-slate-400 hover:text-white transition-colors">
  Learn more
</a>
```

---

## 8. Component Variants Summary

### Badge (`@/components/ui/badge`)

| Variant | Visual | Font Style |
|---------|--------|------------|
| `tier_01` | Purple glow pill | `font-mono text-[10px] uppercase tracking-widest` |
| `tier_02` | Cyan glow pill | `font-mono text-[10px] uppercase tracking-widest` |
| `tier_03` | Emerald glow pill | `font-mono text-[10px] uppercase tracking-widest` |
| `verified` | Emerald subtle | `font-mono text-[9px] uppercase tracking-widest` |
| `unverified` | Muted ghost | `font-mono text-[9px] uppercase tracking-widest` |
| `handshake_ready` | Emerald subtle | `font-mono text-[9px] uppercase tracking-widest` |
| `awaiting_reply` | Amber subtle | `font-mono text-[9px] uppercase tracking-widest` |
| `proposed` | Amber | Standard text |
| `negotiating` | Blue | Standard text |
| `agreed` | Indigo | Standard text |
| `contact_shared` | Purple | Standard text |
| `completed` | Green | Standard text |
| `cancelled` | Red | Standard text |
| `disputed` | Rose | Standard text |

**Sizes:** `sm` (px-2 py-0.5 text-xs), `md` (px-2.5 py-0.5 text-sm)

### Button (`@/components/ui/button`)

| Variant | Style | When to Use |
|---------|-------|-------------|
| `nozar` | Solid emerald, dark text, black weight, uppercase | Primary CTA on NoZar pages |
| `nozarOutline` | Ghost with white/10 border, backdrop blur | Secondary action on NoZar pages |
| `primary` | Solid SA-green | Legacy SA-branded pages only |
| `secondary` | Bordered ghost | Legacy tertiary actions |
| `ghost` | Fully transparent | Minimal inline actions |
| `danger` | Solid SA-red | Destructive actions (delete, cancel) |

**Sizes:** `sm`, `md`, `lg`

### Card (`@/components/ui/card`)

| Variant | Style | When to Use |
|---------|-------|-------------|
| `nozar` | `rounded-3xl bg-[#0F172A]/80 border-white/10 backdrop-blur-sm` | All new NoZar UI |
| `default` | Standard light/dark | Legacy pages only |
| `glass` | `.glass` utility | Floating overlays |
| `elevated` | Shadow + hover shadow | Legacy elevated panels |

### Input (`@/components/ui/input`)

| Variant | Style | When to Use |
|---------|-------|-------------|
| `nozar` | `bg-[#0F172A] border-white/10 focus:border-emerald-500/50` | All new NoZar forms |
| `default` | Standard light/dark | Legacy pages only |

---

## 9. Animation Keyframes Reference

Available in `globals.css` for use with `animation:` property:

| Keyframe | Effect | Duration Suggestion |
|----------|--------|-------------------|
| `float` | Gentle vertical bob (0→-12px→0) | `6s ease-in-out infinite` |
| `pulse-glow` | Box-shadow pulse (0→30px→0) | `3s ease-in-out infinite` |
| `gradient-shift` | Background position shift (0%→100%) | `3s linear infinite` |
| `shimmer` | Horizontal translate (-100%→100%) | `2s ease-in-out infinite` |
| `text-reveal` | Fade up (opacity 0→1, y 20px→0) | `0.6s ease-out` |
| `spin-slow` | Full rotation | `20s linear infinite` |
| `heartbeat` | Scale pulse (1→1.15→1) | `2s ease-in-out infinite` |
| `bounce-scroll` | Vertical bounce (0→8px→0) | `1.5s ease-in-out infinite` |
| `magnetic-ripple` | Scale up + fade (→4x, opacity 0) | `0.6s ease-out` |

---

## 10. Page Template

When building a new NoZar page from scratch:

```tsx
export default function NewPage() {
  return (
    <main className="min-h-screen bg-[#030712] text-slate-50">
      {/* Grid pattern background */}
      <div className="nz-grid-pattern">

        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <span className="nz-mono-label text-emerald-400">SYS.ACTIVE</span>
          <h1 className="nz-hero-gradient mt-4 text-5xl font-black tracking-tighter md:text-7xl">
            Page Title Here
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-slate-400">
            Description text goes here.
          </p>
          <div className="mt-8 flex gap-4">
            <Button variant="nozar" size="lg">PRIMARY ACTION</Button>
            <Button variant="nozarOutline" size="lg">Secondary</Button>
          </div>
        </section>

        {/* Bento Grid Section */}
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card variant="nozar">
              <CardHeader>
                <Badge variant="tier_03" size="sm">ACTIVE</Badge>
                <CardTitle>Card Title</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Content here.</p>
              </CardContent>
            </Card>
            {/* More cards... */}
          </div>
        </section>

      </div>
    </main>
  );
}
```

---

## 11. Decision Tree for Agents

```
Building new UI?
├─ Is it a NoZar page? (most new work)
│  ├─ Background: bg-[#030712]
│  ├─ Cards: variant="nozar"
│  ├─ Buttons: variant="nozar" / "nozarOutline"
│  ├─ Inputs: variant="nozar"
│  ├─ Badges: use tier_*/verified/handshake_ready/awaiting_reply
│  ├─ Text: slate-50 headings, slate-400 body, slate-600 meta
│  ├─ Borders: white/10, hover white/20
│  └─ Radii: rounded-2xl minimum, rounded-3xl preferred
│
├─ Is it a legacy page update?
│  ├─ Use default/primary variants
│  └─ Follow existing patterns in that file
│
└─ Unsure?
   └─ Default to NoZar patterns. When in doubt, go darker.
```

---

*Last verified: extracted from `globals.css` and `src/components/ui/` component source files.*
