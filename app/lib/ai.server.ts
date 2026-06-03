import { callNvidiaModel } from "./nvidia.server";
import { getConfiguredNvidiaApiKey } from "./nvidia-config.server";
import { callGeminiModel } from "./gemini.server";
import { getConfiguredGeminiApiKey } from "./gemini-config.server";

export class AiServiceError extends Error {
  code: "nvidia_not_configured" | "nvidia_failed" | "gemini_failed" | "all_providers_failed";

  constructor(
    code: "nvidia_not_configured" | "nvidia_failed" | "gemini_failed" | "all_providers_failed",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AiServiceError";
    this.code = code;
  }
}

export async function generateContent(prompt: string, systemInstruction?: string) {
  const nvidiaKey = getConfiguredNvidiaApiKey();
  const geminiKey = getConfiguredGeminiApiKey();

  // No providers configured
  if (!nvidiaKey && !geminiKey) {
    throw new AiServiceError(
      "nvidia_not_configured",
      "No AI provider is configured on the server",
    );
  }

  // Try NVIDIA first
  if (nvidiaKey) {
    console.log("Using NVIDIA AI provider");
    try {
      const result = await callNvidiaModel(prompt, {
        systemPrompt: systemInstruction,
      });
      return result;
    } catch (error) {
      console.error("NVIDIA AI request failed, will try fallback:", error);

      // If Gemini is available, fall back to it
      if (geminiKey) {
        console.log("Falling back to Gemini AI provider");
        try {
          return await callGeminiModel(prompt, {
            systemPrompt: systemInstruction,
          });
        } catch (geminiError) {
          console.error("Gemini AI request failed too:", geminiError);
          throw new AiServiceError(
            "all_providers_failed",
            "All AI providers failed",
            { cause: { nvidia: error, gemini: geminiError } },
          );
        }
      }

      // No fallback available
      throw new AiServiceError(
        "nvidia_failed",
        "NVIDIA AI request failed",
        { cause: error },
      );
    }
  }

  // Only Gemini is configured — use it directly
  if (geminiKey) {
    console.log("Using Gemini AI provider");
    try {
      return await callGeminiModel(prompt, {
        systemPrompt: systemInstruction,
      });
    } catch (error) {
      console.error("Gemini AI request failed:", error);
      throw new AiServiceError(
        "gemini_failed",
        "Gemini AI request failed",
        { cause: error },
      );
    }
  }

  // Unreachable but TypeScript needs it
  throw new AiServiceError(
    "nvidia_not_configured",
    "No AI provider is configured on the server",
  );
}
