import { getConfiguredGeminiApiKey } from "./gemini-config.server";

export type GeminiCallOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
};

const DEFAULT_MODEL = "gemini-2.0-flash";

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function callGeminiModel(
  prompt: string,
  options: GeminiCallOptions = {},
) {
  const key = getConfiguredGeminiApiKey();
  if (!key) throw new Error("GOOGLE_GEMINI_API_KEY not configured on server");

  const model = options.model ?? DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const contents: Array<{ parts: Array<{ text: string }> }> = [
    { parts: [{ text: prompt }] },
  ];

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.2,
    },
  };

  if (options.systemPrompt) {
    payload.systemInstruction = {
      parts: [{ text: options.systemPrompt }],
    };
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const raMs = retryAfter ? Number(retryAfter) * 1000 : 1000 * attempt;
        if (attempt === maxAttempts) {
          throw new Error("gemini_rate_limited");
        }
        await delay(raMs + Math.random() * 200);
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Gemini API Error (${res.status}):`, errorText);
        if (res.status >= 500 && attempt < maxAttempts) {
          await delay(500 * attempt);
          continue;
        }
        throw new Error(`gemini_api_error_${res.status}`);
      }

      const json = await res.json();

      // Handle blocked responses (safety filters)
      if (json.promptFeedback?.blockReason) {
        throw new Error(
          `gemini_blocked_${json.promptFeedback.blockReason}`,
        );
      }

      if (
        json.candidates &&
        json.candidates[0]?.content?.parts?.[0]?.text !== undefined
      ) {
        return json.candidates[0].content.parts[0].text;
      }

      // Check for finish reason other than STOP
      if (json.candidates?.[0]?.finishReason) {
        const finishReason = json.candidates[0].finishReason;
        if (finishReason !== "STOP") {
          throw new Error(`gemini_finish_reason_${finishReason}`);
        }
      }

      throw new Error("gemini_unexpected_response_format");
    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err);
      if (attempt === maxAttempts) throw err;
      await delay(300 * attempt);
    }
  }
  throw new Error("gemini_unreachable");
}
