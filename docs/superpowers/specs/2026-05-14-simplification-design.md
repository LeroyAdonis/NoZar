# NoZar Simplification Design
**Date:** 2026-05-14
**Approach:** Progressive disclosure — plain language throughout, reduce cognitive load without hiding power

---

## Overview

NoZar is a South African barter platform. The current app uses technical jargon, scattered navigation labels, and long-scroll pages that confuse non-technical users. This spec covers a full simplification pass across all screens — navigation, onboarding, home feed, add-item flow, item detail, chats, and profile — without changing the brand identity (dark theme, emerald green) or the underlying data model.

**Guiding principles:**
- Every label must be understood on first read by someone who has never used the app
- One clear action per screen moment — no competing CTAs
- Progressive disclosure: required fields first, optional details behind "More details"
- Nothing is removed from the database; only the UI presentation changes

---

## Section 1 — Navigation & Labels

### Bottom nav changes

| Before | After |
|--------|-------|
| Index | Home |
| Radar | Explore |
| Pings | Chats |
| Node | Profile |

The `+` FAB remains centred between Explore and Chats, unchanged.

### Jargon removal (app-wide)

| Before | After |
|--------|-------|
| // Comms.Uplink | (removed) |
| Active Pings | Chats |
| Ping | Message |
| Propose Trade | Offer a swap |
| Archive (a listing) | Hide |
| Total Trades | Swaps started |
| Avg Rating | Your rating |
| Asset | Item |
| Seeking: | Looking to swap for |
| Node | Profile |

All monospace decorative labels (e.g. `// Your Profile`) are removed from screen headers. Section headings use plain sentence-case titles.

---

## Section 2 — Welcome Overlay (First Login)

A full-screen overlay appears once on first login, gated by a `hasSeenWelcome` boolean stored per user. It does not appear on subsequent logins.

### Content

- **Headline:** "Welcome to NoZar"
- **Sub-headline:** "Swap what you have for what you need. No cash needed."
- **Three steps** (icon + one-line each):
  - 📋 Post what you're offering
  - 🔍 Browse what others have
  - 💬 Chat and agree on a swap
- **CTA button:** "Let's go →" — dismisses the overlay and sets `hasSeenWelcome = true`

### Implementation notes

- `hasSeenWelcome` flag stored in `localStorage` (key: `nozar_welcome_seen`) — avoids a schema change and survives across sessions on the same device. Sufficient for a first-login overlay; no need for cross-device persistence.
- Overlay is a fixed full-screen div rendered inside the dashboard layout, z-indexed above all content
- No "skip" link — users must tap "Let's go" to proceed (one clear action)

---

## Section 3 — Home Feed

### Header

Remove the `// AI.Match.Engine` monospace label. Replace with:
- Small label: "Based on your listings"
- Large heading: "Your match"

### Category filter strip

Labels change from icon-only or jargon to plain emoji + word chips:
- All · Electronics · Clothes · Home · Skills · Vehicles · Food · Other

### Region toggle

"Local / National" replaces any technical location-mode labels. Defaults to Local.

### Item cards (meta row)

Current layout stacks distance + username + time-ago in ways that overflow. New layout:
- **Row 1:** distance badge (e.g. "2.3 km") + username (e.g. "by Thabo")
- **Row 2:** time-ago (e.g. "3h ago")

Username is removed from the card header/title area where it was causing overlap.

### "You Have Match" badge

Badge on the Home nav tab already exists. Copy the label: **"You have a match!"** (plain English, no abbreviation).

---

## Section 4 — Add Item Wizard

### Before
One long page with all 9 fields presented simultaneously.

### After — 2-step wizard

**Step 1 of 2 — "What are you offering?"**

Required fields only:
1. Item / Service toggle (two large buttons)
2. Name (text input, placeholder: "e.g. Samsung Galaxy S24")
3. Description (textarea, placeholder: "Good condition, barely used…") + "✨ Write it for me" AI assist button
4. Category (4-tile grid: Electronics · Home · Fashion · More…)
5. Photo (dashed upload zone, "Tap to add a photo") — labelled optional

Collapsible "More details" row beneath (closed by default):
- Condition
- Estimated value in Rands
- Delivery method
- Suburb / area

CTA: **"Next: What do you want? →"**

**Step 2 of 2 — "What do you want in return?"**

Single free-text field:
- Placeholder: "e.g. A laptop, guitar lessons, plumbing work…"
- Back button + **"Post listing"** CTA

### Data model
No schema changes. All existing fields continue to be saved. "More details" fields save the same columns they always did — they are just collapsed in the UI by default.

---

## Section 5 — Item Detail & "Offer a Swap"

### Before
Two competing buttons: "Ping" (primary) + "Propose Trade" (secondary). Jargon. No context about what either does.

### After

**Item detail page**

- Photo (full width, top)
- Title (large, bold)
- Meta row: "Listed by [Name] · [distance] · [time ago]"
- Tags: "Worth ~R12,000" (emerald) · "Like New" (neutral)
- Description (plain text)
- "Looking to swap for" card (own box, not buried in description)
- Single CTA: **"Offer a swap"** (full-width, emerald)
- Tertiary link: "Report this listing" (small, below button)

**"Offer a swap" bottom sheet**

Slides up on button tap before opening chat. Shows:

- "Your swap offer" heading
- Side-by-side trade summary: "You're offering [item + value]" ⇄ "You want [item + value]"
- Amber value-gap warning if the two estimated values differ by more than 20%: "⚠ Value gap — you may need to top up or negotiate"
- Explanatory line: "Tapping 'Start chatting' opens a conversation with [Name]. You can agree on details before anything is finalised."
- CTA: **"Start chatting"**
- Secondary: "Cancel"

