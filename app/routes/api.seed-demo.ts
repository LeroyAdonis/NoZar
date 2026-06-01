// Seed/reset demo data. Pass {"key":"nozar-seed-2026"} to seed, {"key":"nozar-seed-2026","reset":true} to delete.
import { db } from "~/lib/db.server";
import { sql } from "drizzle-orm";

const K = "nozar-seed-2026";
const DEMO_EMAILS = ["thandi@nozar.demo", "james@nozar.demo", "priya@nozar.demo"];

function uid() { return crypto.randomUUID(); }
function ago(n: number) { return new Date(Date.now() - n * 86400_000); }
function img(id: string) { return `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=80`; }

export async function action({ request }: { request: Request }) {
  const body = await request.json();
  if (body.key !== K) return Response.json({ error: "bad key" }, { status: 403 });

  // ── RESET mode: delete all demo data ──
  if (body.reset) {
    for (const email of DEMO_EMAILS) {
      const [u] = await db.execute(sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`);
      if (!u?.id) continue;
      const id = u.id;
      await db.execute(sql`DELETE FROM ratings WHERE rater_id = ${id} OR ratee_id = ${id}`);
      await db.execute(sql`DELETE FROM thread_read_cursors WHERE user_id = ${id}`);
      await db.execute(sql`DELETE FROM messages WHERE sender_id = ${id}`);
      await db.execute(sql`DELETE FROM trade_items WHERE user_id = ${id}`);
      await db.execute(sql`DELETE FROM trade_reports WHERE reporter_id = ${id}`);
      await db.execute(sql`DELETE FROM readiness_flags WHERE user_id = ${id}`);
      await db.execute(sql`DELETE FROM meetup_votes WHERE user_id = ${id}`);
      await db.execute(sql`DELETE FROM contact_disclosures WHERE user_id = ${id}`);
      await db.execute(sql`DELETE FROM trades WHERE initiator_id = ${id} OR responder_id = ${id}`);
      await db.execute(sql`DELETE FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE user_id = ${id})`);
      await db.execute(sql`DELETE FROM listings WHERE user_id = ${id}`);
      await db.execute(sql`DELETE FROM trust_profiles WHERE user_id = ${id}`);
      await db.execute(sql`DELETE FROM profiles WHERE user_id = ${id}`);
      await db.execute(sql`DELETE FROM users WHERE id = ${id}`);
    }
    return Response.json({ message: "Demo data reset." });
  }

  // ── SEED mode: only if not already seeded ──
  const check = await db.execute(sql`SELECT id FROM users WHERE email = ${DEMO_EMAILS[0]} LIMIT 1`);
  if (check.length > 0) return Response.json({ message: "Already seeded. Use {reset:true} first." });

  const USERS = [
    { id: uid(), name: "Thandi Mokoena", email: DEMO_EMAILS[0], s: "Observatory", c: "Cape Town", la: -33.9375, lo: 18.4712, l: "verified", t: 4, r: 4.8, b: "Cape Town. Designer & photographer." },
    { id: uid(), name: "James van der Merwe", email: DEMO_EMAILS[1], s: "Stellenbosch Central", c: "Stellenbosch", la: -33.9371, lo: 18.8601, l: "verified", t: 2, r: 4.5, b: "Stellenbosch. Mountain biker & tech nerd." },
    { id: uid(), name: "Priya Naidoo", email: DEMO_EMAILS[2], s: "Durbanville", c: "Cape Town", la: -33.8342, lo: 18.6476, l: "newcomer", t: 1, r: 4.0, b: "Durbanville. Yoga instructor & plant mom." },
  ];

  const PH = {
    c: ["1516035069371-29a1b244cc32","1502920917128-1aa500764cbd","1510127034890-ba27508e9f1c"],
    b: ["1576436185224-2c6690bda11b","1485965120184-e220f721d03e","1561736778-92e52a7769ef"],
    d: ["1626785774573-4b799315345d","1561070791-2526d30994b5","1453928582365-b6ad33cbcf64"],
    s: ["1555041469-a586c61ea9bc","1493663284031-b7e3aefcae8e","1540574163026-643ea20ade25"],
    m: ["1517336714731-489689fd1ca8","1496181133206-80ce9b88a853","1629131726692-1accd0c53ce0"],
    y: ["1545205597-3d9d02c29597","1506126613408-eca07ce68773","1552196563-55cd4e45efb3"],
  };

  for (const u of USERS) {
    await db.execute(sql`INSERT INTO users (id, name, email, email_verified, created_at, updated_at) VALUES (${u.id}, ${u.name}, ${u.email}, true, ${ago(60)}, ${ago(1)})`);
    await db.execute(sql`INSERT INTO profiles (user_id, display_name, suburb, city, province, lat, lng, search_radius_km, bio) VALUES (${u.id}, ${u.name.split(" ")[0]}, ${u.s}, ${u.c}, 'Western Cape', ${u.la}, ${u.lo}, 25, ${u.b})`);
    await db.execute(sql`INSERT INTO trust_profiles (user_id, level, completed_trades, average_rating, last_active_at) VALUES (${u.id}, ${u.l}, ${u.t}, ${u.r}, ${ago(1)})`);
  }

  const ITEMS = [
    { u: 0, t: "Canon EOS 200D DSLR Camera", ca: "Electronics", v: 4500, d: "Lightweight DSLR with 24.2MP sensor, 18-55mm kit lens, telephoto lens, bag & 2 batteries.", co: "Good", s: "Looking for a laptop or photography gear + cash.", tp: "item", ph: "c" },
    { u: 1, t: "Giant Talon 3 Mountain Bike", ca: "Sports", v: 3200, d: "29er hardtail with hydraulic disc brakes, SRAM 12-speed. New tyres.", co: "Good", s: "Open to offers — camera gear, power tools, or a laptop.", tp: "item", ph: "b" },
    { u: 0, t: "Professional Logo & Brand Design", ca: "Services", v: 1500, d: "Custom logo + brand guide with colour palette, typography & social kit.", co: "New", s: "Barter for furniture, home decor, or photography services.", tp: "service", ph: "d" },
    { u: 2, t: "Leather 3-Seater Sofa — Cognac Brown", ca: "Home & Garden", v: 6000, d: "Genuine leather, bought 2023. Excellent condition with 2 scatter cushions.", co: "Like New", s: "Looking for a laptop or furniture exchange.", tp: "item", ph: "s" },
    { u: 1, t: "MacBook Pro 2019 — 16-inch", ca: "Electronics", v: 12000, d: "Intel i7, 16GB RAM, 512GB SSD. Space grey. 82 battery cycles.", co: "Good", s: "Camera gear (mirrorless/DSLR) or mech keyboard + cash.", tp: "item", ph: "m" },
    { u: 2, t: "Monthly Yoga Pass — 4 Sessions", ca: "Services", v: 500, d: "Vinyasa flow at Zen Studio, Durbanville. 4 sessions. All levels.", co: "New", s: "Swap for art prints, plants, or preserves!", tp: "service", ph: "y" },
  ];

  const ids: number[] = [];
  for (const item of ITEMS) {
    const uid = USERS[item.u].id;
    const res = await db.execute(sql`INSERT INTO listings (user_id, title, description, category, estimated_value_zar, condition, seeking_description, type, status, lat, lng, created_at, updated_at) VALUES (${uid}, ${item.t}, ${item.d}, ${item.ca}, ${item.v}, ${item.co}, ${item.s}, ${item.tp}, 'active', ${USERS[item.u].la}, ${USERS[item.u].lo}, ${ago(14)}, ${ago(1)}) RETURNING id`);
    const lid = Number(res[0].id);
    for (let i = 0; i < PH[item.ph as keyof typeof PH].length; i++) {
      await db.execute(sql`INSERT INTO listing_images (listing_id, url, "order") VALUES (${lid}, ${img(PH[item.ph as keyof typeof PH][i])}, ${i})`);
    }
    ids.push(lid);
  }

  const [t1] = USERS, [j1] = [USERS[1]], [p1] = [USERS[2]];
  const tr1 = await db.execute(sql`INSERT INTO trades (initiator_id, responder_id, listing_id, status, created_at, updated_at) VALUES (${t1.id}, ${j1.id}, ${ids[0]}, 'completed', ${ago(10)}, ${ago(8)}) RETURNING id`);
  const t1id = Number(tr1[0].id);
  await db.execute(sql`INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES (${t1id}, ${t1.id}, 'Hey James! Keen to swap my camera for your bike. R1,300 gap — balance with cash?', 'text', ${ago(10)})`);
  await db.execute(sql`INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES (${t1id}, ${j1.id}, 'Shot Thandi! Works for me. The bike is ready to ride 😎', 'text', ${ago(10)})`);
  await db.execute(sql`INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES (${t1id}, ${t1.id}, 'Both parties agreed — deal locked in! 🎉', 'system', ${ago(9)})`);
  await db.execute(sql`INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES (${t1id}, ${t1.id}, 'Trade marked as completed!', 'system', ${ago(8)})`);
  await db.execute(sql`INSERT INTO ratings (trade_id, rater_id, ratee_id, score, comment) VALUES (${t1id}, ${t1.id}, ${j1.id}, 5, 'Smooth trade!')`);
  await db.execute(sql`INSERT INTO ratings (trade_id, rater_id, ratee_id, score, comment) VALUES (${t1id}, ${j1.id}, ${t1.id}, 5, 'Camera is perfect 👊')`);

  const tr2 = await db.execute(sql`INSERT INTO trades (initiator_id, responder_id, listing_id, status, created_at, updated_at) VALUES (${p1.id}, ${t1.id}, ${ids[3]}, 'completed', ${ago(7)}, ${ago(5)}) RETURNING id`);
  const t2id = Number(tr2[0].id);
  await db.execute(sql`INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES (${t2id}, ${p1.id}, 'Hi Thandi! Swap a full brand package for my leather sofa?', 'text', ${ago(7)})`);
  await db.execute(sql`INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES (${t2id}, ${t1.id}, 'Yes absolutely! That sofa is gorgeous 😍', 'text', ${ago(7)})`);
  await db.execute(sql`INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES (${t2id}, ${p1.id}, 'Both parties agreed! 🎉', 'system', ${ago(6)})`);
  await db.execute(sql`INSERT INTO messages (trade_id, sender_id, text, type, created_at) VALUES (${t2id}, ${p1.id}, 'Trade completed!', 'system', ${ago(5)})`);
  await db.execute(sql`INSERT INTO ratings (trade_id, rater_id, ratee_id, score, comment) VALUES (${t2id}, ${p1.id}, ${t1.id}, 4, 'Beautiful brand guide!')`);
  await db.execute(sql`INSERT INTO ratings (trade_id, rater_id, ratee_id, score, comment) VALUES (${t2id}, ${t1.id}, ${p1.id}, 5, 'Sofa is perfect!')`);

  return Response.json({ message: "Seeded with real images 📸", users: 3, listings: ITEMS.length, trades: 2 });
}

export async function loader() {
  return Response.json({ message: 'POST {"key":"nozar-seed-2026"} to seed. POST {"key":"nozar-seed-2026","reset":true} to reset.' });
}
