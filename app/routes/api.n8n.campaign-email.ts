import { brevo } from "~/lib/brevo.server";
import type { ActionFunctionArgs } from "react-router";

/**
 * POST /api/n8n/campaign-email
 *
 * Sends a campaign email to a specific user on behalf of n8n.
 * Uses the existing Brevo/Resend infrastructure.
 *
 * Body: { userId, email, name, campaign, location? }
 *
 * Auth: Bearer token matching N8N_API_KEY.
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // ── Auth ────────────────────────────────────────────────────────
  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "N8N_API_KEY not configured" }, { status: 500 });
  }
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ") || auth.slice(7) !== apiKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ──────────────────────────────────────────────────
  const body: {
    userId?: string;
    email?: string;
    name?: string;
    campaign?: string;
    location?: string;
  } = await request.json();

  if (!body.email || !body.campaign) {
    return Response.json({ error: "email and campaign required" }, { status: 400 });
  }

  const userName = body.name || "there";
  const location = body.location ? ` in ${body.location}` : "";

  // ── Campaign templates ──────────────────────────────────────────
  const campaigns: Record<string, { subject: string; html: string }> = {
    "skills-first-v1": {
      subject: `Hey ${userName}, got a skill to trade?`,
      html: `<div style="font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;background:#030712;padding:24px;border-radius:12px;max-width:480px;margin:auto">
<h2 style="margin:0 0 12px;color:#10b981;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em">Hey ${userName}! 👋</h2>
<p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.6">
  We noticed you joined NoZar but haven't listed anything yet.
  That's cool — most people don't know how easy it is to start.
</p>
<p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.6">
  <strong>Here's the secret:</strong> You don't need photos or fancy descriptions.
  Just tell us <strong>ONE thing you're good at</strong>.
</p>
<div style="background:#0f172a;border-radius:8px;padding:16px;margin:0 0 16px">
  <p style="margin:0 0 8px;color:#f59e0b;font-size:13px;font-weight:700">🔥 IDEAS${location.toUpperCase()}:</p>
  <p style="margin:0;color:#cbd5e1;font-size:13px;line-height:1.8">
    • Braai like a pro<br>
    • Fix a leaky tap<br>
    • Speak isiXhosa / Afrikaans<br>
    • Build websites<br>
    • Make a killer vetkoek<br>
    • Tutor maths or coding<br>
  </p>
</div>
<p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.6">
  Skills are the fastest way to start trading.<br>
  <strong>Three steps:</strong> Think → Describe → Publish. Takes 2 minutes.
</p>
<a href="https://www.nozar.co.za/dashboard/add" style="display:inline-block;background:#10b981;color:#030712;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.05em">Add Your First Skill →</a>
<p style="margin:16px 0 0;color:#64748b;font-size:12px">
  See you on the swap side,<br>
  Ricky &amp; the NoZar Team
</p>
</div>`,
    },
    "trade-followup-v1": {
      subject: `Hey ${userName}, your trade is ready to complete`,
      html: `<div style="font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;background:#030712;padding:24px;border-radius:12px;max-width:480px;margin:auto">
<h2 style="margin:0 0 12px;color:#f59e0b;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em">Hey ${userName}! ⏳</h2>
<p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.6">
  Your trade has been accepted but hasn't been marked as complete yet.
  Don't let a good swap slip away!
</p>
<p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.6">
  <strong>Next steps:</strong><br>
  • Confirm your meetup time &amp; place<br>
  • Complete the exchange<br>
  • Mark the trade as done on NoZar<br>
</p>
<a href="https://www.nozar.co.za/dashboard" style="display:inline-block;background:#f59e0b;color:#030712;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.05em">Check Trade Status →</a>
<p style="margin:16px 0 0;color:#64748b;font-size:12px">
  Need help? Just reply to this email.<br>
  Ricky &amp; the NoZar Team
</p>
</div>`,
    },
    "referral-invite-v1": {
      subject: `${userName}, you're a NoZar power trader!`,
      html: `<div style="font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;background:#030712;padding:24px;border-radius:12px;max-width:480px;margin:auto">
<h2 style="margin:0 0 12px;color:#10b981;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em">Hey ${userName}! 🏆</h2>
<p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.6">
  You're one of NoZar's most active traders — and that's worth sharing!
</p>
<p style="margin:0 0 16px;color:#94a3b8;font-size:14px;line-height:1.6">
  Invite a friend to NoZar and you'll both get <strong>priority matching</strong>
  on your next trade. The more people trade, the more everyone wins.
</p>
<div style="background:#0f172a;border-radius:8px;padding:16px;margin:0 0 16px">
  <p style="margin:0 0 8px;color:#f59e0b;font-size:13px;font-weight:700">✨ YOUR REFERRAL LINK:</p>
  <p style="margin:0;color:#10b981;font-size:14px;font-weight:700;word-break:break-all">https://www.nozar.co.za/invite</p>
</div>
<a href="https://www.nozar.co.za/dashboard/refer" style="display:inline-block;background:#10b981;color:#030712;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.05em">Share Your Invite →</a>
<p style="margin:16px 0 0;color:#64748b;font-size:12px">
  Thanks for being part of the NoZar community,<br>
  Ricky &amp; the NoZar Team
</p>
</div>`,
    },
  };

  const template = campaigns[body.campaign];
  if (!template) {
    return Response.json({ error: `Unknown campaign: ${body.campaign}` }, { status: 400 });
  }

  // ── Send ────────────────────────────────────────────────────────
  try {
    await brevo.sendEmail({
      to: body.email,
      toName: userName,
      subject: template.subject,
      html: template.html,
    });

    console.log(`[n8n] Campaign "${body.campaign}" sent → ${body.email} (${body.userId ?? "?"})`);

    return Response.json({ success: true, campaign: body.campaign, sentTo: body.email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[n8n] Campaign send failed for ${body.email}:`, msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
