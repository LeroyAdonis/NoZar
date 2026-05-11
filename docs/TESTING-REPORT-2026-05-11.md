# NoZar MVP — End-to-End Testing Report
**Date:** 2026-05-11  
**Tester:** Claude Code (automated human-like walkthrough)  
**Method:** Two-session playwright-cli automation (userA = Test Trader ZA, userB = Zanele Buyer)  
**Stack:** React Router v7 SSR · Drizzle/NeonDB · Better Auth · NVIDIA NIM · Google Maps · Vercel Blob

---

## Executive Summary

NoZar's core barter loop **works end-to-end**. Two users can register, list items, discover each other, negotiate via encrypted chat, complete a dual-blind handshake with AI-suggested meetup spots, exchange contacts, mark a trade complete, and rate each other — all without leaving the platform. The trust system updates in real-time (badge flipped to VERIFIED after first trade).

Three critical bugs were found and **fixed during this session**. Several lower-priority issues and gaps remain.

---

## Bugs Fixed During Testing

### 1. "Initialize Ping" → 404 (CRITICAL — FIXED)
- **File:** `app/routes/dashboard/asset.$id.tsx`
- **Root cause:** Form submitted `intent: "ping"` but the action only handled `intent: "propose_trade"`. The non-owner path fell through to an owner-only DB check and threw a 404.
- **Fix:** Rewrote the ping form to submit `intent: "propose_trade"` with `offerItemId`. Added inventory selection UI (radio buttons for multiple listings, hidden input for single, empty-inventory guard with "Add Item" link).

### 2. Trade status `pending` vs `proposed` mismatch (CRITICAL — FIXED)
- **File:** `app/routes/dashboard/asset.$id.tsx` line 131 + DB migration for existing record
- **Root cause:** `asset.$id.tsx` action created trades with `status: "pending"` but `pings.$id.tsx` UI exclusively checks `status === "proposed"`. The Trade Status right panel was blank; the Initiate Handshake button wasn't rendered.
- **Fix:** Changed `status: "pending"` → `status: "proposed"` in the insert. Updated existing trade #11 in DB.

### 3. NVIDIA model EOL (HIGH — FIXED)
- **File:** `app/lib/nvidia.server.ts`
- **Root cause:** Default model `meta/llama-3.1-405b-instruct` reached end-of-life on 2026-04-21 — all AI features silently failed.
- **Fix:** Updated `DEFAULT_MODEL` to `"meta/llama-3.3-70b-instruct"`. Verified with live API call.
- **Impact:** Fixes AI description generation (Add Item), AI Match (dashboard), and AI Safe Meetup Spot generation.

---

## Feature Test Results

