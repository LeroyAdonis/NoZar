// Quick seed — skips if already seeded. Stays under Vercel 10s timeout.
import { db } from "~/lib/db.server";
import * as schema from "~/lib/schema";
import { eq } from "drizzle-orm";

const KEY = "nozar-seed-2026";

function uid() { return crypto.randomUUID(); }
function ago(n: number) { return new Date(Date.now() - n * 86400_000); }
function img(id: string) { return `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=80`; }

const USERS = [
  { id: uid(), name: "Thandi Mokoena", email: "thandi@nozar.demo", suburb: "Observatory", city: "Cape Town", lat: -33.9375, lng: 18.4712, level: "verified" as const, t: 4, r: 4.8, bio: "Cape Town. Designer & photographer." },
  { id: uid(), name: "James van der Merwe", email: "james@nozar.demo", suburb: "Stellenbosch Central", city: "Stellenbosch", lat: -33.9371, lng: 18.8601, level: "verified" as const, t: 2, r: 4.5, bio: "Stellenbosch. Mountain biker & tech nerd." },
  { id: uid(), name: "Priya Naidoo", email: "priya@nozar.demo", suburb: "Durbanville", city: "Cape Town", lat: -33.8342, lng: 18.6476, level: "newcomer" as const, t: 1, r: 4.0, bio: "Durbanville. Yoga instructor & plant mom." },
];

const PHOTOS: Record<string, string[]> = {
  cam: ["1516035069371-29a1b244cc32","1502920917128-1aa500764cbd","1510127034890-ba27508e9f1c"],
  bike: ["1576436185224-2c6690bda11b","1485965120184-e220f721d03e","1561736778-92e52a7769ef"],
  des: ["1626785774573-4b799315345d","1561070791-2526d30994b5","1453928582365-b6ad33cbcf64"],
  sofa: ["1555041469-a586c61ea9bc","1493663284031-b7e3aefcae8e","1540574163026-643ea20ade25"],
  mac: ["1517336714731-489689fd1ca8","1496181133206-80ce9b88a853","1629131726692-1accd0c53ce0"],
  yoga: ["1545205597-3d9d02c29597","1506126613408-eca07ce68773","1552196563-55cd4e45efb3"],
};

const ITEMS = [
  { u: 0, t: "Canon EOS 200D DSLR Camera", c: "Electronics", v: 4500, d: "Lightweight DSLR with 24.2MP sensor, 18-55mm kit lens, telephoto lens, bag & 2 batteries.", cond: "Good", s: "Looking for a laptop or photography gear + cash.", tp: "item", ph: "cam" },
  { u: 1, t: "Giant Talon 3 Mountain Bike", c: "Sports", v: 3200, d: "29er hardtail with hydraulic disc brakes, SRAM 12-speed. New tyres.", cond: "Good", s: "Open to offers — camera gear, power tools, or a laptop.", tp: "item", ph: "bike" },
  { u: 0, t: "Professional Logo & Brand Design", c: "Services", v: 1500, d: "Custom logo + brand guide with colour palette, typography & social kit.", cond: "New", s: "Barter for furniture, home decor, or photography services.", tp: "service", ph: "des" },
  { u: 2, t: "Leather 3-Seater Sofa — Cognac Brown", c: "Home & Garden", v: 6000, d: "Genuine leather, bought 2023. Excellent condition with 2 scatter cushions.", cond: "Like New", s: "Looking for a laptop or furniture exchange.", tp: "item", ph: "sofa" },
  { u: 1, t: "MacBook Pro 2019 — 16-inch", c: "Electronics", v: 12000, d: "Intel i7, 16GB RAM, 512GB SSD. Space grey. 82 battery cycles.", cond: "Good", s: "Camera gear (mirrorless/DSLR) or mech keyboard + cash.", tp: "item", ph: "mac" },
  { u: 2, t: "Monthly Yoga Pass — 4 Sessions", c: "Services", v: 500, d: "Vinyasa flow at Zen Studio, Durbanville. 4 sessions. All levels.", cond: "New", s: "Swap for art prints, plants, or preserves!", tp: "service", ph: "yoga" },
];

