import { type ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { referrals, users } from "~/lib/schema";
import { eq } from "drizzle-orm";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { referrerId, refereeId } = await request.json();

  if (!referrerId || !refereeId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Ensure referee is the current user (security)
  if (refereeId !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Also generate a referral code for the new user if they don't have one
    const user = await db.query.users.findFirst({
        where: eq(users.id, refereeId)
    });

    if (user && !user.referralCode) {
        const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        await db.update(users).set({ referralCode: newReferralCode }).where(eq(users.id, refereeId));
    }

    await db.insert(referrals).values({
      referrerId,
      refereeId,
    }).onConflictDoNothing();
    
    return Response.json({ success: true });
  } catch (e) {
    console.error("Failed to insert referral:", e);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
