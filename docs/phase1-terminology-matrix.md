# Phase 1: Terminology Mapping Matrix

**Document Version:** 1.0.0  
**Created:** Phase 1, Task Group 1.1  
**Status:** Implementation In Progress

---

## 1. Overview

### Why This Matters

NoZar is a barter marketplace designed for everyday South Africans. Using Web3/crypto jargon creates unnecessary barriers to adoption. This document maps technical terminology to accessible, everyday South African language.

**Core Principles:**
- **Accessibility First**: Every user should understand the platform without a glossary
- **Cultural Relevance**: Use South African context (Rands, local references)
- **Action-Oriented**: Terms should describe what users *do*, not abstract concepts

---

## 2. Complete Mapping Table

### Core Platform Terms

| Web3/Crypto Term | Everyday Term | Implementation Key | Usage Notes |
|------------------|---------------|-------------------|-------------|
| Node | Trader / Member | `trader.profile`, `trader.verified` | Use "Trader" for active users, "Member" for registered users |
| Protocol | Safety Rules | `safety.title` | Use "How it Works" for onboarding, "Safety Rules" for trust features |
| Exchange | Trade / Swap | `trade.initiate`, `cta.startTrading` | Use "Trade" for the action, "Swap" in informal contexts |
| Bypass inflation | Keep your Rands in your pocket | Landing page copy | SA-specific messaging for value proposition |
| Assets / Inventory | My Items / Items I Have | `labels.myItems`, `placeholders.searchItems` | Use "My Items" in UI, "Items I Have" in empty states |
| Bids / Proposals | Offers | `labels.offers`, `buttons.makeOffer` | Universal term for trade proposals |
| Fiat | Cash / Rands | `currency.zar`, `currency.rand` | SA-specific: use "Rands" for local context |

### Navigation & UI Terms

| Technical Term | Everyday Term | Implementation Key | Notes |
|----------------|---------------|-------------------|-------|
| Dashboard | Index / Home | `nav.home` | "Index" used for main listing view |
| Map View | Radar | `nav.map` | More intuitive for discovering nearby traders |
| Messages | Pings | `nav.messages` | Friendlier, less formal than "Messages" |
| Profile | Trader | `nav.profile` | Emphasizes the trading identity |
| Notifications | Notifications | `nav.notifications` | Kept standard - users understand this |

### Trading Flow Terms

| Technical Term | Everyday Term | Implementation Key | Notes |
|----------------|---------------|-------------------|-------|
| Create Listing | Add Item | `nav.addItem`, `cta.listItem` | Simple, action-oriented |
| Search / Browse | Browse Items | `cta.browseItems` | Clear intent |
| Make Bid | Make Offer | `buttons.makeOffer` | Universal understanding |
| Counter Bid | Counter Offer | `buttons.counterOffer` | Clear negotiation language |
| Execute Trade | Complete Trade | `trade.complete` | Action-oriented |
| Transaction History | Trade History | `labels.tradeHistory` | More relatable than "transaction" |

### Status & Badge Terms

| Technical Term | Everyday Term | Implementation Key | Notes |
|----------------|---------------|-------------------|-------|
| Active | Active | `status.active` | Standard |
| Verified Node | Verified Trader | `trader.verified`, `safety.trustBadge` | Trust indicator |
| Trusted | Trusted | `trader.badges.trusted` | Reputation level |
| Quick Responder | Quick Responder | `trader.badges.quick` | Performance indicator |

### Location & Meetup Terms

| Technical Term | Everyday Term | Implementation Key | Notes |
|----------------|---------------|-------------------|-------|
| Location Services | Location | `location.enableLocation` | Standard term |
| Safe Zones | Safe Zones | `meetup.safeZone` | Designated meetup spots |
| Public Meetup | Public Place | `meetup.publicPlace` | General guidance |

---

## 3. Implementation Status

### ✅ Completed (strings.json)

The following mappings are fully implemented in `app/strings.json`:

| Category | Key | Status |
|----------|-----|--------|
| Navigation | `nav.profile` → "Trader" | ✅ Done |
| Navigation | `nav.messages` → "Pings" | ✅ Done |
| Navigation | `nav.map` → "Radar" | ✅ Done |
| Safety | `safety.title` → "Safety Rules" | ✅ Done |
| Trader | `trader.profile` → "Trader Profile" | ✅ Done |
| Offers | `labels.offers` → "Offers" | ✅ Done |
| Items | `labels.myItems` → "My Items" | ✅ Done |
| Currency | `currency.rand` → "Rand" | ✅ Done |
| Currency | `currency.symbol` → "R" | ✅ Done |
| Onboarding | `onboarding.step3Desc` includes "Safety Rules" | ✅ Done |

