# Test Data Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Write and run a one-time script (`scripts/cleanup-test-data.ts`) that permanently deletes all test users, their listings, images, and associated data from the live Neon database and Vercel Blob store, preserving the owner's account and all related data.

**Architecture:** A single TypeScript script run locally via `npx tsx`. It reads env vars from `.env.local` via `dotenv/config`, uses the `neon()` HTTP client for a batched transaction, and calls `@vercel/blob`'s `del()` for image cleanup. Includes a `--dry-run` mode and a `yes` confirmation gate before any mutations.

**Tech Stack:** `@neondatabase/serverless` (neon HTTP client + transaction batching), `@vercel/blob` (del), `dotenv`, `tsx` (runtime), existing `app/lib/schema.ts` (for table/column names only — no Drizzle ORM used in the script to keep FK-safe ordering explicit)

---

### Task 1: Scaffold the script — arg parsing, env loading, owner resolution

**Files:**
- Create: `scripts/cleanup-test-data.ts`

**Step 1: Create the file**

```typescript
// scripts/cleanup-test-data.ts
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import * as readline from "readline/promises";

// ── CLI args ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const ownerEmail = args.find((a) => a.startsWith("--owner-email="))?.split("=")[1];
const isDryRun = args.includes("--dry-run");

if (!ownerEmail) {
  console.error("ERROR: --owner-email=<email> is required");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set. Is .env.local loaded?");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// ── Resolve owner ───────────────────────────────────────────────
async function resolveOwner(): Promise<string> {
  const rows = await sql`SELECT id FROM users WHERE email = ${ownerEmail} LIMIT 1`;
  if (rows.length === 0) {
    console.error(`ERROR: No user found with email "${ownerEmail}". Aborting.`);
    process.exit(1);
  }
  return rows[0].id as string;
}

async function main() {
  console.log(`\n🔍 Resolving owner account for: ${ownerEmail}`);
  const ownerId = await resolveOwner();
  console.log(`✅ Owner found — user ID: ${ownerId}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
```

**Step 2: Verify it runs**

```bash
npx tsx --env-file=.env.local scripts/cleanup-test-data.ts --owner-email=your@email.com --dry-run
```

Expected: `✅ Owner found — user ID: <some-id>`  
If you see "No user found" — double-check the email matches exactly what's in the DB.

**Step 3: Commit scaffold**

```bash
git add scripts/cleanup-test-data.ts
git commit -m "chore: scaffold test data cleanup script"
```

---

### Task 2: Add dry-run summary (row counts + blob URL collection)

**Files:**
- Modify: `scripts/cleanup-test-data.ts`

**Step 1: Replace the body of `main()` after owner resolution with count queries + blob collection**

```typescript
  // ── Count rows to be deleted ────────────────────────────────
  console.log("\n📊 Counting rows to delete (excluding owner)...\n");

  const counts = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM users          WHERE id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM profiles       WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM listings       WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE user_id != ${ownerId})`,
    sql`SELECT COUNT(*)::int AS n FROM trades         WHERE initiator_id != ${ownerId} AND responder_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM messages       WHERE trade_id IN (SELECT id FROM trades WHERE initiator_id != ${ownerId} AND responder_id != ${ownerId})`,
    sql`SELECT COUNT(*)::int AS n FROM subscriptions  WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM trust_profiles WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM referrals      WHERE referrer_id != ${ownerId} AND referee_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM sessions       WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM accounts       WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM push_subscriptions WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM reputation     WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM trade_proposals WHERE requester_id != ${ownerId} AND receiver_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM chat_sessions  WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM transactions   WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM payment_events WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM boost_tokens   WHERE user_id != ${ownerId}`,
  ]);

  const labels = [
    "users", "profiles", "listings", "listing_images", "trades", "messages",
    "subscriptions", "trust_profiles", "referrals", "sessions", "accounts",
    "push_subscriptions", "reputation", "trade_proposals", "chat_sessions",
    "transactions", "payment_events", "boost_tokens",
  ];

  counts.forEach((r, i) => {
    const n = r[0].n;
    if (n > 0) console.log(`  ${labels[i].padEnd(20)} ${n} rows`);
  });

  // ── Collect blob URLs ───────────────────────────────────────
  const blobUrls: string[] = [];
  const BLOB_HOST = "blob.vercel-storage.com";

  const imgRows = await sql`
    SELECT li.url FROM listing_images li
    JOIN listings l ON li.listing_id = l.id
    WHERE l.user_id != ${ownerId}
  `;
  const avatarRows = await sql`
    SELECT avatar_url FROM profiles
    WHERE user_id != ${ownerId} AND avatar_url IS NOT NULL
  `;

  for (const r of imgRows)    if (r.url?.includes(BLOB_HOST))        blobUrls.push(r.url);
  for (const r of avatarRows) if (r.avatar_url?.includes(BLOB_HOST)) blobUrls.push(r.avatar_url);

  console.log(`\n🗂️  Vercel Blob files to delete: ${blobUrls.length}`);
  if (blobUrls.length > 0 && isDryRun) {
    blobUrls.slice(0, 10).forEach((u) => console.log(`    ${u}`));
    if (blobUrls.length > 10) console.log(`    … and ${blobUrls.length - 10} more`);
  }

  if (isDryRun) {
    console.log("\n✋ Dry run complete — no changes made.\n");
    return;
  }
```

