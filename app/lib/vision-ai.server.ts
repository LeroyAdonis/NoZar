import { generateContent } from "./ai.server";

export interface AiListingSuggestion {
  title: string;
  description: string;
  category: string;
  estimatedValue: number | null;
}

/**
 * Generates a listing suggestion (title, description, category, estimated value)
 * from a photo URL using the configured AI provider.
 *
 * The image URL is sent in the prompt text — some models can access public URLs
 * directly for visual analysis. The response is parsed as JSON.
 */
export async function generateListingFromPhoto(
  imageUrl: string,
): Promise<AiListingSuggestion> {
  const prompt = `You are a listing assistant for NoZar, a South African barter/trade platform.

A user has uploaded a photo of an item they want to list for trade. Based on this image URL, generate a listing with:

1. A catchy title (max 60 chars, SA English)
2. A 2-3 sentence description
3. A category from: Electronics, Fashion, Home & Garden, Sports, Tools, Vehicles, Services, Other
4. An estimated value in ZAR (reasonable second-hand price)

Image URL: ${imageUrl}

Return ONLY valid JSON in this exact format, no explanation:
{"title": "...", "description": "...", "category": "...", "estimatedValue": 1234}

If you cannot determine a value, set estimatedValue to null.`;

  const text = await generateContent(prompt);

  // Try to extract JSON from the response (handles wrapping/markdown)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI response did not contain valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]) as AiListingSuggestion;

  // Validate required fields
  if (!parsed.title || !parsed.description || !parsed.category) {
    throw new Error("AI response missing required fields (title, description, or category)");
  }

  return {
    title: parsed.title.trim(),
    description: parsed.description.trim(),
    category: parsed.category.trim(),
    estimatedValue:
      parsed.estimatedValue != null && !Number.isNaN(parsed.estimatedValue)
        ? Math.round(parsed.estimatedValue)
        : null,
  };
}
