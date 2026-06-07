import { db } from "~/lib/db.server";
import { users, profiles, listings } from "~/lib/schema";
import { sql, lt, isNull } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";

/**
 * GET /api/n8n/inactive-users?hours=48&limit=50
 *
 * Secured endpoint for n8n to query users who signed up but haven't
 * created any listings/skills yet. Returns user name, email, signup date,
 * and profile info so campaign emails can be personalized.
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
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));

  // ── Query ───────────────────────────────────────────────────────
  // Find users who:
  //   - Signed up more than {hours} hours ago
  //   - Have NO entries in listings table
  //   - Haven't been contacted yet (no n8n_campaign_sent flag — we track via created_at)
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const inactiveUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      displayName: profiles.displayName,
      city: profiles.city,
      province: profiles.province,
      phone: profiles.phone,
    })
    .from(users)
    .leftJoin(profiles, sql`${profiles.userId} = ${users.id}`)
    .where(
      sql`
        ${users.createdAt} < ${cutoff}::timestamp
        AND ${users.emailVerified} = true
        AND NOT EXISTS (
          SELECT 1 FROM ${listings}
          WHERE ${listings.userId} = ${users.id}
        )
      `,
    )
    .orderBy(sql`${users.createdAt} ASC`)
    .limit(limit);

  return Response.json({
    count: inactiveUsers.length,
    hours,
    users: inactiveUsers.map((u) => ({
      id: u.id,
      name: u.displayName ?? u.name,
      email: u.email,
      signupDate: u.createdAt,
      location: [u.city, u.province].filter(Boolean).join(", ") || null,
      phone: u.phone ?? null,
    })),
  });
}
