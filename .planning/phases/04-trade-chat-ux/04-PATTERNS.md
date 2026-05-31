# Phase 4: Trade Chat & Handshake UX Redesign — Pattern Map

**Mapped:** 2025-01-27
**Files analyzed:** 6 (5 modified + 1 new)
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/routes/dashboard/pings.$id.tsx` | route (loader + action + component) | request-response + SSE event-driven | itself (internal refactor) | exact |
| `app/components/ui/HandshakeFlow.tsx` | component | request-response (Form submit) | `pings.$id.tsx` inline `renderTradeStatusPanel()` + `MessageInput` sub-component | role-match |
| `app/components/ui/balance-pile.tsx` | component (bottom sheet) | CRUD (client-only state) | itself (line 79–248 — CSS-only fix) | exact |
| `app/components/ui/safezone-picker.tsx` | component (inline card) | CRUD (client-only state) | itself (audit only — no sheet of its own) | exact |
| `app/routes/dashboard/profile.tsx` | route (loader + action + component) | CRUD | itself (add section to account tab) | exact |
| `app/components/ui/TradeSummaryCard.tsx` (NEW) | component | request-response (read-only display) | `app/components/ui/asset-card.tsx` (structure), `pings.$id.tsx` lines 1185–1205 (data shape) | role-match |

---

## Pattern Assignments

---

### `app/routes/dashboard/pings.$id.tsx` (route, request-response + SSE)

**Analog:** itself — this is an internal refactor. All patterns are extracted directly from the existing file.

#### Imports pattern (lines 1–52)

```tsx
import { useEffect, useRef, useState } from "react";
import { data, Form, Link, redirect, useFetcher, useNavigation, useRevalidator } from "react-router";
import { eq, asc, and, or, count, avg } from "drizzle-orm";
import { ChevronLeft, Lock, Send, ShieldCheck, ... } from "lucide-react";
import type { Route } from "./+types/pings.$id";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { trades, messages, users, profiles, listings, readinessFlags, ... } from "~/lib/schema";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";
import { TrustBadge, type TrustLevel } from "~/components/ui/trust-badge";
import { ReportModal } from "~/components/ui/report-modal";
import { SafeZonePicker } from "~/components/ui/safezone-picker";
import { BalancePile } from "~/components/ui/balance-pile";
import { useHaptics } from "~/components/ui/haptic-provider";
```

> **Change for phase:** Add import for new sub-components: `HandshakeFlow`, `TradeSummaryCard`. Remove the `"use client"` directive (not present here, but watch for it in HandshakeFlow).

#### Loader pattern (lines 66–231)

```tsx
export async function loader({ request, params }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const tradeId = Number(params.id);
  if (Number.isNaN(tradeId)) throw data(null, { status: 404 });

  // Parallel DB queries with Promise.all
  const [counterpartyRows, tradeMessages, [listing], userListings] = await Promise.all([...]);

  // isReady / theyReady — DOUBLE DUTY:
  // • At `proposed` status:  represents "Agree to Trade" flag
  // • At `agreed` status:    represents contact-sharing readiness
  // (flags are deleted when status advances from proposed → negotiating)
  const [myReadyRow, theirReadyRow] = await Promise.all([
    db.select().from(readinessFlags)
      .where(and(eq(readinessFlags.tradeId, tradeId), eq(readinessFlags.userId, user.id)))
      .limit(1),
    db.select().from(readinessFlags)
      .where(and(eq(readinessFlags.tradeId, tradeId), eq(readinessFlags.userId, counterpartyId)))
      .limit(1),
  ]);

  return {
    trade, messages, counterparty, listing, currentUserId: user.id,
    isReady: myReadyRow[0]?.ready ?? false,
    theyReady: theirReadyRow[0]?.ready ?? false,
    spots, votes, myVote, tradeItemsForTrade, userListings, ...
  };
}
```

> **Change for phase:** No loader schema changes needed. `isReady`/`theyReady` already in return shape — will serve as the 2/2 counter input at `proposed` status.

#### Action pattern — existing intent case (lines 349–403)

```tsx
export async function action({ request, params }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const tradeId = Number(params.id);
  const formData = await request.formData();
  const intent = formData.get("intent") as string | null;

  // Auth check on every case
  const [trade] = await db.select().from(trades).where(eq(trades.id, tradeId)).limit(1);
  if (!trade) throw data(null, { status: 404 });
  if (trade.initiatorId !== user.id && trade.responderId !== user.id)
    throw data({ error: "Not authorized" }, { status: 403 });

  switch (intent) {
    case "proposeHandshake": {  // ← REPLACE with "agreeToTrade"
      if (trade.status !== "proposed") return { error: "Handshake can only be proposed from initial state" };
      await db.update(trades).set({ status: "negotiating", updatedAt: new Date() })
        .where(eq(trades.id, tradeId));
      await db.insert(messages).values({ tradeId, senderId: user.id,
        text: `${user.name} proposed a Secure Handshake`, type: "system" });
      return { ok: true };
    }
    case "acceptHandshake": {  // ← REPLACE with second-click path in "agreeToTrade"
      if (trade.status !== "negotiating") return { error: "No handshake to accept" };
      await db.update(trades).set({ status: "agreed", updatedAt: new Date() })
        .where(eq(trades.id, tradeId));
      // send email, push notifications ...
      return { ok: true };
    }
  }
}
```

> **New `agreeToTrade` intent pattern** (from RESEARCH.md — use this shape, lines 262–305):
> ```tsx
> case "agreeToTrade": {
>   if (trade.status !== "proposed") return { error: "Trade must be in proposed state" };
>   // Upsert this user's agreement flag
>   const [existing] = await db.select().from(readinessFlags)
>     .where(and(eq(readinessFlags.tradeId, tradeId), eq(readinessFlags.userId, user.id))).limit(1);
>   if (existing) {
>     await db.update(readinessFlags).set({ ready: true, readyAt: new Date() })
>       .where(eq(readinessFlags.id, existing.id));
>   } else {
>     await db.insert(readinessFlags).values({ tradeId, userId: user.id, ready: true, readyAt: new Date() });
>   }
>   // Count agreements
>   const [{ count: agreementCount }] = await db
>     .select({ count: count() }).from(readinessFlags)
>     .where(and(eq(readinessFlags.tradeId, tradeId), eq(readinessFlags.ready, true)));
>   if (agreementCount >= 2) {
>     await db.update(trades).set({ status: "negotiating", updatedAt: new Date() })
>       .where(eq(trades.id, tradeId));
>     await db.delete(readinessFlags).where(eq(readinessFlags.tradeId, tradeId)); // CRITICAL: reset for contact-sharing
>     await db.insert(messages).values({ tradeId, senderId: user.id,
>       text: "Both parties agreed — deal locked! Arrange your meetup.", type: "system" });
>   }
>   return { ok: true, agreementCount };
> }
> ```

#### Two-column layout pattern — BROKEN (line 1570) → FIXED

```tsx
// CURRENT (BROKEN at tablet 768–1023px):
<div className="fixed inset-x-0 lg:left-60 top-[73px] bottom-20 lg:bottom-0 z-20
                bg-[#030712] flex flex-col lg:flex-row">
  <div className="flex flex-col flex-1 min-w-0 min-h-0 lg:border-r lg:border-white/5">
    {/* chat */}
  </div>
  <div className="hidden lg:flex flex-col w-72 lg:w-80 ...">
    {/* right panel — INVISIBLE on tablet */}
  </div>
</div>

// FIXED (two-column at md+ = 768px+):
// IMPORTANT: sidebar uses `hidden md:flex` in dashboard.tsx line 238
// → sidebar IS visible at 768px+ → md:left-60 IS correct
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

#### Mobile status chip — correct pattern (lines 1663–1683)

```tsx
// This chip correctly uses lg:hidden → change to md:hidden after layout fix
// (chip is only needed on mobile; tablet+ has the right panel)
<button
  type="button"
  onClick={() => setShowTradeStatus(true)}
  className="md:hidden shrink-0 mt-2 mb-1 w-full flex items-center justify-between
             px-4 py-2.5 rounded-xl bg-[#0F172A] border border-white/10
             hover:border-white/20 transition-colors"
>
  <span className={`text-[11px] font-mono uppercase tracking-widest font-medium ${cfg.color}`}>
    {cfg.label}
  </span>
  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Details</span>
</button>
```

#### Mobile bottom sheet — BROKEN (lines 1786–1820) → FIXED

```tsx
// CURRENT (BROKEN — clips behind 80px bottom nav):
<div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
  <div className="relative bg-[#0F172A] rounded-t-3xl border-t border-white/10
                  flex flex-col max-h-[85dvh]">
    <div className="overflow-y-auto overscroll-contain px-5 py-4 space-y-4"
         style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}>

// FIXED — accounts for 80px bottom nav:
<div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
       onClick={() => setShowTradeStatus(false)} />
  {/* Sheet — max-height minus the 80px bottom nav */}
  <div className="relative bg-[#0F172A] rounded-t-3xl border-t border-white/10
                  flex flex-col max-h-[calc(85dvh-80px)]">
    {/* Drag handle */}
    <div className="flex justify-center pt-3 pb-1 shrink-0">
      <div className="w-9 h-1 rounded-full bg-white/20" />
    </div>
    {/* Scrollable content — bottom padding clears the safe area */}
    <div className="overflow-y-auto overscroll-contain px-5 py-4 space-y-4
                    pb-[calc(env(safe-area-inset-bottom,0px)+80px)]">
      {renderTradeStatusPanel()}
    </div>
  </div>
</div>
```

#### SSE effect pattern — DO NOT MOVE (lines 1059–1086)

```tsx
// Must stay in PingDetail (the route default export). revalidatorRef must be in scope.
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

#### One-time safety banner — localStorage pattern (from RESEARCH.md Pattern 6)

```tsx
// Hydration-safe: default true = hidden on SSR to avoid flash
const [safetyBannerDismissed, setSafetyBannerDismissed] = useState(true);
useEffect(() => {
  const dismissed = localStorage.getItem('nozar:safety-banner-dismissed');
  if (!dismissed) setSafetyBannerDismissed(false);
}, []);
const handleDismissBanner = () => {
  localStorage.setItem('nozar:safety-banner-dismissed', '1');
  setSafetyBannerDismissed(true);
};
// Copy this existing localStorage pattern from dashboard.tsx lines 183–188
// (nozar_location_dismissed key uses same read-from-state-initializer pattern)
```

#### Inline CTA card injection pattern (from RESEARCH.md Pattern 4)

```tsx
// Synthetic CTAs — computed from loader state, NOT stored in DB messages
// Inject as first item in the render list + at state-transition points
type CTACard = {
  id: string;        // e.g. "cta-agree-to-trade"
  type: "cta";
  variant: "agree" | "confirm-deal" | "share-contact" | "complete";
};

// Build before the message list render:
const ctaCards: CTACard[] = [];
if (status === "proposed" && !isReady) {
  ctaCards.push({ id: "cta-agree", type: "cta", variant: "agree" });
}
if (status === "proposed" && isReady && !theyReady) {
  ctaCards.push({ id: "cta-waiting", type: "cta", variant: "agree" }); // shows 1/2 counter
}
if (status === "agreed" && !isReady) {
  ctaCards.push({ id: "cta-share-contact", type: "cta", variant: "share-contact" });
}
// Render ctaCards BEFORE chatMessages in the scroll area
```

#### Message render pattern (lines 1691–1721) — copy for CTA card styling

```tsx
// System message pill — copy for CTA card container label
<div key={msg.id} className="flex justify-center my-4">
  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500
                   bg-[#0F172A] px-3 py-1 rounded-full border border-white/5">
    [ {msg.text} ]
  </span>
</div>

// User message bubble — emerald for "me", slate for "them"
<div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
  isMe
    ? "bg-emerald-500 text-[#030712] font-medium"
    : "bg-[#1E293B] border border-white/15 text-white"
}`}>
  <p className="text-[15px] leading-relaxed">{msg.text}</p>
</div>
```

---

### `app/components/ui/HandshakeFlow.tsx` (component, request-response)

**Analog:** `pings.$id.tsx` — `renderTradeStatusPanel()` (lines 1134–1565) for the status card pattern; `MessageInput` sub-component (lines 1852–1995) for the `Form` + `useFetcher` pattern.

**Current state:** Stub with invalid `"use client"` directive (line 1). Remove that directive.

**Prop interface to implement:**

```tsx
// Remove "use client" (line 1 of current stub)
import { Form, useFetcher, useNavigation } from "react-router";
import { Handshake, ShieldCheck } from "lucide-react";
import { Spinner } from "~/components/ui/loading-indicator";
import { useHaptics } from "~/components/ui/haptic-provider";

interface HandshakeFlowProps {
  tradeId: number;
  status: string;          // "proposed" | "negotiating" | "agreed" | ...
  isReady: boolean;        // current user has tapped "Agree to Trade"
  theyReady: boolean;      // counterparty has tapped "Agree to Trade"
  isSubmitting: boolean;
  submittingIntent: string | null;
}

export default function HandshakeFlow({
  tradeId, status, isReady, theyReady, isSubmitting, submittingIntent
}: HandshakeFlowProps) { ... }
```

**2/2 counter widget pattern** (copy visual style from `renderTradeStatusPanel` lines 1168–1275):

```tsx
// Card container — copy from pings.$id.tsx line 1170
<div className="p-5 rounded-2xl bg-[#0F172A] border border-slate-700/50 space-y-4">

// Agreement count display — new pattern
<div className="flex items-center justify-center gap-3 py-4">
  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2
    ${isReady ? "border-emerald-500 bg-emerald-500/20" : "border-slate-600 bg-slate-700/30"}`}>
    <span className="text-[10px] font-mono text-emerald-400 font-black">YOU</span>
  </div>
  <span className="text-lg font-black text-white tabular-nums">
    {(isReady ? 1 : 0) + (theyReady ? 1 : 0)}/2
  </span>
  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2
    ${theyReady ? "border-emerald-500 bg-emerald-500/20" : "border-slate-600 bg-slate-700/30"}`}>
    <span className="text-[10px] font-mono text-slate-400 font-black">THEM</span>
  </div>
</div>
```

