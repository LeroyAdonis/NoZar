# Referral System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a gamified referral system where users can generate a unique referral link and track their successful referrals.

**Architecture:** Database migrations for `users` and `referrals` table, a public `/r/:referralCode` redirect route, and an authenticated `/refer` dashboard.

**Tech Stack:** React Router v7, Drizzle ORM, Neon Postgres.

---

### Task 1: Database Schema Updates

**Files:**
- Modify: `app/lib/schema.ts`
- Create: `drizzle/000X_add_referrals.sql` (generated via drizzle-kit)

**Step 1: Add `referralCode` to `users` and create `referrals` table**
(Follow existing patterns in `app/lib/schema.ts`)

**Step 2: Generate and apply migration**
Run: `npx drizzle-kit generate`
Run: `npx drizzle-kit migrate`

---

### Task 2: Implement `/r/:referralCode` Redirect

**Files:**
- Create: `app/routes/r.$referralCode.tsx`

**Step 1: Implement `loader`**
- Get `referralCode` from params.
- Find `referrerId` from `users` table.
- Set a cookie `referrerId` with the `referrerId`.
- Redirect to `/register`.

---

### Task 3: Implement `api/refer` Endpoint

**Files:**
- Create: `app/routes/api.refer.ts`

**Step 1: Implement `loader`**
- Get current user session.
- Return the `referralCode` for the user.

---

### Task 4: Implement `/refer` Dashboard

**Files:**
- Create: `app/routes/refer.tsx`
- Create: `app/components/refer/referral-actions.tsx`
- Create: `app/components/refer/referral-stats.tsx`

**Step 1: Implement UI**
- Build dashboard with ReferralActions (Copy, WhatsApp) and ReferralStats.
