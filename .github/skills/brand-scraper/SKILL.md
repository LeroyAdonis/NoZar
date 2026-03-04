---
name: brand-scraper
description: "Scrape public social media posts from a brand handle or URL to extract style patterns for AI content generation. Use when a user connects a social account for the first time, requests brand analysis, uploads a post archive (CSV/ZIP), or asks to improve post quality by matching an existing brand voice. Extracts: tone fingerprint, vocabulary clusters, hashtag patterns, posting cadence, emoji usage, average content length."
---

# Brand Scraper

Analyse a brand's public social presence and extract a reusable **brand profile** for downstream SA post generation.

## Overview

When to use this skill:
- User connects a social media account for the first time
- User uploads a CSV/ZIP archive of past posts
- User wants to re-train the brand profile after a style change
- `sa-post-generator` reports weak brand alignment

The output is a JSON brand profile saved to the `brand_profiles` table via Drizzle ORM.

## Identity

Act as a data analyst specialising in social media linguistics. Be precise, systematic, and sceptical of small sample sizes (< 20 posts). Surface confidence scores alongside findings.

## Constraints

- **Never authenticate** to social platforms — public-only scraping via Playwright
- **Never store raw post content** in the DB — only derived features
- Minimum viable sample: 20 posts; warn loudly below this threshold
- Respect `robots.txt` and rate-limit scrapes to ≤ 1 req/s
- Fall back gracefully to archive upload if live scraping fails or is blocked

## Process

### Step 1 — Determine Data Source

```
if handle/URL provided:
    attempt live scrape via Playwright (public profile only)
    if blocked/CAPTCHA → prompt user to upload archive
elif CSV/ZIP uploaded:
    parse archive
else:
    ask user for handle or archive
```

### Step 2 — Collect Posts

Collect the most recent **100 posts** (or all available if < 100).

For each post capture:
- `text` (string)
- `timestamp` (ISO 8601)
- `platform` (instagram | twitter | linkedin | facebook)
- `likes`, `shares`, `comments` (integers, 0 if unavailable)
- `has_image` (boolean)
- `has_video` (boolean)

### Step 3 — Extract Brand Features

Run all extractions over the collected corpus:

| Feature | Method |
|---|---|
| **Tone fingerprint** | Classify each post: formal / casual / humorous / inspirational. Return distribution % |
| **Vocabulary clusters** | Top 30 non-stopword unigrams + top 15 bigrams |
| **Hashtag patterns** | Frequency map; flag SA hashtags (#Mzansi, #LocalIsLekker etc.) |
| **Posting cadence** | Posts per weekday, posts per hour-of-day histogram (SAST UTC+2) |
| **Emoji usage** | Top 10 emojis by frequency; emoji density (emojis per post) |
| **Avg content length** | Mean character count; P10/P50/P90 percentiles |
| **Top engagement posts** | Top 5 by (likes + shares + comments); note their features |

### Step 4 — Build Brand Profile Object

```typescript
interface BrandProfile {
  userId: string;
  platform: string;
  scrapedAt: string;            // ISO 8601 SAST
  postCount: number;
  confidenceScore: number;      // 0-1, based on sample size & recency
  toneFingerprint: Record<'formal'|'casual'|'humorous'|'inspirational', number>;
  topVocabulary: string[];      // top 30 words
  topBigrams: string[];         // top 15 bigrams
  hashtagFrequency: Record<string, number>;
  postingCadence: {
    byWeekday: Record<string, number>;
    byHourSAST: Record<string, number>;
  };
  emojiUsage: { emoji: string; count: number }[];
  emojiDensity: number;
  avgContentLength: number;
  contentLengthPercentiles: { p10: number; p50: number; p90: number };
  topEngagementExamples: string[]; // top 5 post texts (truncated to 280 chars)
}
```

### Step 5 — Persist to Database

```typescript
import { db } from '@/lib/db';
import { brandProfiles } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

// Upsert — one profile per (userId, platform)
await db.insert(brandProfiles)
  .values(profile)
  .onConflictDoUpdate({
    target: [brandProfiles.userId, brandProfiles.platform],
    set: { ...profile, updatedAt: new Date() },
  });
```

### Step 6 — Return Summary

Return a human-readable summary alongside the profile object:

```
✅ Brand profile built for @handle (platform)
   Posts analysed: 87  |  Confidence: 0.82
   Tone: 52% casual, 31% inspirational, 17% formal
   Top hashtags: #Joburg (14×), #Mzansi (11×), #LocalIsLekker (8×)
   Avg post length: 142 chars  |  Emoji density: 1.4/post
   Best posting window: Tue–Thu 08:00–10:00 SAST
```

## Output Format

Primary output: `BrandProfile` JSON object (see Step 4).
Secondary output: plain-text summary string (see Step 6).
Error output: structured error with `{ error: string; fallbackSuggestion: string }`.

## Examples

**Example 1 — Live scrape**
```
User: "Analyse our brand on Instagram: @mzansi_eats"
→ Playwright scrapes public IG profile
→ Extracts 94 posts
→ Profile saved; summary returned
```

**Example 2 — Archive fallback**
```
User: "Here's our Twitter archive" [uploads posts.csv]
→ Parse CSV (expects columns: text, created_at, favorite_count, retweet_count)
→ Extracts features from 210 tweets
→ Profile saved; note low emoji density suggests formal brand
```

## Troubleshooting

1. **Scraper blocked / CAPTCHA** — Prompt user to download and upload their native platform archive (Twitter Data Export, Meta Download Your Information, LinkedIn Export).
2. **Sample < 20 posts** — Set `confidenceScore` < 0.3, surface warning: *"Brand profile based on fewer than 20 posts — results may not be representative."*
3. **`brand_profiles` table missing** — Run `npm run db:push` to apply schema; check `drizzle/schema.ts` for the `brandProfiles` table definition.
