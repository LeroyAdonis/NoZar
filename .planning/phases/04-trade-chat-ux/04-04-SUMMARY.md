# Plan 04 — Inline CTA Cards + Safety Banner: SUMMARY

## Status: COMPLETE ✅

## What Was Done

### TradeSummaryCard.tsx — new component
- Created `app/components/ui/TradeSummaryCard.tsx`
- Props: `{ role: "yours" | "theirs", title: string, estimatedValueZar?: number | null, imageUrl?: string | null, type?: string }`
- Renders: role label (emerald "YOURS" / slate "THEIRS"), image placeholder box (or actual image if `imageUrl` provided), listing title, estimated value in ZAR, and listing type badge
- Note: `imageUrl` is optional and currently not populated (listing images live in separate `listingImages` table, not joined by loader); placeholder shown instead

### pings.$id.tsx — CTA cards + safety banner
- Added `CTACard` type and `buildCTACards(status, isInitiator)` module-scope function returning contextual action cards per trade stage
- Added `safetyBannerDismissed` state (initialises `true` to prevent SSR flash) + `useEffect` reading `localStorage["nozar_safety_banner_dismissed"]` on mount + `handleDismissBanner` setter
- Replaced text-only trade summary grid in `renderTradeStatusPanel` with two `<TradeSummaryCard>` components (yours + theirs)
- Injected safety banner (dismissible amber alert, persisted to localStorage) + CTA cards loop before `chatMessages.map` in the message scroll area
- CTA cards are contextual: different prompts for `proposed`, `negotiating`, `agreed`, `contact_shared` stages

## Files Changed
- `app/components/ui/TradeSummaryCard.tsx` (new)
- `app/routes/dashboard/pings.$id.tsx`

## Verification
- `npm run typecheck` passed with no new errors in `app/`
- `listing.imageUrl` TS error resolved by removing non-existent prop from TradeSummaryCard call sites (field doesn't exist on `listings` schema — images are in `listingImages` table)
