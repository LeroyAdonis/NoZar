import { generateContent } from "./ai.server";

export type TradeAnalysis = {
  verdict: "fair" | "slightly_unbalanced" | "unbalanced";
  suggestions: string[];
  explanation: string;
};

/**
 * Analyzes a proposed or in-progress trade between two items.
 * Provides sharp, actionable advice from the user's perspective.
 *
 * HARD RULE: Never suggests cash. Only item-based balancing.
 */
export async function analyzeTrade(
  itemA: { title: string; description: string; condition: string; value: number | null; category: string },
  itemB: { title: string; description: string; condition: string; value: number | null; category: string },
  conversationContext?: string,
  userItemTitle?: string,
  theirItemTitle?: string,
): Promise<TradeAnalysis> {
  const yourItem = userItemTitle ?? "your item";
  const theirItem = theirItemTitle ?? "the other item";

  const systemPrompt = [
    "You're a knowledgeable mate on NoZar (SA barter platform) giving blunt trade advice.",
    "NEVER suggest cash or money. Only item-based balancing.",
    "Speak direct and casual — like a friend, not a robot.",
    "",
    "CRITICAL — ONLY reference items listed in the data below.",
    "Do NOT invent item names, brands, or categories that aren't in the listing titles or chat history.",
    "If you need to suggest an item to add, use generic categories (e.g. 'a smaller item', 'an accessory', 'a game or two').",
    "",
    "CRITICAL — value direction:",
    "- Compare YOUR item's value vs THEIR item's value",
    '- If YOUR item is worth LESS: YOU need to add items from YOUR side to match, OR accept the difference',
    '- If THEIR item is worth LESS: THEY need to add items from THEIR side to match, OR accept the difference',
    "- NEVER suggest adding more items to the side that's ALREADY worth more — that widens the gap.",
    "",
    "Output ONLY valid JSON:",
    '  - verdict: "fair" | "slightly_unbalanced" | "unbalanced"',
    "  - suggestions: 2-3 sharp, specific options with clear who-adds-what direction",
    "  - explanation: ONE sentence comparing values — mention the actual gap (e.g. 'your R6k vs their R8.5k, gap of R2.5k')",
  ].join("\n");

  const prompt = [
    `You have a ${yourItem}. They have a ${theirItem}. Speak to YOU — the person with the ${yourItem}.`,
    "",
    `--- Your item (${yourItem}) ---`,
    `Title: ${itemA.title}`,
    `Value: ${itemA.value != null ? `R${itemA.value.toLocaleString()}` : "Not specified"}`,
    `Condition: ${itemA.condition}`,
    `Category: ${itemA.category}`,
    itemA.description ? `Details: ${itemA.description.slice(0, 200)}` : "",
    "",
    `--- Their item (${theirItem}) ---`,
    `Title: ${itemB.title}`,
    `Value: ${itemB.value != null ? `R${itemB.value.toLocaleString()}` : "Not specified"}`,
    `Condition: ${itemB.condition}`,
    `Category: ${itemB.category}`,
    itemB.description ? `Details: ${itemB.description.slice(0, 200)}` : "",
    "",
    `VALUE CHECK: Your item is R${itemA.value ?? "?"} and theirs is R${itemB.value ?? "?"}.`,
    itemA.value != null && itemB.value != null
      ? itemA.value < itemB.value
        ? `Gap of R${(itemB.value - itemA.value).toLocaleString()} — YOU need to add items from YOUR side to match the gap, or they could sweeten the deal on their side (since they want your item).`
        : itemA.value > itemB.value
        ? `Gap of R${(itemA.value - itemB.value).toLocaleString()} — THEY need to add items from THEIR side to close the gap.`
        : "Values are equal — fair trade as-is."
      : "Values not specified — use condition and description to judge fairness.",
    "",
    conversationContext
      ? `Chat so far (read the FULL conversation to understand what's been discussed and rejected):\n${conversationContext.slice(0, 800)}\n\nNote: If someone already said no to an item or combo, don't suggest it again.`
      : "No chat history yet.",
    "",
    "CRITICAL: Do NOT invent items (no Bose, no headphones, no brands not in data). Stick to the listings above and chat history only. Use generic terms like 'add an accessory' if needed.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await generateContent(prompt, systemPrompt);

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
