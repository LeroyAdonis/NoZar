/**
 * Quick seed endpoint — just inserts, skips if already seeded.
 * Stays under Vercel's 10s timeout by avoiding cleanup queries.
 */
import { db } from "~/lib/db.server";
import * as schema from "~/lib/schema";
import { eq } from "drizzle-orm";

const KEY="noz...ction uid() { return crypto.randomUUID(); }
function daysAgo(n: number) { return new Date(Date.now() - n * 86400_000); }
function img(id: string) { return `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=80`; }

const USERS = [
  { id: uid(), name: "Thandi Mokoena", email: "thandi@nozar.demo", suburb: "Observatory", city: "Cape Town", lat: -33.9375, lng: 18.4712, level: "verified" as const, trades: 4, rating: 4.8, bio: "📍 Cape Town. Designer & photographer." },
  { id: uid(), name: "James van der Merwe", email: "james@nozar.demo", suburb: "Stellenbosch Central", city: "Stellenbosch", lat: -33.9371, lng: 18.8601, level: "verified" as const, trades: 2, rating: 4.5, bio: "📍 Stellenbosch. Mountain biker & tech nerd." },
  { id: uid(), name: "Priya Naidoo", email: "priya@nozar.demo", suburb: "Durbanville", city: "Cape Town", lat: -33.8342, lng: 18.6476, level: "newcomer" as const, trades: 1, rating: 4.0, bio: "📍 Durbanville. Yoga instructor & plant mom." },
];

const PHOTOS: Record<string, string[]> = {
  camera:  ["1516035069371-29a1b244cc32","1502920917128-1aa500764cbd","1510127034890-ba27508e9f1c"],
  bike:    ["1576436185224-2c6690bda11b","1485965120184-e220f721d03e","1561736778-92e52a7769ef"],
  design:  ["1626785774573-4b799315345d","1561070791-2526d30994b5","1453928582365-b6ad33cbcf64"],
  sofa:    ["1555041469-a586c61ea9bc","1493663284031-b7e3aefcae8e","1540574163026-643ea20ade25"],
  macbook: ["1517336714731-489689fd1ca8","1496181133206-80ce9b88a853","1629131726692-1accd0c53ce0"],
  yoga:    ["1545205597-3d9d02c29597","1506126613408-eca07ce68773","1552196563-55cd4e45efb3"],
};

const ITEMS = [
  { u: 0, title: "Canon EOS 200D DSLR Camera", cat: "Electronics", val: 4500, desc: "Lightweight DSLR with 24.2MP sensor, 18-55mm kit lens, telephoto lens, bag & 2 batteries.", cond: "Good", seek: "Looking for a laptop or photography gear + cash.", type: "item", img: "camera" },
  { u: 1, title: "Giant Talon 3 Mountain Bike", cat: "Sports", val: 3200, desc: "29er hardtail with hydraulic disc brakes, SRAM 12-speed. New tyres.", cond: "Good", seek: "Open to offers — camera gear, power tools, or a laptop.", type: "item", img: "bike" },
  { u: 0, title: "Professional Logo & Brand Design", cat: "Services", val: 1500, desc: "Custom logo + brand guide with colour palette, typography & social kit.", cond: "New", seek: "Barter for furniture, home decor, or photography services.", type: "service", img: "design" },
  { u: 2, title: "Leather 3-Seater Sofa — Cognac Brown", cat: "Home & Garden", val: 6000, desc: "Genuine leather, bought in 2023. Excellent condition with 2 scatter cushions.", cond: "Like New", seek: "Looking for a laptop or furniture exchange.", type: "item", img: "sofa" },
  { u: 1, title: "MacBook Pro 2019 — 16-inch", cat: "Electronics", val: 12000, desc: "Intel i7, 16GB RAM, 512GB SSD. Space grey. 82 battery cycles.", cond: "Good", seek: "Camera gear (mirrorless/DSLR) or mechanical keyboard + cash.", type: "item", img: "macbook" },
  { u: 2, title: "Monthly Yoga Pass — 4 Sessions", cat: "Services", val: 500, desc: "Vinyasa flow at Zen Studio, Durbanville. 4 sessions. All levels.", cond: "New", seek: "Swap for art prints, plants, or preserves!", type: "service", img: "yoga" },
];

