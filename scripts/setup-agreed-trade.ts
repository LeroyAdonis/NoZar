import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  console.log("=== Setting up trade in 'agreed' status for meetup testing ===\n");

  // 1. Find two demo users
  const users = await sql`
    SELECT id, name, email FROM users WHERE email LIKE '%nozar.demo'
  `;
  console.log(`Found ${users.length} demo users`);

  if (users.length < 2) {
    console.log("Need at least 2 demo users. Run seed-demo first.");
    process.exit(1);
  }

  // 2. Find two listings (one from each user) in different categories
  const listings = await sql`
    SELECT id, user_id, name, category
    FROM listings
    WHERE user_id IN (${users[0].id}, ${users[1].id})
    AND status = 'active'
    LIMIT 5
  `;
  console.log(`\nFound ${listings.length} active listings across both users`);

  // 3. Check if there's already an agreed trade
  const existingTrade = await sql`
    SELECT id, status FROM trades
    WHERE status = 'agreed' LIMIT 1
  `;
  if (existingTrade.length > 0) {
    console.log(`\n✓ Trade already exists in 'agreed' status (id: ${existingTrade[0].id})`);
    console.log("  Nothing to do.\n");
    process.exit(0);
  }

  // 4. Create an agreed trade
  const listerListing = listings.find((l: any) => l.user_id === users[0].id);
  const seekerListing = listings.find((l: any) => l.user_id === users[1].id);

  if (!listerListing || !seekerListing) {
    console.log("Need at least one listing from each user. Create more listings first.");
    process.exit(1);
  }

  console.log(`\nCreating trade between:`);
  if (listerListing && seekerListing) {
    console.log(`  ${listerListing.name} (user ${listerListing.user_id})`);
    console.log(`  ${seekerListing.name} (user ${seekerListing.user_id})`);

    const [trade] = await sql`
      INSERT INTO trades (
        listing_id, listing_user_id,
        offer_type, offer_item_id, offered_by_user_id,
        status, created_at, updated_at
      ) VALUES (
        ${listerListing.id}, ${listerListing.user_id},
        'item', ${seekerListing.id}, ${seekerListing.user_id},
        'agreed', NOW(), NOW()
      )
      RETURNING id
    `;

    console.log(`\n✅ Trade created with id: ${trade.id}`);
    console.log("  Status: agreed");
    console.log("\nYou can now test the meetup suggestion flow.\n");
  }
}

run().catch(console.error);