| Feature | Status | Notes |
|---------|--------|-------|
| `/register` — create account | ✅ Works | Hydration mismatch warning on password field (cosmetic) |
| `/login` — email/password | ✅ Works | — |
| Google OAuth button | ⚠️ Not tested | Requires browser redirect; not automatable without real credentials |
| Dashboard sidebar navigation | ✅ Works | Active states, badge counters update correctly |
| Profile editing | ✅ Works | Display name, bio, suburb, city, province all save |
| Profile photo upload | ⚠️ Not tested | Vercel Blob upload requires file picker interaction |
| Add Item — form | ✅ Works | Item/Service toggle, all fields, image URL |
| Add Item — AI Assist description | ✅ Works (after fix) | NVIDIA generates relevant barter-ready copy |
| Marketplace / Index | ✅ Works | City filters (Cape Town / Johannesburg), search, category chips |
| AI Match | ✅ Works (after fix) | Found 3 matched listings with purple AI MATCHED badge |
| Asset detail page | ✅ Works | Full listing details, owner/non-owner views differ correctly |
| Initialize Ping | ✅ Works (after fix) | Inventory selector, empty inventory guard, creates trade |
| Chat — send message | ✅ Works | Message appears, counter decrements (newcomer limit: 3) |
| Chat — bidirectional | ✅ Works | Both users see each other's messages |
| Chat — quick reply chips | ✅ Works | Tap to pre-fill input |
| Chat — system messages | ✅ Works | Handshake events shown inline |
| Chat — polling updates | ✅ Works | 2-second revalidation interval |
| Initiate Handshake | ✅ Works | Status moves to `negotiating`, right panel updates |
| Accept Handshake | ✅ Works | Status moves to `agreed`, contact exchange panel appears |
| AI Safe Meetup Spots | ✅ Works (after fix) | Generated 3 real Sandton/Johannesburg locations |
| Vote on meetup spot | ✅ Works | Spot selected, "SAFE ZONE CONFIRMED" shown |
| Mark Ready — contact exchange | ✅ Works | Both-party readiness gate enforced |
| Contact reveal | ✅ Works | Dual-blind: each party sees the other's details only after both commit |
| Mark Trade Complete | ✅ Works | Status → completed, "Thank you for using NoZar!" |
| Trade rating | ✅ Works | Star rating + comment submitted, shows "You rated this trade 4/5" |
| Trust score update | ✅ Works | Badge flipped from "Newcomer 0%" to "VERIFIED ✓ (1×)" after first trade |
| Notifications | ✅ Works | Badge count shown in sidebar; notifications list with COMPLETED tag |
| Radar / Map page | ✅ Works | Google Maps embed, profile-anchored centre, 10km radius, listings in range |
| Geolocation enable | ✅ Works | Reverse-geocoded to "Sandton, Johannesburg, Gauteng" |
| Pings list | ✅ Works | Thread preview, unread badge, "1 Thread" count |
| Cancel trade | ✅ Not tested | Button present; skipped to preserve test trade |
| Report trade (flag) | ✅ Not tested | ReportModal present; skipped |
| Phone verification | ⚠️ Not tested | Africa's Talking sandbox — requires real phone |
| Forgot password | ⚠️ Not tested | Email delivery requires SMTP config |
| Referral system `/r/:code` | ⚠️ Not tested | — |
| Billing page | ❌ 404 | `/dashboard/billing` route file exists but returns NODE NOT FOUND |
| Balance the Trade | ❌ Broken | BalancePile props hardcoded to `userListings=[], theirValue=0, yourValue=0` |

---

## Bugs Remaining (Unfixed)

### HIGH PRIORITY

#### B1: Location modal re-appears on every navigation
- **File:** `app/routes/dashboard.tsx`
- **Root cause:** `const [isLocationDismissed, setIsLocationDismissed] = useState(false)` resets on every component mount. Clicking the "Index" sidebar link explicitly calls `setIsLocationDismissed(false)` (line ~214).
- **Impact:** Modal blocks every page on every visit — major UX friction especially during onboarding. Cookie banner + location modal together can block all buttons.
- **Fix:** Persist dismissal to `localStorage` (`sessionStorage` for session-only). Check `localStorage.getItem("locationDismissed")` on mount. Or better: save dismissal as a user profile flag in DB (already has `lat/lng` fields) so it persists across devices.

```tsx
// dashboard.tsx — replace useState with localStorage-backed state
const [isLocationDismissed, setIsLocationDismissed] = useState(() => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("nozar_location_dismissed") === "1";
});
const handleLocationDismiss = () => {
  localStorage.setItem("nozar_location_dismissed", "1");
  setIsLocationDismissed(true);
};
```

#### B2: Cookie banner z-index blocks form buttons
- **File:** `app/components/ui/cookie-consent.tsx` (or similar)
- **Root cause:** Cookie banner is `fixed bottom-0 z-50` and physically overlaps submit buttons at the bottom of forms (Add Item, Login, chat input area).
- **Impact:** New users cannot submit forms until they accept cookies.
- **Fix options:**
  1. Auto-accept essential cookies on first page load (no banner needed — these are essential cookies by definition)
  2. Reduce banner to a small toast-style bottom-right notification
  3. Add `pb-20` padding to form containers so buttons clear the banner

#### B3: BalancePile component props hardcoded to zero
- **File:** `app/routes/dashboard/pings.$id.tsx` lines 1871-1879
- **Root cause:** `BalancePile` receives `userListings={[]}`, `theirValue={0}`, `yourValue={0}` — the component opens but has no data to work with.
- **Impact:** "Balance the Trade" button is non-functional; users who click it see empty state.
- **Fix:** Pass `tradeItemsForTrade`, `userInventory`, and estimated values from loader data to the component.