**"Agree to Trade" CTA button** — copy from `BalancePile` submit button (balance-pile.tsx line 240):

```tsx
// Primary CTA button pattern — emerald fill, brutalist type
<Form method="post">
  <input type="hidden" name="intent" value="agreeToTrade" />
  <button
    type="submit"
    disabled={isSubmitting || isReady}
    onClick={() => haptics.medium()}
    className="w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase
               tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]
               transition-all disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isSubmitting && submittingIntent === "agreeToTrade" ? (
      <span className="inline-flex items-center gap-2"><Spinner className="w-3.5 h-3.5" /> Locking in...</span>
    ) : isReady ? (
      "✓ You agreed — waiting for them"
    ) : (
      "Agree to Trade"
    )}
  </button>
</Form>
```

**Status heading pattern** (copy from pings.$id.tsx line 1176):

```tsx
<h4 className="text-center font-black uppercase tracking-tighter text-white text-sm">
  Chatting — Agree to lock in this trade
</h4>
```

---

### `app/components/ui/balance-pile.tsx` (component/bottom-sheet, CRUD)

**Analog:** itself — CSS-only fix at lines 79–85.

**Current bottom sheet container (lines 79–85) — BROKEN:**

```tsx
// line 79-85 — BEFORE
<div
  className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
  onClick={onClose}
>
  <div
    className="w-full max-w-md bg-[#111827] border border-white/10 rounded-t-3xl
               max-h-[85vh] overflow-y-auto"
    onClick={(e) => e.stopPropagation()}
  >
```