export async function action({ request }: { request: Request }) {
  const body = await request.json();
  if (body.key !== KEY) return Response.json({ error: "bad key" }, { status: 403 });

  const hit = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, USERS[0].email)).limit(1);
  if (hit.length > 0) return Response.json({ message: "Already seeded." });

  for (const u of USERS) {
    await db.insert(schema.users).values({ id: u.id, name: u.name, email: u.email, emailVerified: true, createdAt: ago(60), updatedAt: ago(1) });
    await db.insert(schema.profiles).values({ userId: u.id, displayName: u.name.split(" ")[0], suburb: u.suburb, city: u.city, province: "Western Cape", lat: u.lat, lng: u.lng, searchRadiusKm: 25, bio: u.bio });
    await db.insert(schema.trustProfiles).values({ userId: u.id, level: u.level, completedTrades: u.t, averageRating: u.r, lastActiveAt: ago(1) });
  }

  const ids: number[] = [];
  for (const item of ITEMS) {
    const uid = USERS[item.u].id;
    const [ins] = await db.insert(schema.listings).values({ userId: uid, title: item.t, description: item.d, category: item.c, estimatedValueZar: item.v, condition: item.cond, seekingDescription: item.s, type: item.tp, status: "active", lat: USERS[item.u].lat, lng: USERS[item.u].lng, createdAt: ago(14), updatedAt: ago(1) }).returning({ id: schema.listings.id });
    for (let i = 0; i < PHOTOS[item.ph].length; i++) await db.insert(schema.listingImages).values({ listingId: ins.id, url: img(PHOTOS[item.ph][i]), order: i });
    ids.push(ins.id);
  }

  const [thandi, james, priya] = USERS;
  const [t1] = await db.insert(schema.trades).values({ initiatorId: thandi.id, responderId: james.id, listingId: ids[0], status: "completed", createdAt: ago(10), updatedAt: ago(8) }).returning({ id: schema.trades.id });
  await db.insert(schema.messages).values([
    { tradeId: t1.id, senderId: thandi.id, text: "Hey James! Keen to swap my camera for your bike. R1,300 gap — balance with cash?", type: "text", createdAt: ago(10) },
    { tradeId: t1.id, senderId: james.id, text: "Shot Thandi! Works for me. The bike's ready to ride 😎", type: "text", createdAt: ago(10) },
    { tradeId: t1.id, senderId: thandi.id, text: "Both parties agreed — deal locked in! 🎉", type: "system", createdAt: ago(9) },
    { tradeId: t1.id, senderId: thandi.id, text: "Trade marked as completed!", type: "system", createdAt: ago(8) },
  ]);
  await db.insert(schema.ratings).values([{ tradeId: t1.id, raterId: thandi.id, rateeId: james.id, score: 5, comment: "Smooth trade!" }, { tradeId: t1.id, raterId: james.id, rateeId: thandi.id, score: 5, comment: "Camera is perfect 👊" }]);

  const [t2] = await db.insert(schema.trades).values({ initiatorId: priya.id, responderId: thandi.id, listingId: ids[3], status: "completed", createdAt: ago(7), updatedAt: ago(5) }).returning({ id: schema.trades.id });
  await db.insert(schema.messages).values([
    { tradeId: t2.id, senderId: priya.id, text: "Hi Thandi! Swap a full brand package for my leather sofa?", type: "text", createdAt: ago(7) },
    { tradeId: t2.id, senderId: thandi.id, text: "Yes absolutely! That sofa is gorgeous 😍", type: "text", createdAt: ago(7) },
    { tradeId: t2.id, senderId: priya.id, text: "Both parties agreed! 🎉", type: "system", createdAt: ago(6) },
    { tradeId: t2.id, senderId: priya.id, text: "Trade completed!", type: "system", createdAt: ago(5) },
  ]);
  await db.insert(schema.ratings).values([{ tradeId: t2.id, raterId: priya.id, rateeId: thandi.id, score: 4, comment: "Beautiful brand guide!" }, { tradeId: t2.id, raterId: thandi.id, rateeId: priya.id, score: 5, comment: "Sofa is perfect!" }]);

  return Response.json({ message: "Seeded with real images 📸", users: 3, listings: ITEMS.length, trades: 2 });
}

export async function loader() {
  return Response.json({ message: 'POST {"key":"nozar-seed-2026"} to seed.' });
}
