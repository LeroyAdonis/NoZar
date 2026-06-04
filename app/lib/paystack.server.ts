import crypto from "node:crypto";

const PAYSTACK_API = "https://api.paystack.co";

// ─── Auth ───────────────────────────────────────────────────────

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY not set");
  return key;
}

export function publicKey(): string {
  const key = process.env.PAYSTACK_PUBLIC_KEY;
  if (!key) throw new Error("PAYSTACK_PUBLIC_KEY not set");
  return key;
}

// ─── Transport ───────────────────────────────────────────────────

async function apiPost<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(`Paystack error: ${json.message ?? res.status}`);
  }
  return json.data as T;
}

async function apiGet<T = Record<string, unknown>>(
  path: string,
): Promise<T> {
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const json = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(`Paystack error: ${json.message ?? res.status}`);
  }
  return json.data as T;
}

// ─── Types ───────────────────────────────────────────────────────

export type InitTransactionData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type VerificationData = {
  status: string; // "success" | "failed" | "abandoned"
  amount: number;
  currency: string;
  paid_at: string;
  reference: string;
  authorization: {
    authorization_code: string;
    card_type: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    recurring: boolean;
  };
  plan: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

export type SubscriptionData = {
  id: number;
  subscription_code: string;
  status: string; // "active" | "cancelled" | "non-renewing" | "expired"
  next_payment_date: string;
  plan: { plan_code: string; amount: number; interval: string };
  authorization: { authorization_code: string; channel: string };
  customer: { id: number; email: string };
  createdAt: string;
};

export type PlanData = {
  id: number;
  plan_code: string;
  name: string;
  amount: number;
  interval: string;
  currency: string;
  domain: string; // "test" | "live"
};

// ─── Transaction helpers ─────────────────────────────────────────

export async function initializeTransaction(input: {
  email: string;
  amount: number; // in cents (ZAR)
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<InitTransactionData> {
  return apiPost<InitTransactionData>("/transaction/initialize", {
    email: input.email,
    amount: input.amount,
    currency: "ZAR",
    reference: input.reference,
    callback_url: input.callbackUrl,
    plan: process.env.PAYSTACK_PLAN_CODE!,
    metadata: {
      ...input.metadata,
      provider: "paystack",
    },
  });
}

export async function verifyTransaction(
  reference: string,
): Promise<VerificationData> {
  return apiGet<VerificationData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}

// ─── Subscription helpers ────────────────────────────────────────

export async function cancelSubscription(
  subscriptionCode: string,
): Promise<void> {
  await apiPost(`/subscription/${encodeURIComponent(subscriptionCode)}`, {
    status: "cancelled",
  });
}

export async function listPlans(): Promise<PlanData[]> {
  return apiGet<PlanData[]>(`/plan?perPage=50`);
}

// ─── Webhook verification ────────────────────────────────────────

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) return false;
  const hash = crypto
    .createHmac("sha512", secretKey())
    .update(rawBody)
    .digest("hex");
  if (hash.length !== signatureHeader.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(hash, "utf8"),
    Buffer.from(signatureHeader, "utf8"),
  );
}

// ─── Billing ─────────────────────────────────────────────────────

export const PLUS_PRICE_CENTS = 9900; // R99 in cents — keep in sync with billing.tsx
export const PLUS_PLAN_CODE = "plus";
export const PLUS_PRICE_ZAR = 99;
