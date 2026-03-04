# Barter SA Landing Page — Design Document

**Date:** 2026-03-02
**Status:** Approved

## Problem

The current landing page is a placeholder ("Coming soon"). Barter SA needs a comprehensive marketing site that communicates the value proposition, builds trust with South African users, displays pricing, and meets SA legal requirements (POPIA, ECTA, CPA).

## Design Direction

**Bold & vibrant** — SA flag colors (green, gold, black), energetic, afrofuturistic geometric patterns (ndebele-inspired CSS borders), township energy. System fonts only (no web fonts). < 150KB first load target.

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--sa-green` | `#009739` | Primary CTA, trust signals |
| `--sa-gold` | `#FFB612` | Accents, highlights, hover states |
| `--sa-black` | `#0F172A` | Text, dark backgrounds (existing) |
| `--sa-red` | `#DE3831` | Alerts, destructive actions only |
| `--sa-white` | `#FFFFFF` | Backgrounds, card surfaces |

## Page Sections

### 1. Navigation Bar (LandingNav)
- Logo "Barter SA" + 🇿🇦 flag emoji
- Links: How it Works, Features, Pricing, FAQ
- CTA: "Start Trading Free" → /register
- Transparent on hero, solid on scroll (client component for scroll detection)
- Mobile: hamburger menu

### 2. Hero Section
- Headline: "Trade What You Have. Get What You Need."
- Subline: "South Africa's first peer-to-peer barter platform. No money needed."
- Primary CTA: "Start Trading Free" → /register
- Secondary CTA: "See How It Works" → scroll to section
- Background: SA green → gold gradient with geometric ndebele-inspired CSS pattern
- Stats bar: "1000+ Listings | 5 Cities | 100% Free to Start"

### 3. How It Works (3 steps)
1. **List** — "Post what you have and what you want" (📦 icon)
2. **Match** — "Find traders near you with smart matching" (🤝 icon)
3. **Trade** — "Agree, meet safely, rate each other" (⭐ icon)

### 4. Features Grid (6 cards)
1. **Safe Contact Exchange** — 5-layer security, staged disclosure
2. **Smart Matching** — Location-based, category matching
3. **Reputation System** — Ratings, completion rate, verified badges
4. **Works Offline** — PWA, service worker, data-light
5. **Location-Based** — Suburb-level, distance sorting
6. **Free to Start** — Full barter with R0, upgrade for extras

### 5. SA Trust Signals
- POPIA Compliant badge
- ECTA Registered badge
- Phone-Verified Users badge
- 5-Layer Security badge
- Community Guidelines badge
- "Built in Mzansi, for Mzansi" tagline

### 6. Pricing Section
| | Free | Trader Plus | Business | Enterprise |
|---|---|---|---|---|
| Price | R0/mo | R29/mo | R99/mo | R249/mo |
| Listings | 5 | 20 | 100 | Unlimited |
| Photos | 3/listing | 10/listing | 10/listing | 10/listing |
| Boost tokens | 0 | 2/mo | 10/mo | 30/mo |
| Featured | No | No | Yes | Yes |
| Analytics | No | Basic | Full | Full |
| Support | Community | Email | Priority | Dedicated |

### 7. Testimonials (3 SA personas)
- **Sipho from Soweto** — Traded a guitar for a laptop stand
- **Fatima from Cape Town** — Swapped homemade preserves for garden tools
- **Thabo from Durban** — Exchanged web design skills for photography

### 8. FAQ Accordion
- What is Barter SA?
- Is it really free?
- How do I stay safe?
- What can I trade?
- How does contact exchange work?
- What areas do you cover?
- Can businesses use Barter SA?
- How do ratings work?

### 9. Final CTA
- "Join thousands of South Africans trading smarter"
- Large "Create Free Account" button → /register

### 10. Footer
- Logo + tagline
- Links: About, How It Works, Pricing, FAQ
- Legal: Terms of Service, Privacy Policy, Community Guidelines, Complaints Process
- Contact: hello@bartersa.co.za
- "Made with ❤️ in Mzansi 🇿🇦"

## Legal Pages (New Routes)

### /legal/terms
Renders `docs/legal/terms-of-service.md` as a styled page with table of contents.

### /legal/privacy
Renders `docs/legal/privacy-policy.md` as a styled page with table of contents.

### /legal/community-guidelines
Renders `docs/legal/community-guidelines.md` as a styled page.

### /legal/complaints (NEW)
CPA-compliant complaints and dispute resolution page:
- How to file a complaint
- Dispute resolution process (internal → mediation → CGSO/NCC)
- Response time commitments (48h acknowledgment, 30-day resolution)
- Contact details for Information Officer
- Links to external bodies (National Consumer Commission, CGSO)

## Cookie/Consent Banner (POPIA)

Client component that:
- Shows on first visit: "We use essential cookies to keep you signed in. No tracking cookies."
- Two buttons: "Accept" / "Learn More" (→ /legal/privacy)
- Stores consent in localStorage
- Minimal — no cookie wall, just disclosure

## Technical Architecture

- Landing page: Server Component (SEO optimized)
- Interactive bits (nav scroll, FAQ accordion, cookie banner): Client Components
- Legal pages: Server Components rendering markdown via a shared layout
- All new files under `src/app/(public)/`
- New components under `src/components/landing/`

## Constraints

- < 150KB first load (server components, system fonts, CSS-only patterns)
- Mobile-first responsive design
- Dark mode support via existing CSS variables
- No external images on initial load (CSS gradients + emoji icons)
- WebP only for any added images
