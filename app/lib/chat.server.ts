import { db } from "~/lib/db.server";
import { chatSessions, chatMessages } from "~/lib/schema";
import { generateContent } from "~/lib/ai.server";

export async function handleChat({ user, sessionId, tradeId, input }: { user: any; sessionId?: number; tradeId?: number; input: string; }) {
  if (!input || input.trim().length === 0) throw new Error("empty input");
  if (input.length > 2000) throw new Error("input_too_long");

  let sessId = sessionId;
  if (!sessId) {
    const inserted = await db.insert(chatSessions).values({ tradeId: tradeId ?? null, userId: user.id, context: {}, model: "nvidia" }).returning();
    // returning() yields array; extract id
    sessId = inserted[0].id;
  }

  await db.insert(chatMessages).values({ sessionId: sessId!, sender: "user", senderId: user.id, text: input });

  const assistantText = await generateContent(input);

  await db.insert(chatMessages).values({ sessionId: sessId!, sender: "assistant", text: assistantText });

  return { sessionId: sessId, message: { role: "assistant", text: assistantText } };
}