# Phase 1: Interactive Tutorial — Pattern Map

**Mapped:** 2026-05-23
**Files analyzed:** 4 (1 create, 2 modify, 1 delete)
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/components/ui/tutorial-overlay.tsx` | component | event-driven | `app/components/ui/welcome-overlay.tsx` | exact |
| `app/routes/dashboard.tsx` | route/layout | request-response | self (existing WelcomeOverlay wiring, lines 164–172, 488–490) | exact |
| `app/routes/dashboard/profile.tsx` | route/component | event-driven | `app/routes/dashboard/profile.tsx` lines 751–760 (Plan row) | exact |
| `app/components/ui/welcome-overlay.tsx` | — | — | DELETE — no pattern needed | n/a |

---

## Pattern Assignments

### `app/components/ui/tutorial-overlay.tsx` (component, event-driven)

**Analog:** `app/components/ui/welcome-overlay.tsx`

**Imports pattern** (welcome-overlay.tsx lines 1–1):
```tsx
import { useEffect } from "react";
// TutorialOverlay also needs useState for currentSlide and transitioning:
import { useEffect, useState } from "react";
```

**Props shape** (welcome-overlay.tsx lines 3–5):
```tsx
// Existing single-prop shape — extend with onNavigate:
type WelcomeOverlayProps = {
  onDismiss: () => void;
};

// New shape for TutorialOverlay:
type TutorialOverlayProps = {
  onDismiss: () => void;
  onNavigate: (to: string) => void;
};
```

**Backdrop + accessibility pattern** (welcome-overlay.tsx lines 17–22):
```tsx
<div
  className="fixed inset-0 z-[200] bg-[#030712]/95 backdrop-blur-xl flex items-center justify-center p-6"
  role="dialog"
  aria-modal="true"
  aria-labelledby="welcome-dialog-title"
>
```
> TutorialOverlay: use `aria-label="NoZar tutorial"` instead of `aria-labelledby` (no static title element). Keep identical backdrop classes. Add `onClick={handleBackdropClick}` on outer div to advance on tap (D-02).

**Keyboard listener pattern** (welcome-overlay.tsx lines 8–14):
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onDismiss();
  };
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [onDismiss]);
```
> TutorialOverlay: extend this to also handle `ArrowRight`/`Space` (advance) and `ArrowLeft` (back). Escape calls `onDismiss` directly (marks seen).

**Container + typography pattern** (welcome-overlay.tsx lines 23–33):
```tsx
<div className="max-w-sm w-full space-y-8 text-center">
  <h2
    id="welcome-dialog-title"
    className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-white mb-3"
  >
    Welcome to NoZar
  </h2>
  <p className="text-slate-400 text-sm leading-relaxed">
    Swap what you have for what you need. No cash needed.
  </p>
</div>
```
> Copy `max-w-sm w-full text-center` container and both typography classes exactly.

**CTA button pattern** (welcome-overlay.tsx lines 54–61):
```tsx
<button
  autoFocus
  type="button"
  onClick={onDismiss}
  className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:bg-emerald-400 transition-colors"
>
  Let's go →
</button>
```
> TutorialOverlay: copy base classes, add `hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]` and `active:scale-95` from `button.tsx` nozar variant (line 23):
```tsx
// button.tsx line 23 — nozar variant full class string:
"bg-emerald-500 text-[#030712] font-black uppercase tracking-widest hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
```

**Feature list item pattern** (welcome-overlay.tsx lines 43–51):
```tsx
<div
  key={text}
  className="flex items-center gap-4 p-4 bg-[#0F172A] rounded-xl border border-white/5"
>
  <span aria-hidden="true" className="text-2xl flex-shrink-0">{emoji}</span>
  <span className="text-sm text-slate-300">{text}</span>
</div>
```
> The emoji illustration for TutorialOverlay is a standalone large emoji (text-6xl), not a list item. Use `aria-hidden="true"` on the emoji span to match this pattern.

**Per-slide transition state** (no existing analog — from UI-SPEC.md):
```tsx
// Internal state needed:
const [currentSlide, setCurrentSlide] = useState(0);
const [transitioning, setTransitioning] = useState(false);

// Transition class logic:
const contentClasses = transitioning
  ? "opacity-0 -translate-y-2 transition-all duration-150 ease-in"
  : "opacity-100 translate-y-0 transition-all duration-200 ease-out";

// Advance sequence (UI-SPEC.md Animation Contract):
// 1. setTransitioning(true)           → opacity-0 -translate-y-2 (exit)
// 2. setTimeout(150ms) → setCurrentSlide(next)
//                      → setTransitioning(false) // re-enter from translate-y-3
```

