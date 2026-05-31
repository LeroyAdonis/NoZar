# Phase 4 Context: Trade Chat & Handshake UX Redesign

## Phase Goal

Redesign the Pings chat + handshake flow (`pings.$id.tsx`) to be approachable for non-technical users, visually polished, and correctly responsive across mobile (360–767px), tablet (768–1023px), and desktop (1024px+). Fix all known layout bugs and replace the confusing multi-step handshake with a clear, visual deal-agreement mechanic.

## Background / Problem Statement

Users reported confusion navigating the chat and negotiation/handshake flow. Three screenshots confirmed:
1. **Mobile (412px)**: Trade Status bottom sheet clips behind the 80px bottom nav — CTA content is hidden
2. **Mobile (412px)**: BalancePile sheet barely visible, all content hidden behind nav bar
3. **Tablet (768px)**: Chat content squishes against sidebar, no right panel shown, broken single-column experience at a size that could support two columns

The current code is ~2,050 lines in a single route file with inline layout logic, no component extraction, and a two-step handshake (propose/accept) that users do not understand.

---

## Locked Decisions

### 1. Flow Language & Step Names

| DB Status | User-Facing Label |
|---|---|
| `proposed` | **Chatting** |
| `negotiating` | **Deal Agreed** (transitional — both tapped) |
| `agreed` | **Arrange Meetup** |
| `contact_shared` | **Done** |
| `completed` | **Done ✓** |

- Primary deal-agreement button: **"Agree to Trade"** (not "Initiate Handshake", not "Commit & Reveal")
- Confirmation button label (second user): **"Confirm Deal"**
- Chat input placeholder: **"What are you offering?"** (contextual, early-stage tone)
- Safety messaging: **Removed from chat UI entirely**. A one-time dismissible banner appears the **first time** a user ever opens any trade chat (tracked in localStorage/user prefs). Permanent safety info lives on the user's **profile page** in a prominent section.

### 2. Mobile Action Surfacing

- Trade actions are **not** hidden in a drawer or behind a bottom sheet tap.
- Actions are surfaced as **inline CTA cards in the chat thread** — contextual, appearing at the right moment.
- The **"Agree to Trade" CTA card appears as the very first message** in a new trade thread (before any user messages), for both parties.
- Subsequent inline CTA cards appear at state transitions (e.g., "Share your contact info" after 2/2 agree).

### 3. Handshake Mechanic — "2/2 Agreed" Counter

**Replace** the confusing propose→accept two-step with a symmetric tap-once mechanic:
- Both parties independently tap **"Agree to Trade"**.
- A visible progress indicator shows **"X/2 agreed"** — updates live when one party has tapped.
- When both have tapped (2/2), the trade transitions to `agreed` and an inline CTA card appears to **share contacts**.
- No "initiator" / "accepter" distinction — both parties are equal.

**Contact sharing** (after 2/2):
- A **"Share my contact info"** button appears inline in the chat thread.
- It is visually prominent (emerald accent, not hidden in a panel).
- Each party shares independently — once both share, full contact details appear in the thread.

### 4. Responsive Breakpoints & Layout

**Decision delegated to implementation (best-practice guidance):**
- Mobile: `< 768px` — single column, full-width chat, inline CTA cards
- Tablet: `768px – 1023px` — two-column layout: chat (flex-1 left) + right status panel (~280px)
- Desktop: `≥ 1024px` — two-column: chat (flex-1) + wider right panel (320px)
- Tailwind breakpoint: use `md:` (768px) to trigger two-column, not `lg:` (current broken state)

**Right panel contents (tablet + desktop):**
1. Trade progress stepper (Chatting → Deal Agreed → Arrange Meetup → Done)
2. **Full asset cards** for both sides — image, title, estimated value
3. Trade action buttons (Agree to Trade, Balance the Trade, Safe Zone, etc.)

**Bottom sheet fix:**
- All bottom sheets must account for the 80px bottom nav on mobile.
- Use `pb-[calc(env(safe-area-inset-bottom)+80px)]` or equivalent. No content should be clipped.
- Target: `max-h-[calc(85dvh-80px)]` or `max-h-[75dvh]` with explicit bottom padding.

---

## Out of Scope / Deferred

- React Native mobile app (Phase 3)
- Backend trade lifecycle changes (DB statuses stay the same)
- New notification types or push events for trade state changes
- Dispute/freeze flow redesign (out of scope for this phase)
- Referral or billing changes

---

## Technical Constraints

- DB trade statuses **do not change**: `proposed → negotiating → agreed → contact_shared → completed`
- The `negotiating` status now means "both parties tapped Agree to Trade (2/2)" — same DB trigger, new UX
- Design system: always dark (`#030712` base, `#0F172A` cards, emerald-500 accent), brutalist typography
- React Router v7 SSR, no client-only state outside of UI interactions
- SSE is used for real-time chat — no changes to the SSE endpoint required
- `HandshakeFlow.tsx` and `ChatWindow.tsx` are currently stubs — they **may be** built out or left as stubs (implementation decision)

---

## Files to Change

| File | Change |
|---|---|
| `app/routes/dashboard/pings.$id.tsx` | Primary file — layout, breakpoints, inline CTA cards, action mechanic |
| `app/components/ui/HandshakeFlow.tsx` | Implement 2/2 counter UI or fold logic into main route |
| `app/components/ui/balance-pile.tsx` | Fix bottom sheet clipping |
| `app/components/ui/safezone-picker.tsx` | Audit for bottom sheet clipping |
| `app/routes/dashboard/profile.tsx` | Add prominent safety/trust section |

---

## Success Criteria

1. A non-technical user can start a trade, agree to it, and arrange a meetup without any confusion about what to tap next
2. No content is clipped behind the bottom nav on any mobile screen ≥ 360px wide
3. Tablet (768px) shows a proper two-column layout — chat left, status+assets right panel
4. The "Agree to Trade" mechanic shows a visible "1/2 agreed → 2/2 agreed" counter
5. Inline CTA cards appear at the right moments in the chat thread (on trade open, on 1/2 agreed, on 2/2 agreed, on contact shared)
6. `npm run typecheck` passes with no new errors
