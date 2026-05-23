// scripts/cleanup-test-data.ts
// Wipes ALL data from the database and Vercel Blob store.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { del } from "@vercel/blob";
import * as readline from "readline/promises";

const isDryRun = process.argv.includes("--dry-run");

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set. Is .env.local loaded?");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

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

async function deleteDatabase(): Promise<void> {
  console.log("\n🗄️  Wiping all tables in FK-safe order...");

  await sql.transaction([
    // 1. Tables with no-onDelete FKs to BOTH trades AND users — must go first.
    //    Deleting trades or users before these would violate their FK constraints.
    sql`DELETE FROM contact_disclosures`,
    sql`DELETE FROM ratings`,

    // 2. Chat hierarchy (chat_messages cascades from chat_sessions)
    sql`DELETE FROM chat_messages`,
    sql`DELETE FROM chat_sessions`,

    // 3. Trades — no-onDelete FK to listings and users, so must precede both.
    //    messages, thread_read_cursors, trade_reports etc. cascade automatically.
    sql`DELETE FROM trades`,

    // 4. Listings — listing_images cascades, but explicit delete is safe.
    sql`DELETE FROM listing_images`,
    sql`DELETE FROM listings`,

    // 5. User-adjacent tables (all cascade from users, explicit for safety)
    sql`DELETE FROM push_subscriptions`,
    sql`DELETE FROM transactions`,
    sql`DELETE FROM payment_events`,
    sql`DELETE FROM boost_tokens`,
    sql`DELETE FROM subscriptions`,
    sql`DELETE FROM trust_profiles`,
    sql`DELETE FROM reputation`,
    sql`DELETE FROM referrals`,
    sql`DELETE FROM trade_proposals`,
    sql`DELETE FROM profiles`,

    // 6. Better Auth tables
    sql`DELETE FROM verifications`,
    sql`DELETE FROM sessions`,
    sql`DELETE FROM accounts`,

    // 7. Users — last, after all FK references are cleared
    sql`DELETE FROM users`,
  ]);

  console.log("✅ Database wiped.");
}

async function main() {
  console.log("\n📊 Counting all rows...\n");

  const counts = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM users`,
    sql`SELECT COUNT(*)::int AS n FROM profiles`,
    sql`SELECT COUNT(*)::int AS n FROM listings`,
    sql`SELECT COUNT(*)::int AS n FROM listing_images`,
    sql`SELECT COUNT(*)::int AS n FROM trades`,
    sql`SELECT COUNT(*)::int AS n FROM messages`,
    sql`SELECT COUNT(*)::int AS n FROM contact_disclosures`,
    sql`SELECT COUNT(*)::int AS n FROM ratings`,
    sql`SELECT COUNT(*)::int AS n FROM subscriptions`,
    sql`SELECT COUNT(*)::int AS n FROM trust_profiles`,
    sql`SELECT COUNT(*)::int AS n FROM sessions`,
    sql`SELECT COUNT(*)::int AS n FROM accounts`,
    sql`SELECT COUNT(*)::int AS n FROM push_subscriptions`,
    sql`SELECT COUNT(*)::int AS n FROM reputation`,
    sql`SELECT COUNT(*)::int AS n FROM trade_proposals`,
    sql`SELECT COUNT(*)::int AS n FROM chat_sessions`,
    sql`SELECT COUNT(*)::int AS n FROM transactions`,
    sql`SELECT COUNT(*)::int AS n FROM payment_events`,
    sql`SELECT COUNT(*)::int AS n FROM boost_tokens`,
    sql`SELECT COUNT(*)::int AS n FROM referrals`,
  ]);
  const labels = [
    "users", "profiles", "listings", "listing_images", "trades", "messages",
    "contact_disclosures", "ratings", "subscriptions", "trust_profiles",
    "sessions", "accounts", "push_subscriptions", "reputation", "trade_proposals",
    "chat_sessions", "transactions", "payment_events", "boost_tokens", "referrals",
  ];
  counts.forEach((r, i) => {
    const n = r[0].n;
    if (n > 0) console.log(`  ${labels[i].padEnd(22)} ${n} rows`);
  });

  // ── Collect all blob URLs ───────────────────────────────────
  const blobUrls: string[] = [];
  const BLOB_HOST = "blob.vercel-storage.com";
  const imgRows    = await sql`SELECT url FROM listing_images`;
  const avatarRows = await sql`SELECT avatar_url FROM profiles WHERE avatar_url IS NOT NULL`;
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

  // ── Confirmation ────────────────────────────────────────────
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    '\n⚠️  This will PERMANENTLY delete ALL data in the database. Type "yes" to proceed: '
  );
  rl.close();
  if (answer.trim().toLowerCase() !== "yes") {
    console.log("Aborted — no changes made.");
    process.exit(0);
  }

  await deleteBlobs(blobUrls);
  await deleteDatabase();
  console.log("\n🎉 All done! Database is fully wiped.\n");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
