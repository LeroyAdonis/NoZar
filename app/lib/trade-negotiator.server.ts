import { callGeminiModel } from "./gemini.server";

export type TradeAnalysis = {
  /** Overall assessment — how fair the trade is */
  verdict: "fair" | "slightly_unbalanced" | "unbalanced";
  /** Suggested item-based balancing options. NEVER suggests cash. */
  suggestions: string[];
  /** Brief explanation of the value comparison */
  explanation: string;
};

/**
 * Analyzes a proposed or in-progress trade between two items.
 *
 * HARD RULE: Never suggests adding money/cash. Only item-based balancing.
 * - "Add a smaller item to balance"
 * - "Bundle two of your items"
 * - "Adjust condition expectations"
 * - "Add a service or skill"
 */
export async function analyzeTrade(
  itemA: { title: string; description: string; condition: string; value: number | null; category: string },
  itemB: { title: string; description: string; condition: string; value: number | null; category: string },
  conversationContext?: string,
): Promise<TradeAnalysis> {
  const systemPrompt = [
    "You are NoZar's AI Trade Negotiator — a fair trade advisor for a South African barter platform.",
    "Your ONLY purpose is to help users make fair, balanced trades WITHOUT using money.",
    "",
    "ABSOLUTELY FORBIDDEN:",
    "- Do NOT suggest adding cash, money, or any currency to balance a trade",
    "- Do NOT say 'add R200 on top' or anything involving money",
    "- Do NOT mention 'cash top-up', 'pay the difference', or similar",
    "",
    "What you CAN suggest:",
    "- 'Try adding another item to balance the value'",
    "- 'Bundle one of your smaller items with this one'",
    "- 'Ask if they'd include a service or skill to make up the difference'",
    "- 'Adjust what you're offering — maybe pick a different item from your inventory'",
    "- 'The condition differs significantly — consider whether you're comfortable with that'",
    "- 'Offer to meet halfway on the condition expectations'",
    "- 'Consider adding a smaller item or accessory to balance things out'",
    "",
    "Output ONLY valid JSON with these keys:",
    "- verdict: 'fair' | 'slightly_unbalanced' | 'unbalanced'",
    "- suggestions: array of 2-3 specific, actionable suggestions (strings)",
    "- explanation: short explanation of the value comparison (max 2 sentences)",
    "",
    "Keep it friendly and helpful, like a mate giving honest advice.",
  ].join("\n");

  const prompt = [
    "Analyze this proposed barter trade:",
    "",
    "--- Item A ---",
    `Title: ${itemA.title}`,
    `Description: ${itemA.description}`,
    `Category: ${itemA.category}`,
    `Condition: ${itemA.condition}`,
    `Estimated Value: ${itemA.value != null ? `R${itemA.value}` : "Not specified"}`,
    "",
    "--- Item B ---",
    `Title: ${itemB.title}`,
    `Description: ${itemB.description}`,
    `Category: ${itemB.category}`,
    `Condition: ${itemB.condition}`,
    `Estimated Value: ${itemB.value != null ? `R${itemB.value}` : "Not specified"}`,
    "",
    conversationContext
      ? `--- Conversation Context ---\n${conversationContext}`
      : "",
    "",
    "Return ONLY a JSON object with verdict, suggestions, and explanation.",
    "Remember: NO CASH SUGGESTIONS. Only item-based balancing.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await callGeminiModel(prompt, {
      temperature: 0.3,
      maxTokens: 1024,
      systemPrompt,
    });

    const cleaned = raw
      .replace(/```[\w]*\n?/g, "")
      .replace(/```$/g, "")
      .trim();

    return JSON.parse(cleaned) as TradeAnalysis;
  } catch (err) {
    console.error("Trade analysis failed:", err);
    return {
      verdict: "fair",
      suggestions: [
        "Both items seem comparable. Try chatting with the other person to confirm details.",
        "Check condition and meetup location before finalizing.",
      ],
      explanation: "Couldn't analyze automatically. Use your best judgment — you know your stuff best!",
    };
  }
}