**Fixed bottom sheet container:**

```tsx
// FIXED — subtract 80px bottom nav from max-height, add bottom padding
<div
  className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
  onClick={onClose}
>
  <div
    className="w-full max-w-md bg-[#111827] border border-white/10 rounded-t-3xl
               max-h-[calc(85vh-80px)] overflow-y-auto
               pb-[calc(env(safe-area-inset-bottom,0px)+20px)]"
    onClick={(e) => e.stopPropagation()}
  >
```

**Existing design patterns to preserve** (lines 84–248):

```tsx
// Header pattern (lines 88–97)
<div className="p-5 border-b border-white/5 flex items-center justify-between">
  <h3 className="font-bold text-white">⚖️ Balance the Trade</h3>
  <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X /></button>
</div>

// Value grid pattern (lines 101–117)
<div className="grid grid-cols-3 gap-2">
  <div className="text-center p-3 bg-white/5 rounded-xl">
    <span className="text-[9px] font-mono text-slate-500 uppercase">Their</span>
    <p className="text-sm font-bold text-white">~R{theirValue.toLocaleString()}</p>
  </div>
</div>

// Submit button pattern (line 240) — canonical emerald CTA
<button className="w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black
                   uppercase tracking-widest text-xs
                   hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all">
  ⚖️ Submit Balanced Offer
</button>

// Selection chip pattern (lines 225–236)
<span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                 bg-emerald-500/10 border border-emerald-500/20
                 text-[10px] font-mono text-emerald-400">
  {label}
</span>

// Label pattern throughout
<span className="text-[10px] font-mono text-slate-400 uppercase">Your Listings ...</span>
```

