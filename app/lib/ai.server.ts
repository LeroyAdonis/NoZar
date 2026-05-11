import { callNvidiaModel } from "./nvidia.server";
import { getConfiguredNvidiaApiKey } from "./nvidia-config.server";

export class AiServiceError extends Error {
  code: "nvidia_not_configured" | "nvidia_failed";

  constructor(
    code: "nvidia_not_configured" | "nvidia_failed",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AiServiceError";
    this.code = code;
  }
}

export async function generateContent(prompt: string, systemInstruction?: string) {
  const fullPrompt = systemInstruction
    ? `${systemInstruction}\n\n${prompt}`
    : prompt;

  if (!getConfiguredNvidiaApiKey()) {
    throw new AiServiceError(
      "nvidia_not_configured",
      "NVIDIA AI is not configured on the server",
    );
  }

  try {
    return await callNvidiaModel(fullPrompt);
  } catch (error) {
    console.error("NVIDIA AI request failed:", error);
    throw new AiServiceError(
      "nvidia_failed",
      "NVIDIA AI request failed",
      { cause: error },
    );
  }
}
