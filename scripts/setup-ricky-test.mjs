#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

function uid() { return crypto.randomUUID(); }
function ago(n) { return new Date(Date.now() - n * 86400_000); }
function img(id) { return `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=80`; }

async function main() {
  const LEROY_ID = "iP2fq6sitmKKu8GJOLexGgG7UapgVus6";

  console.log("=== Setting up Ricky test account ===\n");

  // 1. Check if Ricky already exists
  const existing = await sql`SELECT id FROM users WHERE email = 'ricky@nozar.test'`;
  if (existing.length > 0) {
    console.log("Ricky already exists. Cleaning up old trades...");
    const rickyId = existing[0].id;

    // Delete old trades and messages
    await sql`DELETE FROM messages WHERE trade_id IN (SELECT id FROM trades WHERE initiator_id = ${rickyId} OR responder_id = ${rickyId})`;
    await sql`DELETE FROM trade_items WHERE trade_id IN (SELECT id FROM trades WHERE initiator_id = ${rickyId} OR responder_id = ${rickyId})`;
    await sql`DELETE FROM trades WHERE initiator_id = ${rickyId} OR responder_id = ${rickyId}`;
    await sql`DELETE FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE user_id = ${rickyId})`;
    await sql`DELETE FROM listings WHERE user_id = ${rickyId}`;
    await sql`DELETE FROM trust_profiles WHERE user_id = ${rickyId}`;
    await sql`DELETE FROM profiles WHERE user_id = ${rickyId}`;
    await sql`DELETE FROM users WHERE id = ${rickyId}`;
    console.log("Old data cleaned.\n");
  }

  // 2. Create Ricky
  const RICKY_ID = uid();
  console.log(`Creating Ricky (ID: ${RICKY_ID})...`);

  await sql`
    INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
    VALUES (${RICKY_ID}, 'Ricky', 'ricky@nozar.test', true, ${ago(7)}, ${ago(1)})
  `;

  await sql`
    INSERT INTO profiles (user_id, display_name, bio, suburb, city, province, lat, lng, search_radius_km, preferred_language)
    VALUES (${RICKY_ID}, 'Ricky', 'Your NoZar homie. Let''s trade!', 'Observatory', 'Cape Town', 'Western Cape', -33.938, 18.471, 50, 'xh')
  `;

  await sql`
    INSERT INTO trust_profiles (user_id, level, completed_trades, average_rating, last_active_at)
    VALUES (${RICKY_ID}, 'verified', 3, 4.9, ${ago(1)})
  `;

  // 3. Create Ricky's listings
  const ITEMS = [
    { title: 'ASUS ROG Zephyrus G14 Gaming Laptop', category: 'Electronics', value: 8500, condition: 'Good',
      desc: '2022 model, Ryzen 7 6800HS, RTX 3060, 16GB RAM, 1TB SSD. Perfect for gaming and work. Lightly used.',
      seeking: 'Looking for a gaming console + accessories, or camera gear. Open to bundles.',
      ph: ['1496181133206-80ce9b88a853', '1517336714731-489689fd1ca8', '1629131726692-1accd0c53ce0'] },
    { title: 'Bose QuietComfort Ultra Headphones', category: 'Electronics', value: 3500, condition: 'Like New',
      desc: 'Immaculate condition with case, USB-C cable, and airline adapter. Bought Dec 2025.',
      seeking: 'Swap for a Nintendo Switch, iPad, or Bluetooth speaker + small item.',
      ph: ['1505740420928-5e560c06d30e', '1484704849700-f032a568e944', '1491927570842-0261e477d937'] },
    { title: 'Mountain Bike Service & Tune-Up', category: 'Services', value: 600, condition: 'New',
      desc: 'Full service: gear indexing, brake bleed, chain lube, tyre pressure check. I come to you in CPT.',
      seeking: 'Barter for electronics, board games, or craft beer 🍺',
      ph: [] },
  ];

  const rickyListings = [];
  for (const item of ITEMS) {
    const [ins] = await sql`
      INSERT INTO listings (user_id, title, description, category, estimated_value_zar, condition, seeking_description, type, status, lat, lng, created_at, updated_at)
      VALUES (${RICKY_ID}, ${item.title}, ${item.desc}, ${item.category}, ${item.value}, ${item.condition}, ${item.seeking}, 'item', 'active', -33.938, 18.471, ${ago(5)}, ${ago(1)})
      RETURNING id
    `;
    rickyListings.push(ins.id);
    console.log(`  ✅ Listing: ${item.title} (ID: ${ins.id})`);
    for (let i = 0; i < item.ph.length; i++) {
      await sql`INSERT INTO listing_images (listing_id, url, "order") VALUES (${ins.id}, ${img(item.ph[i])}, ${i})`;
    }
  }

  // 4. Create a trade — Ricky offers the ASUS laptop for Leroy's Nintendo Switch
  const [trade] = await sql`
    INSERT INTO trades (initiator_id, responder_id, listing_id, status, created_at, updated_at)
    VALUES (${RICKY_ID}, ${LEROY_ID}, ${19}, 'proposed', ${ago(1)}, ${ago(1)})
    RETURNING id
  `;
  console.log(`\n  ✅ Trade created (ID: ${trade.id}) — Ricky's ASUS laptop ↔ Leroy's Nintendo Switch`);

  // Add trade items
  await sql`
    INSERT INTO trade_items (trade_id, user_id, listing_id, description)
    VALUES (${trade.id}, ${RICKY_ID}, ${rickyListings[0]}, 'ASUS ROG Zephyrus G14 Gaming Laptop — R8,500 estimated value')
  `;
  console.log(`  ✅ Trade item: ASUS ROG Zephyrus G14 (R8,500) added to trade`);

  // 5. Add some chat messages
  const messages = [
    { sender: RICKY_ID, text: "Yo Leroy! Keen to swap my ASUS ROG Zephyrus G14 for your Nintendo Switch OLED?", type: "text" },
    { sender: LEROY_ID, text: "Aweh Ricky! That's a solid offer. The ASUS is worth more though — R8,500 vs R6,000. What else you got?", type: "text" },
    { sender: RICKY_ID, text: "Yeah true haha. I could throw in my Bose QuietComfort Ultra headphones? They're R3,500. Together that's dead fair.", type: "text" },
    { sender: LEROY_ID, text: "Wait so the laptop AND headphones for the Switch? That's a lot on your side, man. You sure?", type: "text" },
    { sender: RICKY_ID, text: "Nah not both! Let's use the AI Trade Negotiator to figure out a fair deal 😎", type: "text" },
  ];

  const now = Date.now();
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const ts = new Date(now - (messages.length - i) * 60000).toISOString();
    await sql`
      INSERT INTO messages (trade_id, sender_id, text, type, created_at)
      VALUES (${trade.id}, ${m.sender}, ${m.text}, ${m.type}, ${ts})
    `;
  }
  console.log(`  ✅ ${messages.length} chat messages added`);

  console.log(`\n=== Done! 🎯 ===`);
  console.log(`You can now log into nozar.co.za and check /dashboard/chat/${trade.id}`);
  console.log(`Ricky speaks isiXhosa (preferred_language: xh) — try the translate button!`);
}

main().catch(console.error);