### ⏳ Pending (Landing Page)

The following mappings need implementation on the public landing page:

| Section | Current State | Required Change |
|---------|---------------|-----------------|
| Hero Section | May contain "exchange" language | Update to "Trade" / "Swap" |
| Value Prop | May reference "assets" | Update to "Items" / "Stuff" |
| Trust Section | May reference "protocol" | Update to "Safety Rules" |
| Inflation Copy | Generic messaging | Add "Keep your Rands in your pocket" |

---

## 4. Remaining Tasks

### Landing Page Updates Required

1. **Hero Section**
   - [ ] Review hero copy for Web3 terminology
   - [ ] Ensure "Trade" and "Swap" are primary verbs
   - [ ] Verify no "exchange" or "transaction" language

2. **Value Proposition**
   - [ ] Replace "assets" with "items" or "stuff"
   - [ ] Replace "inventory" with "My Items"
   - [ ] Add inflation-resistant messaging: "Keep your Rands in your pocket"

3. **Trust & Safety Section**
   - [ ] Replace any "protocol" references with "Safety Rules"
   - [ ] Emphasize "Verified Trader" badges
   - [ ] Highlight safe meetup zones

4. **How It Works Section**
   - [ ] Use "List", "Browse", "Trade" as primary actions
   - [ ] Reference onboarding strings for consistency

### Components to Review

| File Path | Review For |
|-----------|------------|
| `app/routes/landing.tsx` | All terminology |
| `app/components/landing/*.tsx` | Section-specific copy |
| `public/manifest.json` | App description |
| `public/og-image.*` | Social sharing copy |

---

## 5. Brand Voice Guidelines

### Do Use

- **Trader**: The preferred term for users actively trading
- **Member**: For registered users who haven't traded yet
- **Offer**: The universal term for trade proposals
- **Safety Rules**: The branded term for platform trust features
- **Rands**: Always use for South African currency context
- **Items**: The preferred term for things being traded
- **Ping**: Friendly term for messages/notifications

### Don't Use

| Avoid | Use Instead | Reason |
|-------|-------------|--------|
| Node | Trader / Member | Too technical |
| Protocol | Safety Rules | Abstract, sounds corporate |
| Exchange | Trade / Swap | Sounds like crypto/fintech |
| Asset | Item | Too financial |
| Inventory | My Items | Sounds like warehouse management |
| Bid | Offer | Sounds like auction |
| Proposal | Offer | Too formal |
| Fiat | Cash / Rands | Crypto-specific |
| Transaction | Trade | Too formal |
| Execute | Complete | Too technical |

### Tone Guidelines

1. **Conversational**: Write like you're explaining to a friend
2. **Action-Oriented**: Use verbs over nouns when possible
3. **South African Context**: Reference local currency, places, culture
4. **Trust-Building**: Emphasize safety without being alarmist
5. **Inclusive**: Avoid jargon that excludes first-time users

### Example Rewrites

| Original | Better |
|----------|--------|
| "Execute a peer-to-peer exchange" | "Trade directly with someone nearby" |
| "Your assets are stored securely" | "Your items stay in your hands until you trade" |
| "Follow the protocol for safe transactions" | "Follow our Safety Rules for smooth trades" |
| "Bypass inflation with asset swaps" | "Keep your Rands in your pocket - trade what you have" |

---

## 6. Verification Checklist

Before marking Phase 1 terminology complete:

- [ ] All `strings.json` keys use correct terminology
- [ ] Landing page copy reviewed and updated
- [ ] No Web3/crypto jargon in user-facing content
- [ ] "Rands" used for all South African currency references
- [ ] "Trader" used for active users, "Member" for registered users
- [ ] "Safety Rules" used instead of "Protocol"
- [ ] "Offer" used instead of "Bid/Proposal"
- [ ] "Item" used instead of "Asset/Inventory"

---

## Appendix: String Keys Reference

### Primary Terminology Keys

```json
{
  "trader.profile": "Trader Profile",
  "trader.verified": "Verified Trader",
  "safety.title": "Safety Rules",
  "labels.offers": "Offers",
  "labels.myItems": "My Items",
  "nav.messages": "Pings",
  "nav.map": "Radar",
  "nav.profile": "Trader",
  "currency.rand": "Rand",
  "currency.symbol": "R"
}
```

### Onboarding Flow Keys

```json
{
  "onboarding.step1Title": "List What You Have",
  "onboarding.step2Title": "Find What You Want",
  "onboarding.step3Title": "Trade Safely",
  "onboarding.step3Desc": "Meet up, inspect, and trade. Follow our Safety Rules for a smooth experience."
}
```

---

*Document created as part of Phase 1, Task Group 1.1 implementation*
