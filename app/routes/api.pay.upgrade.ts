import { type ActionFunctionArgs, data, redirect } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { subscriptions } from "~/lib/schema";
import { eq } from "drizzle-orm";
import { initializePaystackTransaction } from "~/lib/paystack.server";

const PLAN_CONFIG = {
  plus: { code: "PLN_1", amount: 100 },
  business: { code: "PLN_2", amount: 200 },
  enterprise: { code: "PLN_3", amount: 500 },
};

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const planId = formData.get("planCode") as string;

  if (!PLAN_CONFIG[planId as keyof typeof PLAN_CONFIG]) {
    return data({ error: "Invalid plan" }, { status: 400 });
  }

  const existingSubscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .limit(1);

  if (existingSubscription.length > 0 && existingSubscription[0].status === "active") {
    return data({ error: "Active subscription already exists" }, { status: 400 });
  }

  const plan = PLAN_CONFIG[planId as keyof typeof PLAN_CONFIG];
  const response = await initializePaystackTransaction(
    user.email,
    plan.amount,
    plan.code,
    user.id
  );

  if (!response.status) {
    return data({ error: "Failed to initialize payment" }, { status: 500 });
  }

  return redirect(response.data.authorization_url);
}
