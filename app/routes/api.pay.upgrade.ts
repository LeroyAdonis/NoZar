import { type ActionFunctionArgs, data, redirect } from "react-router";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { subscriptions, transactions, profiles } from "~/lib/schema";
import {
  buildPayFastSignature,
  buildPlusSubscriptionFields,
} from "~/lib/payfast.server";

const SUPPORTED_PLAN = "plus";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { user } = await requireAuth(request);
    const formData = await request.formData();
    const planCode = String(formData.get("planCode") ?? "");

    if (planCode !== SUPPORTED_PLAN) {
      return data(
        { error: "Only Plus is available at MVP launch" },
        { status: 400 },
      );
    }

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

    const [profile] = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);
    const firstName = (profile?.displayName ?? user.name ?? "Trader").split(
      " ",
    )[0];

    const mPaymentId = randomUUID();

    await db.insert(transactions).values({
      userId: user.id,
      listingId: null,
      amount: 9900,
      currency: "ZAR",
      status: "pending",
      providerReference: mPaymentId,
    });

    const baseUrl =
      process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;
    const todayISO = new Date().toISOString().slice(0, 10);

    const payload = buildPlusSubscriptionFields({
      userId: user.id,
      email: user.email,
      firstName,
      mPaymentId,
      baseUrl,
      todayISO,
    });

    const signature = buildPayFastSignature(
      payload.fields,
      process.env.PAYFAST_PASSPHRASE ?? "",
    );

    const signedFields: Array<[string, string]> = [
      ...payload.fields,
      ["signature", signature],
    ];

    const html = renderAutoSubmitForm(payload.actionUrl, signedFields);
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("PayFast upgrade error:", error);
    return redirect("/dashboard/billing?error=payment_failed");
  }
}

function renderAutoSubmitForm(
  actionUrl: string,
  fields: ReadonlyArray<readonly [string, string]>,
): string {
  const inputs = fields
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}" />`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Redirecting to PayFast…</title>
</head>
<body>
  <p>Redirecting to PayFast…</p>
  <form id="pf" method="post" action="${escapeHtml(actionUrl)}">
    ${inputs}
    <noscript><button type="submit">Continue to PayFast</button></noscript>
  </form>
  <script>document.getElementById("pf").submit();</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
