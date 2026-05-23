import { randomBytes } from "node:crypto";
import { type ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { referrals, users } from "~/lib/schema";
import { eq } from "drizzle-orm";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  const { user } = await requireAuth(request);

  const { referrerId, refereeId } = await request.json();

  if (!referrerId || !refereeId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Prevent self-referral
  if (referrerId === refereeId) {
    return Response.json({ error: "Cannot refer yourself" }, { status: 400 });
  }

  // Ensure referee is the current user (security)
  if (refereeId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, refereeId),
    });

    if (currentUser && !currentUser.referralCode) {
      const newReferralCode = randomBytes(4).toString("hex").toUpperCase();
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
