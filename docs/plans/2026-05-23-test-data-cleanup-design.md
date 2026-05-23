# Design: Test Data Cleanup for MVP Launch

**Date:** 2026-05-23  
**Status:** Approved  
**Scope:** One-time wipe of all test users, listings, and associated data from the production Neon database and Vercel Blob store, preserving the owner's account.

---

## Context

Before MVP launch the live database contains test users, listings, trades, and uploaded images. The goal is a clean slate — no test data visible to real users — while preserving the owner's account and all data associated with it.

---

## Approach

A single-use Node.js script (`scripts/cleanup-test-data.ts`) run locally via `npx tsx`. It is never added to `package.json` scripts and is deleted or gitignored after use.

```bash
npx tsx scripts/cleanup-test-data.ts --owner-email=you@example.com
```

Flags:
- `--owner-email=<email>` — required; identifies the user to preserve
- `--dry-run` — print counts and blob URLs only, no mutations

The script reads `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` from `.env.local`.

---

## Execution Flow

1. **Resolve owner** — query `users` by email; abort with exit code 1 if not found.
2. **Dry-run summary** — count rows per table (excluding owner's rows), list all blob URLs targeted for deletion; print to console.
3. **Confirmation prompt** — unless `--dry-run`, require user to type `yes` before proceeding.
4. **Blob deletion** — enumerate `listing_images.url` (excluding owner's listings) and `profiles.avatar_url` (excluding owner's profile) where the URL matches the Vercel Blob host; call `del()` from `@vercel/blob` for each. Failures are logged and skipped (non-fatal).
5. **Database wipe (single transaction)** — delete rows in FK-safe order, filtering `WHERE user_id != ownerId` (or equivalent join) at each step:

   | Step | Tables |
   |------|--------|
   | 1 | `push_subscriptions`, `chat_messages`, `meetup_votes`, `readiness_flags`, `ratings`, `thread_read_cursors`, `contact_disclosures`, `payment_events` |
   | 2 | `chat_sessions`, `meetup_spots`, `trade_items`, `trade_proposals`, `messages`, `trade_reports` |
   | 3 | `trades` |
   | 4 | `listing_images`, `listings` |
   | 5 | `boost_tokens`, `subscriptions`, `trust_profiles`, `reputation`, `referrals` |
   | 6 | `profiles` |
   | 7 | `verifications`, `sessions`, `accounts` (Better Auth tables) |
   | 8 | `users` — delete all except owner |

6. **Result summary** — print counts of deleted rows per table.

---

## Safety Model

- **Single transaction** for all DB deletes — any failure rolls back the entire operation.
- **Owner guard** — script aborts early if owner email resolves to zero rows.
- **Dry-run mode** — inspect before committing.
- **Blob failures are non-fatal** — orphaned files don't affect app behaviour; logged for manual cleanup if needed.
- Script is not committed to git with `.env.local` values; should be deleted after use.

---

## What Is Preserved

- Owner's `users` row and their `accounts`, `sessions`, `verifications`
- Owner's `profiles`, `listings`, `listing_images`, `trades`, `messages`
- Owner's `subscriptions`, `trust_profiles`, `boost_tokens`, `referrals`
- Owner's `push_subscriptions`, `chat_sessions`, `ratings`, `reputation`

---

## Out of Scope

- No Drizzle migration is created (this is a one-time operational task, not a schema change).
- No soft-delete / archival table is added to the schema.
- Blob files belonging to the owner are untouched.
