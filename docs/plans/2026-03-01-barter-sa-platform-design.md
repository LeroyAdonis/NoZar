# Barter SA — Platform Design Document

**Date:** 2026-03-01
**Status:** Approved (brainstorming complete)
**Author:** Architecture session

---

## 1. Problem Statement

Build a mobile-first PWA for the South African market where businesses and individuals trade goods and services without money — a pure barter exchange system. The platform must solve three critical unknowns: monetization without transaction fees, secure contact exchange between strangers, and a tight MVP scope that proves the core barter loop.

## 2. Foundational Decisions

### 2.1 Barter Model
- **Pure 1:1 barter** with advisory "estimated value in ZAR" on every listing
- Estimated value is for matching expectations only — both parties can agree to any trade regardless of numbers
- Data model supports trade credits in a future phase
- No multi-party chain trades in MVP

### 2.2 Geographic Strategy
- **Community-seeded Johannesburg launch** targeting 3 clusters:
  - University area (Wits/UJ) — consumer/freelancer testing
  - Business district (Sandton/Rosebank) — business account testing
  - Township (Soweto) — informal economy/consumer testing
- Phase 2: Cape Town + Durban expansion

### 2.3 User Types
- **Consumer accounts** — individuals trading personal items or skills
- **Business accounts** — companies trading surplus stock, equipment, or services (Phase 2)
- **Freelancers** — treated as consumers who primarily list services (not a third account type)
- Consumer and Business have different profile structures, verification requirements, and monetization

### 2.4 Remote vs. Local Trades
- Items default to **local-only** (collection/meetup)
- Services default to **remote-eligible**
- Users can override defaults per listing

---

## 3. Monetization Strategy

### 3.1 Core Principle
No per-trade fees — unenforceable on barter transactions and contradicts the "no money" brand promise.

### 3.2 Revenue Model: Freemium + Boost Economy

| Tier | Price | Target | Key Features |
|------|-------|--------|-------------|
| **Free Forever** | R0 | Consumer/Freelancer | 5 active listings, basic search, chat, map view |
| **Trader Plus** | R29/mo | Active consumers | 20 listings, 2 boost tokens/mo, trade analytics |
| **Business Starter** | R99/mo | Small business | 50 listings, verified badge, business profile, 5 boosts/mo |
| **Business Pro** | R249/mo | Established business | Unlimited listings, premium map pin, analytics, 15 boosts/mo |

### 3.3 Boost Tokens (à la carte)
- R15 per boost (24hr priority placement in search results and feed)
- Bundles: 5 for R59, 10 for R99
- Non-refundable once used

### 3.4 Pricing Rationale
- R29/mo is below SA's Netflix basic tier (R49) — affordable for active traders
- R99/mo is comparable to Gumtree SA business subscription
- Boosts are the primary revenue driver (proven model in SA via Gumtree)
- Free tier must be genuinely useful to build network effects
- Business tiers carry the margin; consumers drive volume

### 3.5 Payment Integration
- Polar.sh for subscription tiers (recurring) and boost token bundles (one-time)

---

## 4. Security Architecture — Safe Contact Exchange

### 4.1 Threat Model

| Threat | Risk Level | When |
|--------|-----------|------|
| Fake profiles harvesting contact details | 🔴 Critical | At trade agreement |
| Location stalking via address disclosure | 🔴 Critical | At meetup arrangement |
| Robbery at meetup location | 🔴 Critical | Post-agreement IRL |
| Spam/scam via harvested phone numbers | 🟡 High | Post-contact exchange |
| Ghost after getting contact info | 🟡 High | Post-agreement |
| Social engineering from profile data | 🟠 Medium | Any time |

### 4.2 Five-Layer Security Architecture

