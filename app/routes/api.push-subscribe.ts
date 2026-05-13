import { data } from "react-router";
import type { Route } from "./+types/api.push-subscribe";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { pushSubscriptions } from "~/lib/schema";
import { eq, and } from "drizzle-orm";

interface PushSubscribeBody {
  subscription?: PushSubscriptionJSON;
  action?: string;
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const body = (await request.json()) as PushSubscribeBody;

  if (body.action === "unsubscribe" && body.subscription?.endpoint) {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, user.id),
          eq(pushSubscriptions.endpoint, body.subscription.endpoint),
        ),
      );
    return data({ ok: true });
  }

  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return data({ error: "Invalid subscription" }, { status: 400 });
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: user.id,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    });

  return data({ ok: true });
}
