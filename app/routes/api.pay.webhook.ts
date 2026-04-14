import { db } from "~/lib/db.server";
import { subscriptions, boostTokens } from "~/lib/schema";
import { verifyPaystackSignature } from "~/lib/paystack.server";
import { eq, sql } from "drizzle-orm";

export async function action({ request }: { request: Request }) {
  const signature = request.headers.get("x-paystack-signature");
  const body = await request.text();
  
  if (!signature || !verifyPaystackSignature(signature, body)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);
  
  if (event.event === "subscription.create") {
    const { customer, subscription_code, plan } = event.data;
    
    // In a real scenario, you'd link the customer email to a user ID.
    // Assuming email mapping is handled or customer.email is used.
    await db.insert(subscriptions).values({
      userId: event.data.metadata.userId,
      planCode: plan,
      status: "active",
      subscriptionCode: subscription_code,
      email: customer.email,
    }).onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        status: "active",
        subscriptionCode: subscription_code,
        planCode: plan,
      }
    });
  } else if (event.event === "charge.success") {
    // Handle boost token refill
    const { customer, plan } = event.data;
    
    // Logic: Find subscription and update nextPaymentDate
    // Refill tokens based on plan
    const tokenAmounts: Record<string, number> = { plus: 10, business: 50, enterprise: 200 };
    const amount = tokenAmounts[plan] || 0;
    
    await db.update(boostTokens)
      .set({ balance: sql`${boostTokens.balance} + ${amount}`, lastRefillAt: new Date() })
      .where(eq(boostTokens.userId, event.data.metadata.userId));
  } else if (event.event === "subscription.disable") {
      const { customer } = event.data;
      await db.update(subscriptions)
        .set({ status: "cancelled" })
        .where(eq(subscriptions.userId, event.data.metadata.userId));
  }
  
  return new Response("OK", { status: 200 });
}
