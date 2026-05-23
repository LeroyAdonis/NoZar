import { type ActionFunctionArgs, data } from "react-router";
import { eq } from "drizzle-orm";

import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { subscriptions } from "~/lib/schema";
import { cancelSubscription } from "~/lib/payfast.server";

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);

  const [sub] = await db
    .select({
      token: subscriptions.subscriptionToken,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  if (!sub || sub.status !== "active") {
    return data({ error: "No active subscription to cancel" }, { status: 400 });
  }
  if (!sub.token) {
    return data(
      { error: "Subscription is missing a PayFast token — contact support" },
      { status: 400 },
    );
  }

  const payfastResult = await cancelSubscription(sub.token);

  // PayFast will fire an ITN with payment_status=CANCELLED; the webhook
  // updates subscriptions.status. We optimistically mark it cancelled now
  // for immediate UI feedback.
  await db
    .update(subscriptions)
    .set({ status: "cancelled", updatedAt: new Date(), subscriptionToken: null })
    .where(eq(subscriptions.userId, user.id));

  return data({ ok: true }, { status: 200 });
}
