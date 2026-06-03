const GEMINI_PLACEHOLDERS = new Set([
  "YOUR_GOOGLE_GEMINI_API_KEY",
  "your_google_gemini_api_key",
]);

export function getConfiguredGeminiApiKey(): string | null {
  const value = process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!value || GEMINI_PLACEHOLDERS.has(value)) {
    return null;
  }

  return value;
}
