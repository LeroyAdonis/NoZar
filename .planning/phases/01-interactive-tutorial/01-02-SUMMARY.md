# Plan 01-02 Summary — Wire TutorialOverlay into App

## Status: ✅ Complete

## Files Modified
- `app/routes/dashboard.tsx` — Swapped WelcomeOverlay for TutorialOverlay
- `app/routes/dashboard/profile.tsx` — Added Replay Tutorial row in Account tab

## Files Deleted
- `app/components/ui/welcome-overlay.tsx` — Deleted; no imports remain anywhere in `app/`

## Key Changes

### dashboard.tsx
- Added `useNavigate` to react-router import
- Replaced `WelcomeOverlay` import with `TutorialOverlay` from `~/components/ui/tutorial-overlay`
- Renamed state: `hasSeenWelcome` → `hasSeenTutorial`, key `nozar_welcome_seen` → `nozar_tutorial_seen`
- Renamed handler: `handleWelcomeDismiss` → `handleTutorialDismiss`
- JSX: `{!hasSeenTutorial && <TutorialOverlay onDismiss={handleTutorialDismiss} onNavigate={navigate} />}`

### profile.tsx
- Added `useNavigate` to react-router import
- Added `navigate` hook and `handleReplayTutorial` handler (clears `nozar_tutorial_seen`, navigates to `/dashboard`)
- Inserted Tutorial row between Plan row and Sign out section

## Verification
- `npm run typecheck`: no errors in changed files