This sheet acts as an explicit confirmation step — no blind jump into chat.

---

## Section 6 — Chats (formerly Pings)

### Chat list

- Remove "// Comms.Uplink" decorative label
- Title: **"Chats"** (was "Active Pings")
- Sub-label: "Your swap conversations"
- Thread count: "2 active" (plain text, no badge)
- Each thread row: Name · "About: [item name]" · last message · status badge

### Trade status badges

Every thread shows a plain-language status pill:

| Status | Colour | Meaning shown |
|--------|--------|---------------|
| Offered | Purple | You've sent an offer — waiting for a reply |
| Chatting | Emerald | Both sides are talking it through |
| Agreed | Amber | You've shaken hands — arrange the handover |
| Done ✓ | Light emerald | Swap completed — leave a rating |

### Safe meetup flow (required gate)

Safety at handover is non-negotiable for South African users. The safe meetup step is a **required gate** — "Confirm swap" is unreachable until both parties agree on a meetup location.

**Flow order:**
1. Chatting → negotiate terms
2. **Pick a safe spot** → AI suggests 3 public locations near both users; each party votes
3. Confirm swap → both sides lock it in
4. Done → leave a rating

**Step 1 — AI suggests spots**

The `MeetupPlanner` stub is replaced with the full `SafeZonePicker` component wired into the chat screen. When the swap status reaches "Agreed", the SafeZonePicker card appears inline in the chat:

- Header: "Choose a safe meetup spot" + "AI found 3 public places near both of you"
- Three radio-select locations with name, address, safety note
- CTA: "Vote for [selected location]"
- Sub-text: "[Other user] also needs to vote — you'll both see the result"

**Step 2 — Both voted, spot confirmed**

Once both votes are cast (real-time, via existing `meetupVotes` table + SSE), the card transitions to a confirmed state:

- "SAFE SPOT CONFIRMED" header
- Location name + address
- "✓ Both parties agreed on this location"

Only after this confirmation does the "Ready to finalise?" / "Confirm swap" card appear.

**Implementation notes:**

- `MeetupPlanner` component (currently a stub in `app/components/ui/MeetupPlanner.tsx`) should be replaced with `SafeZonePicker` or updated to render it
- Wire `SafeZonePicker` into the chat screen, triggered when status = "Agreed"
- AI spot generation: call AI API with both users' suburb fields to produce 3 safe public locations
- Gate "Confirm swap" button: it must not render until `meetupSpots` table shows an agreed location for this tradeId
- Real-time spot reveal: when the other user votes, both parties should see the result without refreshing (use existing SSE infrastructure)
- Backend API (`api.meetup.$tradeId.ts`) is already fully built with `add_spot`, `vote`, `finalize` actions

---

## Section 7 — Profile

### Before
One long scroll mixing: avatar upload controls, profile card, stats grid, edit form (toggled inline), active listings, archived listings, sign out button.

### After — two tabs

**"My listings" tab** (default)

- Sub-heading: "[N] active"
- "+ Add item" button (top right, emerald pill)
- List of active listings: thumbnail · name · category + value · Edit / Hide buttons
- "Hide" replaces "Archive" everywhere — it removes the listing from public view without deleting it

**"Account" tab**

- Avatar + name + "Edit" link (top right)
- Location + email verified badge
- Stats grid (3 cells):
  - "Swaps started" (was "Total Trades")
  - "Completed"
  - "Your rating" (was "Avg Rating")
- Verification card: Email (verified badge) · Phone ("+ Add & verify →" if missing)
- Plan row: "Free plan — 5 listings" + "Upgrade →" link
- Sign out button (red border, bottom)

### Profile editing
The "Edit" link on the Account tab opens the existing edit profile form as a slide-in sheet (or navigates to the existing edit route if one exists). It does not toggle inline within the scrollable Account tab — that was the source of the long-scroll problem. The edit form content (name, bio, location, avatar) is unchanged.

### Removed from profile
- Decorative `// Your Profile` monospace label
- Inline edit form toggling embedded in the scrollable page body

---

## Out of Scope

- No changes to the database schema
- No changes to the visual brand (dark theme, emerald green, typography)
- No removal of any existing features — only relabelling and reorganising
- Ratings/review screen: not redesigned in this spec (no current complaints)
- Push notification copy: not redesigned in this spec

---

## Files to change

| File | Change |
|------|--------|
| `app/components/ui/bottom-nav.tsx` | Update nav labels: Index→Home, Radar→Explore, Pings→Chats, Node→Profile |
| `app/routes/dashboard/home.tsx` | Remove monospace decorative header, update category labels, fix meta row layout, update "you have match" copy |
| `app/routes/dashboard/add.tsx` | Rewrite as 2-step wizard with step-1/step-2 state, progressive disclosure "More details" accordion |
| `app/routes/dashboard/asset.$id.tsx` | Replace "Ping"+"Propose Trade" with single "Offer a swap" + bottom sheet confirmation |
| `app/routes/dashboard/pings.tsx` | Keep filename, update UI only: remove jargon header, add status badges, wire safe meetup gate |
| `app/components/ui/MeetupPlanner.tsx` | Replace stub with SafeZonePicker integration + AI spot generation |
| `app/routes/dashboard/profile.tsx` | Split into two tabs: My listings + Account; rename Archive→Hide, rename stats labels |
| Dashboard layout / root | Add `hasSeenWelcome` overlay on first login |