export async function action({ request }: { request: Request }) {
  const body = await request.json();
  if (body.key !== KEY) return Response.json({ error: "bad key" }, { status: 403 });

  // Check if already seeded
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, USERS[0].email)).limit(1);
  if (existing.length > 0) return Response.json({ message: "Already seeded. Delete demo users first." });

  // 1. Users
  for (const u of USERS) {
    await db.insert(schema.users).values({ id: u.id, name: u.name, email: u.email, emailVerified: true, createdAt: daysAgo(60), updatedAt: daysAgo(1) });
    await db.insert(schema.profiles).values({ userId: u.id, displayName: u.name.split(" ")[0], suburb: u.suburb, city: u.city, province: "Western Cape", lat: u.lat, lng: u.lng, searchRadiusKm: 25, bio: u.bio });
    await db.insert(schema.trustProfiles).values({ userId: u.id, level: u.level, completedTrades: u.trades, averageRating: u.rating, lastActiveAt: daysAgo(1) });
  }

  // 2. Listings  
  const listingIds: number[] = [];
  for (const item of ITEMS) {
    const userId = USERS[item.u].id;
    const [ins] = await db.insert(schema.listings).values({
      userId, title: item.title, description: item.desc, category: item.cat,
      estimatedValueZar: item.val, condition: item.cond, seekingDescription: item.seek,
      type: item.type, status: "active", lat: USERS[item.u].lat, lng: USERS[item.u].lng,
      createdAt: daysAgo(14), updatedAt: daysAgo(1),
    }).returning({ id: schema.listings.id });
    const photos = PHOTOS[item.img];
    for (let i = 0; i < photos.length; i++) {
      await db.insert(schema.listingImages).values({ listingId: ins.id, url: img(photos[i]), order: i });
    }
    listingIds.push(ins.id);
  }

  // 3. Trade 1
  const [thandi, james, priya] = USERS;
  const [t1] = await db.insert(schema.trades).values({ initiatorId: thandi.id, responderId: james.id, listingId: listingIds[0], status: "completed", createdAt: daysAgo(10), updatedAt: daysAgo(8) }).returning({ id: schema.trades.id });
  await db.insert(schema.messages).values([
    { tradeId: t1.id, senderId: thandi.id, text: "Hey James! Keen to swap my camera for your bike. R1,300 gap — balance with cash?", type: "text", createdAt: daysAgo(10) },
    { tradeId: t1.id, senderId: james.id, text: "Shot Thandi! Works for me. The bike's ready to ride 😎", type: "text", createdAt: daysAgo(10) },
    { tradeId: t1.id, senderId: thandi.id, text: "Both parties agreed — deal locked in! 🎉", type: "system", createdAt: daysAgo(9) },
    { tradeId: t1.id, senderId: thandi.id, text: "Trade marked as completed!", type: "system", createdAt: daysAgo(8) },
  ]);
  await db.insert(schema.ratings).values([
    { tradeId: t1.id, raterId: thandi.id, rateeId: james.id, score: 5, comment: "Smooth trade!" },
    { tradeId: t1.id, raterId: james.id, rateeId: thandi.id, score: 5, comment: "Camera is perfect 👊" },
  ]);

  // 4. Trade 2
  const [t2] = await db.insert(schema.trades).values({ initiatorId: priya.id, responderId: thandi.id, listingId: listingIds[3], status: "completed", createdAt: daysAgo(7), updatedAt: daysAgo(5) }).returning({ id: schema.trades.id });
  await db.insert(schema.messages).values([
    { tradeId: t2.id, senderId: priya.id, text: "Hi Thandi! Swap a full brand package for my leather sofa?", type: "text", createdAt: daysAgo(7) },
    { tradeId: t2.id, senderId: thandi.id, text: "Yes absolutely! That sofa is gorgeous 😍", type: "text", createdAt: daysAgo(7) },
    { tradeId: t2.id, senderId: priya.id, text: "Both parties agreed! 🎉", type: "system", createdAt: daysAgo(6) },
    { tradeId: t2.id, senderId: priya.id, text: "Trade completed!", type: "system", createdAt: daysAgo(5) },
  ]);
  await db.insert(schema.ratings).values([
    { tradeId: t2.id, raterId: priya.id, rateeId: thandi.id, score: 4, comment: "Beautiful brand guide!" },
    { tradeId: t2.id, raterId: thandi.id, rateeId: priya.id, score: 5, comment: "Sofa is perfect!" },
  ]);

  return Response.json({ message: "Seeded with real images 📸", users: 3, listings: ITEMS.length, trades: 2 });
}

export async function loader() {
  return Response.json({ message: 'POST {"key":"nozar-seed-2026"} to seed.' });
}
