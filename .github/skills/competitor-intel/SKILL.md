---
name: competitor-intel
description: "Playwright-driven competitor research skill for Purple Glow Social 2.0. Use when tasked with competitive analysis, product roadmap research, or feature gap identification. Visits competitor marketing/pricing pages, extracts feature lists, pricing tiers, AI capabilities, and UX patterns. Outputs structured JSON suitable for Kanban task enrichment and product roadmap decisions. Never logs in to competitor products — public pages only."
---

# Competitor Intel

Systematically research competitors' public-facing marketing and pricing pages with Playwright. Output structured intelligence for product decisions.

## Identity

Act as a sharp product analyst. Stay objective. Document what you observe; do not editorialize about competitor quality. Surface gaps and opportunities without bias.

## Constraints

- **Public pages only** — never attempt login, sign-up, or trial flows
- **No account creation** on competitor services
- **Screenshot everything** — visual evidence required for each finding
- Cap at 5 competitor URLs per session to prevent context bloat
- Store results in `competitor_intel` table via Drizzle; never in flat files
- Use `logger.admin` for all logging

## Process

### Step 1 — Define Target List

Accept one or more competitor URLs. Default research targets for Purple Glow Social:

```
https://buffer.com/pricing
https://hootsuite.com/plans
https://later.com/pricing
https://sproutsocial.com/pricing
https://metricool.com/pricing
```

### Step 2 — Playwright Scrape Loop

For each URL:

```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

// Screenshot for evidence
await page.screenshot({ 
  path: `e2e-artifacts/competitor-${slug}-${Date.now()}.png`, 
  fullPage: true 
});

// Extract text content
const bodyText = await page.evaluate(() => document.body.innerText);
```

### Step 3 — Extract Structured Intelligence

Parse the body text and DOM for the following fields:

```typescript
interface CompetitorIntelRecord {
  url: string;
  competitorName: string;
  scrapedAt: string;              // ISO 8601 SAST
  screenshotPath: string;

  // Pricing
  pricingTiers: {
    name: string;
    priceMonthly: string;
    currency: string;
    highlightedFeatures: string[];
  }[];

  // Features
  aiFeatures: string[];           // Any AI/ML mentioned features
  platformsSupported: string[];   // Social platforms listed
  languagesSupported: string[];   // Languages listed (flag SA language gaps)
  schedulingFeatures: string[];
  analyticsFeatures: string[];
  teamFeatures: string[];

  // UX signals
  ctaPrimary: string;             // Text of main CTA button
  trialOffered: boolean;
  trialDurationDays: number | null;
  integrationCount: number | null;

  // Gaps vs Purple Glow Social
  missingFeatures: string[];      // Features PGS has that competitor lacks
  competitorAdvantages: string[]; // Features competitor has that PGS lacks
}
```

Use Gemini to classify extracted text into the above structure:

```typescript
const prompt = `
Analyse this competitor pricing/marketing page text and extract a JSON object
matching this TypeScript interface: ${JSON.stringify(schemaDescription)}.
Text: ${bodyText.slice(0, 8000)}
Return ONLY valid JSON, no markdown.
`;
```

### Step 4 — Gap Analysis Against PGS Feature Set

Compare extracted features against PGS capabilities (defined in `AGENTS.md` Phase 1–11 features). Flag:

- **PGS advantages**: SA languages, SAST scheduling, ZAR pricing, local cultural content
- **Competitor advantages**: features PGS is missing (add to `competitorAdvantages[]`)
- **Opportunities**: features neither has (surface as Kanban card suggestions)

### Step 5 — Persist to Database

```typescript
await db.insert(competitorIntel)
  .values(record)
  .onConflictDoUpdate({
    target: [competitorIntel.url],
    set: { ...record, updatedAt: new Date() },
  });
```

### Step 6 — Output Report

Return a structured summary and a Kanban-ready JSON array:

```typescript
interface CompetitorIntelReport {
  summary: string;               // 3-5 sentence executive summary
  records: CompetitorIntelRecord[];
  kanbanSuggestions: {           // Ready for kanban-tracker skill
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    source: string;              // Competitor URL that inspired this
  }[];
  scrapedAt: string;
  screenshotPaths: string[];
}
```

## Output Format

Return `CompetitorIntelReport` JSON. Also print a brief plain-text executive summary to the console.

## Examples

**Example 1 — Single competitor**
```
Input: url="https://buffer.com/pricing"
Output:
  - 4 pricing tiers extracted (Free/Essentials/Team/Agency)
  - AI features: "AI Assistant for captions"
  - Platforms: Instagram, Facebook, Twitter, LinkedIn, Pinterest, TikTok
  - Gap identified: Buffer lacks SA language support → Kanban card created
  - Screenshot saved to e2e-artifacts/competitor-buffer-*.png
```

**Example 2 — Full sweep**
```
Input: urls=[buffer, hootsuite, later, sproutsocial, metricool]
Output:
  - 5 records in competitor_intel table
  - Executive summary: "All 5 competitors lack SA-language content generation..."
  - 8 Kanban suggestions generated (TikTok support, video scheduling, etc.)
```

## Troubleshooting

1. **Page load timeout** — Increase timeout to 60s; try `waitUntil: 'domcontentloaded'` instead of `networkidle`
2. **Bot detection / blank page** — Use stealth mode: `playwright-extra` with `puppeteer-extra-plugin-stealth`; take screenshot to confirm blank load
3. **Gemini JSON parse failure** — Retry with stricter prompt: "Return ONLY a raw JSON object. No markdown. No explanation."
