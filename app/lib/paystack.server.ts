import crypto from "node:crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function initializePaystackTransaction(email: string, amountZar: number, planCode: string, userId: string) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not defined");
  }
  
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amountZar * 100, // Paystack uses kobo (cents)
      plan: planCode,
      callback_url: `${process.env.BETTER_AUTH_URL}/dashboard/billing`,
      metadata: {
        userId,
      }
    }),
  });
  return response.json();
}

export function verifyPaystackSignature(signature: string, body: string) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not defined");
  }
  const hash = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY).update(body).digest("hex");
  return hash === signature;
}
