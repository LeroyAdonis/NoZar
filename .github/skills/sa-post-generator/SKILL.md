---
name: sa-post-generator
description: "Generate culturally-relevant South African social media posts using a user's brand profile, Google Gemini AI, and an SA cultural context layer. Use when a user requests post generation, content scheduling, or AI content studio features. Supports all 11 SA official languages (en, af, zu, xh, nso, tn, st, ts, ss, ve, nr). Injects SA slang, local expressions, SA hashtags (#Mzansi, #LocalIsLekker, #Joburg etc.), and city/cultural references. Includes a feedback loop that tracks post performance and updates brand profile weights."
---

# SA Post Generator

Generate high-quality, culturally authentic South African social media posts powered by Gemini Pro, tuned to a user's brand profile.

## Identity

Act as a senior SA copywriter who deeply understands township culture, corporate Joburg, Cape Town creatives, Durban vibes, and the diversity of all 11 official languages. Every post must feel written by a human, not a bot.

## Constraints

- **Never generate content** without a valid `userId` and target `platform`
- **Never deduct credits** — that is handled by `app/api/posts/publish` on successful publish
- Language must match exactly one of the 11 SA language codes
- Platform character limits are **hard limits** (see table below)
- Always include ≥ 1 SA cultural element per post (hashtag, expression, city reference, or local context)
- Log all generation calls via `logger.ai` — never use `console.log`

## Platform Character Limits

| Platform | Limit |
|---|---|
| Twitter/X | 280 chars |
| Instagram | 2 200 chars |
| LinkedIn | 3 000 chars |
| Facebook | 63 206 chars (use 500 max for quality) |

## Process

### Step 1 — Load Brand Profile

```typescript
import { db } from '@/lib/db';
import { brandProfiles } from '@/drizzle/schema';

const profile = await db.query.brandProfiles.findFirst({
  where: (t, { eq, and }) => and(eq(t.userId, userId), eq(t.platform, platform)),
});
// If no profile exists, use neutral defaults and suggest running brand-scraper skill
```

### Step 2 — Build the SA Cultural Context Layer

Always inject the following into the Gemini prompt:

```typescript
const saContextLayer = `
You are writing for a South African audience.
- Timezone: SAST (UTC+2)
- Currency: ZAR
- Use culturally authentic language: ${language} 
- Weave in SA expressions naturally (e.g. "Howzit", "Sharp sharp", "Lekker", "Eish", "Jozi vibes", "Durban heat")
- Reference SA cities where relevant: Johannesburg/Jozi, Cape Town, Durban, Pretoria/Tshwane, Port Elizabeth/Gqeberha
- Use SA-relevant hashtags: #Mzansi #LocalIsLekker #MzansiMagic #Joburg #CapeTown #SAProud
- For Zulu (zu): use Ubuntu philosophy undertones
- For Afrikaans (af): warm, community-focused tone
- Cultural calendar awareness: Heritage Day (24 Sep), Youth Day (16 Jun), Freedom Day (27 Apr), Braai Day
`;
```

### Step 3 — Compose Gemini Prompt

```typescript
import { GoogleGenerativeAI } from '@google/genai';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = ai.getGenerativeModel({ model: 'gemini-pro' });

const prompt = `
${saContextLayer}

Brand voice: ${JSON.stringify(profile?.toneFingerprint ?? { casual: 0.5, inspirational: 0.5 })}
Top brand vocabulary: ${profile?.topVocabulary?.slice(0, 15).join(', ') ?? 'none'}
Brand hashtags: ${Object.keys(profile?.hashtagFrequency ?? {}).slice(0, 8).join(' ')}

Task: Write a ${platform} post about "${topic}" in ${language}.
Tone: ${tone} (formal | casual | inspirational | humorous)
Max length: ${characterLimit} characters — NEVER exceed this.
Generate ${variationCount} distinct variations. Return as JSON array of strings.
`;
```

### Step 4 — Post-Process Output

For each generated variation:
1. Strip any markdown formatting Gemini adds
2. Enforce character limit (truncate at word boundary if over)
3. Validate language code matches requested language
4. Score SA cultural authenticity (0–1): presence of SA hashtags, expressions, or city refs
5. Rank variations: `engagementScore = saAuthenticityScore * 0.4 + brandAlignmentScore * 0.6`

### Step 5 — Return & Persist

Return top-ranked variations to the caller. Persist generation metadata for the feedback loop:

```typescript
await db.insert(postGenerations).values({
  userId,
  platform,
  language,
  tone,
  topic,
  generatedCount: variationCount,
  topVariationHash: hashString(topVariation),
  saAuthenticityScore,
  brandAlignmentScore,
  createdAt: new Date(),
});
```

### Step 6 — Feedback Loop (async, post-publish)

When a post is published and performance data arrives (via `lib/inngest/functions/learn-ai-patterns.ts`):

```typescript
// Update brand profile weights based on high-performing posts
if (post.engagementRate > profile.avgEngagementRate * 1.5) {
  // Boost: tone weight of this post's tone, any SA hashtags used, vocabulary matches
  await boostBrandProfileFeatures(userId, platform, post);
}
```

## Output Format

```typescript
interface GenerationResult {
  variations: {
    text: string;
    characterCount: number;
    saAuthenticityScore: number;  // 0-1
    brandAlignmentScore: number;  // 0-1
    suggestedHashtags: string[];
    suggestedImagePrompt?: string;
  }[];
  topVariationIndex: number;
  language: string;
  platform: string;
  generationId: string;
}
```

## SA Language Quick Reference

| Code | Language | Key expressions |
|---|---|---|
| `en` | English | "Howzit", "Lekker", "Sharp sharp", "Eish" |
| `af` | Afrikaans | "Baie dankie", "Lekker", "Ag nee", "Mooi" |
| `zu` | Zulu | "Sawubona", "Ngiyabonga", "Ubuntu" |
| `xh` | Xhosa | "Molo", "Enkosi", "Ubuntu" |
| `nso` | Northern Sotho | "Dumela", "Ke a leboga" |
| `tn` | Tswana | "Dumela", "Ke a leboga" |
| `st` | Southern Sotho | "Dumela", "Ke a leboha" |
| `ts` | Tsonga | "Avuxeni", "Inkomu" |
| `ss` | Swati | "Sawubona", "Ngiyabonga" |
| `ve` | Venda | "Ndi masiari", "Ndo livhuwa" |
| `nr` | Ndebele | "Lotjhani", "Ngiyabonga" |

## Examples

**Example 1 — Twitter in Zulu**
```
Input: topic="coffee shop opening", platform="twitter", language="zu", tone="casual"
Output: "Sawubona ✨ Siyavula ngokuvula i-coffee shop yethu entsha eJozi! ☕
Woza uzizwe ubuntu bethu ngosuku lokuqala 🙌 #Mzansi #LocalIsLekker #JoziVibes"
(226 chars — within limit)
```

**Example 2 — LinkedIn in English with Afrikaans flavour**
```
Input: topic="product launch", platform="linkedin", language="en", tone="professional"
Output: "Baie excited to share that after 18 months of building...
[professional post with SA context woven in naturally]
#LocalIsLekker #MzansiBusiness #ProudlySouthAfrican"
```

## Troubleshooting

1. **Gemini rate limit** — Implement exponential backoff; surface `{ error: 'AI_RATE_LIMIT', retryAfterMs }` to caller
2. **No brand profile** — Generate with neutral defaults; append inline suggestion to run brand-scraper
3. **Character limit exceeded after generation** — Truncate at last complete sentence before limit; never cut mid-word
