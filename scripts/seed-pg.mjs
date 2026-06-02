/**
 * Direct seed script using pg (TCP connection, reliable).
 * Run: DATABASE_URL="$(grep DATABASE_URL .env.local | cut -d= -f2-)" node scripts/seed-pg.mjs
 */
import pg from "pg";
const { Pool } = pg;

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL required"); process.exit(1); }

const pool = new Pool({ connectionString: url });

function uid() { return crypto.randomUUID(); }
function daysAgo(n) { return new Date(Date.now() - n * 86400_000).toISOString(); }
function img(id) { return `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=80`; }

const USERS = [
  { id: uid(), name: "Thandi Mokoena", email: "thandi@nozar.demo", suburb: "Observatory", city: "Cape Town", lat: -33.9375, lng: 18.4712, level: "verified", trades: 4, rating: 4.8, bio: "📍 Cape Town. Designer & photographer. Love trading skills as much as things." },
  { id: uid(), name: "James van der Merwe", email: "james@nozar.demo", suburb: "Stellenbosch Central", city: "Stellenbosch", lat: -33.9371, lng: 18.8601, level: "verified", trades: 2, rating: 4.5, bio: "📍 Stellenbosch. Mountain biker and tech nerd. Swapping gear is my hobby." },
  { id: uid(), name: "Priya Naidoo", email: "priya@nozar.demo", suburb: "Durbanville", city: "Cape Town", lat: -33.8342, lng: 18.6476, level: "newcomer", trades: 1, rating: 4.0, bio: "📍 Durbanville. Yoga instructor and plant mom. Bartering is the future." },
];

const PHOTOS = {
  camera:  ["1516035069371-29a1b244cc32","1502920917128-1aa500764cbd","1510127034890-ba27508e9f1c"],
  bike:    ["1576436185224-2c6690bda11b","1485965120184-e220f721d03e","1561736778-92e52a7769ef"],
  design:  ["1626785774573-4b799315345d","1561070791-2526d30994b5","1453928582365-b6ad33cbcf64"],
  sofa:    ["1555041469-a586c61ea9bc","1493663284031-b7e3aefcae8e","1540574163026-643ea20ade25"],
  macbook: ["1517336714731-489689fd1ca8","1496181133206-80ce9b88a853","1629131726692-1accd0c53ce0"],
  yoga:    ["1545205597-3d9d02c29597","1506126613408-eca07ce68773","1552196563-55cd4e45efb3"],
};

const ITEMS = [
  { u: 0, title: "Canon EOS 200D DSLR Camera", cat: "Electronics", val: 4500, desc: "Lightweight DSLR with 24.2MP sensor, 18-55mm kit lens, telephoto lens, bag & 2 batteries.", cond: "Good", seek: "Looking for a laptop or photography gear + cash.", photos: "camera" },
  { u: 1, title: "Giant Talon 3 Mountain Bike", cat: "Sports", val: 3200, desc: "29er hardtail with hydraulic disc brakes, SRAM 12-speed. New tyres.", cond: "Good", seek: "Open to offers — camera gear, power tools, or a laptop.", photos: "bike" },
  { u: 0, title: "Professional Logo & Brand Design", cat: "Services", val: 1500, desc: "Custom logo + brand guide with colour palette, typography & social kit.", cond: "New", seek: "Barter for furniture, home decor, or photography services.", photos: "design" },
  { u: 2, title: "Leather 3-Seater Sofa — Cognac Brown", cat: "Home & Garden", val: 6000, desc: "Genuine leather, bought in 2023. Excellent condition with 2 scatter cushions.", cond: "Like New", seek: "Looking for a laptop or furniture exchange.", photos: "sofa" },
  { u: 1, title: "MacBook Pro 2019 — 16-inch", cat: "Electronics", val: 12000, desc: "Intel i7, 16GB RAM, 512GB SSD. Space grey. 82 battery cycles.", cond: "Good", seek: "Camera gear (mirrorless/DSLR) or mechanical keyboard + cash.", photos: "macbook" },
  { u: 2, title: "Monthly Yoga Pass — 4 Sessions", cat: "Services", val: 500, desc: "Vinyasa flow at Zen Studio, Durbanville. 4 sessions. All levels.", cond: "New", seek: "Swap for art prints, plants, or preserves!", photos: "yoga" },
];

