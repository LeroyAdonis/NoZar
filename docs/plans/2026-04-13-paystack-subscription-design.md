# Paystack Subscription Integration Design

**Date:** 2026-04-13  
**Status:** Approved  
**Scope:** Paystack subscription system for NoZar (Free, Trader Plus, Business, Enterprise)

---

## 1. Objectives
- Implement a robust recurring billing system using Paystack for South African users (ZAR).
- Enforce plan-based listing limits (5, 20, 100, Unlimited).
- Manage monthly boost tokens for upgraded tiers.
- Provide a simple "Billing Node" UI in the dashboard.

## 2. Data Model

### `subscriptions` table
| Field | Type | Description |
|-------|------|-------------|
| id | serial | Primary key |
| userId | text | References `users.id` (unique) |
| planCode | text | e.g. "plus", "business", "enterprise" |
| status | text | "active", "cancelled", "non-renewing", "expired" |
| subscriptionCode | text | Paystack subscription code |
| email | text | Customer email at Paystack |
| nextPaymentDate | timestamp | Next renewal date |
| createdAt | timestamp | Auto-generated |
| updatedAt | timestamp | Auto-generated |

### `boost_tokens` table
| Field | Type | Description |
|-------|------|-------------|
| userId | text | References `users.id` (unique) |
| balance | integer | Current tokens available |
| lastRefillAt | timestamp | When the last monthly allocation was added |

## 3. Architecture & Flows

### Upgrade / Checkout Flow (Redirect)
1. **Trigger**: User clicks "Upgrade Node" on Pricing or Profile.
2. **Endpoint**: `POST /api/pay/upgrade { planId: string }`
3. **Logic**:
   - Check if the user already has an active subscription.
   - Initialize a Paystack transaction with the `plan` code.
   - Return the `authorization_url`.
4. **Redirect**: User completes payment on Paystack's hosted page.

### Webhook Handling
1. **Endpoint**: `POST /api/pay/webhook`
2. **Security**: Verify Paystack HMAC signature.
3. **Events**:
   - `subscription.create`: Create entry in `subscriptions` table.
   - `charge.success`: Update `nextPaymentDate` and refill `boost_tokens` if needed.
   - `subscription.disable`: Mark status as "cancelled" or "expired".

### Limits Enforcement
- **Listing Count Check**:
  - Before a user adds a new asset in `/dashboard/add`, a loader or action checks their current `plan`.
  - If `count(listings) >= limit`, the user is redirected to the "Billing Node" with an upgrade prompt.

## 4. Components & Services

### `PaystackClient` (`app/lib/paystack.server.ts`)
- `initializeTransaction(email, amount, planCode)`
- `verifyWebhook(signature, body)`
- `cancelSubscription(subscriptionCode)`

### `BillingNode` UI (`app/routes/dashboard/billing.tsx`)
- Display current tier badge.
- List active limits and usage (e.g., "5/5 listings used").
- "Upgrade" buttons for higher tiers.
- "Manage Subscription" (External link to Paystack if available or a Cancel button).

## 5. Testing & Verification
- **E2E**: Verify that a "Free" user cannot add a 6th listing.
- **Unit**: Mock Paystack webhooks to ensure the `subscriptions` table updates correctly.
- **Manual**: Test the redirect flow in Paystack Sandbox.

---

## 6. Success Criteria
- [ ] Successful redirection to Paystack for upgrades.
- [ ] Subscriptions persist in the database after payment.
- [ ] Users are blocked from adding listings beyond their tier limit.
- [ ] Boost tokens are correctly allocated on successful payments.
