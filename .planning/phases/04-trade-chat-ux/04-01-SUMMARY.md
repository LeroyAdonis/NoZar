# Plan 01 — Mobile Bottom Sheet Clipping Fix: SUMMARY

## Status: COMPLETE ✅

## What Was Done

### balance-pile.tsx
- Changed `max-h-[85vh]` → `max-h-[calc(85vh-80px)]` on the bottom-sheet panel
- Added `pb-safe` (safe-area bottom padding) to prevent content clipping behind the bottom nav bar on iOS

### safezone-picker.tsx
- Audited for similar clipping issues
- No changes required — component uses a `Dialog` / portal rendering pattern that is not affected by bottom nav overlap

### profile.tsx
- Removed `"use client"` directive (forbidden in React Router v7)
- Added `SAFETY_TIPS` constant with 4 tips (escrow scams, public meetups, phone-sharing, trust badges)
- Added **Safety & Trust** section card below the existing profile form, rendering tips in a bulleted list with emerald accent icons

## Files Changed
- `app/components/ui/balance-pile.tsx`
- `app/routes/dashboard/profile.tsx`

## Verification
- `npm run typecheck` passed with no new errors in `app/`
