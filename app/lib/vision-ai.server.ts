import { callNvidiaVision } from "./nvidia.server";

export interface AiListingSuggestion {
  title: string;
  description: string;
  category: string;
  estimatedValue: number | null;
}

/**
 * Generates a listing suggestion (title, description, category, estimated value)
 * from a photo URL using Qwen 3.5 VLM (vision-language model) via NVIDIA NIM.
 *
 * The image is sent as a proper multimodal content part, not embedded in text.
 */
export async function generateListingFromPhoto(
  imageUrl: string,
): Promise<AiListingSuggestion> {
  const text = `You are a listing assistant for NoZar, a South African barter/trade platform.

A user has uploaded a photo of an item they want to list for trade. Based on this image, generate a listing with:

1. A catchy title (max 60 chars, SA English)
2. A 2-3 sentence description
3. A category from: Electronics, Fashion, Home & Garden, Sports, Tools, Vehicles, Services, Other
4. An estimated value in ZAR (reasonable second-hand price)

Return ONLY valid JSON in this exact format, no explanation:
{"title": "...", "description": "...", "category": "...", "estimatedValue": 1234}

If you cannot determine a value, set estimatedValue to null.

IMPORTANT: Look at the image carefully. Identify the specific item shown — be as accurate as possible with the brand, model, and condition visible. If it's a fire extinguisher, say it's a fire extinguisher, not a camera.`;

  const raw = await callNvidiaVision(text, imageUrl, {
    maxTokens: 512,
    temperature: 0.1,
  });

  // Try to extract JSON from the response (handles wrapping/markdown)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
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
