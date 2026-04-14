# Paystack Subscription Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Paystack for recurring subscriptions and enforce plan-based listing limits.

**Architecture:** Use Paystack Redirect flow for payments and a webhook for asynchronous persistence. Enforce limits in the dashboard's "Add Asset" action.

**Tech Stack:** React Router v7, Drizzle ORM, Neon PostgreSQL, Paystack API, Better Auth.

---

### Task 1: Database Schema

**Files:**
- Modify: `app/lib/schema.ts`

**Step 1: Define `subscriptions` and `boost_tokens` tables**

```typescript
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  planCode: text("plan_code").notNull(), // plus | business | enterprise
  status: text("status").notNull(), // active | cancelled | expired
  subscriptionCode: text("subscription_code"),
  email: text("email"),
  nextPaymentDate: timestamp("next_payment_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const boostTokens = pgTable("boost_tokens", {
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  lastRefillAt: timestamp("last_refill_at").notNull().defaultNow(),
});
```

**Step 2: Generate and apply migrations**

Run: `npx drizzle-kit generate`
Run: `npx drizzle-kit push`

**Step 3: Commit**

```bash
git add app/lib/schema.ts drizzle/*
git commit -m "feat: add subscription and boost_tokens tables" --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
```

---

### Task 2: Paystack Server Client

**Files:**
- Create: `app/lib/paystack.server.ts`

**Step 1: Implement Paystack utility**

```typescript
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function initializePaystackTransaction(email: string, amountZar: number, planCode: string) {
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
    }),
  });
  return response.json();
}

export function verifyPaystackSignature(signature: string, body: string) {
  const crypto = require("crypto");
  const hash = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY).update(body).digest("hex");
  return hash === signature;
}
```

**Step 2: Commit**

```bash
git add app/lib/paystack.server.ts
git commit -m "feat: add paystack server utility" --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
```

---

### Task 3: Upgrade API Route

**Files:**
- Create: `app/routes/api.pay.upgrade.ts`
- Modify: `app/routes.ts`

**Step 1: Implement upgrade action**

```typescript
import { requireAuth } from "~/lib/auth.server";
import { initializePaystackTransaction } from "~/lib/paystack.server";

export async function action({ request }: { request: Request }) {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const planCode = formData.get("planCode") as string;
  
  const amountMap: Record<string, number> = {
    plus: 29,
    business: 99,
    enterprise: 249
  };

  const data = await initializePaystackTransaction(user.email, amountMap[planCode], planCode);
  if (data.status) {
    return Response.redirect(data.data.authorization_url);
  }
  return { error: "Failed to initialize payment" };
}
```

**Step 2: Add route to `app/routes.ts`**

```typescript
route("api/pay/upgrade", "routes/api.pay.upgrade.ts"),
```

**Step 3: Commit**

```bash
git add app/routes/api.pay.upgrade.ts app/routes.ts
git commit -m "feat: add paystack upgrade route" --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
```

---

### Task 4: Webhook Handler

**Files:**
- Create: `app/routes/api.pay.webhook.ts`

**Step 1: Implement webhook logic**

```typescript
import { db } from "~/lib/db.server";
import { subscriptions } from "~/lib/schema";
import { verifyPaystackSignature } from "~/lib/paystack.server";
import { eq } from "drizzle-orm";

export async function action({ request }: { request: Request }) {
  const signature = request.headers.get("x-paystack-signature");
  const body = await request.text();
  
  if (!signature || !verifyPaystackSignature(signature, body)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);
  if (event.event === "subscription.create") {
    const { customer, subscription_code, plan } = event.data;
    // Update DB with subscription details
  }
  
  return new Response("OK", { status: 200 });
}
```

**Step 2: Commit**

```bash
git add app/routes/api.pay.webhook.ts
git commit -m "feat: add paystack webhook handler" --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
```

---

### Task 5: Limits Enforcement

**Files:**
- Modify: `app/routes/dashboard/add.tsx`

**Step 1: Implement limit check**

```typescript
const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id));
const [listingCount] = await db.select({ count: count() }).from(listings).where(eq(listings.userId, user.id));

const limits: Record<string, number> = { free: 5, plus: 20, business: 100, enterprise: Infinity };
const currentPlan = sub?.planCode || "free";

if (listingCount.count >= limits[currentPlan]) {
  return redirect("/dashboard/billing?error=limit_exceeded");
}
```

**Step 2: Commit**

```bash
git add app/routes/dashboard/add.tsx
git commit -m "feat: enforce plan-based listing limits" --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
```

---

### Task 6: Billing UI

**Files:**
- Create: `app/routes/dashboard/billing.tsx`

**Step 1: Implement Billing page**

Show current plan, usage, and upgrade buttons.

**Step 2: Commit**

```bash
git add app/routes/dashboard/billing.tsx
git commit -m "feat: add billing dashboard page" --trailer "Co-authored-by: Junie <junie@jetbrains.com>"
```
