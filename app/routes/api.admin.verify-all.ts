import { type ActionFunctionArgs, data } from "react-router";
import { eq, and } from "drizzle-orm";

import { db } from "~/lib/db.server";
import { users, accounts } from "~/lib/schema";

const ADMIN_TOKEN = process.env.ADMIN_VERIFICATION_TOKEN;

export async function action({ request }: ActionFunctionArgs) {
  // Secure this endpoint with an admin token
  const authHeader = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!ADMIN_TOKEN || authHeader !== ADMIN_TOKEN) {
    return data({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  // Find unverified credential (email+password) users
  const unverified = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .innerJoin(accounts, eq(accounts.userId, users.id))
    .where(
      and(
        eq(accounts.providerId, "credential"),
        eq(users.emailVerified, false),
      ),
    );

  const { auth: authLib } = await import("~/lib/auth.server");

  const results: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (const user of unverified) {
    try {
      await authLib.api.sendVerificationEmail({
        body: {
          email: user.email,
          callbackURL: "/dashboard",
        },
      });

      results.push({ email: user.email, ok: true });
    } catch (err) {
      results.push({
        email: user.email,
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return data(
    {
      total: unverified.length,
      sent,
      failed,
      results,
    },
    { status: 200 },
  );
}
