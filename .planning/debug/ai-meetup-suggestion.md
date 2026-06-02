# Debug: AI Meetup Suggestion not triggering

## Finding
The AI meetup suggestion **works** — NVIDIA API is reachable and generates valid spots. The root cause was **no trades in `agreed` status** in the database.

## Evidence

### 1. Seed data gap
- `POST /api/seed-demo` only creates trades in `completed` and `negotiating` statuses
- The `generateSafeZone` guard checks `trade.status !== "agreed"` — no existing trade passes this check
- Without `agreed` status, the "✦ Generate Safe Meetup Spots" button never appears

### 2. NVIDIA API is functional
- API key is valid and configured
- Model `z-ai/glm-5.1` at `https://integrate.api.nvidia.com/v1/chat/completions` responds correctly
- Successfully generated 3 meetup spots for Cape Town:
  1. V&A Waterfront — Dock Road, Victoria & Alfred Basin, Cape Town, 8001
  2. Kirstenbosch National Botanical Garden — Rhodes Drive, Newlands, Cape Town, 7735
  3. Cavendish Square — Dreyer Street, Claremont, Cape Town, 7708
- Each spot has valid `name`, `address`, and `reason` fields matching the action handler's expected format

### 3. Action handler flow (`app/routes/dashboard/pings.$id.tsx`)
```
User clicks button → request.formData() → intent = "generateSafeZone"
  → trade.status === "agreed" ✓ (only when agreed)
  → existing spots check (idempotency)
  → NVIDIA_API_KEY in env ✓
  → resolve location from listing owner profile (suburb → city → province → "South Africa")
  → callNvidiaModel(system prompt + location)
  → parse JSON → insert into meetup_spots table
  → set readiness flag for both users
  → UI re-renders SafeZone with spot cards
```

### 4. UI rendering path (`pings.$id.tsx:1272-1333`)
- SafeZone component rendered via `<Suspense>` with `Await` on `meetupData`
- Shows spots if `meetupData.length > 0`, shows "Generate" button if `spots.length === 0 && status === "agreed"`
- After generation: spot cards with vote buttons, tally, and countdown timer

## Resolution
Created trade **#29** in `agreed` status between Thandi Mokoena and James van der Merwe for listing "Felt TK2 Velodrome Track Bike".

### To test end-to-end
```bash
# Start server
npm run dev

# Manually trigger the action:
# 1. Open http://localhost:5173/dashboard/pings/29
# 2. Log in as Thandi (thandi@nozar.demo — NO password set)
#    Need to reset password via API or register new user
# 3. Click "✦ Generate Safe Meetup Spots"
# 4. Verify 3 spots appear with vote/confirm UI
```

### E2E test blockers (should be solved separately)
1. **Registration broken**: Better Auth `requireEmailVerification: true` with `autoSignIn` in `PLAYWRIGHT_TEST` mode doesn't create sessions
2. **Demo users no password**: Seed users can't log in via browser (no password hashes)
3. **Dev server lifecycle**: Background processes killed between tool invocations

## Relevant Code
| File | Lines | Purpose |
|------|-------|---------|
| `app/routes/dashboard/pings.$id.tsx` | 842 | `generateSafeZone` action handler (takes action) |
| `app/routes/dashboard/pings.$id.tsx` | 1272–1333 | SafeZone UI component (renders spots) |
| `app/lib/nvidia.server.ts` | 19–88 | `callNvidiaModel` — API call with retry logic |
| `app/lib/schema.ts` | 280 | `meetupSpots` table, `readinessFlags` table |
| `app/lib/auth.server.ts` | 440 | `autoSignIn` config — suspected bug |
| `scripts/setup-agreed-trade.ts` | — | Script to create agreed trade |
| `scripts/test-meetup-flow.ts` | — | Integration test for meetup flow |
