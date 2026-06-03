import { callGeminiModel } from "./gemini.server";
import type { SaLanguageCode } from "./sa-languages";

type TranslationResult = {
  translatedTitle: string;
  translatedDescription: string;
  translatedSeeking?: string;
};

/**
 * Translate listing content from English into any SA language.
 * Uses Gemini with a batch prompt to minimize API calls.
 */
export async function translateListing(
  title: string,
  description: string,
  seekingDescription: string | null | undefined,
  targetLang: SaLanguageCode,
): Promise<TranslationResult> {
  const systemPrompt = [
    "You are a professional translator specializing in South African languages.",
    "Translate accurately and naturally — don't add or remove meaning.",
    "Keep the same tone (casual, friendly, formal) as the original.",
    "Preserve any brand names, prices, numbers, and URLs exactly as-is.",
    "Use appropriate South African terminology for the target language.",
    "Output ONLY valid JSON with these keys: translatedTitle, translatedDescription",
    "If seekingDescription is provided, include translatedSeeking.",
  ].join("\n");

  const prompt = [
    `Translate the following listing from English to ${getLanguageName(targetLang)}.`,
    "",
    `Title: ${title}`,
    `Description: ${description}`,
    seekingDescription ? `Seeking: ${seekingDescription}` : null,
    "",
    "Return ONLY a JSON object with the translated fields.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await callGeminiModel(prompt, {
      temperature: 0.1,
      maxTokens: 1024,
      systemPrompt,
    });

    const json = JSON.parse(cleanJson(raw));

    return {
      translatedTitle: json.translatedTitle ?? title,
      translatedDescription: json.translatedDescription ?? description,
      translatedSeeking: json.translatedSeeking ?? seekingDescription ?? undefined,
    };
  } catch (err) {
    console.error(`Translation failed for ${targetLang}:`, err);
    // Fallback: return original text
    return {
      translatedTitle: title,
      translatedDescription: description,
      translatedSeeking: seekingDescription ?? undefined,
    };
  }
}

/**
 * Translate a single chat message into the target language.
 * Lightweight — no JSON output needed, just the translated text.
 */
export async function translateMessage(
  message: string,
  targetLang: SaLanguageCode,
): Promise<string> {
  if (!message || message.length < 2) return message;

  const prompt = [
    `Translate this message to ${getLanguageName(targetLang)}.`,
    "Keep it natural and conversational. Preserve emojis and formatting.",
    "If the message is already in that language, return it unchanged.",
    "",
    `Message: ${message}`,
    "",
    "Return ONLY the translated text, nothing else.",
  ].join("\n");

  try {
    return await callGeminiModel(prompt, { temperature: 0.1, maxTokens: 512 });
  } catch {
    return message; // fallback
  }
}

/**
 * Detect which SA language a message is written in.
 */
export async function detectLanguage(message: string): Promise<SaLanguageCode> {
  if (!message || message.length < 3) return "en";

  const prompt = [
    "Detect which South African language the following message is written in.",
    `Valid options: ${["English", "Afrikaans", "isiZulu", "isiXhosa", "Sesotho", "Setswana", "SiSwati", "Xitsonga", "Tshivenḓa", "isiNdebele", "Sesotho sa Leboa"].join(", ")}`,
    "Return ONLY the language code: en, af, zu, xh, st, tn, ss, ts, ve, nr, nso",
    "",
    `Message: ${message}`,
  ].join("\n");

  try {
    const result = await callGeminiModel(prompt, { temperature: 0, maxTokens: 10 });
    const code = result.trim().toLowerCase() as SaLanguageCode;
    // Validate it's actually a supported code
    const validCodes = ["en", "af", "zu", "xh", "st", "tn", "ss", "ts", "ve", "nr", "nso"];
    return validCodes.includes(code) ? code : "en";
  } catch {
    return "en";
  }
}

function getLanguageName(code: SaLanguageCode): string {
  const names: Record<SaLanguageCode, string> = {
    en: "English",
    af: "Afrikaans",
    zu: "isiZulu",
    xh: "isiXhosa",
    st: "Sesotho",
    tn: "Setswana",
    ss: "SiSwati",
    ts: "Xitsonga",
    ve: "Tshivenḓa",
    nr: "isiNdebele",
    nso: "Sesotho sa Leboa",
  };
  return names[code] ?? "English";
}

/**
 * Clean JSON from model output — strip code fences and trim.
 */
function cleanJson(raw: string): string {
  let cleaned = raw.trim();
  // Remove markdown code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/```[\w]*\n?/, "").replace(/```$/, "");
  }
  return cleaned.trim();
}
