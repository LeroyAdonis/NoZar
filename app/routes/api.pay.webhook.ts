import { type ActionFunctionArgs } from "react-router";
import { eq, sql } from "drizzle-orm";

import { db } from "~/lib/db.server";
import {
  boostTokens,
  paymentEvents,
  subscriptions,
  transactions,
} from "~/lib/schema";
import { verifyWebhookSignature } from "~/lib/paystack.server";

const TOKEN_REFILL: Record<string, number> = { plus: 10 };

// ─── Paystack webhook event types ────────────────────────────────

type ChargeSuccessPayload = {
  id: number;
  reference: string;
  status: string; // "success"
  amount: number; // in cents
  currency: string;
  paid_at: string;
  authorization: {
    authorization_code: string;
    card_type: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    recurring: boolean;
  };
  plan: { plan_code: string } | null;
  metadata: { userId?: string; planCode?: string } | null;
  customer: { id: number; email: string };
  subscription_code?: string;
};

type SubscriptionPayload = {
  id: number;
  subscription_code: string;
  status: string; // "active" | "cancelled" | "non-renewing" | "expired"
  next_payment_date: string;
  customer: { id: number; email: string };
  plan: { plan_code: string; amount: number; interval: string };
  authorization: { authorization_code: string; channel: string };
};

type InvoicePayload = {
  id: number;
  reference: string;
  status: string;
  amount: number;
  paid_at?: string;
  subscription: { subscription_code: string };
  transaction: { reference: string } | null;
  customer: { id: number; email: string };
};

type PaystackWebhookEvent =
  | { event: "charge.success"; data: ChargeSuccessPayload }
  | { event: "subscription.create"; data: SubscriptionPayload }
  | { event: "subscription.not_renew"; data: SubscriptionPayload }
  | { event: "subscription.disable"; data: SubscriptionPayload }
  | { event: "subscription.expiring_cards"; data: SubscriptionPayload }
  | { event: "invoice.update"; data: InvoicePayload }
  | { event: "invoice.payment_failed"; data: InvoicePayload };

// ─── Handler ─────────────────────────────────────────────────────

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Gate 1: Verify HMAC-SHA512 signature
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  switch (event.event) {
    case "charge.success":
      await handleChargeSuccess(event.data);
      break;
    case "subscription.create":
      await handleSubscriptionCreate(event.data);
      break;
    case "subscription.not_renew":
      await handleSubscriptionNotRenew(event.data);
      break;
    case "subscription.disable":
      await handleSubscriptionDisable(event.data);
      break;
    case "subscription.expiring_cards":
      // Log for monitoring but don't change status
      break;
    case "invoice.update":
      await handleInvoiceUpdate(event.data);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data);
      break;
    default:
      // Unknown event — acknowledge receipt so Paystack doesn't retry
      break;
  }

  return new Response("OK", { status: 200 });
}

// ─── Event handlers ──────────────────────────────────────────────