---

### `app/components/ui/safezone-picker.tsx` (component/inline-card, CRUD)

**Analog:** itself — audit only, no direct fix required.

**Key finding from RESEARCH.md (line 559–561):** `SafeZonePicker` renders as an inline card/list **inside** the status panel bottom sheet — it does NOT create its own `fixed` overlay. The bottom-sheet clipping fix on `pings.$id.tsx` (showTradeStatus sheet) will fix SafeZonePicker automatically.

**Existing patterns to audit and preserve** (lines 1–143):

```tsx
// Confirmed-state card — emerald border glow pattern
<div className="rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#030712]
                border border-emerald-500/50 overflow-hidden
                shadow-[0_0_40px_rgba(16,185,129,0.2)]">

// Section header — brutalist mono label
<div className="bg-emerald-500/10 p-3 border-b border-emerald-500/20 flex items-center gap-2">
  <ShieldCheck className="w-4 h-4 text-emerald-400" />
  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
    Safe Zone Confirmed 🤝
  </span>
</div>

// Spot selection row — emerald active state
<button className={`w-full text-left p-4 transition-all ${
  selected === idx
    ? "bg-emerald-500/10 border-l-2 border-l-emerald-500"
    : "hover:bg-white/5"
}`}>

// Radio dot pattern
<div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
  ${selected === idx ? "border-emerald-500 bg-emerald-500" : "border-slate-600"}`}>
  {selected === idx && <span className="w-2 h-2 rounded-full bg-white" />}
