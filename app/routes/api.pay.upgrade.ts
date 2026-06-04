import { type ActionFunctionArgs, data, redirect } from "react-router";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { subscriptions, transactions } from "~/lib/schema";
import {
  initializeTransaction,
  PLUS_PRICE_CENTS,
  PLUS_PLAN_CODE,
} from "~/lib/paystack.server";

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);

  // Accept both JSON (mobile) and form-encoded (web)
  const contentType = request.headers.get("content-type") ?? "";
  let planCode = "";
  if (contentType.includes("application/json")) {
    const body = await request.json() as { planCode?: string };
    planCode = body.planCode ?? "";
  } else {
    const formData = await request.formData();
    planCode = String(formData.get("planCode") ?? "");
  }

  if (planCode !== PLUS_PLAN_CODE) {
    return data(
      { error: "Only Plus is available at MVP launch" },
      { status: 400 },
    );
  }

  // Check no active subscription already
  const [existing] = await db
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  if (existing?.status === "active") {
    return data(
      { error: "You already have an active subscription" },
      { status: 400 },
    );
  }

  // Generate internal reference & create pending transaction
  const reference = randomUUID();
  await db.insert(transactions).values({
    userId: user.id,
    listingId: null,
    amount: PLUS_PRICE_CENTS,
    currency: "ZAR",
    status: "pending",
    providerReference: reference,
  });

  const baseUrl =
    process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;

  // Initialize Paystack transaction with plan
  const initData = await initializeTransaction({
    email: user.email,
    amount: PLUS_PRICE_CENTS,
    reference,
    callbackUrl: `${baseUrl}/dashboard/billing?ps=success`,
    metadata: { userId: user.id, planCode },
  });

  // Return the authorization URL — frontend handles the redirect
  return data(
    { ok: true, redirectUrl: initData.authorization_url },
    { status: 200 },
  );
}
