---
status: complete
phase: 04-trade-chat-ux
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md
started: 2026-05-31T15:47:45Z
updated: 2026-06-01T06:46:28Z
---

## Current Test

[testing complete]

## Tests

### 1. Safety & Trust Tips on Profile
expected: Open the Profile page (/dashboard/profile). Below the existing profile form, a "Safety & Trust" section card appears with 4 safety tips (escrow scams, public meetups, phone-sharing, trust badges) rendered as a bulleted list with emerald accent icons.
result: pass

### 2. Bottom Sheet Clears Bottom Nav on Mobile
expected: On a mobile-sized viewport (or real device), open the trade offer/balance bottom sheet in a ping (the sheet that slides up). All content inside the sheet is fully visible — nothing is hidden behind the bottom nav bar.
result: issue
reported: "Balance trade/offer still does not open all the way, but chat stage/status works perfect!"
severity: major

### 3. Ping Sidebar Appears at Tablet Width
expected: On a tablet-width viewport (~768px wide), open a ping conversation (/dashboard/pings/:id). The sidebar detail panel should be visible alongside the chat (not hidden). Previously it only appeared at 1024px+.
result: issue
reported: "Yes but I think 1024 is fine but from 970px needs to have 2 columns like smaller screens"
severity: minor

### 4. Handshake — YOU/THEM Circles Render
expected: In a ping that is in "proposed" or "negotiating" stage, the handshake panel shows two circles: one labeled "YOU" (emerald-filled when you've agreed, empty otherwise) and one labeled "THEM" (emerald-filled when they've agreed, slate otherwise).
result: pass

### 5. Agree to Trade Button
expected: In the handshake panel, an "Agree to Trade" button is visible if you have NOT yet agreed. Clicking it submits and the button shows a spinner while in flight. Once you've agreed, the button disappears/is hidden.
result: pass

### 6. Both Parties Agreed — Celebration State
expected: When both you and the other party have agreed (simulated by agreeing on both accounts), a celebration card with a checkmark appears, and the trade status badge reads "Stage 02 — Deal Agreed" in emerald (not amber).
result: skipped
reason: requires two accounts to test simultaneously

### 7. Trade Summary Cards (YOURS / THEIRS)
expected: Inside a trade ping, the trade status panel shows two summary cards side-by-side: one labeled "YOURS" (emerald label) showing your listing title, estimated ZAR value, and type badge; one labeled "THEIRS" (slate label) showing the other party's listing details.
result: issue
reported: "Yes, but I did not see the estimated ZAR value. Could also not test the type badge for THEIRS and listings"
severity: major

### 8. Safety Banner in Chat — Visible + Dismissible
expected: Opening any trade ping shows an amber safety banner in the message area (above chat messages). Clicking dismiss hides the banner. Refreshing the page keeps it dismissed (localStorage persists the preference).
result: pass

### 9. Contextual CTA Cards by Stage
expected: In a ping at "proposed" stage, contextual CTA action cards appear in the message area above the chat messages, prompting stage-appropriate actions (e.g., "Review the offer", "Send a message"). Cards should change content when the trade advances to "negotiating" and "agreed" stages.
result: pass

## Summary

total: 9
passed: 5
issues: 3
pending: 0
skipped: 1
blocked: 0

## Gaps

- truth: "All content inside the bottom sheet is fully visible — nothing hidden behind the bottom nav bar"
  status: failed
  reason: "User reported: Balance trade/offer still does not open all the way, but chat stage/status works perfect!"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
- truth: "Sidebar detail panel visible alongside chat at tablet width (~768px+)"
  status: failed
  reason: "User reported: Yes but I think 1024 is fine but from 970px needs to have 2 columns like smaller screens"
  severity: minor
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
- truth: "Trade summary cards show listing title, estimated ZAR value, and type badge for both YOURS and THEIRS"
  status: failed
  reason: "User reported: Yes, but I did not see the estimated ZAR value. Could also not test the type badge for THEIRS and listings"
  severity: major
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