async function main() {
  console.log("🌱 Seeding...\n");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clean old demo data — find by email, then delete using actual DB id
    const demoEmails = USERS.map(u => u.email);
    for (const email of demoEmails) {
      const { rows } = await client.query("SELECT id FROM users WHERE email = $1", [email]);
      if (rows.length === 0) continue;
      const fid = rows[0].id;
      await client.query("DELETE FROM ratings WHERE rater_id = $1 OR ratee_id = $1", [fid]);
      await client.query("DELETE FROM thread_read_cursors WHERE user_id = $1", [fid]);
      await client.query("DELETE FROM meetup_votes WHERE user_id = $1", [fid]);
      await client.query("DELETE FROM readiness_flags WHERE user_id = $1", [fid]);
      await client.query("DELETE FROM contact_disclosures WHERE user_id = $1", [fid]);
      await client.query("DELETE FROM trade_reports WHERE reporter_id = $1", [fid]);
      await client.query("DELETE FROM trade_items WHERE user_id = $1", [fid]);
      await client.query("DELETE FROM messages WHERE sender_id = $1", [fid]);
      await client.query("DELETE FROM trades WHERE initiator_id = $1 OR responder_id = $1", [fid]);
      await client.query("DELETE FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE user_id = $1)", [fid]);
      await client.query("DELETE FROM listings WHERE user_id = $1", [fid]);
      await client.query("DELETE FROM trust_profiles WHERE user_id = $1", [fid]);
      await client.query("DELETE FROM profiles WHERE user_id = $1", [fid]);
      await client.query("DELETE FROM users WHERE id = $1", [fid]);
    }

    // Insert users
    for (const u of USERS) {
      await client.query(
        "INSERT INTO users (id, name, email, email_verified, created_at, updated_at) VALUES ($1,$2,$3,true,$4,$5)",
        [u.id, u.name, u.email, daysAgo(60), daysAgo(1)]
      );
      await client.query(
        "INSERT INTO profiles (user_id, display_name, suburb, city, province, lat, lng, search_radius_km, bio) VALUES ($1,$2,$3,$4,'Western Cape',$5,$6,25,$7)",
        [u.id, u.name.split(" ")[0], u.suburb, u.city, u.lat, u.lng, u.bio]
      );
      await client.query(
        "INSERT INTO trust_profiles (user_id, level, completed_trades, average_rating, last_active_at) VALUES ($1,$2,$3,$4,$5)",
        [u.id, u.level, u.trades, u.rating, daysAgo(1)]
      );
      console.log(`  👤 ${u.name} (${u.level})`);
    }

    // Insert listings
    const listingIds = [];
    for (const item of ITEMS) {
      const uid = USERS[item.u].id;
      const u = USERS[item.u];
      const r = await client.query(
        `INSERT INTO listings (user_id, title, description, category, estimated_value_zar, condition, seeking_description, type, status, lat, lng, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11,$12) RETURNING id`,
        [uid, item.title, item.desc, item.cat, item.val, item.cond, item.seek, item.cat === "Services" ? "service" : "item", u.lat, u.lng, daysAgo(14), daysAgo(1)]
      );
      const lid = r.rows[0].id;
      const photos = PHOTOS[item.photos];
      for (let i = 0; i < photos.length; i++) {
        await client.query(
          "INSERT INTO listing_images (listing_id, url, \"order\") VALUES ($1,$2,$3)",
          [lid, img(photos[i]), i]
        );
      }
      listingIds.push(lid);
      console.log(`  📦 ${item.title} — R${item.val}`);
    }

    // Trade 1: camera ↔ bike
    const [thandi, james, priya] = USERS;
    const t1 = await client.query(
      "INSERT INTO trades (initiator_id, responder_id, listing_id, status, created_at, updated_at) VALUES ($1,$2,$3,'completed',$4,$5) RETURNING id",
      [thandi.id, james.id, listingIds[0], daysAgo(10), daysAgo(8)]
    );
    const t1id = t1.rows[0].id;
    await client.query("INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES ($1,$2,$3,'text',$4)", [t1id, thandi.id, "Hey James! Keen to swap my camera for your bike. R1,300 gap — balance with cash?", daysAgo(10)]);
    await client.query("INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES ($1,$2,$3,'text',$4)", [t1id, james.id, "Shot Thandi! Works for me. The bike's ready to ride 😎", daysAgo(10)]);
    await client.query("INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES ($1,$2,$3,'system',$4)", [t1id, thandi.id, "Both parties agreed — deal locked in! 🎉", daysAgo(9)]);
    await client.query("INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES ($1,$2,$3,'system',$4)", [t1id, thandi.id, "Trade marked as completed!", daysAgo(8)]);
    await client.query("INSERT INTO ratings (trade_id, rater_id, ratee_id, score, comment) VALUES ($1,$2,$3,5,'Smooth trade!')", [t1id, thandi.id, james.id]);
    await client.query("INSERT INTO ratings (trade_id, rater_id, ratee_id, score, comment) VALUES ($1,$2,$3,5,'Camera is perfect 👊')", [t1id, james.id, thandi.id]);
    console.log(`  👊 Trade 1 completed — camera ↔ bike (5★)`);

    // Trade 2: sofa ↔ design
    const t2 = await client.query(
      "INSERT INTO trades (initiator_id, responder_id, listing_id, status, created_at, updated_at) VALUES ($1,$2,$3,'completed',$4,$5) RETURNING id",
      [priya.id, thandi.id, listingIds[3], daysAgo(7), daysAgo(5)]
    );
    const t2id = t2.rows[0].id;
    await client.query("INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES ($1,$2,$3,'text',$4)", [t2id, priya.id, "Hi Thandi! Swap a full brand package for my leather sofa?", daysAgo(7)]);
    await client.query("INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES ($1,$2,$3,'text',$4)", [t2id, thandi.id, "Yes absolutely! That sofa is gorgeous 😍", daysAgo(7)]);
    await client.query("INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES ($1,$2,$3,'system',$4)", [t2id, priya.id, "Both parties agreed! 🎉", daysAgo(6)]);
    await client.query("INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES ($1,$2,$3,'system',$4)", [t2id, priya.id, "Trade completed!", daysAgo(5)]);
    await client.query("INSERT INTO ratings (trade_id, rater_id, ratee_id, score, comment) VALUES ($1,$2,$3,4,'Beautiful brand guide!')", [t2id, priya.id, thandi.id]);
    await client.query("INSERT INTO ratings (trade_id, rater_id, ratee_id, score, comment) VALUES ($1,$2,$3,5,'Sofa is perfect!')", [t2id, thandi.id, priya.id]);
    console.log(`  👊 Trade 2 completed — sofa ↔ design (4★, 5★)`);

    await client.query("COMMIT");
    console.log("\n✅ Done! 3 users, 6 listings, 2 trades.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ Failed:", e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