**Skip button pattern** — use label/link style from profile.tsx's "Upgrade →" link (line 757):
```tsx
// profile.tsx line 754-759 — anchor style to match for Skip:
className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest hover:text-emerald-300"

// Skip button in TutorialOverlay uses slate variant (not emerald — it's destructive-adjacent):
className="text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-slate-300 p-2 absolute top-6 right-6"
```

**Progress dots** — no existing analog; implement per UI-SPEC.md verbatim:
```tsx
<div
  className="flex items-center gap-2 mt-8 mb-6"
  role="tablist"
  aria-label={`Tutorial progress: slide ${currentSlide + 1} of 6`}
>
  {SLIDES.map((_, i) => (
    <button
      key={i}
      role="tab"
      aria-selected={i === currentSlide}
      aria-label={`Slide ${i + 1}`}
      onClick={() => goToSlide(i)}
      className={
        i === currentSlide
          ? "w-5 h-1.5 rounded-full bg-emerald-500 transition-all duration-200"
          : "w-1.5 h-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-all duration-200"
      }
    />
  ))}
</div>
```

**Overlay enter animation** — use `animate-in fade-in duration-300 ease-out` on the outer wrapper div (Tailwind CSS animate-in plugin, already used in dashboard.tsx line 382 with `animate-in fade-in zoom-in-95`).

**Emoji re-key pattern** (UI-SPEC.md):
```tsx
// Re-key the emoji span so Tailwind animate-in retriggers on every slide:
<span
  key={currentSlide}
  aria-hidden="true"
  className="text-6xl mb-6 animate-in zoom-in-95 duration-200 ease-out"
>
  {SLIDES[currentSlide].emoji}
</span>
```

---

### `app/routes/dashboard.tsx` (route/layout, request-response)

**Analog:** Self — existing `hasSeenWelcome` wiring at lines 164–172 and 488–490.

**Import swap** (dashboard.tsx line 27):
```tsx
// REMOVE:
import { WelcomeOverlay } from "~/components/ui/welcome-overlay";

// ADD:
import { TutorialOverlay } from "~/components/ui/tutorial-overlay";
```

**Add `useNavigate`** — dashboard.tsx currently imports from `react-router` at line 2. Add `useNavigate` to that import:
```tsx
// Current (line 2):
import { Link, Outlet, useLocation, useNavigation } from "react-router";

// Updated:
import { Link, Outlet, useLocation, useNavigation, useNavigate } from "react-router";
```

**State initializer pattern** (dashboard.tsx lines 164–172) — copy exactly, change key and variable names:
```tsx
// EXISTING (lines 164–172) — the pattern to replicate:
const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("nozar_welcome_seen") === "1";
});

const handleWelcomeDismiss = () => {
  localStorage.setItem("nozar_welcome_seen", "1");
  setHasSeenWelcome(true);
};

// NEW — drop in immediately after the above block (before it is removed):
const navigate = useNavigate();

const [hasSeenTutorial, setHasSeenTutorial] = useState(() => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("nozar_tutorial_seen") === "1";
});

const handleTutorialDismiss = () => {
  localStorage.setItem("nozar_tutorial_seen", "1");
  setHasSeenTutorial(true);
};
```

**Companion pattern for location modal dismiss** (lines 151–162) — shows the `localStorage.removeItem` + `setIsX(false)` mirror used for "reopen"; TutorialOverlay does NOT need reopen in dashboard.tsx, but profile.tsx's replay uses the same `removeItem` approach:
```tsx
const handleLocationReopen = () => {
  localStorage.removeItem("nozar_location_dismissed");
  setIsLocationDismissed(false);
};
```

**JSX render swap** (dashboard.tsx lines 488–490):
```tsx
// REMOVE:
{!hasSeenWelcome && (
  <WelcomeOverlay onDismiss={handleWelcomeDismiss} />
)}

// ADD (same position, after <LocationPromptModal>, before <BottomNav>):
{!hasSeenTutorial && (
  <TutorialOverlay
    onDismiss={handleTutorialDismiss}
    onNavigate={navigate}
  />
)}
```

> **Constraint:** Keep `TutorialOverlay` render *after* `<LocationPromptModal>` in DOM order. Both use `z-[200]`; tutorial should use `z-[200]` or higher so it renders above location modal on first visit.

---

### `app/routes/dashboard/profile.tsx` (route/component, event-driven)

**Analog:** Self — existing "Free plan" row at lines 751–760 and "Add & verify" link pattern at lines 742–748.

**Import addition** — profile.tsx already imports from `react-router` (line 4: `Form, useNavigation, useFetcher, Link`). Add `useNavigate`:
```tsx
// Current (line 4):
import { Form, useNavigation, useFetcher, Link } from "react-router";

// Updated:
import { Form, useNavigation, useFetcher, Link, useNavigate } from "react-router";
```

