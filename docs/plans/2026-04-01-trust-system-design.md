# NoZar Trust & Safety System

**Date:** 2026-04-01  
**Status:** Proposed  
**Author:** Eva (brainstorming skill)

## Overview

End-to-end implementation of the 3-stage trust architecture with progressive feature unlock, report/freeze system, and AI-powered safe meetup routing. Safety-first design built for the South African risk environment.

## Decisions (Approved by Leroy)

1. **Trust levels are hard-gated** — no bypass, no limp
2. **Report/freeze = cool-down first** — disputes escalate optionally
3. **Trust persists forever** — no decay, with optional "last active" indicator
4. **Meetups powered by Gemini AI** — no dependency on Google Maps places
5. **Both parties must mutually commit** for Stage 2 → Stage 3 transition

---

## 1. Trust Levels & Progressive Unlock

### Schema Changes

Add to `users` table (or create `trust_profiles` table):

```typescript
export const trustProfiles = pgTable("trust_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").primaryKey() // FK to users.id
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  level: text("level").notNull().default("newcomer"), // newcomer | verified | trusted
  completedTrades: integer("completed_trades").notNull().default(0),
  cancelledTrades: integer("cancelled_trades").notNull().default(0),
  averageRating: real("average_rating"),
  reportsReceived: integer("reports_received").notNull().default(0),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  flagged: boolean("flagged").notNull().default(false),
  freezeCount: integer("freeze_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### Level Rules


| Level | Requirements | Chat Limit | Handshake | SafeZone | Listings | Search Rank |
|---|---|---|---|---|---|---|
| **Newcomer** | 0 trades | 3 messages per trade | ❌ | ❌ | 3 max | — |
| **Verified** | 1 completed trade | Unlimited | ✅ | ✅ | 20 max | Normal |
| **Trusted** | 5 completed trades + 4★ avg | Unlimited | ✅ | ✅ | Unlimited | Priority |


### Trust Level Computation

Run as a trigger after trade completion (action in `pings.$id.tsx`):

```typescript
// After trade marked "completed":
// 1. Increment completedTrades for both participants
// 2. Recompute averageRating from ratings table
// 3. Apply level:
//    - completedTrades >= 5 && avgRating >= 4.0 → "trusted"
//    - completedTrades >= 1 && !flagged → "verified"
//    - else → "newcomer"
```

### UI: Trust Badge Component

```tsx
// components/ui/trust-badge.tsx
// Renders: 🔵 Newcomer shield | 🟢 Verified ✓ | ⭐ Trusted ★
// Color: newcomer=slate-500, verified=emerald-500, trusted=cyan-400
// Shows next-level progress when applicable: "1/3 trades to Verified"
```

---

## 2. Report & Freeze System

### Schema

```typescript
export const tradeReports = pgTable("trade_reports", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(), // harassment | scam | safety_concern | no_show | other
  description: text("description"),
  status: text("status").notNull().default("active"), // active | resolved | dismissed
  resolvedAt: timestamp("resolved_at"),
  freezeExpiry: timestamp("freeze_expiry"), // auto-unfreeze after 72h if no escalation
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### Flow

```
User sees 🔴 Report → Selects reason → Submits
  → trade.status = "frozen"
  → contacts hidden from both parties
  → system message: "Trade frozen pending review"
  → freezeExpiry = now + 72 hours
  → If no escalation within 72h, trade returns to previous state
  → Multiple reports → auto-flag user, escalate to admin notification
```

### UI: Report Modal

Small bottom-sheet on mobile:
- 4 reason buttons + text area
- Warning: "This will freeze the trade. Are you sure?"
- After submit: "Trade frozen. Both parties will be notified."

### Enforcement

- **2+ active reports against same user** → `trust_profiles.flagged = true` → their profile shows "⚠️ Under review"
- **5+ reports** → auto-freeze all their pending trades
- This doesn't ban them — just adds friction until cleared

---

## 3. Gemini-Powered SafeZone Meetups

### Current → Fixed

**Before:** Hardcoded "Engen Garage, Main Rd"  
**After:** AI-driven meetup suggestions using both users' locations

### How It Works

1. Loader queries both parties' suburb/city/province from profiles
2. Calls Gemini with structured prompt:
   ```
   User A is in {suburb_A}, {city_A}.
   User B is in {suburb_B}, {city_B}.
   Both are in {province}.
   
   Return 3 safe public meetup spots at a reasonable midpoint.
   Prioritize: shopping malls, police stations, petrol stations, 
   community centres, hospitals. Only well-lit, 24/7 areas.
   Return ONLY JSON: [{"name":"...", "address":"...", "reason":"..."}]
   ```
3. Both parties see the 3 suggestions
4. Each party selects one — if they match, it's confirmed
5. Mismatch → Gemini generates 3 alternatives

### Schema

```typescript
export const meetupSpots = pgTable("meetup_spots", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  reason: text("reason"),
  order: integer("order").notNull().default(0),
});

export const meetupVotes = pgTable("meetup_votes", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  spotId: integer("spot_id")
    .notNull()
    .references(() => meetup_spots.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  unique(["tradeId", "userId"]),
});
```

### UI: SafeZone Picker

After handshake accepted (Stage 2), the SafeZone card shows:
- 3 suggestion buttons with name, address, and reason
- "Pick your preferred spot" — tap one
- Both selected the same → "Meetup confirmed! 🤝"
- Mismatch → "Generating alternative spots..." + 3 new options

---

## 4. Hard-Gated Newcomer Limit

### Message Limit Enforcement

**Before sending a message in Stage 1:**
```typescript
// Action: sendMessage
if (trade.status === "proposed") {
  const userTradeMsgCount = await db
    .select({ count: count() })
    .from(messages)
    .where(and(
      eq(messages.tradeId, tradeId),
      eq(messages.senderId, user.id),
      eq(messages.type, "text"),
    ));
  
  // Fetch user's completed trade count
  const [{ completedTrades }] = await db
    .select({ completedTrades: trustProfiles.completedTrades })
    .from(trustProfiles)
    .where(eq(trustProfiles.userId, user.id));
  
  if (completedTrades < 1 && userTradeMsgCount.count >= 3) {
    return { error: "NEWCOMER_LIMIT", 
      message: "New users can send 3 messages per trade. Complete your first trade to unlock unlimited messaging." };
  }
}
```

### UI: Newcomer Limit Warning

After 2 messages sent:
> ⚠️ You have 1 message remaining. Complete a trade to unlock unlimited messaging.

After 3/3:
> 🔒 Message limit reached. You can complete this trade by committing to the handshake — or start a new one. Your limit resets next trade.

### Other Limits for Newcomers

- **Max 3 active listings** (not 20)
- **Cannot initiate handshake** until counterparty responds first
- **Cannot access SafeZone** (obvious, since handshake is locked)

---

## 5. Double-Blind Contact Reveal

### Change to Current Flow

**Current:** After handshake accepted → either party shares contact independently  
**Fixed:** After handshake accepted → both users must click "I'm Ready"

### UI: Contact Ready Button

Both parties see a shared panel:
```
┌─────────────────────────────────────┐
│  🔒 Contact Details Locked           │
│                                     │
│  You    — Not Ready                 │
│  {name} — Not Ready                 │
│                                     │
│  [ I'm Ready to Exchange Contacts ] │
└─────────────────────────────────────┘
```

When BOTH click "I'm Ready":
- Screen flashes "🤝 Contacts Exchanged!"
- Both users' contact info displayed simultaneously
- 48-hour countdown starts
- System message: "Contact details exchanged. Details valid for 48 hours."

### Schema

```typescript
export const readinessFlags = pgTable("readiness_flags", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id").notNull(),
  userId: text("user_id").notNull(),
  ready: boolean("ready").notNull().default(false),
  readyAt: timestamp("ready_at"),
  unique(["tradeId", "userId"]),
});
```

---

## 6. Value Balancing — "Add to the Pile"

### Philosophy

Real barter never worked as 1-for-1. A bicycle traded for a phone + a service. The lighter pile got topped up until both sides felt good. No calculator, just the feel of a fair deal.

### UX Flow (Stage 1 — Chat)

During encrypted chat, either party taps **"⚖️ Balance the Trade"** — opens a bottom sheet:

```
┌─────────────────────────────────────┐
│  ⚖️ Balance the Trade                │
│                                     │
│  Their listing: Samsung S24 Ultra   │
│  ~R8,000                            │
│                                     │
│  Your listing: Guitar Lessons (2hrs)│
│  ~R600                              │
│                                     │
│  Gap: ~R7,400                       │
│                                     │
│  How do you want to balance?         │
│  ◉ Add another listing              │
│  ○ Extend my service offer          │
│  ○ I accept as-is                   │
│                                     │
│  [Continue]                          │
└─────────────────────────────────────┘
```

**"Add another listing"**: Shows their active listings. Tap to add 1–5 items to the trade pile.

**"Extend my service"**: Free-text counter-offer — "I'll add website design, worth ~R1,500"

**"I accept as-is"**: Skip balancing, proceed to handshake.

### Rules

- **Max 5 items per side** — keeps it manageable, not a swap shop
- New items go into a **pending pile** — the counterparty must accept each addition
- Deal is balanced when **both parties accept** the combined pile
- Once balanced, the "Deal Struck" card appears with full pile summary

### Deal Struck Card

```
┌─────────────────────────────────────────┐
│  🤝 Deal Struck! Your pile:              │
│  • Samsung S24 Ultra (~R8,000)          │
│                                          │
│  Their pile:                             │
│  • Guitar Lessons (~R600)               │
│  • Piano Lessons (~R300)                │
│  • Website Design (~R1,500)             │
│  • Old Tablet (~R2,000)                 │
│  • 3kg Braai Pack (~R400 + bonus)       │
│                                          │
│  [🤝 Commit to Handshake]               │
└─────────────────────────────────────────┘
```

### Schema

```typescript
export const tradeItems = pgTable("trade_items", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  listingId: integer("listing_id")
    .references(() => listings.id, { onDelete: "set null" }),
  description: text("description"),           // free-text for service extensions
  estimatedValue: integer("estimated_value_zar"),
  type: text("type").notNull(),               // listing | service_extension
  accepted: boolean("accepted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### Enforcement

- Subagents count items per `userId` per `tradeId` — reject if count >= 5
- When either party adds an item, a system message shows in the chat stream:
  > ⚖️ {name} added to the pile: "{item}" — ~R{value}
- Counterparty sees accept/reject buttons on the addition
- Rejected item removed, trade continues with existing pile
- Accepted → pile grows, either party can trigger Stage 2 handshake at any time

---

## Implementation Order (Subagent-Ready)

| Task | File(s) | Complexity |
|---|---|---|
| T1: `trust_profiles` table + migration | `lib/schema.ts`, `drizzle/` | Easy |
| T2: `tradeReports` + `readinessFlags` tables | `lib/schema.ts`, `drizzle/` | Easy |
| T3: `tradeItems` table for value balancing | `lib/schema.ts`, `drizzle/` | Easy |
| T4: Trust badge component | `components/ui/trust-badge.tsx` | Easy |
| T5: Newcomer message limit | `routes/dashboard/pings.$id.tsx` action | Medium |
| T6: Trust level computation on trade complete | `routes/dashboard/pings.$id.tsx` action | Medium |
| T7: Report/freeze UI + modal | `routes/dashboard/pings.$id.tsx` | Medium |
| T8: Double-blind contact reveal | `routes/dashboard/pings.$id.tsx` | Medium |
| T9: Value balancing UI + add-to-pile flow | `routes/dashboard/pings.$id.tsx` | Medium |
| T10: Gemini SafeZone API + UI | `routes/dashboard/pings.$id.tsx` + `lib/` | Hard |
| T11: Profile trust display + active indicator | `routes/dashboard/profile.tsx` | Easy |
| T12: Newcomer listing limit enforcement | `routes/dashboard/add.tsx` action | Easy |
