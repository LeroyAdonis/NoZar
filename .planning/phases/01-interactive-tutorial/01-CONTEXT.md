# Phase 1: Interactive Tutorial — Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a multi-slide, full-screen interactive tutorial that replaces the existing `WelcomeOverlay` and walks first-time users through NoZar's core swap flow — Browse → Post → Ping → Handshake — using plain English copy and emoji-driven illustrations with CSS micro-animations. The tutorial triggers once on first dashboard visit, can be replayed from Profile settings, and is tracked via localStorage only (no schema change).

</domain>

<decisions>
## Implementation Decisions

### Tutorial Format
- **D-01:** Full-screen slides — swipeable/tappable overlay, extending the existing `WelcomeOverlay` visual pattern (`fixed inset-0 z-[200] bg-[#030712]/95 backdrop-blur-xl`).
- **D-02:** Navigation: tap/click anywhere on the slide advances it, plus a visible "Next →" button.
- **D-03:** Progress indicator: dots row (common mobile pattern), positioned at the top or bottom of the overlay.
- **D-04:** Each slide uses emoji/icon illustrations consistent with the current `WelcomeOverlay` emoji style — no new assets needed.

### Steps & Coverage
- **D-05:** 5–6 slides covering the core flow only:
  1. Welcome / What is NoZar? (merges old WelcomeOverlay into slide 1)
  2. Browse — "See what your neighbours are offering"
  3. Post an asset — "List your stuff — anything from furniture to skills"
  4. Ping someone — "Chat and agree on a swap"
  5. Handshake — "Confirm the swap is done"
  6. CTA — "Ready to make your first swap?" → button navigates to `/dashboard/add`
- **D-06:** Copy tone: plain English, accessible to non-technical users in Cape Town & Johannesburg. Avoid jargon; do not use "Listings", "Pings", "Handshake" without plain-English explanation.
- **D-07:** Final slide includes a CTA button ("List your first item →") that navigates to `/dashboard/add` and dismisses the tutorial.

### Interactivity Level
- **D-08:** Passive with CSS micro-animations — each slide's illustration element animates in (fade-in, slide-up, or scale) using Tailwind transitions and inline CSS. No new dependency (no Framer Motion, no Lottie).
- **D-09:** Animation approach: Tailwind `transition`, `duration-*`, `ease-*` classes + `animate-*` utilities. Animations are decorative and must not block slide advancement.

### Trigger & Re-access
- **D-10:** The new tutorial **replaces** the existing `WelcomeOverlay` component entirely. `WelcomeOverlay` (`app/components/ui/welcome-overlay.tsx`) is deleted; the new `TutorialOverlay` (or similar name) is used in its place in `dashboard.tsx`.
- **D-11:** State key: `localStorage("nozar_tutorial_seen")` — mirrors the pattern of `nozar_welcome_seen`. Update `dashboard.tsx` to read this key instead.
- **D-12:** Skip button: visible "Skip" text link at the top-right of the overlay from slide 1 onward. Skipping marks `nozar_tutorial_seen = "1"` and dismisses.
- **D-13:** Replay: add a "Replay tutorial" link/button in the Profile page (`app/routes/dashboard/profile.tsx`) settings section. Clicking it clears `nozar_tutorial_seen` from localStorage and navigates to `/dashboard`, causing the overlay to appear again.

### Agent's Discretion
- Exact emoji choices per slide — use judgment to pick clear, universally understood emojis.
- Whether dots indicator sits at top or bottom — pick whichever looks better with the slide content layout.
- Animation timing (duration, easing) — keep it snappy, under 300ms.
- Component filename and export name — `TutorialOverlay` or `OnboardingTutorial` — match project naming conventions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Onboarding Components
- `app/components/ui/welcome-overlay.tsx` — Current WelcomeOverlay being replaced. Read for existing CSS classes, structure, and dismiss pattern to replicate/extend.
- `app/routes/dashboard.tsx` — Where `WelcomeOverlay` is imported and rendered; where `hasSeenWelcome` / `handleWelcomeDismiss` state lives. New tutorial slots in here.

### Dashboard Profile (Replay entry point)
- `app/routes/dashboard/profile.tsx` — Must add "Replay tutorial" control in the settings section.

### Styling Conventions
- Design uses always-dark theme: `#030712` base, `#0F172A` card backgrounds, `emerald-500` primary, slate text. No light mode. See `.github/copilot-instructions.md` §Conventions for full token list.
- Brutalist typography: `font-mono uppercase tracking-widest text-[10px]` for labels, `font-black uppercase tracking-tighter` for headings.

### Auth & Session Patterns
- `app/lib/auth.server.ts` — `requireAuth(request)` for protected loaders.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WelcomeOverlay` (`app/components/ui/welcome-overlay.tsx`): Direct predecessor — reuse its `fixed inset-0 z-[200]` backdrop, `max-w-sm` container, emerald CTA button, and Escape key listener. The new tutorial is an evolution of this component.
- `LocationPromptModal` (`app/components/ui/location-prompt-modal.tsx`): Another full-screen blocking overlay — reference for accessibility pattern (`role="dialog" aria-modal`).
- `Button` (`app/components/ui/button.tsx`): Use for Next/Skip/CTA buttons.

### Established Patterns
- **localStorage onboarding flags:** `nozar_welcome_seen` read via `useState(() => localStorage.getItem(...) === "1")` in `dashboard.tsx:164-167`. New key `nozar_tutorial_seen` follows identical pattern.
- **`hasSeenX` → `handleXDismiss` pattern:** Dashboard layout uses this for both welcome and location modal — new tutorial follows the same two-variable pattern.
- **`z-[200]` overlay stack:** WelcomeOverlay uses `z-[200]`; LocationPromptModal likely similar. Tutorial should use the same or higher z-index to render above both.
- **CSS animation:** Tailwind utilities only — no Framer Motion in the project currently.

### Integration Points
- `dashboard.tsx`: Remove `WelcomeOverlay` import, add `TutorialOverlay` import. Replace `hasSeenWelcome`/`handleWelcomeDismiss` state with `hasSeenTutorial`/`handleTutorialDismiss`. Pass `onNavigate` prop for the final CTA (use `useNavigate`).
- `profile.tsx`: Add a "Replay tutorial" button in the settings/actions section that clears `nozar_tutorial_seen` and navigates to `/dashboard`.
- `app/components/ui/welcome-overlay.tsx`: Delete this file after the new tutorial component is in place.

</code_context>

<specifics>
## Specific Ideas

- Plain English slide copy examples from discussion:
  - Browse slide: *"See what your neighbours are offering"*
  - Post slide: *"List your stuff — anything from furniture to skills"*
- Final CTA button copy: *"List your first item →"* (navigates to `/dashboard/add`)
- The tutorial should feel like a quick ~30-second scan for confident users, while still being clear enough for first-time smartphone users.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-interactive-tutorial*
*Context gathered: 2026-05-23*