**Step 2: Test the dry-run**

```bash
npx tsx --env-file=.env.local scripts/cleanup-test-data.ts --owner-email=your@email.com --dry-run
```

Expected: table with row counts per table, blob file count. No changes made.

**Step 3: Commit**

```bash
git add scripts/cleanup-test-data.ts
git commit -m "chore: add dry-run summary to cleanup script"
```

---

### Task 3: Add Vercel Blob deletion

**Files:**
- Modify: `scripts/cleanup-test-data.ts`

**Step 1: Add import at top of file (after existing imports)**

```typescript
import { del } from "@vercel/blob";
```

**Step 2: Add `deleteBlobs()` function before `main()`**

```typescript
async function deleteBlobs(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("⚠️  BLOB_READ_WRITE_TOKEN not set — skipping Blob deletion.");
    return;
  }
  console.log(`\n🗑️  Deleting ${urls.length} Vercel Blob file(s)...`);
  try {
    await del(urls);
    console.log("✅ Blob files deleted.");
  } catch (err) {
    console.warn("⚠️  Blob deletion failed (non-fatal):", err);
    console.warn("    Orphaned files can be cleaned up manually in the Vercel dashboard.");
  }
}
```

---

### Task 4: Add database deletions in FK-safe order (single batch transaction)

**Files:**
- Modify: `scripts/cleanup-test-data.ts`

**Step 1: Add `deleteDatabase()` before `main()`**

