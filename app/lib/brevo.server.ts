/**
 * Brevo (formerly Sendinblue) transactional email + SMS service.
 * Falls back to Resend for email when Brevo is not configured.
 *
 * Priority: Brevo > Resend > console log (for local dev)
 *
 * Brevo API docs:
 *   Email: https://developers.brevo.com/reference/sendtransacemail
 *   SMS:   https://developers.brevo.com/reference/sendtransacsms
 */

// ── Config ────────────────────────────────────────────────────

const BREVO_KEY = process.env.BREVO_API_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const API_BASE = "https://api.brevo.com/v3";
const FROM_NAME = "NoZar";
const FROM_EMAIL = "noreply@nozar.co.za";

let warnedOnce = false;

function brevoHeaders(): Record<string, string> | null {
  if (BREVO_KEY && BREVO_KEY.trim() !== "") {
    return {
      "api-key": BREVO_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }
  return null;
}

function hasResend(): boolean {
  return !!(RESEND_KEY && RESEND_KEY.trim() !== "");
}

function logDisabled(to: string, type: string, subject: string) {
  if (!warnedOnce) {
    warnedOnce = true;
    console.warn(
      "[brevo] Neither BREVO_API_KEY nor RESEND_API_KEY configured — emails/SMS disabled",
    );
  }
  console.log(`[brevo] (disabled) ${type} → ${to} | ${subject}`);
}

// ── Email ──────────────────────────────────────────────────────

interface EmailParams {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, toName, subject, html }: EmailParams): Promise<void> {
  // Try Brevo first
  const headers = brevoHeaders();
  if (headers) {
    try {
      const res = await fetch(`${API_BASE}/smtp/email`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sender: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ email: to, name: toName ?? to }],
          subject,
          htmlContent: html,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`[brevo] email send failed: ${res.status} ${body}`);
        // Fall through to Resend fallback
      } else {
        const data = await res.json();
        console.log(`[brevo] email sent (Brevo) → ${to} | ${subject} | id: ${data.messageId}`);
        return;
      }
    } catch (err) {
      console.error("[brevo] email exception (Brevo):", err instanceof Error ? err.message : err);
      // Fall through to Resend fallback
    }
  }

  // Fallback: Resend
  if (hasResend()) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_KEY);
      const result = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject,
        html,
      });
      console.log(`[brevo] email sent (Resend) → ${to} | ${subject} | id: ${result.data?.id}`);
      return;
    } catch (err) {
      console.error("[brevo] email exception (Resend):", err instanceof Error ? err.message : err);
    }
  }

  // Neither configured
  logDisabled(to, "email", subject);
}

// ── SMS ────────────────────────────────────────────────────────

async function sendSms(
  to: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  const headers = brevoHeaders();
  if (!headers) {
    logDisabled(to, "SMS", content.slice(0, 40));
    return { success: false, error: "Brevo not configured" };
  }

  try {
    const res = await fetch(`${API_BASE}/transactionalSMS/sms`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sender: FROM_NAME,
        recipient: to,
        content,
        type: "transactional",
        tag: "nozar-otp",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[brevo] SMS send failed: ${res.status} ${body}`);
      return { success: false, error: `Brevo SMS error: ${res.status}` };
    }

    const data = await res.json();
    console.log(`[brevo] SMS sent → ${to} | id: ${data.messageId ?? data.smsId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[brevo] SMS exception:", msg);
    return { success: false, error: msg };
  }
}

// ── Template helpers ───────────────────────────────────────────

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Public exports ─────────────────────────────────────────────

export const brevo = {
  sendEmail,
  sendSms,
  templates: { baseStyle, accentHeading, body, btn, escapeHtml },
};
