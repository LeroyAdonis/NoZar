import { type ActionFunctionArgs } from "react-router";
import { eq, sql } from "drizzle-orm";

import { db } from "~/lib/db.server";
import {
  boostTokens,
  paymentEvents,
  subscriptions,
  transactions,
} from "~/lib/schema";
import {
  isPayFastSourceIp,
  validateItnWithPayFast,
  verifyItnSignature,
} from "~/lib/payfast.server";

const TOKEN_REFILL: Record<string, number> = { plus: 10 };

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await request.text();
  const formData = new URLSearchParams(rawBody);
  const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";

  // Gate 1: signature
  if (!verifyItnSignature(formData, passphrase)) {
    return new Response("Invalid signature", { status: 400 });
  }

  // Gate 2: source IP (best-effort behind Vercel proxies)
  const sourceIp = (
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    ""
  )
    .split(",")[0]
    .trim();

  if (sourceIp && !(await isPayFastSourceIp(sourceIp))) {
    return new Response("Source IP not allowed", { status: 400 });
  }

  // Gate 3: amount check against pending transaction
  const mPaymentId = formData.get("m_payment_id");
  const pfPaymentId = formData.get("pf_payment_id");
  const amountGrossStr = formData.get("amount_gross") ?? "0";
  const paymentStatus = formData.get("payment_status") ?? "";
  const userId = formData.get("custom_str1");
  const planCode = formData.get("custom_str2") ?? "";
  const subscriptionToken = formData.get("token");

  if (!mPaymentId || !userId) {
    return new Response("Missing m_payment_id or custom_str1", { status: 400 });
  }

  const expectedAmountCents = Math.round(parseFloat(amountGrossStr) * 100);

  const [txn] = await db
    .select({ amount: transactions.amount })
    .from(transactions)
    .where(eq(transactions.providerReference, mPaymentId))
    .limit(1);

  if (txn && txn.amount !== expectedAmountCents) {
    return new Response("Amount mismatch", { status: 400 });
  }

  // Gate 4: POST-back validation
  const valid = await validateItnWithPayFast(formData);
  if (!valid) {
    return new Response("Failed PayFast validate", { status: 400 });
  }

  // Idempotency: insert into payment_events; conflict on dedup → 200 immediately
  const rawPayload = Object.fromEntries(formData.entries());
  const inserted = await db
    .insert(paymentEvents)
    .values({
      mPaymentId,
      pfPaymentId: pfPaymentId ?? "__missing__",
      userId,
      paymentStatus,
      amountGrossCents: expectedAmountCents,
      rawPayload,
    })
    .onConflictDoNothing({
      target: [paymentEvents.mPaymentId, paymentEvents.pfPaymentId],
    })
    .returning({ id: paymentEvents.id });

  if (inserted.length === 0) {
    return new Response("OK (duplicate)", { status: 200 });
  }

  if (paymentStatus === "COMPLETE") {
    const nextPaymentDate = addMonths(new Date(), 1);

    await db
      .insert(subscriptions)
      .values({
        userId,
        planCode,
        status: "active",
        subscriptionToken: subscriptionToken ?? null,
        email: formData.get("email_address") ?? null,
        nextPaymentDate,
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          status: "active",
          planCode,
          subscriptionToken: subscriptionToken ?? null,
          nextPaymentDate,
          updatedAt: new Date(),
        },
      });

    if (txn) {
      await db
        .update(transactions)
        .set({
          status: "completed",
          providerReference: pfPaymentId ?? mPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(transactions.providerReference, mPaymentId));
    }

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
  } else if (paymentStatus === "CANCELLED") {
    await db
      .update(subscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId));
  }

  return new Response("OK", { status: 200 });
}

function addMonths(d: Date, months: number): Date {
  const result = new Date(d);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}