```typescript
async function deleteDatabase(ownerId: string): Promise<void> {
  console.log("\n🗄️  Running database cleanup in a single transaction...");

  const nonOwnerTrades    = sql`SELECT id FROM trades    WHERE initiator_id != ${ownerId} AND responder_id != ${ownerId}`;
  const nonOwnerListings  = sql`SELECT id FROM listings  WHERE user_id != ${ownerId}`;
  const nonOwnerChatSess  = sql`SELECT id FROM chat_sessions WHERE user_id != ${ownerId}`;

  await sql.transaction([
    // 1. Leaf tables referencing trades (no cascade on their own FK)
    sql`DELETE FROM ratings             WHERE trade_id IN (${nonOwnerTrades})`,
    sql`DELETE FROM contact_disclosures WHERE trade_id IN (${nonOwnerTrades})`,

    // 2. Chat messages → chat sessions
    sql`DELETE FROM chat_messages WHERE session_id IN (${nonOwnerChatSess})`,
    sql`DELETE FROM chat_sessions WHERE user_id != ${ownerId}`,

    // 3. Trades — cascades: messages, trade_reports, readiness_flags,
    //             meetup_spots → meetup_votes, trade_items, thread_read_cursors
    sql`DELETE FROM trades WHERE initiator_id != ${ownerId} AND responder_id != ${ownerId}`,

    // 4. Listings (trade_items.listing_id is set null on cascade — safe)
    sql`DELETE FROM listing_images WHERE listing_id IN (${nonOwnerListings})`,
    sql`DELETE FROM listings       WHERE user_id != ${ownerId}`,

    // 5. User-adjacent
    sql`DELETE FROM push_subscriptions WHERE user_id != ${ownerId}`,
    sql`DELETE FROM transactions        WHERE user_id != ${ownerId}`,
    sql`DELETE FROM payment_events      WHERE user_id != ${ownerId}`,
    sql`DELETE FROM boost_tokens        WHERE user_id != ${ownerId}`,
    sql`DELETE FROM subscriptions       WHERE user_id != ${ownerId}`,
    sql`DELETE FROM trust_profiles      WHERE user_id != ${ownerId}`,
    sql`DELETE FROM reputation          WHERE user_id != ${ownerId} AND reviewer_id != ${ownerId}`,
    sql`DELETE FROM referrals           WHERE referrer_id != ${ownerId} AND referee_id != ${ownerId}`,
    sql`DELETE FROM trade_proposals     WHERE requester_id != ${ownerId} AND receiver_id != ${ownerId}`,

    // 6. Profiles
    sql`DELETE FROM profiles WHERE user_id != ${ownerId}`,

    // 7. Better Auth tables (verifications are ephemeral tokens — safe to wipe all)
    sql`DELETE FROM verifications`,
    sql`DELETE FROM sessions WHERE user_id != ${ownerId}`,
    sql`DELETE FROM accounts WHERE user_id != ${ownerId}`,

    // 8. Users — last, after all FKs are cleared
    sql`DELETE FROM users WHERE id != ${ownerId}`,
  ]);

  console.log("✅ Database cleanup complete.");
}
```

---

### Task 5: Add confirmation prompt and wire final `main()`

**Files:**
- Modify: `scripts/cleanup-test-data.ts`

**Step 1: Replace `main()` with the fully assembled version**

