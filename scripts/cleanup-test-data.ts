// scripts/cleanup-test-data.ts
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { del } from "@vercel/blob";
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

async function deleteDatabase(ownerId: string): Promise<void> {
  console.log("\n🗄️  Running database cleanup in a single transaction...");

  // trades.listing_id has no onDelete clause (defaults to RESTRICT).
  // We must delete any trade whose listing is being removed, even if the
  // owner is one of the parties (e.g. owner pinged a test-user's listing).
  const tradesToDelete = sql`
    SELECT id FROM trades
    WHERE (initiator_id != ${ownerId} AND responder_id != ${ownerId})
       OR listing_id IN (SELECT id FROM listings WHERE user_id != ${ownerId})
  `;
  const nonOwnerListings = sql`SELECT id FROM listings      WHERE user_id != ${ownerId}`;
  const nonOwnerChatSess = sql`SELECT id FROM chat_sessions WHERE user_id != ${ownerId}`;

  await sql.transaction([
    // 1. Leaf tables with no-onDelete FKs referencing trades
    sql`DELETE FROM ratings             WHERE trade_id IN (${tradesToDelete})`,
    sql`DELETE FROM contact_disclosures WHERE trade_id IN (${tradesToDelete})`,

    // 2. Chat messages → chat sessions
    sql`DELETE FROM chat_messages WHERE session_id IN (${nonOwnerChatSess})`,
    sql`DELETE FROM chat_sessions WHERE user_id != ${ownerId}`,

    // 3. Trades (messages/thread_read_cursors cascade automatically)
    sql`DELETE FROM trades WHERE id IN (${tradesToDelete})`,

    // 4. Listings (listing_images cascades, but explicit delete is harmless)
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

    // 8. Users — last
    sql`DELETE FROM users WHERE id != ${ownerId}`,
  ]);

  console.log("✅ Database cleanup complete.");
}

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
