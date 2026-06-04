import { type ActionFunctionArgs, data } from "react-router";
import { eq } from "drizzle-orm";

import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { subscriptions } from "~/lib/schema";
import { cancelSubscription } from "~/lib/paystack.server";

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);

  const [sub] = await db
    .select({
      code: subscriptions.subscriptionCode,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  if (!sub || sub.status !== "active") {
    return data({ error: "No active subscription to cancel" }, { status: 400 });
  }

  if (sub.code) {
    // Cancel on Paystack side
    try {
      await cancelSubscription(sub.code);
    } catch (err) {
      // If Paystack returns an error (e.g. already cancelled), still update local
      console.warn("Paystack cancel error (non-critical):", err);
    }
  }

  // Update locally regardless
  await db
    .update(subscriptions)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
      subscriptionCode: null,
      subscriptionToken: null,
    })
    .where(eq(subscriptions.userId, user.id));

  return data({ ok: true }, { status: 200 });
}