async function handleChargeSuccess(data: ChargeSuccessPayload) {
  const metadata = data.metadata ?? {};
  const userId = metadata.userId ?? "";

  // Find our pending transaction by reference
  const [txn] = await db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(eq(transactions.providerReference, data.reference))
    .limit(1);

  if (!txn) {
    // Could be a non-subscription payment — log and skip
    return;
  }

  const planCode = metadata.planCode ?? "plus";
  const authorizationCode = data.authorization?.authorization_code ?? null;
  const subscriptionCode = data.subscription_code ?? null;

  // Log the payment event (idempotent via unique constraint)
  await db
    .insert(paymentEvents)
    .values({
      mPaymentId: data.reference,
      pfPaymentId: String(data.id),
      userId,
      paymentStatus: "COMPLETE",
      amountGrossCents: Math.round(data.amount),
      rawPayload: data as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({
      target: [paymentEvents.mPaymentId, paymentEvents.pfPaymentId],
    });

  // Activate subscription
  const nextPaymentDate = new Date();
  nextPaymentDate.setUTCMonth(nextPaymentDate.getUTCMonth() + 1);

  await db
    .insert(subscriptions)
    .values({
      userId,
      planCode,
      status: "active",
      subscriptionCode,
      subscriptionToken: authorizationCode,
      email: data.customer.email,
      nextPaymentDate,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        status: "active",
        planCode,
        subscriptionCode,
        subscriptionToken: authorizationCode,
        email: data.customer.email,
        nextPaymentDate,
        updatedAt: new Date(),
      },
    });

  // Mark transaction as completed
  await db
    .update(transactions)
    .set({
      status: "completed",
      providerReference: data.reference,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, txn.id));

  // Refill boost tokens
  const refill = TOKEN_REFILL[planCode] ?? 0;
  if (refill > 0) {
    await db
      .insert(boostTokens)
      .values({ userId, balance: refill, lastRefillAt: new Date() })
      .onConflictDoUpdate({
        target: boostTokens.userId,
        set: {
          balance: sql`${boostTokens.balance} + ${refill}`,
          lastRefillAt: new Date(),
        },
      });
  }
}

async function handleSubscriptionCreate(
  data: SubscriptionPayload,
) {
  // Subscription was created after successful initial payment.
  // The subscription_code might already have been stored via
  // charge.success, but if not, find by auth code.
  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.subscriptionCode, data.subscription_code))
    .limit(1);

  if (existing) return; // Already updated via charge.success

  await db
    .update(subscriptions)
    .set({
      subscriptionCode: data.subscription_code,
      nextPaymentDate: new Date(data.next_payment_date),
      updatedAt: new Date(),
    })
    .where(
      eq(
        subscriptions.subscriptionToken,
        data.authorization.authorization_code,
      ),
    );
}

async function handleSubscriptionNotRenew(
  data: SubscriptionPayload,
) {
  // User cancelled — subscription will not auto-renew
  await db
    .update(subscriptions)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.subscriptionCode, data.subscription_code));
}

async function handleSubscriptionDisable(
  data: SubscriptionPayload,
) {
  // Subscription disabled (payment failures, etc.)
  await db
    .update(subscriptions)
    .set({
      status: "expired",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.subscriptionCode, data.subscription_code));
}

async function handleInvoiceUpdate(data: InvoicePayload) {
  // Update next payment date based on invoice data
  if (data.status === "paid" && data.paid_at) {
    const nextPaymentDate = new Date();
    nextPaymentDate.setUTCMonth(nextPaymentDate.getUTCMonth() + 1);

    await db
      .update(subscriptions)
      .set({
        nextPaymentDate,
        updatedAt: new Date(),
      })
      .where(
        eq(subscriptions.subscriptionCode, data.subscription.subscription_code),
      );

    // Refill tokens on renewal as well
    const [sub] = await db
      .select({ planCode: subscriptions.planCode, userId: subscriptions.userId })
      .from(subscriptions)
      .where(
        eq(subscriptions.subscriptionCode, data.subscription.subscription_code),
      )
      .limit(1);

    if (sub) {
      const refill = TOKEN_REFILL[sub.planCode] ?? 0;
      if (refill > 0) {
        await db
          .insert(boostTokens)
          .values({ userId: sub.userId, balance: refill, lastRefillAt: new Date() })
          .onConflictDoUpdate({
            target: boostTokens.userId,
            set: {
              balance: sql`${boostTokens.balance} + ${refill}`,
              lastRefillAt: new Date(),
            },
          });
      }
    }
  }
}

async function handleInvoicePaymentFailed(
  data: InvoicePayload,
) {
  // Log the failure — subscription will be disabled after retries
  await db
    .update(subscriptions)
    .set({
      status: "expired",
      updatedAt: new Date(),
    })
    .where(
      eq(subscriptions.subscriptionCode, data.subscription.subscription_code),
    );
}
