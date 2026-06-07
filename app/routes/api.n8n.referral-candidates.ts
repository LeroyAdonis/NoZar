import { db } from "~/lib/db.server";
import { users, listings, trustProfiles } from "~/lib/schema";
import { sql, and, gt } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";

/**
 * GET /api/n8n/referral-candidates?minTrades=1&limit=50
 *
 * Finds users who are good referral candidates — users with
 * completed trades or multiple listings. Ordered by activity
 * (most trades first, then most listings).
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
  const minTrades = Math.max(0, parseInt(url.searchParams.get("minTrades") ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));

  // ── Query ───────────────────────────────────────────────────────
  // Find users with completedTrades > 0 or multiple listings,
  // ordered by activity (completion count desc, listing count desc)

  const referralCandidates = await db.execute(
    sql`
      WITH listing_counts AS (
        SELECT user_id, COUNT(*) AS cnt
        FROM ${listings}
        GROUP BY user_id
      )
      SELECT
        u.id,
        u.name,
        u.email,
        COALESCE(tp.completed_trades, 0) AS "completedTrades",
        COALESCE(lc.cnt, 0)::int AS "listingCount"
      FROM ${users} u
      LEFT JOIN ${trustProfiles} tp ON tp.user_id = u.id
      LEFT JOIN listing_counts lc ON lc.user_id = u.id
      WHERE
        (COALESCE(tp.completed_trades, 0) > ${minTrades - 1}
         OR COALESCE(lc.cnt, 0) >= 2)
      ORDER BY
        tp.completed_trades DESC NULLS LAST,
        lc.cnt DESC NULLS LAST,
        u.name ASC
      LIMIT ${limit}
    `,
  );

  const rows = referralCandidates.rows ?? [];

  return Response.json({
    count: rows.length,
    users: rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      completedTrades: Number(r.completedTrades ?? 0),
      listingCount: Number(r.listingCount ?? 0),
    })),
  });
}