#### B4: Billing page 404
- **URL:** `/dashboard/billing`
- **Root cause:** Route file exists in codebase but the route module is either not exported, has a missing layout, or the file is in the wrong location.
- **Impact:** Any billing/subscription link would 404. Minor for MVP if billing isn't launched yet.
- **Fix:** Either implement the billing page or remove all links that point to it.

### MEDIUM PRIORITY

#### B5: Chat input not cleared after send
- **File:** `app/routes/dashboard/pings.$id.tsx` — `MessageInput` component
- **Root cause:** The `formRef.current?.reset()` is called `when(!isSubmitting && submittingIntent === "sendMessage")`. However, there's a timing issue — the input shows the previous text on the next render cycle before reset fires.
- **Observed:** After sending a message, the input visually retains the message text. It clears on the next server round-trip.
- **Fix:** Add `key` prop to the form tied to message count, or use a controlled input with explicit clear.

#### B6: Duplicate React instance error from `context-mode` package
- **File:** `package.json` — `"context-mode": "file:./context-mode"`
- **Root cause:** The local `context-mode` file package imports its own copy of React, creating two React instances. This causes `TypeError: Cannot read properties of null (reading 'useContext')` in `chunk-OTTQSYDI.js`.
- **Impact:** Console errors on every page; potential for subtle hook failures.
- **Fix:** Ensure the `context-mode` package uses `peerDependencies: { "react": "*" }` rather than a direct `dependencies` React import. Or remove the package if unused.

#### B7: Trade Status right panel empty during `proposed` phase
- **File:** `app/routes/dashboard/pings.$id.tsx` — `renderTradeStatusPanel()`
- **Root cause:** The function has content for `negotiating`, `agreed`, `completed`, and `frozen` but nothing for `proposed` (the chat phase).
- **Impact:** The right panel shows only the "// Trade Status" label — no guidance for new users.
- **Fix:** Add a `proposed` status panel showing trade summary (items being traded, estimated values, tips for safe trading).

#### B8: SSR hydration mismatch on `/register`
- **Root cause:** Password field has `style={{}}` on server but different computed style on client (browser autofill/password manager styles).
- **Impact:** React prints a hydration warning; no visual issue.
- **Fix:** Add `suppressHydrationWarning` to the password input, or ensure server/client render identically.

### LOW PRIORITY

#### B9: Chat polling (2s) is battery-heavy on mobile
- **Root cause:** `setInterval(..., 2000)` revalidates the loader every 2 seconds.
- **Fix:** Switch to server-sent events (SSE) or WebSockets via React Router's `eventStream`. Alternatively use 10s polling for inactive tabs.

#### B10: "3 messages remaining" counter confusing UX
- The counter counts each user's messages independently (newcomer limit is 3 per person). But users see the same "3 messages remaining" regardless of what the counterparty has sent, which is potentially confusing.

---

## Gaps / Missing for MVP

### G1: No onboarding flow
New users land on the dashboard with no guidance. A first-run tooltip tour or a "Welcome" empty state on the Index page would reduce churn dramatically. Currently: Index page shows all listings with no "what to do first" prompt.

### G2: Search is client-side only
The search bar on the dashboard/home filters the already-loaded listings in the browser. There is no server-side search. This is fine for MVP but will not scale.

### G3: No "what I want" visibility to counterparty
When viewing an asset, the "Needs:" field shows what the owner wants. But there's no UI to show whether YOUR listings match what they want. The AI Match helps, but a simple "✓ You have what they want" badge on the listing card would improve conversion.

### G4: Newcomer message limit (3) is aggressively low
For a first trade, users need to discuss condition, confirm specs, negotiate terms. 3 messages is often not enough. Recommend 5 for newcomers.

### G5: No re-engagement after trade completion
After completing a trade, there's no "List another item?" prompt or "Invite a friend" CTA. The success moment is wasted.

### G6: No in-app notifications (push/real-time)
Users must manually refresh or rely on the 2s poll to see new messages. No browser push notifications. No email for new pings (though `newMessageEmail` is implemented — needs SMTP config).

