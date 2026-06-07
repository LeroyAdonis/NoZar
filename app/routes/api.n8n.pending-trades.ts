import { db } from "~/lib/db.server";
import { trades, users, listings, profiles } from "~/lib/schema";
import { sql } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";

/**
 * GET /api/n8n/pending-trades?hours=48
 *
 * Finds trades with status="accepted" that haven't been completed
 * within the specified number of hours. Returns user details for
 * both parties involved so n8n can follow up via SMS/email.
 *
 * Auth: Bearer token in Authorization header matching N8N_API_KEY env var.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  // ── Auth ────────────────────────────────────────────────────────
  const apiKey = process.env.N8N_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "N8N_API_KEY not configured on server" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== apiKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Params ──────────────────────────────────────────────────────
  const url = new URL(request.url);
  const hours = Math.max(1, parseInt(url.searchParams.get("hours") ?? "48", 10) || 48);

  // ── Query trades ─────────────────────────────────────────────────
  // Find trades with status "accepted" that are older than {hours}
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Use raw SQL query for the multi-join to avoid Drizzle alias complexity
  const pendingTrades = await db.execute(
    sql`
      SELECT
        t.id AS "tradeId",
        t.initiator_id AS "initiatorId",
        t.responder_id AS "responderId",
        t.updated_at AS "updatedAt",
        l.title AS "listingTitle",
        initiator.name AS "initiatorName",
        initiator.email AS "initiatorEmail",
        responder.name AS "responderName",
        responder.email AS "responderEmail",
        initiator_profile.phone AS "initiatorPhone",
        responder_profile.phone AS "responderPhone"
      FROM ${trades} t
      INNER JOIN ${users} initiator ON initiator.id = t.initiator_id
      INNER JOIN ${users} responder ON responder.id = t.responder_id
      INNER JOIN ${listings} l ON l.id = t.listing_id
      LEFT JOIN ${profiles} initiator_profile ON initiator_profile.user_id = t.initiator_id
      LEFT JOIN ${profiles} responder_profile ON responder_profile.user_id = t.responder_id
      WHERE t.status = 'accepted'
        AND t.updated_at < ${cutoff.toISOString()}::timestamp
      ORDER BY t.updated_at ASC
    `,
  );

  const rows = pendingTrades.rows ?? [];

  return Response.json({
    count: rows.length,
    hours,
    trades: rows.map((r: Record<string, unknown>) => ({
      tradeId: r.tradeId,
      initiatorId: r.initiatorId,
      responderId: r.responderId,
      initiatorName: r.initiatorName,
      responderName: r.responderName,
      initiatorEmail: r.initiatorEmail,
      responderEmail: r.responderEmail,
      initiatorPhone: r.initiatorPhone ?? null,
      responderPhone: r.responderPhone ?? null,
      listingTitle: r.listingTitle,
      updatedAt: r.updatedAt,
    })),
  });
}
