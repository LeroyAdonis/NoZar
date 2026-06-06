/**
 * Transactional email service via Brevo.
 *
 * Graceful degradation — if no BREVO_API_KEY is set, everything
 * logs to the console and returns without error.
 */

import { brevo } from "./brevo.server";

// ── Helpers ────────────────────────────────────────────────────

const { baseStyle, accentHeading, body, btn, escapeHtml } = brevo.templates;

// ── Template builders ──────────────────────────────────────────

/** 0. Support escalation — AI couldn't answer */
export function supportEscalationEmail(params: {
  userEmail: string;
  userName: string;
  question: string;
  timestamp: string;
}): Promise<void> {
  const { userEmail, userName, question, timestamp } = params;
  return brevo.sendEmail({
    to: "leroy@nozar.co.za",
    toName: "Leroy",
    subject: `🔔 Support Escalation: Unanswered question from ${userName}`,
    html: baseStyle(
      accentHeading("🆘 Support Escalation") +
      body(`A user asked a question the AI support bot couldn't answer:`) +
      `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:13px">` +
      `  <tr><td style="padding:6px 0;color:#64748b;width:100px">User</td><td style="padding:6px 0;color:#e2e8f0"><strong>${escapeHtml(userName)}</strong> &lt;${escapeHtml(userEmail)}&gt;</td></tr>` +
      `  <tr><td style="padding:6px 0;color:#64748b">Time</td><td style="padding:6px 0;color:#e2e8f0">${escapeHtml(timestamp)}</td></tr>` +
      `</table>` +
      `<div style="border-left:3px solid #f59e0b;padding:12px 16px;margin:0 0 16px;border-radius:4px;background:#0f172a;color:#cbd5e1;font-size:13px">` +
      `<strong style="color:#f59e0b">❓ Question:</strong><br>${escapeHtml(question)}` +
      `</div>` +
      body(`Reply to this email or use the <strong>support-cli</strong> in Telegram to handle this ticket.`) +
      btn(`${process.env.APP_URL ?? "https://www.nozar.co.za"}/admin/users?search=${encodeURIComponent(userEmail)}`, "View User Profile")
    ),
  });
}

/** 1. New message received */
export function newMessageEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  messageSnippet: string;
  tradeId: number;
  listingTitle: string;
}): Promise<void> {
  const { to, recipientName, senderName, messageSnippet, tradeId, listingTitle } = params;
  return brevo.sendEmail({
    to,
    toName: recipientName,
    subject: `New message from ${senderName} on NoZar`,
    html: baseStyle(
      accentHeading("💬 New Message") +
      body(`Hey ${recipientName}, <strong>${senderName}</strong> sent you a message about "<strong>${listingTitle}</strong>":`) +
      `<blockquote style="border-left:3px solid #10b981;padding:8px 12px;margin:0 0 16px;border-radius:4px;background:#0f172a;color:#cbd5e1;font-size:13px">${escapeHtml(messageSnippet)}</blockquote>` +
      btn(`https://www.nozar.co.za/dashboard/pings/${tradeId}`, "View Conversation")
    ),
  });
}

/** 2. Trade completed */
export function tradeCompletedEmail(params: {
  to: string;
  recipientName: string;
  otherName: string;
  tradeId: number;
  listingTitle: string;
}): Promise<void> {
  const { to, recipientName, otherName, tradeId, listingTitle } = params;
  return brevo.sendEmail({
    to,
    toName: recipientName,
    subject: `Trade complete — "${listingTitle}"`,
    html: baseStyle(
      accentHeading("✅ Trade Completed") +
      body(`Your trade for "<strong>${listingTitle}</strong>" with ${otherName} is now complete. Thanks for using NoZar!`) +
      body(`Don't forget to leave a rating — it helps the community.`) +
      btn(`https://www.nozar.co.za/dashboard/pings/${tradeId}`, "Leave Rating")
    ),
  });
}

/** 3. Contact shared */
export function contactSharedEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  tradeId: number;
  listingTitle: string;
}): Promise<void> {
  const { to, recipientName, senderName, tradeId, listingTitle } = params;
  return brevo.sendEmail({
    to,
    toName: recipientName,
    subject: `${senderName} shared contact details — ${listingTitle}`,
    html: baseStyle(
      accentHeading("📱 Contact Details Shared") +
      body(`${senderName} has shared their contact information with you for the trade "<strong>${listingTitle}</strong>".`) +
      body(`You can now coordinate your meetup. Remember to meet in a public Safe Zone.`) +
      btn(`https://www.nozar.co.za/dashboard/pings/${tradeId}`, "View Trade")
    ),
  });
}