</div>

// Mono hint text
<p className="text-[10px] font-mono text-emerald-400/60 mt-1">→ {spot.reason}</p>
```

**No changes required** unless the component itself causes visual issues during testing.

---

### `app/routes/dashboard/profile.tsx` (route, CRUD)

**Analog:** itself — adding a new section to the account tab JSX.

**Anti-pattern to fix first:** Remove `"use client"` at line 1 (invalid in React Router v7).

**Account tab section structure** (lines 714–868) — insert safety section AFTER stats grid, BEFORE phone card:

```tsx
{/* Account tab — section insertion point */}
{profileTab === "account" && (
  <div className="space-y-6">
    {/* Stats grid (lines 752–768) — KEEP AS IS */}
    <div className="grid grid-cols-3 gap-3">
      <StatCard icon={...} label="Swaps started" value={stats.tradeCount} />
      <StatCard icon={...} label="Completed" value={stats.completedCount} />
      <StatCard icon={...} label="Your rating" value={...} />
    </div>

    {/* ↓ INSERT SAFETY/TRUST SECTION HERE ↓ */}

    {/* Phone verification card (lines 771–808) — KEEP AS IS */}
  </div>
)}
```

**Section card pattern** — copy from existing account tab cards (lines 810–831):

```tsx
// Standard card row pattern
<div className="p-4 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-between">
  <span className="text-sm text-slate-400">Free plan — 5 listings</span>
  <Link className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest hover:text-emerald-300">
    Upgrade →
  </Link>
