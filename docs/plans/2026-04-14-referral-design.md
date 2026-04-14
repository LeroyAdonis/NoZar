# Referral System Design

## Overview
Gamified referral system (Approach B).

## Data Model
- `users` table: Added `referralCode` (string, unique, indexed).
- `referrals` table: Tracks `referrerId`, `refereeId`, `createdAt`.

## Routes & Logic
- `/refer`: Referral dashboard.
- `api/refer`: Fetch referral code.
- `/r/:referralCode`: Handle referral link (cookie + redirect).

## Components
- `ReferralDashboard`: Main layout.
- `ReferralActions`: Includes copy and WhatsApp share.
- `ReferralStats`: Referral success widget.
