/**
 * AI-enhanced fraud detection for trade chat messages.
 * Sends conversation context to NVIDIA AI for deeper analysis
 * when pattern-based detection flags high-risk trades.
 */

import { getConfiguredNvidiaApiKey } from "./nvidia-config.server";

const NVIDIA_CHAT_URL =
  "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "deepseek-ai/deepseek-v4-flash";

export type AiFraudResult = {
  risk: "safe" | "suspicious" | "dangerous";
  reason: string;
};

/**
 * Use NVIDIA AI to analyze a trade conversation for scam/risk patterns.
 * Sends the full message history with a system prompt about SA-specific
 * trade scam indicators (fake courier fees, upfront deposits, etc.).
 */
export async function aiAnalyzeTradeMessages(
  messages: Array<{ text: string; sender: string }>,
): Promise<AiFraudResult> {
  const apiKey = getConfiguredNvidiaApiKey();
  if (!apiKey) {
    return { risk: "safe", reason: "AI analysis unavailable (no API key)" };
  }

  const conversationText = messages
    .map((m) => `${m.sender}: ${m.text}`)
    .join("\n");

  const systemPrompt = `You are a fraud detection assistant for NoZar, a South African barter/trade platform.
Analyze the following trade conversation for scam indicators specific to SA barter platforms:
- Requests for upfront money, deposits, or "refundable fees"
- Pressure tactics (urgency, deadline, "other buyer waiting")
- Off-platform contact attempts (WhatsApp, Telegram)
- Fake courier/shipping fee requests
- Too-good-to-be-true offers
- Requests for bank/card details
- Any language consistent with common SA marketplace scams

Respond with ONE of: safe | suspicious | dangerous
Then on a new line, give a brief reason (max 100 characters).`;

  try {
    const res = await fetch(NVIDIA_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: conversationText },
        ],
        temperature: 0.1,
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      console.error(
        `NVIDIA AI fraud analysis error (${res.status}):`,
        await res.text(),
      );
      return { risk: "safe", reason: "AI analysis failed" };
    }

    const json = await res.json();
    const content: string =
      json?.choices?.[0]?.message?.content?.trim() ?? "";

    const riskLine = content.split("\n")[0]?.toLowerCase().trim() ?? "";
    const reason =
      content.split("\n").slice(1).join(" ").trim() || "No details";

    let risk: "safe" | "suspicious" | "dangerous" = "safe";
    if (riskLine.includes("dangerous")) risk = "dangerous";
    else if (riskLine.includes("suspicious")) risk = "suspicious";

    return { risk, reason };
  } catch (err) {
    console.error("NVIDIA AI fraud analysis error:", err);
    return { risk: "safe", reason: "AI analysis unavailable" };
  }
}
