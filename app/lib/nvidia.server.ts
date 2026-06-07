import { getConfiguredNvidiaApiKey } from "./nvidia-config.server";

// Standard NVIDIA NIM (OpenAI-compatible) API wrapper

export type NvidiaCallOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
};

// Recommended default for NIM — free endpoint via NVIDIA NIM
const DEFAULT_MODEL = "meta/llama-4-maverick-17b-128e-instruct";

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function callNvidiaModel(prompt: string, options: NvidiaCallOptions = {}) {
  const key = getConfiguredNvidiaApiKey();
  if (!key) throw new Error("NVIDIA_API_KEY not configured on server");
  
  const model = options.model ?? DEFAULT_MODEL;
  // OpenAI-compatible endpoint
  const url = "https://integrate.api.nvidia.com/v1/chat/completions";

  const payload: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens: number;
    temperature: number;
  } = {
    model,
    messages: [
      ...(options.systemPrompt
        ? [{ role: "system" as const, content: options.systemPrompt }]
        : []),
      { role: "user", content: prompt }
    ],
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.2,
  };

  return callNvidiaApi(payload);
}

/**
 * Call NVIDIA NIM with a vision (multimodal) request.
 * Sends the image as a proper content part, not embedded in text.
 * Uses Qwen 3.5 VLM which has actual vision capabilities.
 */
export async function callNvidiaVision(
  text: string,
  imageUrl: string,
  options: { maxTokens?: number; temperature?: number } = {},
) {
  const key = getConfiguredNvidiaApiKey();
  if (!key) throw new Error("NVIDIA_API_KEY not configured on server");

  const model = "qwen/qwen3.5-397b-a17b";
  const url = "https://integrate.api.nvidia.com/v1/chat/completions";

  const payload = {
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: options.maxTokens ?? 512,
    temperature: options.temperature ?? 0.1,
  };

  return callNvidiaApi(payload);
}

// Shared API caller with retry logic
async function callNvidiaApi(payload: Record<string, unknown>) {
  const key = getConfiguredNvidiaApiKey();
  const url = "https://integrate.api.nvidia.com/v1/chat/completions";
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const raMs = retryAfter ? Number(retryAfter) * 1000 : 1000 * attempt;
        if (attempt === maxAttempts) {
          throw new Error("nvidia_rate_limited");
        }
        await delay(raMs + Math.random() * 200);
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`NVIDIA API Error (${res.status}):`, errorText);
        if (res.status >= 500 && attempt < maxAttempts) {
          await delay(500 * attempt);
          continue;
        }
        throw new Error(`nvidia_api_error_${res.status}`);
      }

      const json = await res.json();
      if (json.choices && json.choices[0]?.message?.content) {
        return json.choices[0].message.content;
      }
      throw new Error("nvidia_unexpected_response_format");
    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err);
      if (attempt === maxAttempts) throw err;
      await delay(300 * attempt);
    }
  }
  throw new Error("nvidia_unreachable");
}
