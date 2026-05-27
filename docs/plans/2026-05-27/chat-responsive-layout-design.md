# Chat Page Responsive Layout — Design

**Date:** 2026-05-27  
**Scope:** `app/routes/dashboard/pings.$id.tsx`  
**Status:** Approved

---

## Problem

The pings chat page (`/dashboard/pings/:id`) has layout breakdowns at small and medium
screen sizes:

1. **Small screens** — `MessageInput` crams icon action buttons, three quick-reply pill
   buttons, a text input, and a send button into a single `flex gap-2` row. "Can you add
   another item?" gets squashed and the text input elongates to fill remaining space.
2. **Medium screens** — The `md:w-3/5` / `md:w-2/5` percentage split at 768px gives the
   chat column only ~317px (sidebar-offset viewport), which is too narrow.

---

## Approach: Two-Row Input + Fixed Right Panel

### Section 1 — MessageInput Restructure

Split the single broken flex row into two distinct rows:

**Row 1 — Quick reply pills (horizontal scroll strip)**
- Only renders when `status === "proposed"`
- `overflow-x-auto whitespace-nowrap` — pills never wrap or squash
- Subtle right-edge fade mask to indicate scrollability
- Each pill is an independent `<Form method="post">` button (unchanged behaviour)

**Row 2 — Action toolbar + text input + send**
- `flex items-center gap-2`
- Handshake icon button: `shrink-0` (conditional on `status === "proposed"`)
- Balance icon button: `shrink-0` (conditional on `status === "proposed"`)
- Text input: `flex-1 min-w-0` — takes all remaining horizontal space
- Send button: `shrink-0`

Visual sketch:
```
┌──────────────────────────────────────────────────────────────┐
│ ← Can you add another item? · No thanks. · What else do…  → │  ← scroll
├──────────────────────────────────────────────────────────────┤
│ [🛡] [⚖]  [  Encrypted transmission...            ]  [➤]  │
└──────────────────────────────────────────────────────────────┘
```

### Section 2 — Two-Column Layout Proportions

**Before:** percentage-based `md:w-3/5` / `md:w-2/5`  
**After:** fixed right panel + flex-1 chat

| Column        | Class                         | Width at 768px |
|---------------|-------------------------------|----------------|
| Chat (left)   | `flex-1 min-w-0`              | ~480px         |
| Trade panel   | `w-72 shrink-0 lg:w-80`       | 288px / 320px  |

The chat column always gets all leftover space. The right panel stays a predictable
fixed width — avoids an overly wide empty panel on large displays.

### Section 3 — Header & Misc Hardening

- Add `shrink-0` to the left side (back/report/cancel buttons) and right avatar in the
  chat header so they are never squeezed.
- Simplify center title truncation: remove hardcoded `max-w-[120px] sm:max-w-none` —
  the center div already has `min-w-0 flex-1`, so `truncate` alone is sufficient.
- Add `min-w-0` to the inner chat column wrapper to prevent content overflow.

---

## Files Changed

| File | Change |
|------|--------|
| `app/routes/dashboard/pings.$id.tsx` | Restructure `MessageInput`, fix column proportions, header hardening |

---

## Non-Goals

- No changes to right-column content or trade status panel layout
- No changes to mobile status panels (inline `md:hidden` cards in message scroll area)
- No JS added — pills remain plain form submits