</div>

// Security link card pattern (lines 833–848) — copy this for safety section container
<Link className="flex items-center justify-between p-4 rounded-xl border border-white/10
                 bg-[#0F172A] hover:bg-white/5 transition-colors group">
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
      <ShieldCheck className="w-4 h-4 text-emerald-400" />
    </div>
    <div>
      <p className="text-sm font-semibold text-white">Security</p>
      <p className="text-xs text-slate-400">Two-factor authentication</p>
    </div>
  </div>
  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
</Link>
```

**Safety section pattern to create** — static content, no new DB queries needed:

```tsx
{/* Safety & Trust Section — new addition */}
<div className="p-4 bg-[#0F172A] border border-emerald-500/20 rounded-2xl space-y-3">
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
      <ShieldCheck className="w-4 h-4 text-emerald-400" />
    </div>
    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-black">
      Safe Trading Guidelines
    </span>
  </div>
  <ul className="space-y-2">
    {SAFETY_TIPS.map((tip) => (
      <li key={tip} className="flex items-start gap-2">
        <span className="text-emerald-500 text-[10px] font-mono mt-0.5 shrink-0">✓</span>
        <span className="text-[11px] font-mono text-slate-400 leading-relaxed">{tip}</span>
      </li>
    ))}
  </ul>
</div>
```

**Tip list copy from existing safe tips** (pings.$id.tsx lines 1213–1225):

```tsx
// These exact tips are in the current pings.$id.tsx renderTradeStatusPanel
// Move them here + expand for profile page:
const SAFETY_TIPS = [
  "Only meet in safe, well-lit public locations — cafés, shopping centres, police stations",
  "Never share your home address in the chat",
  "Use the 2/2 Agree mechanic to lock in deal terms before meeting",
  "Use Balance Trade to compare values fairly before agreeing",
  "If something feels off, cancel the trade — your safety comes first",
  "Report suspicious behaviour using the 🚩 flag in any trade chat",
];
```

---

### `app/components/ui/TradeSummaryCard.tsx` (NEW component, request-response/display)

**Analogs:**
1. `app/components/ui/asset-card.tsx` — visual structure (image box + title + value), CSS card pattern
2. `pings.$id.tsx` lines 1185–1205 — exact data shape (what the pings loader actually returns)

**Why not use `AssetCard` directly** (RESEARCH.md Pitfall 7): `AssetCard` requires `ListingCard` type with `distance`, `timeAgo`, `userName`, `imageUrl`, `isVerified` — fields the pings loader does NOT compute. `TradeSummaryCard` is a simplified display-only card for the right panel.

**Prop interface:**

```tsx
// Only the fields the pings loader returns for a listing
interface TradeSummaryCardProps {
  role: "yours" | "theirs";            // label shown above card
  title: string;                        // listing.title
  estimatedValueZar?: number | null;    // listing.estimatedValueZar
  imageUrl?: string | null;             // listing.imageUrl (if available)
  type?: string;                        // listing.type (e.g. "item", "service")
}
```

**CSS structure** — copy from `asset-card.tsx` lines 15–63, simplified:

```tsx
// Container — copy from asset-card.tsx line 15
<div className="relative bg-[#0F172A] border border-white/10 rounded-2xl p-3
                flex gap-3 overflow-hidden">

  {/* Role label — copy from balance-pile.tsx lines 104–107 */}
  <span className="text-[9px] font-mono text-slate-500 uppercase">
    {role === "yours" ? "You offer" : "They offer"}
  </span>

  {/* Image box — copy from asset-card.tsx lines 24–38 */}
  <div className="w-16 h-16 rounded-xl bg-emerald-900/20 border border-white/5
                  flex items-center justify-center flex-shrink-0 overflow-hidden">
    {imageUrl ? (
      <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
    ) : (
      <Repeat className="w-5 h-5 text-white/20" />
    )}
    {type && (
      <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md
                      rounded px-1 py-0.5 text-[7px] font-mono text-white">
        {type}
      </div>
    )}
  </div>

  {/* Content — copy from asset-card.tsx lines 41–62 */}
  <div className="flex-1 flex flex-col gap-1 min-w-0">
    <h3 className="font-bold text-xs leading-snug text-slate-50 break-words">
      {title}
    </h3>
    {estimatedValueZar != null && estimatedValueZar > 0 && (
      <span className="text-[10px] font-mono text-emerald-400">
        ~R{estimatedValueZar.toLocaleString()}
      </span>
    )}
  </div>
</div>
```

**Usage in right panel** (insert where trade summary grid is in `renderTradeStatusPanel`):

```tsx
// Replace the existing grid in renderTradeStatusPanel (lines 1185–1205) with:
import { TradeSummaryCard } from "~/components/ui/TradeSummaryCard";

<div className="space-y-2">
  <span className="font-mono uppercase tracking-widest text-[10px] text-slate-500 block">
    // Trade Summary
  </span>
  <TradeSummaryCard
    role="theirs"
    title={listing.userId !== currentUserId ? listing.title : "Their items"}
    estimatedValueZar={theirValue > 0 ? theirValue : null}
  />
  <TradeSummaryCard
    role="yours"
    title={listing.userId === currentUserId ? listing.title : "Your items"}
    estimatedValueZar={yourValue > 0 ? yourValue : null}
  />
</div>
```

---

## Shared Patterns

### Authentication Guard
**Source:** `pings.$id.tsx` lines 66–67, 235–254
**Apply to:** All route loader/action functions
```tsx
const { user } = await requireAuth(request);
// ... in action:
if (trade.initiatorId !== user.id && trade.responderId !== user.id)
  throw data({ error: "Not authorized" }, { status: 403 });
```

### Emerald Primary CTA Button
**Source:** `balance-pile.tsx` line 240
**Apply to:** `HandshakeFlow.tsx` "Agree to Trade" button; `TradeSummaryCard.tsx` if interactive
```tsx
className="w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase
           tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]
           transition-all disabled:opacity-50 disabled:cursor-not-allowed"