**Handler** — add near other action handlers in the component function body:
```tsx
const navigate = useNavigate();

const handleReplayTutorial = () => {
  localStorage.removeItem("nozar_tutorial_seen");
  navigate("/dashboard");
};
```

**Placement in JSX** — insert the new row between the "Free plan" row (line 760) and the "Sign out" section (line 762). Match the Plan row structure exactly:

```tsx
{/* Existing Plan row — analog to copy (lines 751–760): */}
<div className="p-4 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-between">
  <span className="text-sm text-slate-400">Free plan — 5 listings</span>
  <Link
    to="/dashboard/billing"
    className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest hover:text-emerald-300"
  >
    Upgrade →
  </Link>
</div>

{/* NEW — Tutorial row (insert immediately after the Plan row above): */}
<div className="p-4 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-between">
  <span className="text-sm text-slate-400">Tutorial</span>
  <button
    type="button"
    onClick={handleReplayTutorial}
    className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
  >
    Replay tutorial →
  </button>
</div>
```

> **Pattern note:** The existing "Add & verify →" link (lines 742–748) uses `<Link to=...>` because it navigates to a route. The "Replay tutorial →" uses `<button type="button" onClick=...>` because it performs a side effect (localStorage write) before navigating — consistent with how `handleWelcomeDismiss` / `handleLocationDismiss` work elsewhere.

---

## Shared Patterns

### LocalStorage Onboarding Flags
**Source:** `app/routes/dashboard.tsx` lines 151–172
**Apply to:** `tutorial-overlay.tsx` (writes via `onDismiss`), `dashboard.tsx` (state init + handler), `profile.tsx` (removeItem + navigate)

```tsx
// Init pattern — SSR-safe lazy initializer:
const [hasSeenX, setHasSeenX] = useState(() => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("nozar_X_seen") === "1";
});

// Set pattern:
localStorage.setItem("nozar_X_seen", "1");
setHasSeenX(true);

// Clear pattern (replay):
localStorage.removeItem("nozar_X_seen");
```

### Full-Screen Overlay Backdrop
**Source:** `app/components/ui/welcome-overlay.tsx` line 18
**Apply to:** `tutorial-overlay.tsx` (outer wrapper)

```tsx
className="fixed inset-0 z-[200] bg-[#030712]/95 backdrop-blur-xl flex items-center justify-center p-6"
```

### Dialog Accessibility
**Source:** `app/components/ui/welcome-overlay.tsx` lines 19–21
**Apply to:** `tutorial-overlay.tsx` outer wrapper

```tsx
role="dialog"
aria-modal="true"
// welcome-overlay uses aria-labelledby; tutorial-overlay uses aria-label (UI-SPEC):
aria-label="NoZar tutorial"
```

### Keyboard Event Listener (useEffect cleanup)
**Source:** `app/components/ui/welcome-overlay.tsx` lines 8–14
**Apply to:** `tutorial-overlay.tsx`

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onDismiss();
    // Add: ArrowRight / Space → advance; ArrowLeft → back
  };
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [onDismiss]);
```

### Emerald CTA Button
**Source:** `app/components/ui/button.tsx` lines 23–24 (`nozar` variant) + `welcome-overlay.tsx` lines 54–61
**Apply to:** `tutorial-overlay.tsx` primary action button

```tsx
// Full inline class string (nozar variant expanded + size):
className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
```

### Mono Label / Link Style
**Source:** `app/routes/dashboard/profile.tsx` lines 744–747 and 754–759
**Apply to:** Skip button in `tutorial-overlay.tsx`, Replay link in `profile.tsx`

```tsx
// Emerald links (Upgrade →, Add & verify →, Replay tutorial →):
className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"

// Muted Skip button (different role — not a nav action):
className="text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
```

### Dark Surface Card Row
**Source:** `app/routes/dashboard/profile.tsx` lines 752–760 (Plan row)
**Apply to:** Tutorial row in `profile.tsx`

```tsx
className="p-4 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-between"
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Progress dot indicator (within `tutorial-overlay.tsx`) | sub-component | event-driven | No existing multi-step progress indicator in codebase; implement per UI-SPEC.md verbatim |
| Per-slide content transition logic | state machine | event-driven | No existing slide/stepper animation pattern; implement the two-phase exit/enter timeout sequence per UI-SPEC.md Animation Contract |

---

## Metadata

**Analog search scope:** `app/components/ui/`, `app/routes/dashboard.tsx`, `app/routes/dashboard/profile.tsx`
**Files scanned:** 5 (`welcome-overlay.tsx`, `dashboard.tsx`, `profile.tsx`, `location-prompt-modal.tsx`, `button.tsx`)
**Pattern extraction date:** 2026-05-23
