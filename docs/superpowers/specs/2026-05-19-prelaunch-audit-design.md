# NoZar Pre-Launch Audit & Cleanup — Design Spec

**Date:** 2026-05-19
**Author:** Claude (via brainstorming skill, session-driven by Leroy)
**Status:** Approved by user — execution proceeds inline

## Goal

Ship a pre-launch sweep of the NoZar app that fixes broken / unverified / illegal content so the app is safe to put in front of real users. Three concrete forces driving this:

1. **Digital Wave Tech is de-registered.** All references must come out of the codebase, especially the legal pages. POPIA / ECTA require a named responsible party — the platform now operates as a sole proprietorship.
2. **Several pieces of landing-page copy are unverified or fabricated** (testimonials, stats, trust badges with un-true claims). They have to be honest before launch.
3. **The last E2E test (2026-05-11) found broken links/buttons** and the codebase has changed significantly since (simplification refactor, new nav labels, web push, SSE chat, profile split). The app needs a fresh "every corner" walkthrough.

## Decisions captured

| Decision | Value |
|---|---|
| Operating entity | NoZar (operated as a sole proprietorship — no registered company) |
| Named Information Officer | Leroy Adonis (only in Information Officer fields) |
| Contact email everywhere | `hello@nozar.co.za` |
| Testimonials section | Removed entirely |
| Stats bar | Removed entirely |
| Trust badges | Rewritten — keep POPIA Compliant; drop ECTA Registered & Phone-verified users; replace those three with defensible claims |
| Fix mode | Inline as found |
| Footer copyright | `© NoZar` (no PTY LTD) |

## Phases

### Phase 1 — Static cleanup (high-confidence; do first)

#### 1A. Legal docs
Files: `docs/legal/terms-of-service.md`, `privacy-policy.md`, `complaints-process.md`

- Remove every "Digital Wave Tech" reference and reg # `2023/629766/07`.
- Replace operator wording with "NoZar (operated as a sole proprietorship)".
- Information Officer field only: `Leroy Adonis`.
- All emails (`privacy@bartersa.co.za`, `legal@bartersa.co.za`, `complaints@bartersa.co.za`) → `hello@nozar.co.za`.
- Resolve `[Your Legal Entity Name]` placeholder in complaints-process.md §10.
- Remove physical Johannesburg address (`Unit 10 Villa Fiorentina…`) — it was the company's registered address; sole prop has no such requirement. Note that ECTA s43 requires the operator to disclose a physical/postal address for service of legal process — replace with the line "Postal address available on request via hello@nozar.co.za" for now.
- Leave dates ("Effective Date: 13 April 2026") and SA-law citations untouched.

#### 1B. Landing page copy
Files: `app/routes/landing.tsx`, `app/components/landing/{stats-bar,testimonials-section,trust-badges-section,footer-section}.tsx`

- `landing.tsx`: remove `<StatsBar />` and `<TestimonialsSection />` plus their imports. Delete the source files (they're not used elsewhere — confirmed).
- `trust-badges-section.tsx`: rewrite the 6 `TRUST_BADGES` entries:
  - Keep: POPIA Compliant, Community rules, Built in Mzansi
  - Drop: ECTA Registered, Phone-verified users
  - Replace with two defensible claims drawn from features actually in the codebase (dual-blind contact reveal, AI safe-meetup spots, in-app messaging, free to start). I'll pick the two with the strongest backing.
- `footer-section.tsx`: `© ${year} NoZar PTY LTD` → `© ${year} NoZar`.

### Phase 2 — Legal route verification

- Find the route(s) that render `docs/legal/*.md` (likely `app/routes/legal.*.tsx` or similar).
- Confirm all four paths render: `/legal/terms`, `/legal/privacy`, `/legal/community-guidelines`, `/legal/complaints`.
- If wiring is broken, fix it (this is the highest-leverage compliance gap).

### Phase 3 — Playwright E2E walkthrough

Reuse known-good account: `testtrader@nozar-test.com` / `TestTrader123!`. Walk-list, in order:

1. Landing page — all top-nav anchors, all footer links (legal, anchor scrolls, mailto, follow-us placeholder).
2. `/register` and `/login` — basic UI, form validation, "forgot password" link.
3. `/forgot-password` — UI only (SMTP off).
4. Dashboard — exercise every sidebar item: Home (was Index), Explore (was Radar), Chats (was Pings), Profile (was Node), Add, Refer.
5. Profile page — My listings tab, Account tab, Edit profile sheet (a11y).
6. Asset detail page — owner view + non-owner view, "Offer a swap" sheet.
7. Chat thread — propose / negotiate / agree status UI panels.
8. Refer page — `/refer` and `/r/:code`.
9. Legal pages — all four from the footer.
10. 404 / unknown route handling.

For each: capture broken links, dead buttons, dummy `mailto:` links, residual Digital Wave Tech mentions, console errors / hydration warnings, any unverified copy that slipped past Phase 1.

### Phase 4 — Inline fixes
Each Phase-3 finding gets fixed immediately, then re-verified by re-visiting the page.

### Out of scope (do not expand)
- New features (rule: "Don't add features beyond what the task requires")
- SMTP/SMS env configuration (user-side ops)
- Real-money payment integration test
- Cosmetic redesigns beyond removing/rewriting fake content
- Backwards-compatibility shims (rule: "If something is unused, delete it")

## Deliverables

- Phase 1 + Phase 2 changes committed (1 commit, scoped to "content cleanup + legal").
- Phase 4 changes committed (1 commit, scoped to "E2E fixes").
- Updated memory entry summarising current MVP state (replaces the 2026-05-11 snapshot).
- This spec at `docs/superpowers/specs/2026-05-19-prelaunch-audit-design.md`.

## Self-review (post-write)

- Placeholders: none.
- Contradictions: footer says `© NoZar`; we are also dropping reg # — both correct since there's no entity.
- Scope: bounded to existing pages; no new features.
- Ambiguity: ECTA s43 address requirement — I'm proposing "available on request" instead of fabricating; if user disagrees they can name a PO box.
