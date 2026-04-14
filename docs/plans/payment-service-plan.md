# Payment Service Implementation Plan

This document outlines the implementation plan for integrating a payment service into the NoZar platform, focusing on supporting South African Rand (ZAR) and ensuring secure, reliable transactions.

## Overview

The system will leverage a payment gateway provider (e.g., PayFast or similar suitable for South African market) to facilitate ZAR transactions. The architecture will follow a modular approach to allow frontend and backend development to proceed in parallel.

## Architectural Guidelines

This implementation will adhere to the following standards:
- **Frontend Design**: Use `frontend-design` for building a responsive, accessible, and user-friendly checkout experience.
- **Performance**: Apply `vercel-react-best-practices` for efficient data fetching, state management of transaction status, and optimizing rendering during the checkout flow.
- **UX**: Follow `web-design-guidelines` for clear feedback mechanisms (loading states, success/failure notifications, and error handling) and accessibility (ARIA labels, keyboard navigation).

## Implementation Modules

### 1. Database Schema Updates (Drizzle ORM)
*Backend-focused.*
- Create a new `transactions` table to store records of all payment attempts.
- Include fields: `id`, `userId`, `listingId`, `amount`, `currency` (default: 'ZAR'), `status` (pending, completed, failed, refunded), `providerReference` (for gateway correlation), `createdAt`, `updatedAt`.
- Run migrations using `npx drizzle-kit generate` and `npx drizzle-kit migrate`.

### 2. Payment Service Layer (Backend)
*Backend-focused.*
- Implement a `lib/payments.ts` service to encapsulate communication with the payment gateway.
- Methods: `createPaymentIntent(amount, userId, listingId)`, `verifyWebhookSignature(payload, signature)`, `updateTransactionStatus(reference, status)`.

### 3. API Route Setup (React Router)
*Backend-focused.*
- **Action**: `/actions/payment-init` – Initiates a payment session with the provider and records a pending transaction in DB.
- **Loader**: `/api/payment-status/:id` – Checks the current status of a specific transaction.
- **Webhook Endpoint**: `/api/webhooks/payment` – Receives status updates from the payment gateway to update the `transactions` table.

### 4. Frontend Checkout Integration
*Frontend-focused.*
- Create `routes/checkout.$listingId.tsx` for the checkout UI.
- Implement checkout workflow: summary review, payment initiation, redirect/polling for status.
- Implement UI components for handling payment status feedback (Success, Failed, Pending).

## Edge Cases and Risks

| Risk/Edge Case | Strategy |
| :--- | :--- |
| **Failed Transactions** | Implement robust retry mechanisms on the frontend and clear error messages. Log failure details server-side for troubleshooting. |
| **Network Interruption** | Use polling or Webhook updates to ensure the application state eventually reconciles with the payment provider. |
| **Security/Tampering** | **Crucial:** Never trust client-side payment amounts. Always validate amounts against `listing.estimatedValueZar` on the server before initiating payments. Always verify webhook signatures. |
| **ZAR Specifics** | Ensure currency formatting in UI is handled correctly using `Intl.NumberFormat` for 'en-ZA' locale. |

## Parallel Development Path

- **Backend Agent**: Can proceed with steps 1, 2, and 3 simultaneously by defining a strict TypeScript interface (`Transaction`, `PaymentResult`) that the frontend agent will rely on.
- **Frontend Agent**: Can proceed with step 4 by mocking the API responses based on the agreed-upon interface until the backend implementation is complete.
