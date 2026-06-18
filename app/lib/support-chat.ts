/**
 * Support chat escalation logic.
 *
 * When the AI can't answer a question, this module handles
 * escalating to a human support agent via Telegram (primary)
 * with email fallback.
 */
import { sendTelegramMessage } from "./telegram.server";
import { supportEscalationEmail } from "./email.server";

export type EscalationParams = {
  userEmail: string;
  userName: string;
  question: string;
  timestamp: string;
};

/**
 * Build an HTML-formatted Telegram message from escalation params.
 */
function buildTelegramMessage(p: EscalationParams): string {
  return (
    "🆘 Support Escalation — NoZar\n" +
    `\n` +
    `User: <b>${escapeHtml(p.userName)}</b> (${escapeHtml(p.userEmail)})\n` +
    `Time: ${escapeHtml(p.timestamp)}\n` +
    `Question: ${escapeHtml(p.question)}\n` +
    `\n` +
    `/support-reply ${p.userEmail} &lt;your reply&gt;`
  );
}

/**
 * Escape HTML entities for safe Telegram message content.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Escalate an unanswered question to a human support agent.
 *
 * Primary: Telegram message to the support chat.
 * Fallback: Email to leroy@nozar.co.za (via Brevo).
 *
 * If Telegram succeeds, email is skipped (Telegram is the primary channel).
 */
export async function escalateUnansweredQuestion(
  params: EscalationParams,
): Promise<void> {
  try {
    const sent = await sendTelegramMessage(buildTelegramMessage(params));
    if (sent) {
      // Telegram sent successfully — skip email fallback
      return;
    }
  } catch (err) {
    console.error("[support-chat] Telegram escalation failed:", err);
  }

  // Fallback: send email
  try {
    await supportEscalationEmail(params);
  } catch (err) {
    console.error("[support-chat] escalation email failed:", err);
  }
}
