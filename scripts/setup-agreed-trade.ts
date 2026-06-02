import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log("=== Setting up trade in 'agreed' status for meetup testing ===\n");

  // 1. Find two demo users
  const users = await sql`
    SELECT id, name, email FROM users WHERE email LIKE '%nozar.demo'
  `;
  console.log(`Found ${users.length} demo users`);
  for (const u of users) {
    console.log(`  ${u.id.substring(0, 8)}... ${u.name} (${u.email})`);
  }

  if (users.length < 2) {
    console.log("ERROR: Need at least 2 demo users. Run POST /api/seed-demo first.");
    return;
  }

  // 2. Find an active listing from one of them
  const listings = await sql`
    SELECT l.id, l.title, l.user_id, u.name as owner_name
    FROM listings l
    JOIN users u ON l.user_id = u.id
    WHERE l.status = 'active'
    LIMIT 5
  `;
  console.log(`\nFound ${listings.length} active listings`);

  if (listings.length === 0) {
    console.log("ERROR: No active listings found.");
    return;
  }

  // 3. Create a trade in "agreed" status between two different users
  const initiator = users[0];
  const responder = users[1];
  const listing = listings[0];

  // Check if a trade already exists between these users for this listing
  const existingTrade = await sql`
    SELECT id, status FROM trades
    WHERE initiator_id = ${initiator.id} AND responder_id = ${responder.id} AND listing_id = ${listing.id}
    LIMIT 1
  `;

  let tradeId;
  if (existingTrade.length > 0) {
    tradeId = existingTrade[0].id;
    // Update status to agreed if not already
    if (existingTrade[0].status !== "agreed") {
      await sql`UPDATE trades SET status = 'agreed', updated_at = NOW() WHERE id = ${tradeId}`;
      console.log(`\n✓ Updated existing trade #${tradeId} to 'agreed'`);
    } else {
      console.log(`\nTrade #${tradeId} already in 'agreed' status`);
    }
  } else {
    const insertResult = await sql`
      INSERT INTO trades (initiator_id, responder_id, listing_id, status, created_at, updated_at)
      VALUES (${initiator.id}, ${responder.id}, ${listing.id}, 'agreed', NOW(), NOW())
      RETURNING id
    `;
    tradeId = insertResult[0].id;
    console.log(`\n✓ Created new trade #${tradeId} in 'agreed' status`);
  }

  // 4. Add a system message for the status change
  const msgs = await sql`SELECT id FROM messages WHERE trade_id = ${tradeId} AND text LIKE '%agreed%' LIMIT 1`;
  if (msgs.length === 0) {
    await sql`
      INSERT INTO messages (trade_id, sender_id, text, type, created_at)
      VALUES (${tradeId}, ${initiator.id}, 'Both parties agreed — deal locked in! 🎉', 'system', NOW())
    `;
    console.log("  System message added");
  }

  // 5. Verify the final state
  const [trade] = await sql`SELECT * FROM trades WHERE id = ${tradeId}`;
  console.log(`\n✓ Trade #${trade.id} status: "${trade.status}"`);
  console.log(`  Initiator: ${initiator.name} (${initiator.email})`);
  console.log(`  Responder: ${responder.name} (${responder.email})`);
  console.log(`  Listing: ${listing.title}`);

  // 6. Check the listing owner's location
  const profile = await sql`
    SELECT p.suburb, p.city, p.province
    FROM profiles p WHERE p.user_id = ${listing.user_id}
    LIMIT 1
  `;

  if (profile.length > 0) {
    const loc = profile[0];
    const location = loc.suburb || loc.city || loc.province || "South Africa";
    console.log(`  Listing owner location: ${location}`);
    console.log(`  AI prompt location: "${location}, South Africa"`);
  }

  // 7. Generate meetup spots via AI (if this trade had an agreed status, 
  //    the action handler would be triggerable via the UI)
  console.log(`\n✓ To trigger AI meetup suggestion:`);
  console.log(`  1. Open /dashboard/pings/${trade.id}`);
  console.log(`  2. Click "✦ Generate Safe Meetup Spots"`);
  console.log(`  3. Wait for AI to generate 3 safe spots`);
  console.log(`  4. Both parties vote on a spot`);
  console.log(`  5. Contact exchange becomes available`);
  
  // 8. Check the meetup spots table
  const spots = await sql`SELECT * FROM meetup_spots WHERE trade_id = ${tradeId}`;
  if (spots.length > 0) {
    console.log(`\n✓ Meetup spots already exist for trade #${tradeId}:`);
    for (const s of spots) {
      console.log(`  [${s.order + 1}] ${s.name} — ${s.address}`);
    }
  } else {
    console.log(`\n  No meetup spots yet — needs AI generation`);
  }

  console.log("\n=== Setup complete ===\n");
}

run().catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