```typescript
async function main() {
  console.log(`\n🔍 Resolving owner account for: ${ownerEmail}`);
  const ownerId = await resolveOwner();
  console.log(`✅ Owner found — user ID: ${ownerId}`);

  // ── Count rows ──────────────────────────────────────────────
  console.log("\n📊 Counting rows to delete (excluding owner)...\n");
  const counts = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM users               WHERE id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM profiles            WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM listings            WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM listing_images      WHERE listing_id IN (SELECT id FROM listings WHERE user_id != ${ownerId})`,
    sql`SELECT COUNT(*)::int AS n FROM trades              WHERE initiator_id != ${ownerId} AND responder_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM messages            WHERE trade_id IN (SELECT id FROM trades WHERE initiator_id != ${ownerId} AND responder_id != ${ownerId})`,
    sql`SELECT COUNT(*)::int AS n FROM subscriptions       WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM trust_profiles      WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM referrals           WHERE referrer_id != ${ownerId} AND referee_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM sessions            WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM accounts            WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM push_subscriptions  WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM reputation          WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM trade_proposals     WHERE requester_id != ${ownerId} AND receiver_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM chat_sessions       WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM transactions        WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM payment_events      WHERE user_id != ${ownerId}`,
    sql`SELECT COUNT(*)::int AS n FROM boost_tokens        WHERE user_id != ${ownerId}`,
  ]);
  const labels = [
    "users", "profiles", "listings", "listing_images", "trades", "messages",
    "subscriptions", "trust_profiles", "referrals", "sessions", "accounts",
    "push_subscriptions", "reputation", "trade_proposals", "chat_sessions",
    "transactions", "payment_events", "boost_tokens",
  ];
  counts.forEach((r, i) => {
    const n = r[0].n;
    if (n > 0) console.log(`  ${labels[i].padEnd(22)} ${n} rows`);
  });

  // ── Collect blob URLs ───────────────────────────────────────
  const blobUrls: string[] = [];
  const BLOB_HOST = "blob.vercel-storage.com";
  const imgRows    = await sql`SELECT li.url FROM listing_images li JOIN listings l ON li.listing_id = l.id WHERE l.user_id != ${ownerId}`;
  const avatarRows = await sql`SELECT avatar_url FROM profiles WHERE user_id != ${ownerId} AND avatar_url IS NOT NULL`;
  for (const r of imgRows)    if (r.url?.includes(BLOB_HOST))        blobUrls.push(r.url);
  for (const r of avatarRows) if (r.avatar_url?.includes(BLOB_HOST)) blobUrls.push(r.avatar_url);
  console.log(`\n🗂️  Vercel Blob files to delete: ${blobUrls.length}`);
  if (blobUrls.length > 0 && isDryRun) {
    blobUrls.slice(0, 10).forEach((u) => console.log(`    ${u}`));
    if (blobUrls.length > 10) console.log(`    … and ${blobUrls.length - 10} more`);
  }

  // ── Dry run exit ────────────────────────────────────────────
  if (isDryRun) {
    console.log("\n✋ Dry run complete — no changes made.\n");
    return;
  }

  // ── Confirmation ────────────────────────────────────────────
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    '\n⚠️  This will PERMANENTLY delete all non-owner data. Type "yes" to proceed: '
  );
  rl.close();
  if (answer.trim().toLowerCase() !== "yes") {
    console.log("Aborted — no changes made.");
    process.exit(0);
  }

  // ── Execute ─────────────────────────────────────────────────
  await deleteBlobs(blobUrls);
  await deleteDatabase(ownerId);
  console.log("\n🎉 All done! The database is clean for MVP launch.\n");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/cleanup-test-data.ts
git commit -m "chore: complete test data cleanup script"
```

---

### Task 6: Run the script, verify, and remove it

**Step 1: Dry run — confirm the counts look right**

```bash
npx tsx --env-file=.env.local scripts/cleanup-test-data.ts --owner-email=your@email.com --dry-run
```

Review: do the row counts match your expectation of what test data is in the DB?

**Step 2: Run for real**

```bash
npx tsx --env-file=.env.local scripts/cleanup-test-data.ts --owner-email=your@email.com
```

Type `yes` when prompted. Watch for any error or warning output.

**Step 3: Verify owner account is intact**

Log into the app at `http://localhost:5173`. Confirm your account, profile, and any listings/trades you own are still visible and working.

**Step 4: Verify the DB is clean (optional sanity check)**

Open the Neon dashboard → SQL editor and run:

```sql
SELECT COUNT(*) FROM users;      -- should be 1 (you)
SELECT COUNT(*) FROM listings;   -- should be your own listings only
SELECT COUNT(*) FROM trades;     -- should be your own trades only
```

**Step 5: Remove the script (it's done its job)**

```bash
git rm scripts/cleanup-test-data.ts
git commit -m "chore: remove one-time test data cleanup script after MVP launch"
```

---

## Notes

- **`sql.transaction([])`** in `@neondatabase/serverless` sends all statements as one atomic HTTP batch. If any statement fails, the whole batch rolls back — the DB is never left in a partial state.
- **Vercel Blob deletion** is non-fatal. If it fails, orphaned files can be purged via the Vercel dashboard under **Storage → Blob → Manage**.
- **`verifications` table** is fully wiped — these are short-lived email/OTP tokens. Acceptable for launch.
- The script reads from `.env.local` automatically via `--env-file=.env.local` flag on `tsx`.