### G7: Email delivery not configured
`app/lib/email.server.ts` exists with functions for `newMessageEmail`, `tradeAcceptedEmail`, `contactSharedEmail`, `tradeCompletedEmail` — but no SMTP env vars are configured. All emails silently fail.

### G8: No delete listing (only archive)
Users can archive a listing but not permanently delete it. This is fine for data integrity but add a "Delete" option with a 30-day soft-delete for peace of mind.

### G9: Image upload UX (Vercel Blob)
Image upload via Vercel Blob is implemented but the profile photo upload requires a file picker that's difficult to automate. No drag-and-drop. Recommend adding direct image URL paste as primary method (it's already there as secondary).

### G10: BalancePile / value parity is scaffolded but not functional
The Value Parity Engine concept exists in the UI (Balance the Trade button, tradeItems table in DB) but the BalancePile component receives no real data. This feature is half-built.

---

## Implementation Plan: MVP to Launchable

### Sprint 1 — Critical Fixes (1–2 days)
1. **Location modal persistence** (B1) — `localStorage` dismissal flag — ~30 min
2. **Cookie banner z-index** (B2) — padding or auto-accept essential cookies — ~20 min  
3. **Billing page** (B4) — implement stub page or remove links — ~1 hour
4. **BalancePile real data** (B3) — wire loader data through to component — ~2 hours
5. **Email SMTP config** (G7) — add `SMTP_*` env vars, test email delivery — ~1 hour

### Sprint 2 — High Impact UX (2–3 days)
6. **Onboarding empty state** (G1) — "Welcome to NoZar, here's how to start" first-run card — ~4 hours
7. **"5 messages for newcomers"** (G4) — change `Math.max(0, 3 - ...)` to 5 — ~5 min
8. **Trade Status `proposed` panel** (B7) — add guidance panel for chat phase — ~1 hour
9. **Post-completion CTA** (G5) — "List another item" / "Invite a friend" button — ~1 hour
10. **Chat input clear fix** (B5) — controlled input or form key — ~30 min

### Sprint 3 — Polish & Performance (3–5 days)
11. **Real-time chat** (B9) — SSE or WebSocket via React Router eventStream — ~1 day
12. **Duplicate React fix** (B6) — fix `context-mode` peerDependencies — ~1 hour
13. **Server-side search** (G2) — debounced URL search param + DB query — ~4 hours
14. **"You have what they want" badge** (G3) — compare user listings to listing `needsDescription` via AI — ~3 hours
15. **Push notifications** (G6) — Web Push API with service worker — ~2 days
16. **Hydration fix** (B8) — `suppressHydrationWarning` on password inputs — ~15 min

### Sprint 4 — Growth Features (ongoing)
17. Phone verification (Africa's Talking SMS OTP)
18. Referral system testing and launch
19. BalancePile full implementation
20. Performance: polling → SSE
21. Playwright automated test suite (expand existing tests)

---

## Environment Notes
- `NVIDIA_API_KEY` — ✅ Set and working  
- `DATABASE_URL` — ✅ NeonDB connected  
- `BETTER_AUTH_*` — ✅ Working  
- `GOOGLE_MAPS_API_KEY` — ✅ Map rendering  
- `BLOB_READ_WRITE_TOKEN` — ✅ Set (upload not fully tested)  
- `AFRICASTALKING_API_KEY` — Set but sandbox mode; SMS not testable without real phone  
- `SMTP_*` — ❌ Not configured — all transactional emails silently drop  
- `GOOGLE_CLIENT_*` — Set; OAuth redirect not testable in headless automation  

---

## Conclusion

NoZar's core product loop is **solid and differentiating**. The dual-blind handshake, AI-powered safe meetup spots, trust progression system, and encrypted chat are genuinely compelling for the South African barter market. The three critical bugs fixed today (ping 404, status mismatch, NVIDIA EOL) unblocked the entire trade flow.

**Recommended priority:** Fix the location modal persistence bug (B1) and cookie banner overlap (B2) before any user testing — these are the first things every user hits and both create a frustrating experience. Everything else can follow in prioritised sprints.

The MVP is ready for closed beta testing with real users once Sprint 1 items are resolved.
