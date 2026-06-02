/**
 * Transactional email service via Resend.
 *
 * Graceful degradation — if no RESEND_API_KEY is set, everything
 * logs to the console and returns without error.
 */

import { Resend } from "resend";

// ── Setup ────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;

let resend: Resend | null = null;
let warnedOnce = false;

function getResend(): Resend | null {
  if (RESEND_API_KEY && RESEND_API_KEY.trim() !== "") {
    if (!resend) resend = new Resend(RESEND_API_KEY);
    return resend;
  }
  if (!warnedOnce) {
    warnedOnce = true;
    console.warn("[email] RESEND_API_KEY not configured — emails disabled");
  }
  return null;
}

// ── Common helpers ───────────────────────────────────────

const FROM_EMAIL = "NoZar <noreply@nozar.co.za>";
const APP_URL =
  process.env.APP_URL ?? "https://www.nozar.co.za";

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

function baseStyle(css: string) {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;background:#030712;padding:24px;border-radius:12px;max-width:480px;margin:auto">${css}</div>`;
}

function accentHeading(text: string) {
  return `<h2 style="margin:0 0 12px;color:#10b981;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em">${text}</h2>`;
}

function body(text: string) {
  return `<p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.6">${text}</p>`;
}

function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#10b981;color:#030712;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.05em">${label}</a>`;
}

// ── Core send function ──────────────────────────────────

async function send({ to, subject, html }: EmailParams): Promise<void> {
  const client = getResend();
  if (!client) {
    console.log(`[email] (disabled) → ${to} | ${subject}`);
    return;
  }

  try {
    await client.emails.send({ from: FROM_EMAIL, to, subject, html });
    console.log(`[email] sent → ${to} | ${subject}`);
  } catch (err) {
    // Never let email failures bubble up and break the user flow
    console.error("[email] send failed:", err instanceof Error ? err.message : err);
  }
}

// ── Template builders ───────────────────────────────────

/** 0. Support escalation — AI couldn't answer */
export function supportEscalationEmail(params: {
  userEmail: string;
  userName: string;
  question: string;
  timestamp: string;
}): Promise<void> {
  const { userEmail, userName, question, timestamp } = params;
  return send({
    to: "leroy@nozar.co.za",
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
  return send({
    to,
    subject: `New message from ${senderName} on NoZar`,
    html: baseStyle(
      accentHeading("💬 New Message") +
      body(`Hey ${recipientName}, <strong>${senderName}</strong> sent you a message about "<strong>${listingTitle}</strong>":`) +
      `<blockquote style="border-left:3px solid #10b981;padding:8px 12px;margin:0 0 16px;border-radius:4px;background:#0f172a;color:#cbd5e1;font-size:13px">${escapeHtml(messageSnippet)}</blockquote>` +
      btn(`${APP_URL}/dashboard/pings/${tradeId}`, "View Conversation")
    ),
  });
}

/** 2. Trade accepted (handshake accepted) */
export function tradeAcceptedEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  tradeId: number;
  listingTitle: string;
}): Promise<void> {
  const { to, recipientName, senderName, tradeId, listingTitle } = params;
  return send({
    to,
    subject: `Trade accepted — ${listingTitle}`,
    html: baseStyle(
      accentHeading("🤝 Trade Accepted") +
      body(`${senderName} accepted your trade proposal for "<strong>${listingTitle}</strong>". Both of you can now share contact details and arrange the meetup.`) +
      btn(`${APP_URL}/dashboard/pings/${tradeId}`, "Open Trade")
    ),
  });
}

/** 3. Trade completed */
export function tradeCompletedEmail(params: {
  to: string;
  recipientName: string;
  otherName: string;
  tradeId: number;
  listingTitle: string;
}): Promise<void> {
  const { to, recipientName, otherName, tradeId, listingTitle } = params;
  return send({
    to,
    subject: `Trade complete — "${listingTitle}"`,
    html: baseStyle(
      accentHeading("✅ Trade Completed") +
      body(`Your trade for "<strong>${listingTitle}</strong>" with ${otherName} is now complete. Thanks for using NoZar!`) +
      body(`Don't forget to leave a rating — it helps the community.`) +
      btn(`${APP_URL}/dashboard/pings/${tradeId}`, "Leave Rating")
    ),
  });
}

/** 4. Contact shared */
export function contactSharedEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  tradeId: number;
  listingTitle: string;
}): Promise<void> {
  const { to, recipientName, senderName, tradeId, listingTitle } = params;
  return send({
    to,
    subject: `${senderName} shared contact details — ${listingTitle}`,
    html: baseStyle(
      accentHeading("📱 Contact Details Shared") +
      body(`${senderName} has shared their contact information with you for the trade "<strong>${listingTitle}</strong>".`) +
      body(`You can now coordinate your meetup. Remember to meet in a public Safe Zone.`) +
      btn(`${APP_URL}/dashboard/pings/${tradeId}`, "View Trade")
    ),
  });
}

// ── Utility ─────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