#### Layer 1: Identity Verification (before trading)
- Phone OTP verification — mandatory for all accounts (Africa's Talking SMS)
- Progressive trust gates: new accounts get 1 active listing and 1 trade/week until first successful trade with mutual positive ratings
- Business verification: CIPC registration validation → "Verified Business" badge (Phase 2)
- Optional SA ID verification → "Identity Verified" badge (Smile Identity)

#### Layer 2: In-Platform Communication (during negotiation)
- All negotiation happens in barter chat — no external contact info needed
- Chat auto-flags messages containing phone numbers, emails, or URLs before trade agreement
- Soft warning: "For your safety, share contact details only after confirming a trade agreement"
- Report button on every message

#### Layer 3: Staged Contact Disclosure (the critical innovation)
When both parties hit "Agree to Trade":

**Step 1 — Trade Contract:** Both confirm what's being exchanged, estimated values, and method:
- 🤝 Public meetup (items)
- 🚚 Delivery (items, remote)
- 💻 Remote (services)

**Step 2 — Selective disclosure by trade method:**

| Trade Method | Revealed | Hidden |
|-------------|----------|--------|
| Public meetup | First name, general suburb, in-app voice call | Phone number, exact address |
| Delivery | First name + delivery address (to sender only) | Phone number |
| Remote service | First name, in-app video call | Everything else |

**Step 3 — Masked phone relay** via Africa's Talking (MVP; replaced by WebRTC in Phase 2)

**Step 4 — Safe meetup locations:** Platform suggests verified public spots (police station lobbies, shopping mall info desks, Pick n Pay parking lots). Users can pin custom locations.

**Step 5 — Auto-expiry:** Contact details hidden 72 hours after trade completion.

#### Layer 4: Reputation & Trust Signals
- Mutual ratings after every trade (both must rate to unlock next trade)
- Trade completion rate visible on profile (e.g., "12/14 trades completed — 86%")
- Account age and verification badges visible
- "Trusted Trader" badge after 10+ completed trades with 4.5+ rating

#### Layer 5: Abuse Pattern Detection
- Harvester detection: accounts initiating 5+ trades but completing <20% → flagged and throttled
- New account rate limiting: max 1 trade agreement/day for first 2 weeks
- Geographic anomaly: flagging "in-person" trades between different cities
- Automated reporting: 3 reports → manual review; 5 → automatic suspension

---

## 5. MVP Scope

### 5.1 Phase 1 — MVP (Prove the Barter Loop)

**In scope:**
- Auth (Better Auth) with phone OTP via Africa's Talking
- Consumer profiles only (business accounts deferred)
- Item + Service listings with estimated ZAR value
- Timeline feed with full-text search
- Category + value range + type filters
- Geolocation-based distance filtering (list view, not map)
- Barter chat with offer/counter-offer flow
- Trade agreement with staged contact disclosure
- Masked phone relay via Africa's Talking
- Mutual rating system
- New account rate limiting (1 trade/day, 5 listings max)
- Basic PWA (installable, offline listing cache)
- Read-only public profiles for unauthenticated visitors
- Safe meetup location suggestions (static list per area)

**Out of scope (deferred):**
- Map view with interactive pins → Phase 2
- WebRTC in-app voice/video calling → Phase 2
- Business accounts & business profiles → Phase 2
- Monetization (subscriptions, boosts, Polar.sh) → Phase 2
- CIPC business verification → Phase 2
- Advanced abuse pattern detection → Phase 2
- Full offline-first (service worker write-back) → Phase 2
- AI-powered matching (Puter.js) → Phase 3
- Trade credits / multi-party chain trades → Phase 3
- Delivery service integration → Phase 3

### 5.2 Phase 2 — Growth (after ~100 completed trades)
- Business accounts with separate profile structure
- Interactive map view with filterable pins
- Monetization tiers + boost tokens (Polar.sh)
- WebRTC in-app calling (replace masked phone relay)
- CIPC business verification
- Advanced abuse detection
- Full offline-first with write-back sync

### 5.3 Phase 3 — Scale (after ~1,000 completed trades)
- Trade credits / barter points system
- AI-powered matching and recommendations (Puter.js)
- Multi-city expansion (Cape Town, Durban)
- Delivery service integration (Uber Connect, Mr D)
- API for business inventory sync
- Analytics dashboard for business accounts

---

## 6. System Architecture

```
┌─────────────────────────────────────────────────┐
│                   Client (PWA)                   │
│  Next.js App Router + React Server Components    │
│  Service Worker (Serwist) + IndexedDB cache      │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│               Next.js Server                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ API Route│ │  Server  │ │ Server Actions   │ │
│  │ Handlers │ │Components│ │ (mutations)      │ │
│  └────┬─────┘ └────┬─────┘ └───────┬──────────┘ │
│       │             │               │            │
│  ┌────┴─────────────┴───────────────┴──────────┐ │
│  │           Service Layer                      │ │
│  │  Auth │ Listings │ Trades │ Chat │ Ratings   │ │
│  └────┬─────────────────────────────────────────┘ │
│       │                                          │
│  ┌────┴────────────────────┐ ┌─────────────────┐ │
│  │  Drizzle ORM            │ │ Africa's Talking│ │
│  │  (Neon PostgreSQL)      │ │ (SMS/Phone mask)│ │
│  └─────────────────────────┘ └─────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 6.1 Key Architectural Decisions
- **Server Components by default** — listings feed, profiles, search results are server-rendered
- **Client Components only for**: chat interface, trade negotiation UI, location picker, interactive filters
- **Server Actions for mutations** — creating listings, initiating trades, sending messages, rating
- **No separate backend** — Next.js API routes handle everything

### 6.2 App Router Structure

```
app/
  (public)/                    # No auth required
    page.tsx                   # Landing page + SEO
    listings/[id]/page.tsx     # Public listing view
    profiles/[id]/page.tsx     # Read-only public profile
  (auth)/                      # Auth pages
    login/page.tsx
    register/page.tsx
    verify-phone/page.tsx
  (app)/                       # Authenticated layout
    layout.tsx                 # App shell with nav
    feed/page.tsx              # Main timeline/feed
    listings/
      new/page.tsx             # Create listing
      [id]/edit/page.tsx       # Edit listing
    trades/
      page.tsx                 # Active trades list
      [id]/page.tsx            # Trade detail + chat
    profile/
      page.tsx                 # Own profile
      edit/page.tsx            # Edit profile
    settings/page.tsx          # Account settings
    search/page.tsx            # Search with filters
```

---

## 7. Data Models (Drizzle Schema)

### 7.1 Users & Profiles

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  phone: text('phone').unique(),
  phoneVerified: boolean('phone_verified').default(false),
  accountType: text('account_type', {
    enum: ['consumer', 'business']
  }).default('consumer'),
  identityVerified: boolean('identity_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey()
    .references(() => users.id),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  suburb: text('suburb'),
  city: text('city').default('Johannesburg'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  searchRadiusKm: integer('search_radius_km').default(25),
  tradeRadiusKm: integer('trade_radius_km').default(15),
  completedTrades: integer('completed_trades').default(0),
  averageRating: doublePrecision('average_rating'),
  trustedTrader: boolean('trusted_trader').default(false),
});
```

### 7.2 Listings

```typescript
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  parentId: text('parent_id')
    .references(() => categories.id),
});

export const listings = pgTable('listings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  type: text('type', {
    enum: ['item', 'service']
  }).notNull(),
  categoryId: text('category_id')
    .references(() => categories.id),
  estimatedValueZar: integer('estimated_value_zar'),
  condition: text('condition', {
    enum: ['new', 'like_new', 'good', 'fair', 'poor']
  }),
  deliveryMethod: text('delivery_method', {
    enum: ['local_meetup', 'delivery', 'remote', 'flexible']
  }).default('local_meetup'),
  serviceDuration: text('service_duration'),
  serviceFormat: text('service_format', {
    enum: ['in_person', 'online', 'both']
  }),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  suburb: text('suburb'),
  status: text('status', {
    enum: ['active', 'traded', 'expired', 'draft']
  }).default('active'),
  seekingDescription: text('seeking_description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const listingImages = pgTable('listing_images', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').notNull()
    .references(() => listings.id),
  url: text('url').notNull(),
  order: integer('order').default(0),
});
```

### 7.3 Trades

```typescript
export const trades = pgTable('trades', {
  id: text('id').primaryKey(),
  initiatorId: text('initiator_id').notNull()
    .references(() => users.id),
  responderId: text('responder_id').notNull()
    .references(() => users.id),
  status: text('status', {
    enum: ['proposed', 'negotiating', 'agreed',
           'contact_shared', 'completed',
           'cancelled', 'disputed']
  }).default('proposed'),
  tradeMethod: text('trade_method', {
    enum: ['public_meetup', 'delivery', 'remote']
  }),
  meetupLocationLat: doublePrecision('meetup_location_lat'),
  meetupLocationLng: doublePrecision('meetup_location_lng'),
  meetupLocationName: text('meetup_location_name'),
  contactSharedAt: timestamp('contact_shared_at'),
  contactExpiresAt: timestamp('contact_expires_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tradeItems = pgTable('trade_items', {
  id: text('id').primaryKey(),
  tradeId: text('trade_id').notNull()
    .references(() => trades.id),
  listingId: text('listing_id').notNull()
    .references(() => listings.id),
  offeredBy: text('offered_by').notNull()
    .references(() => users.id),
});
```

### 7.4 Messages

```typescript
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  tradeId: text('trade_id').notNull()
    .references(() => trades.id),
  senderId: text('sender_id').notNull()
    .references(() => users.id),
  content: text('content').notNull(),
  type: text('type', {
    enum: ['text', 'offer', 'counter_offer',
           'agreement', 'system']
  }).default('text'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 7.5 Ratings

```typescript
export const ratings = pgTable('ratings', {
  id: text('id').primaryKey(),
  tradeId: text('trade_id').notNull()
    .references(() => trades.id),
  raterId: text('rater_id').notNull()
    .references(() => users.id),
  ratedUserId: text('rated_user_id').notNull()
    .references(() => users.id),
  score: integer('score').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueRating: unique().on(table.tradeId, table.raterId),
}));
```

### 7.6 Contact Disclosures

```typescript
export const contactDisclosures = pgTable('contact_disclosures', {
  id: text('id').primaryKey(),
  tradeId: text('trade_id').notNull()
    .references(() => trades.id),
  disclosedTo: text('disclosed_to').notNull()
    .references(() => users.id),
  disclosedField: text('disclosed_field', {
    enum: ['first_name', 'phone_masked', 'suburb',
           'delivery_address']
  }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revoked: boolean('revoked').default(false),
});
```

### 7.7 Key Schema Decisions
- **`seekingDescription`** on listings — free text "what I want in return" for flexible matching
- **`estimatedValueZar`** as integer — enables future trade credit system
- **`contactDisclosures`** table — audit trail for what was revealed, to whom, and when it expires
- **Single `listings` table** for items and services — nullable service-specific fields avoid a second table
- **Trade status machine** — `proposed → negotiating → agreed → contact_shared → completed`

### 7.8 Early Commitments (hard to change later)
- Users table structure (Better Auth alignment)
- Trade status flow
- Listing type enum (`item` vs `service`)

### 7.9 Deferrable Decisions
- Category hierarchy (start flat, add nesting later)
- Business profile fields (Phase 2)
- Search indexing strategy (Neon full-text vs. external)

---

## 8. PWA Configuration

### 8.1 Manifest

```json
{
  "name": "Barter SA",
  "short_name": "Barter",
  "description": "Trade items and services without money",
  "start_url": "/feed",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0F172A",
  "background_color": "#0F172A",
  "icons": [
    { "src": "/icons/icon-192.webp", "sizes": "192x192", "type": "image/webp" },
    { "src": "/icons/icon-512.webp", "sizes": "512x512", "type": "image/webp" },
    { "src": "/icons/icon-maskable-512.webp", "sizes": "512x512", "type": "image/webp", "purpose": "maskable" }
  ]
}
```

### 8.2 Service Worker Strategy (Serwist)

| Resource Type | Strategy | Rationale |
|---|---|---|
| App shell (HTML, CSS, JS) | Cache-first, stale-while-revalidate | Instant loads on repeat visits |
| Listing images | Cache-first with 7-day expiry | Images don't change; save data |
| API: Feed/listings | Network-first, cache fallback | Fresh data when online; cached when offline |
| API: Chat messages | Network-only | Must be real-time |
| Static assets | Cache-first, immutable | Never changes per version |
| Search results | Network-only | Stale search results are misleading |

### 8.3 Data Budget
- First load target: **< 150KB compressed** (excluding images)
- Listing images: **WebP only, max 200KB each, lazy-loaded**
- Thumbnails: 50px blur hash placeholder → 400px WebP on tap
- API responses: paginated (20 items/page)
- Offline indicator: clear visual banner

### 8.4 SA Optimizations
- **No web fonts** — system font stack saves 50-200KB
- **No heavy JS libraries** — React Server Components for most pages
- **Sharp image pipeline** — all uploads converted to WebP at 80% quality
- **Prefetch only visible listings** — no aggressive prefetching

---

## 9. Development Strategy

### 9.1 Subagent Workstreams

| # | Agent | Branch | Responsibility | Depends On |
|---|-------|--------|----------------|------------|
| 1 | Auth Agent | `feat/auth` | Better Auth, phone OTP, user/profile CRUD, trust gates | Nothing |
| 2 | Listings Agent | `feat/listings` | Listing CRUD, image upload, search, filters | Auth |
| 3 | Trade Agent | `feat/trades` | Trade state machine, chat, offers, contact disclosure, ratings | Auth + Listings |
| 4 | PWA Agent | `feat/pwa` | Service worker, manifest, offline cache, install prompt | Auth (for app shell) |
| 5 | Map Agent | `feat/map` | Leaflet/Mapbox map, user pins, location picker | Listings (Phase 2) |
| 6 | Monetization Agent | `feat/monetization` | Polar.sh, subscriptions, boosts, paywall | Auth + Listings (Phase 2) |

### 9.2 Handoff Contracts

```typescript
// Auth Agent exports:
interface AuthService {
  getCurrentUser(): Promise<User | null>;
  requireAuth(): Promise<User>;
  requirePhoneVerified(): Promise<User>;
  getUserTrustLevel(userId: string): Promise<'new' | 'active' | 'trusted'>;
}

// Listings Agent exports:
interface ListingService {
  createListing(data: NewListing): Promise<Listing>;
  getListingsInRadius(lat: number, lng: number, radiusKm: number): Promise<Listing[]>;
  searchListings(query: string, filters: SearchFilters): Promise<PaginatedResult<Listing>>;
}

// Trade Agent exports:
interface TradeService {
  initiateTrade(initiatorId: string, listingId: string): Promise<Trade>;
  advanceTrade(tradeId: string, action: TradeAction): Promise<Trade>;
  getTradeMessages(tradeId: string): Promise<Message[]>;
}
```

### 9.3 Git Worktree Strategy

```bash
barter/                  # main branch — shared schema, config, types
barter-auth/             # feat/auth
barter-listings/         # feat/listings
barter-trades/           # feat/trades
barter-pwa/              # feat/pwa
# Phase 2:
barter-map/              # feat/map
barter-monetization/     # feat/monetization
```

**Merge order:** auth → listings → pwa (parallel) → trades

### 9.4 Phase 1 Sprint Plan

| Week | Focus | Agents |
|------|-------|--------|
| Week 1 | Project scaffold, schema, auth setup, basic listing CRUD | Auth, Listings (scaffold) |
| Week 2 | Listing feed, search, filters, image pipeline | Listings, PWA (scaffold) |
| Week 3 | Trade state machine, barter chat, offer flow | Trade, PWA (service worker) |
| Week 4 | Contact disclosure, ratings, safe meetup locations | Trade (finalize) |
| Week 5 | Integration testing, security hardening, PWA polish | All (integration) |
| Week 6 | Bug fixes, performance optimization, soft launch prep | All (polish) |

---

## 10. Tech Stack Tensions & Resolutions

| Tension | Resolution |
|---------|-----------|
| Real-time chat with Next.js (no built-in WebSocket) | Use Server-Sent Events or polling for MVP; add WebSocket via custom server in Phase 2 |
| Neon DB cold starts on serverless | Use Neon's connection pooling; critical queries use prepared statements |
| Better Auth + phone OTP | Better Auth supports custom providers; wrap Africa's Talking as a credential provider |
| PWA offline writes | Read-only offline in MVP; IndexedDB queue for write-back in Phase 2 |
| Image storage | Use Vercel Blob or Cloudflare R2 (cheap, SA-proxied via CDN) |
| Geolocation queries on PostgreSQL | PostGIS extension on Neon for radius queries; or use Haversine formula for MVP |

---

## 11. Legal Documents

### 11.1 Required Documents
- Terms of Service (ECTA-compliant) — drafted
- Privacy Policy (POPIA-compliant with Information Officer) — drafted
- Community Guidelines — drafted
- POPIA Information Officer Notice (POPIA s55) — to be filed
- Cookie/Storage Notice — included in Privacy Policy

### 11.2 Key Legal Considerations
- Barter is taxable under SARS — platform includes tax disclaimer
- VAT on barter for registered businesses
- POPIA cross-border transfer consent required (Neon DB hosted outside SA)
- CPA applies to consumer-business trades
- Platform is NOT a party to trades — facilitator only

### 11.3 Full Document Drafts
Full legal document drafts are maintained separately. See the brainstorming session for complete Terms of Service, Privacy Policy, and Community Guidelines templates.

---

## 12. Open Questions for Future Exploration

1. **Search infrastructure**: Neon full-text search vs. Typesense/Meilisearch for listing search at scale
2. **Image hosting**: Vercel Blob vs. Cloudflare R2 vs. Supabase Storage — cost/performance for SA
3. **Chat infrastructure**: Polling vs. SSE vs. WebSocket for barter chat — latency vs. complexity trade-off
4. **Africa's Talking pricing**: Phone relay cost per trade — may need to cap relay usage per trade
5. **Moderation**: Manual vs. AI-assisted content moderation for listings
6. **Analytics**: Privacy-respecting analytics tool (Plausible, Umami) for launch metrics
7. **Hosting region**: Vercel edge functions vs. single region — SA-proxied CDN considerations

---

## Appendix A: Assumptions That Deserve Questioning

| Assumption | Risk | Mitigation |
|-----------|------|-----------|
| Users will set honest estimated values | Medium — gaming values for better matches | Show community average for similar items |
| Phone OTP is sufficient for identity verification | Medium — SIM farms exist in SA | Add optional ID verification badge |
| 5 free listings is enough for casual users | Low — can adjust based on usage data | Feature flag the limit |
| Joburg launch is better than Cape Town | Low — Cape Town has higher tech adoption | Monitor early signups by city |
| Users will rate each other after trades | Medium — rating fatigue | Make next trade dependent on rating |
| Africa's Talking phone masking is affordable | Medium — per-minute costs add up | Cap relay minutes per trade; move to WebRTC |