```

### Brutalist Typography
**Source:** `pings.$id.tsx` throughout `renderTradeStatusPanel()`
**Apply to:** All new components in this phase
```tsx
// Section label (mono, all-caps, wide)
className="font-mono uppercase tracking-widest text-[10px] text-slate-500"
// Section heading (black, tight)
className="font-black uppercase tracking-tighter text-white text-sm"
// Data value
className="text-sm font-bold text-white"
// Mono value accent
className="text-[9px] font-mono text-emerald-400"
```

### Card Container
**Source:** `pings.$id.tsx` line 1170 (proposed state card)
**Apply to:** `HandshakeFlow.tsx`, `TradeSummaryCard.tsx`, profile safety section
```tsx
// Default card
className="p-5 rounded-2xl bg-[#0F172A] border border-slate-700/50 space-y-4"
// Emerald-highlighted card (agreed state)
className="p-5 rounded-2xl bg-[#0F172A] border border-emerald-500/30
           shadow-[0_0_30px_rgba(16,185,129,0.1)]"
```

### Form Submit with Intent
**Source:** `pings.$id.tsx` lines 1934–1944 (proposeHandshake in MessageInput)
**Apply to:** `HandshakeFlow.tsx` form buttons
```tsx
<Form method="post">
  <input type="hidden" name="intent" value="agreeToTrade" />
  <button type="submit" disabled={isSubmitting}>...</button>
