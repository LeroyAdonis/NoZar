import { db } from "~/lib/db.server";
import { campaignLog } from "~/lib/schema";
import { brevo } from "~/lib/brevo.server";
import { eq, and } from "drizzle-orm";
import type { ActionFunctionArgs } from "react-router";

/**
 * POST /api/n8n/campaign-sms
 *
 * Sends a campaign SMS to a specific user on behalf of n8n.
 * Uses Brevo's transactional SMS API.
 * Logs every send attempt to campaign_log for dedup + analytics.
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

  // ── Dedup: check if already sent to this user for this campaign ──
  if (body.userId) {
    const existing = await db
      .select({ id: campaignLog.id })
      .from(campaignLog)
      .where(
        and(
          eq(campaignLog.userId, body.userId),
          eq(campaignLog.campaign, body.campaign),
          eq(campaignLog.channel, "sms"),
          eq(campaignLog.status, "sent"),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`[n8n] SKIP SMS campaign "${body.campaign}" → ${body.phone} (already sent)`);
      return Response.json({
        success: true,
        skipped: true,
        reason: "already_sent",
        campaign: body.campaign,
        sentTo: body.phone,
      });
    }
  }

  // ── Campaign templates ──────────────────────────────────────────
  const campaigns: Record<string, string> = {
    "trade-followup-v1": `Hey ${userName}! Your trade (${tradeInfo}) has been accepted but not completed. Need help? Reply or check it now at nozar.co.za`,
    "referral-v1": `Hey ${userName}! You're one of NoZar's top traders. Invite a friend and get priority matching! Share your link: nozar.co.za/invite`,
  };

  const template = campaigns[body.campaign];
  if (!template) {
    return Response.json({ error: `Unknown campaign: ${body.campaign}` }, { status: 400 });
  }

  // ── Send + Log ──────────────────────────────────────────────────
  try {
    const result = await brevo.sendSms(body.phone, template);

    if (!result.success) {
      console.error(`[n8n] SMS campaign "${body.campaign}" failed for ${body.phone}: ${result.error}`);

      // Log failure
      if (body.userId) {
        await db.insert(campaignLog).values({
          userId: body.userId,
          campaign: body.campaign,
          channel: "sms",
          status: "failed",
          recipient: body.phone,
          errorMessage: result.error ?? "SMS send failed",
          tradeId: body.tradeId ? Number(body.tradeId) : null,
        }).catch((logErr) => {
          console.error(`[n8n] Failed to log SMS failure:`, logErr);
        });
      }

      return Response.json({ error: result.error ?? "SMS send failed" }, { status: 500 });
    }

    console.log(`[n8n] SMS campaign "${body.campaign}" sent → ${body.phone} (${body.userId ?? "?"})`);

    // Log success
    if (body.userId) {
      await db.insert(campaignLog).values({
        userId: body.userId,
        campaign: body.campaign,
        channel: "sms",
        status: "sent",
        recipient: body.phone,
        tradeId: body.tradeId ? Number(body.tradeId) : null,
      });
    }

    return Response.json({ success: true, campaign: body.campaign, sentTo: body.phone });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[n8n] SMS campaign send failed for ${body.phone}:`, msg);

    // Log failure
    if (body.userId) {
      await db.insert(campaignLog).values({
        userId: body.userId,
        campaign: body.campaign,
        channel: "sms",
        status: "failed",
        recipient: body.phone,
        errorMessage: msg,
        tradeId: body.tradeId ? Number(body.tradeId) : null,
      }).catch((logErr) => {
        console.error(`[n8n] Failed to log SMS failure:`, logErr);
      });
    }

    return Response.json({ error: msg }, { status: 500 });
  }
}
