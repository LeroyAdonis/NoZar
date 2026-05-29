# Phase 4: Trade Chat & Handshake UX Redesign — Research

**Researched:** 2025-01-27
**Domain:** React Router v7 SSR, Tailwind v4, real-time SSE, bottom-sheet UX, mobile-responsive layout
**Confidence:** HIGH (all findings verified directly from codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

| DB Status | User-Facing Label |
|---|---|
| `proposed` | **Chatting** |
| `negotiating` | **Deal Agreed** (transitional — both tapped) |
| `agreed` | **Arrange Meetup** |
| `contact_shared` | **Done** |
| `completed` | **Done ✓** |

- Primary deal-agreement button: **"Agree to Trade"**
- Confirmation button label (second user): **"Confirm Deal"**
- Chat input placeholder: **"What are you offering?"**
- Safety messaging: **Removed from chat UI entirely**. One-time dismissible banner on first trade chat open (tracked in localStorage). Permanent safety info moves to profile page.
- Trade actions surfaced as **inline CTA cards in the chat thread** — NOT in a drawer or bottom sheet
- **"Agree to Trade" CTA card appears as the very first message** in a new trade thread, for both parties
- 2/2 counter mechanic: symmetric tap-once, no initiator/accepter distinction
- Bottom sheet fix: `pb-[calc(env(safe-area-inset-bottom)+80px)]` or equivalent; `max-h-[calc(85dvh-80px)]` or `max-h-[75dvh]`
- Breakpoints: `md:` (768px) triggers two-column, not `lg:` (current broken state)
- Right panel at md+: Trade progress stepper + full asset cards + action buttons
- DB trade statuses **do not change**: `proposed → negotiating → agreed → contact_shared → completed`
- `negotiating` now means "both parties tapped Agree to Trade (2/2)"
- Design system: always dark, `#030712` base, `#0F172A` cards, emerald-500 accent, brutalist mono typography
- React Router v7 SSR — no client-only state outside of UI interactions
- SSE endpoint unchanged
- `npm run typecheck` must pass with no new errors

### The Agent's Discretion

- Whether HandshakeFlow.tsx is built out as a proper component or logic is folded inline into pings.$id.tsx
- Exact file split strategy for pings.$id.tsx (which sub-components to extract)

### Deferred Ideas (OUT OF SCOPE)

- React Native mobile app (Phase 3)
- Backend trade lifecycle changes (DB statuses stay the same)
- New notification types or push events for trade state changes
- Dispute/freeze flow redesign
- Referral or billing changes
</user_constraints>

---

## Summary

`app/routes/dashboard/pings.$id.tsx` is a 2,200-line single-file route module containing: loader, action (12 intents), and a React component with an inline `renderTradeStatusPanel()` function plus 4 extracted sub-components. The current layout uses `lg:` (1024px) breakpoints exclusively — tablets at 768–1023px see a broken single-column experience with no right panel. Bottom sheets (`showTradeStatus` and `BalancePile`) use `fixed inset-0` which extends behind the 80px bottom nav; the content's bottom padding does not account for the nav height.

The handshake mechanic currently uses `proposeHandshake` (proposed→negotiating) and `acceptHandshake` (negotiating→agreed) — a two-step asymmetric flow. The new 2/2 symmetric mechanic requires per-user agreement tracking. The `readinessFlags` table (currently used for contact-sharing gating in `agreed` state) is the cleanest existing table for this purpose with a reset strategy at status transition. No DB migration is required if we reuse it carefully.

The `HandshakeFlow.tsx` and `ChatWindow.tsx` components are both stubs — they are **not used anywhere in pings.$id.tsx** (the route renders its own message list and handshake UI inline). All meaningful UI logic lives in the main route file.

**Primary recommendation:** Keep the action layer (loader + action + SSE) in `pings.$id.tsx`. Extract the right-panel, inline-CTA, and 2/2-counter as focused sub-components to reduce the file's cognitive complexity while avoiding any risk to the SSE subscription lifecycle.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Chat message rendering | Frontend (route component) | — | Messages loaded from DB via loader, rendered client-side |
| Real-time updates (SSE) | Frontend (useEffect EventSource) | API route `/api/chat-stream/:tradeId` | EventSource opened in component, server pushes `new-messages` events |
| Trade state transitions (intents) | API / Backend (action) | — | All DB mutations in server action; form submits trigger revalidation |
| 2/2 agreement counter | Frontend (derived from loader data) | Backend (action upserts readinessFlags) | Count of readinessFlags rows = counter; render is client-side |
| Inline CTA cards | Frontend (route component, chat list render) | — | Synthetic/computed messages injected into render pipeline |
| One-time safety banner | Frontend only (localStorage) | — | No server state needed; localStorage key tracks dismissal |
| Bottom sheet layout | Frontend (CSS/Tailwind) | — | Pure layout fix: padding + max-height adjustments |
| Responsive two-column | Frontend (CSS/Tailwind) | — | Breakpoint change from `lg:` to `md:` in layout classes |
| Safety/trust section on profile | Frontend (profile.tsx component) | Loader (existing trustProfile data) | Static content section; trust data already loaded |
| Contact sharing | Backend (action: shareContact) | Frontend (form submit) | DB insert + status advance already works; needs UX surface change |

---

## Standard Stack

All libraries already installed — no new dependencies required for this phase.

### Core (already in project)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| React Router v7 | current | SSR routing, loader/action, Form, useFetcher, useRevalidator | Use `Form`, `useFetcher` from `react-router` |
| Tailwind v4 | current | Utility-first CSS, dark theme | Via `@tailwindcss/vite`, no `tailwind.config` file |
| Lucide React | current | Icon set | Already imported extensively in pings.$id.tsx |
| EventSource (Web API) | browser | SSE client | Already implemented in the route |

### No New Dependencies Required
[VERIFIED: codebase] The entire phase is UI/UX work on existing infrastructure. No new npm packages needed.

---

## Architecture Patterns

### Current pings.$id.tsx Structure (2,200 lines)

```
pings.$id.tsx
├── imports (lines 1–52)
├── meta() (lines 54–62)
├── loader() (lines 66–231)          — DB queries, returns 15 fields
├── action() (lines 235–959)         — 12 intent cases (switch statement)
│   ├── sendMessage
│   ├── counterOffer
│   ├── archive
│   ├── proposeHandshake             ← TO RENAME/REPLACE
│   ├── acceptHandshake              ← TO RENAME/REPLACE
│   ├── shareContact
│   ├── completeTrade
│   ├── cancelTrade
│   ├── submitRating
│   ├── reportTrade
│   ├── unfreezeTrade
│   ├── toggleReady
│   ├── addTradeItem
│   ├── generateSafeZone
│   └── voteMeetupSpot
├── PingDetail component (lines 963–1850) — default export
│   ├── Derived state / refs / fetchers (lines 963–1117)
│   ├── renderTradeStatusPanel() (lines 1134–1565)  ← local function, not a component
│   └── JSX return (lines 1567–1850)
│       ├── Fixed outer container
│       ├── Left col: chat header, trust banner, status chip, messages list, footer
│       ├── Right col: desktop status panel (hidden lg:flex)
│       ├── Mobile bottom sheet (showTradeStatus)
│       ├── ReportModal
│       └── BalancePile
├── MessageInput (lines 1852–1996)   — sub-component
├── ShareContactForm (lines 1998–2053) — sub-component
├── RatingForm (lines 2055–2121)     — sub-component
└── DisclosedContactsCard (lines 2123–2200+) — sub-component
```

### System Architecture Diagram (Data Flow)

```
User tap "Agree to Trade"
         │
         ▼
 React Router Form POST
 intent="agreeToTrade"
         │
         ▼
 action() → upsert readinessFlags (userId, tradeId)
         │
         ├─ count == 1? → return { agreementCount: 1 }
         │                 (status stays "proposed")
         │
         └─ count == 2? → UPDATE trades SET status="negotiating"
                        → DELETE readinessFlags (reset for contact-sharing)
                        → INSERT messages (system: "2/2 agreed")
                        → return { ok: true }
                        │
                        ▼
              revalidator.revalidate()
                        │
                        ▼
              loader re-fetches → new status + isReady/theyReady
                        │
                        ▼
              Component re-renders with 2/2 counter

SSE (EventSource) ──► "new-messages" event ──► revalidator.revalidate()
                  ──► (catches the system message inserted above)
```

### Recommended Sub-Component Extraction

```
pings.$id.tsx (keep: loader, action, PingDetail, SSE effect)
├── TradeStepper.tsx          — NEW: 4-step progress bar
├── TradeCTACard.tsx          — NEW: inline CTA card in chat thread
├── AgreementCounter.tsx      — NEW: X/2 agreed counter widget
├── TradeStatusPanel.tsx      — EXTRACT: renderTradeStatusPanel() → component
├── MessageInput.tsx          — already extracted (lines 1852–1996)
├── ShareContactForm.tsx      — already extracted (lines 1998–2053)
├── RatingForm.tsx            — already extracted (lines 2055–2121)
└── DisclosedContactsCard.tsx — already extracted (lines 2123+)
```

**Key safety rule:** All extracted components can use `Form` and `useFetcher` from `react-router` — they inherit the router context. The SSE `useEffect` and `revalidator` **must remain in `PingDetail`** (the route default export) to avoid stale closure issues.

### Pattern 1: Current Two-Column Layout (BROKEN at tablet)

```tsx
// CURRENT — only shows right panel at lg+ (1024px)
<div className="fixed inset-x-0 lg:left-60 top-[73px] bottom-20 lg:bottom-0 z-20
                bg-[#030712] flex flex-col lg:flex-row">
  <div className="flex flex-col flex-1 min-w-0 min-h-0 lg:border-r lg:border-white/5">
    {/* chat */}
  </div>
  <div className="hidden lg:flex flex-col w-72 lg:w-80 ...">
    {/* right panel — invisible on tablet */}
  </div>
</div>
```

```tsx
// FIXED — two-column at md+ (768px)
<div className="fixed inset-x-0 md:left-60 top-[73px] bottom-20 md:bottom-0 z-20
                bg-[#030712] flex flex-col md:flex-row">
  <div className="flex flex-col flex-1 min-w-0 min-h-0 md:border-r md:border-white/5">
    {/* chat */}
  </div>
  <div className="hidden md:flex flex-col w-72 md:w-80 ...">
    {/* right panel — visible at 768px+ */}
  </div>
</div>
```
[VERIFIED: codebase, line 1570]

**Caution:** The sidebar in `dashboard.tsx` uses `md:pl-60` or similar — verify `md:left-60` is the correct offset at tablet. If the sidebar is hidden at tablet, the offset should not apply. Check dashboard.tsx layout classes before changing the `left-*` breakpoint.

### Pattern 2: Bottom Sheet Clipping Fix

```tsx
// CURRENT (showTradeStatus sheet) — clips behind 80px bottom nav
<div className="relative bg-[#0F172A] rounded-t-3xl border-t border-white/10
                flex flex-col max-h-[85dvh]">
  <div className="overflow-y-auto ... px-5 py-4 space-y-4"
       style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}>
```

```tsx
// FIXED — accounts for 80px bottom nav
<div className="relative bg-[#0F172A] rounded-t-3xl border-t border-white/10
                flex flex-col max-h-[calc(85dvh-80px)]">
  <div className="overflow-y-auto ... px-5 py-4 space-y-4
                  pb-[calc(env(safe-area-inset-bottom,0px)+80px)]">
```
[VERIFIED: codebase, lines 1795–1817]

```tsx
// CURRENT (BalancePile) — clips behind bottom nav
<div className="w-full max-w-md bg-[#111827] ... max-h-[85vh] overflow-y-auto">

// FIXED
<div className="w-full max-w-md bg-[#111827] ...
                max-h-[calc(85vh-80px)] overflow-y-auto
                pb-[calc(env(safe-area-inset-bottom,0px)+20px)]">
```
[VERIFIED: codebase, balance-pile.tsx line 84]

### Pattern 3: 2/2 Agreement Counter (New `agreeToTrade` Intent)

**DB approach:** Reuse `readinessFlags` table (tradeId, userId, ready, readyAt). This table already has a unique constraint on `(tradeId, userId)` — perfect for symmetric per-user flags.

**The reset strategy:**
- When first user taps "Agree to Trade" → upsert `readinessFlags` with `ready=true`
- When second user taps → upsert, count flags, if 2 → advance to `negotiating` AND **delete both flags** so the table is clean for the contact-sharing step
- Contact sharing step uses `toggleReady` which already upserts to `readinessFlags` — this works cleanly after the reset

```typescript
// New action intent: "agreeToTrade"
case "agreeToTrade": {
  if (trade.status !== "proposed") {
    return { error: "Trade must be in proposed state" };
  }

  // Upsert this user's agreement flag
  const [existing] = await db.select()
    .from(readinessFlags)
    .where(and(eq(readinessFlags.tradeId, tradeId), eq(readinessFlags.userId, user.id)))
    .limit(1);

  if (existing) {
    await db.update(readinessFlags)
      .set({ ready: true, readyAt: new Date() })
      .where(eq(readinessFlags.id, existing.id));
  } else {
    await db.insert(readinessFlags).values({
      tradeId, userId: user.id, ready: true, readyAt: new Date()
    });
  }

  // Count agreements
  const [{ count: agreementCount }] = await db
    .select({ count: count() })
    .from(readinessFlags)
    .where(and(eq(readinessFlags.tradeId, tradeId), eq(readinessFlags.ready, true)));

  if (agreementCount >= 2) {
    // 2/2 — advance to negotiating and RESET flags for contact-sharing step
    await db.update(trades)
      .set({ status: "negotiating", updatedAt: new Date() })
      .where(eq(trades.id, tradeId));
    await db.delete(readinessFlags)
      .where(eq(readinessFlags.tradeId, tradeId));
    await db.insert(messages).values({
      tradeId, senderId: user.id,
      text: "Both parties agreed — deal locked! Arrange your meetup.",
      type: "system",
    });
  }

  return { ok: true, agreementCount };
}
```
[VERIFIED: codebase, readinessFlags schema at schema.ts lines 268–278]

**Loader update needed:** The loader already fetches `isReady` and `theyReady` from `readinessFlags`. These now serve double-duty — at `proposed` status they represent "Agree to Trade" flags; at `agreed` status they represent contact-sharing readiness. Since flags are reset at the `proposed→negotiating` transition, there's no collision.

### Pattern 4: Inline CTA Cards in Chat Thread

CTA cards are **synthetic** (computed from trade state, not stored as messages). They are injected into the message render list based on conditions:

```tsx
// In the message list render loop:
const syntheticMessages = buildCTACards({
  status, isReady, theyReady,
  currentUserId, trade, counterparty
});

// Render: [...syntheticMessages, ...chatMessages].sort by time
// Or: inject as first item + at-status-transition points
```

```tsx
// CTA card shape (synthetic, not DB-backed)
type CTACard = {
  id: string;              // deterministic: "cta-agree-to-trade"
  type: "cta";
  variant: "agree" | "confirm-deal" | "share-contact" | "complete";
  position: "first" | "after-message-id";
  message?: string;
};
```

**CTA injection points:**
1. `proposed` + no flags: "Agree to Trade" CTA as FIRST item (before all messages)
2. `proposed` + this user agreed (isReady=true): "Waiting for X to agree..." 1/2 counter card
3. `proposed` + both agreed about to become `negotiating`: already handled by server
4. `negotiating`: "Both agreed! Now arrange your meetup" card
5. `agreed` + contact not yet shared: "Share your contact info" card
6. `contact_shared`: contact details inline card

### Pattern 5: Existing Responsive Patterns (Reference)

```tsx
// BalancePile — emerald accent button pattern
className="w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black
           uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]
           transition-all"

// System message pill pattern
className="text-[9px] font-mono uppercase tracking-widest text-slate-500
           bg-[#0F172A] px-3 py-1 rounded-full border border-white/5"

// Card container pattern
className="p-5 rounded-2xl bg-[#0F172A] border border-emerald-500/30
           shadow-[0_0_30px_rgba(16,185,129,0.1)]"

// Label pattern
className="font-mono uppercase tracking-widest text-[10px] text-slate-500"

// Brutalist heading
className="font-black uppercase tracking-tighter text-white text-sm"
```
[VERIFIED: codebase, pings.$id.tsx throughout]

### Pattern 6: localStorage Safety Banner (One-Time Dismissal)

```tsx
// In PingDetail component — hydration-safe pattern
const [safetyBannerDismissed, setSafetyBannerDismissed] = useState(true); // default true = no flash

useEffect(() => {
  const dismissed = localStorage.getItem('nozar:safety-banner-dismissed');
  if (!dismissed) setSafetyBannerDismissed(false);
}, []);

const handleDismissBanner = () => {
  localStorage.setItem('nozar:safety-banner-dismissed', '1');
  setSafetyBannerDismissed(true);
};

{!safetyBannerDismissed && (
  <div className="...banner...">
    <button onClick={handleDismissBanner}>Got it</button>
  </div>
)}
```
[VERIFIED: pattern consistent with codebase SSR guard conventions]
[ASSUMED: No existing localStorage utility exists in `app/lib/` — manual implementation needed]

### Pattern 7: SSE Real-Time Integration (DO NOT MODIFY)

```tsx
// In PingDetail component — lines 1059–1086
useEffect(() => {
  let mounted = true;
  function safeRevalidate() {
    if (mounted && revalidatorRef.current.state === "idle") {
      revalidatorRef.current.revalidate();
    }
  }
  if (typeof EventSource === "undefined") {
    const interval = setInterval(safeRevalidate, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }
  const es = new EventSource(`/api/chat-stream/${trade.id}`);
  es.addEventListener("new-messages", safeRevalidate);
  es.onerror = () => { es.close(); };
  return () => { mounted = false; es.close(); };
}, [trade.id]);
```

**Critical:** The `revalidatorRef` pattern (storing `revalidator` in a ref to avoid re-running the effect) is intentional and correct. When extracting sub-components, the SSE effect must remain in `PingDetail` (the component that holds `revalidator`).
[VERIFIED: codebase, lines 1059–1086]

### Anti-Patterns to Avoid

- **Don't move the SSE `useEffect` into a sub-component:** it requires `revalidatorRef` from the parent; moving it creates stale closure risks and complicates the dependency array
- **Don't use the `"use client"` directive:** `HandshakeFlow.tsx` and `ChatWindow.tsx` have invalid `"use client"` directives (Next.js convention, not React Router v7). Remove these when touching those files — they are TypeScript noise, not errors yet
- **Don't store CTA card state in DB messages:** CTA cards should be computed from trade state, not inserted as DB messages — keeping them synthetic avoids migration and keeps the message table clean
- **Don't add `lg:left-60` for tablet layout without verifying sidebar breakpoint:** Check dashboard.tsx — if sidebar uses `md:block`, then `md:left-60` is correct; if sidebar uses `lg:block`, then `md:left-0` is needed
- **Don't reinitialize readinessFlags for the contact-sharing step if they weren't reset during `agreeToTrade`:** Reset flags at the `proposed→negotiating` transition to avoid flag contamination
- **Don't cast `formData.get("text") as string` without null guard:** The existing `offerText` at ~line 330 does this; fix to `(formData.get("text") as string | null)?.trim() ?? ""` pattern

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-user symmetric flags | New table | `readinessFlags` (already exists) | Unique constraint (tradeId, userId) is exactly what's needed |
| Bottom sheet clipping | Custom z-index manager | Tailwind `pb-[calc(...)]` + `max-h-[calc(...)]` | Simple CSS fix |
| Real-time counter update | WebSocket or custom polling | Existing SSE + `revalidator.revalidate()` | Already works; inserting a system message triggers SSE push |
| One-time banner | Server-side user prefs | `localStorage` | No auth required; content is purely presentational |
| Progress stepper | External component | Inline Tailwind with dots/lines | Codebase uses zero UI library components (shadcn-style) |
| CTA card animations | Framer Motion | Tailwind `transition-all` | Consistent with existing animation patterns |

---

## Common Pitfalls

### Pitfall 1: Breaking the Tablet Sidebar Offset
**What goes wrong:** Changing `lg:left-60` to `md:left-60` without checking if the sidebar is actually visible at md. If the sidebar is hidden at md, the 240px left offset creates a blank column.
**Why it happens:** The dashboard layout (`app/routes/dashboard.tsx`) controls sidebar visibility independently of this route.
**How to avoid:** Read `app/routes/dashboard.tsx` bottom-nav and sidebar classes before changing breakpoints. Specifically check: `md:block` vs `lg:block` on the sidebar element.
**Warning signs:** White/dark gap on the left side of the screen at 768px.

### Pitfall 2: readinessFlags Flag Contamination Between Stages
**What goes wrong:** User A and B both agree (flags set), status advances to `negotiating`, flags NOT deleted. Later at `agreed` stage, `toggleReady` checks flags that are already `true` — both parties appear "ready" without actually confirming for contact sharing.
**Why it happens:** The same `readinessFlags` table is reused for both the "agree to trade" and "contact sharing readiness" steps.
**How to avoid:** In `agreeToTrade` action, after advancing to `negotiating`, DELETE all `readinessFlags` for the trade: `await db.delete(readinessFlags).where(eq(readinessFlags.tradeId, tradeId))`.
**Warning signs:** Contact sharing form appears immediately when trade first enters `agreed` state.

### Pitfall 3: Duplicate System Messages for "1/2 agreed"
**What goes wrong:** Inserting a system message when the first user agrees creates a DB record visible in chat. If the 2/2 advance message is also inserted, users see two system messages. Alternatively, inserting on first-agree pollutes the message stream.
**Why it happens:** System messages are permanent DB records; the "1/2 agreed" state is transitional.
**How to avoid:** Do NOT insert a system message for the 1/2 state. Show the counter via the inline CTA card (client-side, derived from loader data). Only insert a system message on 2/2 (the permanent transition).

### Pitfall 4: TypeScript Errors from Mixed Action Return Types
**What goes wrong:** The action returns `{ ok: true }`, `{ error: string }`, `{ success: boolean }`, `{ agreementCount: number }` — all as possible union members. React Router v7 infers a wide return type. When adding `agreementCount`, the union widens and components accessing action data must handle all branches.
**Why it happens:** The action has 12+ intent cases with different return shapes.
**How to avoid:** Add a type-safe discriminated union or use `satisfies` assertion: `return { ok: true, agreementCount } satisfies { ok: boolean; agreementCount: number }`. Or, since these are separate intents, just ensure the component only accesses `agreementCount` from the right fetcher.
**Warning signs:** `npm run typecheck` fails with "property does not exist on type union".

### Pitfall 5: offerText TypeScript Error (~line 330)
**What goes wrong:** `(formData.get("text") as string)?.trim()` — TypeScript strict mode treats `FormDataEntryValue` (which is `string | File`) as not directly castable to `string` in some configurations.
**Why it happens:** `formData.get()` returns `FormDataEntryValue | null`. The cast `as string` skips the `File` possibility.
**How to avoid:** Use `(formData.get("text") as string | null)?.trim() ?? ""` or `String(formData.get("text") ?? "").trim()`.

### Pitfall 6: "use client" Directive in Non-Next.js Files
**What goes wrong:** `HandshakeFlow.tsx` and `ChatWindow.tsx` have `"use client"` at line 1. React Router v7 does not process this directive. It's harmless at runtime but is technically a string literal at the top of a module (not an error currently) — but it's incorrect and should be removed when editing those files.
**How to avoid:** Remove `"use client"` from any file touched in this phase. Do the same for `profile.tsx` line 1.

### Pitfall 7: AssetCard Type Mismatch for Right Panel
**What goes wrong:** The existing `AssetCard` component requires `ListingCard` type which has `distance`, `timeAgo`, `userName`, `isVerified`, `imageUrl` fields. The loader only returns a partial `Listing` record (from Drizzle schema), not a full `ListingCard`.
**Why it happens:** `ListingCard` is a view model built by the home feed loader with distance calculations; the pings loader doesn't compute these.
**How to avoid:** Create a simplified inline `TradeSummaryCard` component (or mini-card) for the right panel that only needs `title` and `estimatedValueZar` — do not try to use the existing `AssetCard`. The trade only stores a single `listingId`; there's no "counterparty's offered listing" ID in the schema.

---

## Key File Audit Results

### pings.$id.tsx — Current Layout & Breakpoints

**Container (line 1570):**
```tsx
<div className="fixed inset-x-0 lg:left-60 top-[73px] bottom-20 lg:bottom-0 z-20
                bg-[#030712] flex flex-col lg:flex-row">
```
- `top-[73px]` — offsets the 73px dashboard header (verified in comment at line 1123)
- `bottom-20` = 80px on mobile — correct clearance for bottom nav
- `lg:bottom-0` — desktop flush, no bottom nav
- `lg:flex-row` — **BROKEN at tablet (768–1023px gets single column)**
- `lg:left-60` — **BROKEN at tablet if sidebar is visible at md+**

**Right panel (line 1776):**
```tsx
<div className="hidden lg:flex flex-col w-72 lg:w-80 ...">
```
- **BROKEN: tablet gets `display:none`**

**Mobile status chip (line 1663):**
```tsx
<button className="lg:hidden ...">
```
- Shows on mobile AND tablet — this is fine (collapses the right panel into a bottom sheet trigger)

**Mobile bottom sheet (line 1795):**
```tsx
<div className="relative bg-[#0F172A] rounded-t-3xl ... flex flex-col max-h-[85dvh]">
  <div className="overflow-y-auto ... px-5 py-4 space-y-4"
       style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}>
```
- **BUG: `paddingBottom: 20px` does NOT account for 80px bottom nav**
- The sheet uses `fixed inset-0 z-50 flex flex-col justify-end` — inset-0 extends to screen bottom
- Bottom nav likely has `z-30` or similar — need to verify, but visually the nav sits on top of the sheet

### HandshakeFlow.tsx — Current Stub

```tsx
"use client";  // ← invalid directive for React Router v7
export default function HandshakeFlow({ tradeId }: { tradeId: number }) {
  return (
    <div className="p-4 bg-card rounded">
      <div className="text-sm">Handshake actions will appear here for trade {tradeId}.</div>
    </div>
  );
}
```
- **Not imported or used in pings.$id.tsx** — the main file handles all handshake UI inline
- Decision: fold the 2/2 counter logic inline, or implement `HandshakeFlow` as the 2/2 widget and use it from pings.$id.tsx

### ChatWindow.tsx — Current Stub

```tsx
"use client";  // ← invalid directive
export default function ChatWindow({ messages }: { messages: Array<{id?: number, text:string, role?:string}> }) {
  // Basic message rendering with role-based alignment
}
```
- **Not used in pings.$id.tsx** — the route has its own richer message rendering (handles `msg.type === "system"`, timestamps, `msg.senderId` comparison)
- The stub's prop type `role?: string` doesn't match the actual DB `messages` schema (which uses `senderId`)
- Decision: leave as stub or upgrade to match actual message schema

### balance-pile.tsx — Bottom Sheet Clipping

```tsx
// Backdrop (line 79)
<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
// Content (line 84)
<div className="w-full max-w-md bg-[#111827] ... rounded-t-3xl max-h-[85vh] overflow-y-auto">
```
- **BUG: `max-h-[85vh]` with no bottom padding for bottom nav**
- The Submit button at the bottom (line 238) and content at the bottom are clipped behind the 80px nav

### safezone-picker.tsx — No Bottom Sheet of Its Own

The `SafeZonePicker` component is rendered INSIDE the status panel (or bottom sheet) — it does NOT create its own bottom sheet overlay. It renders as a card/list within whatever container holds it. The clipping fix for the status bottom sheet will fix SafeZonePicker automatically.

### Current Handshake Action Flow

```
User A clicks ShieldCheck button in footer → intent="proposeHandshake"
  → Status: proposed → negotiating
  → System message: "UserA proposed a Secure Handshake"

User B sees status panel with "Stage 02: Handshake Initiated" + "Commit & Reveal" button → intent="acceptHandshake"
  → Status: negotiating → agreed
  → System message: "UserB accepted the Handshake"
```

**Notes:**
- `proposeHandshake` button is visible to BOTH parties in `proposed` state (no initiator restriction)
- `acceptHandshake` button is visible to BOTH parties in `negotiating` state (no accepter restriction)
- This means the current UX is already nearly symmetric — the naming is just confusing
- The new mechanic renames and restructures: both see "Agree to Trade" from `proposed` state, both can click, 1st click = 1/2 (no status change), 2nd click = 2/2 (advance to `negotiating`)

### Contact Sharing — Current Flow

```
Status: agreed
  → User must first click "I'm Ready — Exchange Contacts" → intent="toggleReady"
  → Both parties must be ready (isReady AND theyReady)
  → Then ShareContactForm appears
  → User submits phone/email → intent="shareContact"
  → After BOTH users share → status advances to "contact_shared"
```

**CONTEXT.md change:** The readiness gating step may be simplified for the new UX ("Share my contact info" button appears inline after 2/2). The `contactDisclosures` table and status advance logic can remain; what changes is HOW the button is surfaced (inline CTA card vs. status panel button). The `readinessFlags` for contact sharing could be removed if the CONTEXT no longer requires it — but this is an implementation decision.

### profile.tsx — "use client" + Safety Section Location

- Line 1: `"use client"` — remove when editing
- The profile page is a very long file (~600+ lines estimated). The safety/trust section should be added as a new section in the component JSX (after stats section, before or alongside listings). The loader already fetches `stats.completedCount` and has access to `trustProfile`-related data if needed.
- The safety/trust section content (static tips about meeting safely) does NOT require new DB queries.

---

## Runtime State Inventory

> Rename/refactor phase: N/A. No renames occurring. Labels/button text changing, but DB status values unchanged.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `messages` table: system messages with old text like "proposed a Secure Handshake" | No migration needed — old system messages remain in history, new ones use new labels |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None affected | None |
| Build artifacts | None | None |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright E2E (in `e2e/`) |
| Unit | Vitest (`vitest.config.ts`) |
| E2E config | `playwright.config.ts` |
| Quick run | `npm run test:chat` |
| Full suite | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-01 | Bottom nav does not clip content at 360px | E2E (visual) | `npm run test:chat` | ✅ `e2e/chat.spec.ts` (audit) |
| REQ-02 | Tablet 768px shows two-column layout | E2E (viewport) | `npx playwright test chat.spec.ts --project=Mobile` | ❌ Wave 0 |
| REQ-03 | "Agree to Trade" button visible on fresh trade | E2E | `npm run test:chat` | ✅ (audit) |
| REQ-04 | 2/2 counter increments correctly | E2E | `npm run test:chat` | ❌ Wave 0 |
| REQ-05 | TypeScript passes with no new errors | Static | `npm run typecheck` | ✅ |

### Wave 0 Gaps
- [ ] Viewport test at 768px for two-column layout — new test in `e2e/chat.spec.ts`
- [ ] 2/2 counter interaction test — new test in `e2e/chat.spec.ts`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth unchanged |
| V3 Session Management | no | Session unchanged |
| V4 Access Control | yes | `requireAuth` + trade participant check already in all actions |
| V5 Input Validation | yes | `formData.get()` cast fix; existing PII scrubbing preserved |
| V6 Cryptography | no | N/A |

**Existing security preserved:**
- PII scrubbing (phone/email redaction) on `sendMessage` at `proposed`/`negotiating` states — this code must NOT be removed
- Participant verification in all action cases — must remain on any new `agreeToTrade` intent
- Contact disclosure TTL (48 hours) — unchanged

**New security concern:** The `agreeToTrade` intent must check `trade.initiatorId === user.id || trade.responderId === user.id` — the same guard already in all other action cases. Copy the participant check pattern exactly.

---

## Open Questions

1. **Does the sidebar show at md (768px) or lg (1024px)?**
   - What we know: `app/routes/dashboard.tsx` controls the sidebar. The chat route uses `lg:left-60` (verified). The bottom nav might be `md:hidden` or `lg:hidden`.
   - What's unclear: The exact breakpoint at which the sidebar becomes visible in the dashboard layout.
   - Recommendation: Read `app/routes/dashboard.tsx` layout section before implementing the `md:` breakpoint change. If sidebar is `lg:block`, use `md:left-0` on tablet and `lg:left-60` on desktop.

2. **Should the readinessFlags contact-sharing gate be removed?**
   - What we know: CONTEXT says "Share my contact info" button appears inline (simpler). The current flow requires two separate actions (toggleReady, then shareContact).
   - What's unclear: Whether the planner wants to keep the readiness gate (two-phase sharing: "mark ready" then "share") or simplify to one-click share.
   - Recommendation: Keep the single-click share (`shareContact` direct), remove the `toggleReady` gating for contact sharing since it adds confusion. The `readinessFlags` table is freed up for the `agreeToTrade` mechanism.

3. **What does "full asset cards" mean for the right panel when only one listing is tracked?**
   - What we know: `trades` table stores only `listingId` (the target listing). The `AssetCard` needs `ListingCard` type including distance/timeAgo. The loader loads `listing` (single) and `tradeItemsForTrade` (supplemental items).
   - What's unclear: Does "full asset card" mean using the existing `AssetCard` component or a simpler trade-specific card?
   - Recommendation: Build a `TradeSummaryCard` component that shows: listing image (from `listingImages` if loader is extended), title, estimated value. Do not use `AssetCard` — it requires computed fields the loader doesn't provide.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `"use client"` directives in stubs are harmless noise (not TypeScript errors currently) | Key File Audit | If they cause errors, remove them in Wave 0 |
| A2 | Sidebar is visible at `md:` (768px) in dashboard.tsx, so `md:left-60` is the correct offset | Architecture Patterns | Would cause layout gap if sidebar is only `lg:block` |
| A3 | The `bottom-nav` has `z-index` higher than `z-50` on the bottom sheet, causing the clipping | Bottom Sheet Clipping | If nav has lower z-index, the clipping has a different root cause |
| A4 | No localStorage utility exists in `app/lib/` | Pattern 6 | If one exists, use it instead |
| A5 | Removing readiness gate for contact sharing is safe (no flows depend on both-party readiness) | Open Questions | If readiness guard is intentional UX, removing it needs user confirmation |

---

## Sources

### Primary (HIGH confidence — verified directly from codebase)
- `app/routes/dashboard/pings.$id.tsx` — Full file audit (all 2,200+ lines)
- `app/components/ui/balance-pile.tsx` — Bottom sheet pattern
- `app/components/ui/safezone-picker.tsx` — Component structure
- `app/components/ui/HandshakeFlow.tsx` — Stub content
- `app/components/ui/ChatWindow.tsx` — Stub content
- `app/components/ui/asset-card.tsx` — AssetCard props
- `app/lib/schema.ts` — All table schemas including `readinessFlags`
- `app/lib/types.ts` — Trade types and HandshakeStage
- `.github/copilot-instructions.md` — Design system, architecture, commands

### Secondary (MEDIUM confidence)
- `.planning/phases/04-trade-chat-ux/04-CONTEXT.md` — Locked decisions
- `.planning/ROADMAP.md` — Phase goals

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase
- Architecture (layout bugs, breakpoints): HIGH — verified from source code
- Current handshake flow: HIGH — verified action cases at lines 349–404
- 2/2 counter implementation pattern: HIGH — verified readinessFlags table + existing usage
- Bottom sheet CSS fix: HIGH — exact class strings verified
- Inline CTA card pattern: MEDIUM — new concept, architecture is sound but specific design is implementation's discretion
- Profile page safety section: MEDIUM — file structure read, exact location TBD (file not fully audited)

**Research date:** 2025-01-27
**Valid until:** 2025-03-01 (stable codebase, 30-day window)