</Form>
```

### Submitting State Detection
**Source:** `pings.$id.tsx` lines 977–980
**Apply to:** All route components and sub-components that receive `isSubmitting` prop
```tsx
const isSubmitting = navigation.state === "submitting";
const submittingIntent = isSubmitting
  ? (navigation.formData?.get("intent") as string | null)
  : null;
```

### Bottom Sheet Overlay Scaffold
**Source:** `pings.$id.tsx` lines 1786–1820 (FIXED version above)
**Apply to:** Any future bottom sheet; `balance-pile.tsx` fix
```tsx
<div className="fixed inset-0 z-50 flex flex-col justify-end">
  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
  <div className="relative bg-[#0F172A] rounded-t-3xl border-t border-white/10
                  flex flex-col max-h-[calc(85dvh-80px)]">
    <div className="overflow-y-auto overscroll-contain px-5 py-4 space-y-4
                    pb-[calc(env(safe-area-inset-bottom,0px)+80px)]">
      {/* content */}
    </div>
  </div>
</div>
```

### localStorage Pattern (Hydration-Safe)
**Source:** `app/routes/dashboard.tsx` lines 183–188 (nozar_location_dismissed)
**Apply to:** One-time safety banner in `pings.$id.tsx`
```tsx
// Initialize to "true" (hidden) to avoid SSR flash, then check localStorage in useEffect
const [dismissed, setDismissed] = useState(true);
useEffect(() => {
  const val = localStorage.getItem('nozar:safety-banner-dismissed');
  if (!val) setDismissed(false);
}, []);
```

---

## No Analog Found

All 6 files have analogs. No files are without a codebase reference.

---

## Key Architectural Constraints (Copy into Every Plan)

1. **Sidebar is `hidden md:flex` in `dashboard.tsx` line 238** → `md:left-60` is the correct breakpoint for the two-column layout offset. Do NOT use `lg:left-60`.
2. **SSE `useEffect` + `revalidatorRef` MUST remain in `PingDetail`** — never move to a sub-component.
3. **`readinessFlags` reset is mandatory** at the `proposed→negotiating` transition — delete all flags after 2/2 agree, before contact-sharing step reuses the table.
4. **Do NOT insert a DB system message for the 1/2 state** — show it via inline CTA card only.
5. **Remove `"use client"` from `HandshakeFlow.tsx` line 1** — it's an invalid Next.js directive in React Router v7.
6. **`TradeSummaryCard` must NOT use `AssetCard`** — the `ListingCard` type requires `distance`/`timeAgo`/`userName` that the pings loader does not provide.
7. **`npm run typecheck` must pass** — use `(formData.get("text") as string | null)?.trim() ?? ""` pattern for all FormData string reads.

---

## Metadata

**Analog search scope:** `app/routes/dashboard/`, `app/components/ui/`, `app/routes/dashboard.tsx`
**Files scanned:** 8 source files (pings.$id.tsx, profile.tsx, dashboard.tsx, HandshakeFlow.tsx, balance-pile.tsx, safezone-picker.tsx, asset-card.tsx, ChatWindow.tsx)
**Pattern extraction date:** 2025-01-27
