import { brevo } from "~/lib/brevo.server";
import type { ActionFunctionArgs } from "react-router";

/**
 * POST /api/n8n/campaign-sms
 *
 * Sends a campaign SMS to a specific user on behalf of n8n.
 * Uses Brevo's transactional SMS API.
 *
 * Body: { userId, phone, campaign, name?, tradeId? }
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
    phone?: string;
    name?: string;
    campaign?: string;
    tradeId?: string;
  } = await request.json();

  if (!body.phone || !body.campaign) {
    return Response.json({ error: "phone and campaign required" }, { status: 400 });
  }

  const userName = body.name || "there";
  const tradeInfo = body.tradeId ? `#${body.tradeId}` : "your trade";

  // ── Campaign templates ──────────────────────────────────────────
  const campaigns: Record<string, string> = {
    "trade-followup-v1": `Hey ${userName}! Your trade (${tradeInfo}) has been accepted but not completed. Need help? Reply or check it now at nozar.co.za`,
    "referral-v1": `Hey ${userName}! You're one of NoZar's top traders. Invite a friend and get priority matching! Share your link: nozar.co.za/invite`,
  };

  const template = campaigns[body.campaign];
  if (!template) {
    return Response.json({ error: `Unknown campaign: ${body.campaign}` }, { status: 400 });
  }

  // ── Send ────────────────────────────────────────────────────────
  try {
    const result = await brevo.sendSms(body.phone, template);

    if (!result.success) {
      console.error(`[n8n] SMS campaign "${body.campaign}" failed for ${body.phone}: ${result.error}`);
      return Response.json({ error: result.error ?? "SMS send failed" }, { status: 500 });
    }

    console.log(`[n8n] SMS campaign "${body.campaign}" sent → ${body.phone} (${body.userId ?? "?"})`);

    return Response.json({ success: true, campaign: body.campaign, sentTo: body.phone });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[n8n] SMS campaign send failed for ${body.phone}:`, msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
