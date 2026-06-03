import { callNvidiaVision } from "~/lib/nvidia.server";

export type PhotoQualityResult = {
  score: number;
  suggestions: string[];
  overallRating: "great" | "good" | "okay" | "poor";
};

/**
 * Analyze a listing photo for quality using Qwen 3.5 VLM via NVIDIA NIM.
 * Returns a score (0-100), improvement suggestions, and overall rating.
 */
export async function analyzePhotoQuality(
  imageUrl: string,
): Promise<PhotoQualityResult> {
  const prompt = `You are a photography expert for NoZar, a South African barter/trade platform. Users upload photos of items they want to trade.

Analyze this listing photo and return ONLY valid JSON (no explanation):

{
  "score": <number 0-100>,
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "rating": "great" | "good" | "okay" | "poor"
}

Scoring criteria:
- 80-100: Well-lit, clear subject, clean background, good composition
- 60-79: Decent photo but has room for improvement
- 40-59: Poor lighting, cluttered background, blurry
- 0-39: Almost unusable — too dark/blurry/obstructed

Suggestions (max 3, short and actionable in SA English):
- Focus on: lighting, background clutter, angle/position, clarity, or framing
- Be specific but concise (10-15 words max per suggestion)
- If the photo is already great, return ["Looks good!"]

Rating:
- "great" if score >= 80
- "good" if score >= 60
- "okay" if score >= 40
- "poor" if score < 40`;

  const raw = await callNvidiaVision(prompt, imageUrl, {
    maxTokens: 256,
    temperature: 0.1,
  });

  // Extract JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Fallback for parsing failure
    return {
      score: 50,
      suggestions: ["Could not analyze this photo. Try a clearer image."],
      overallRating: "okay",
    };
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    score?: number;
    suggestions?: string[];
    rating?: string;
  };

  const score = Math.max(0, Math.min(100, parsed.score ?? 50));
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.slice(0, 3)
    : ["Try a clearer photo with better lighting."];

  let overallRating: PhotoQualityResult["overallRating"] = "okay";
  if (score >= 80) overallRating = "great";
  else if (score >= 60) overallRating = "good";
  else if (score >= 40) overallRating = "okay";
  else overallRating = "poor";

  return { score, suggestions, overallRating };
}

/**
 * Get a color class for the quality rating badge.
 */
export function qualityRatingColor(rating: PhotoQualityResult["overallRating"]): string {
  switch (rating) {
    case "great": return "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
    case "good": return "text-cyan-400 border-cyan-500/20 bg-cyan-500/10";
    case "okay": return "text-amber-400 border-amber-500/20 bg-amber-500/10";
    case "poor": return "text-rose-400 border-rose-500/20 bg-rose-500/10";
  }
}
