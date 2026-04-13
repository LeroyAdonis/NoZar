import { db } from "~/lib/db.server";
import { chat_sessions, chat_messages } from "~/lib/schema";
import { callNvidiaModel } from "~/lib/nvidia.server";

export async function handleChat({ user, sessionId, tradeId, input }: { user: any; sessionId?: number; tradeId?: number; input: string; }) {
  if (!input || input.trim().length === 0) throw new Error("empty input");
  if (input.length > 2000) throw new Error("input_too_long");

  let sessId = sessionId;
  if (!sessId) {
    const inserted = await db.insert(chat_sessions).values({ tradeId: tradeId ?? null, userId: user.id, context: {}, model: "nvidia" }).returning();
    // returning() yields array; extract id
    sessId = inserted[0].id;
  }

  await db.insert(chat_messages).values({ sessionId: sessId, sender: "user", senderId: user.id, text: input }).run();

  const modelResponse = await callNvidiaModel(input);
  const assistantText = (modelResponse && (modelResponse.output || modelResponse.text || JSON.stringify(modelResponse))) ?? "(no response)";

  await db.insert(chat_messages).values({ sessionId: sessId, sender: "assistant", text: assistantText }).run();

  return { sessionId: sessId, message: { role: "assistant", text: assistantText } };
}