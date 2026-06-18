import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { AiServiceError } from "~/lib/ai.server";
import { callNvidiaModel } from "~/lib/nvidia.server";
import { escalateUnansweredQuestion } from "~/lib/support-chat";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_PATH = resolve(__dirname, "..", "..", "docs", "support-knowledge.md");

let knowledgeBase: string | null = null;

async function getKnowledgeBase(): Promise<string> {
  if (knowledgeBase) return knowledgeBase;
  try {
    knowledgeBase = await readFile(KNOWLEDGE_PATH, "utf-8");
  } catch {
    knowledgeBase = "No knowledge base available.";
  }
  return knowledgeBase;
}

const SYSTEM_PROMPT = `You are a helpful NoZar support assistant. NoZar is a South African membership-based community platform where users list and discover items and services.

RULES:
1. Answer ONLY using the knowledge base provided. If the answer isn't in the knowledge base, say: "I'm not sure about that one — let me connect you to a human support agent."
2. Keep answers short, friendly, and practical — like a helpful WhatsApp message.
3. Never invent features, policies, or capabilities that aren't in the knowledge base.
4. If the user's question is about account actions (changing email, verifying, unblocking), tell them what to do first. Only say "contact support" as a last resort.
5. Format answers in plain text without markdown headers or code blocks — just short paragraphs with line breaks.
6. Use South African English (e.g., "keen" not "interested", "sorted" not "resolved").

KNOWLEDGE BASE:
{knowledge}

Now answer the user's question.`;

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);

  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const body: { question?: string } = await request.json().catch(() => ({}));
  const question = body.question?.trim();

  if (!question) {
    return Response.json({ error: "Ask a question" }, { status: 400 });
  }

  const knowledge = await getKnowledgeBase();
  const systemPrompt = SYSTEM_PROMPT.replace("{knowledge}", knowledge);

  try {
    const answer = await callNvidiaModel(question, {
      model: "meta/llama-3.1-8b-instruct",
      temperature: 0.3,
      maxTokens: 512,
      systemPrompt,
    });

    // If AI couldn't answer, escalate to human support (Telegram + email fallback)
    const cantAnswer = "i'm not sure about that one";
    if (answer.toLowerCase().startsWith(cantAnswer)) {
      const userName = user.name ?? user.email ?? "Unknown";
      const timestamp = new Date().toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        hour12: false,
      });
      // Fire and forget — don't block the user's response
      escalateUnansweredQuestion({
        userEmail: user.email,
        userName,
        question,
        timestamp,
      }).catch((err) =>
        console.error("[support-chat] escalation failed:", err)
      );
    }

    return Response.json({ answer });
  } catch (err: unknown) {
    console.error("/api/support/chat error:", err);
    if (err instanceof AiServiceError) {
      return Response.json(
        { error: "AI service unavailable. Please try again later." },
        { status: 503 },
      );
    }
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
