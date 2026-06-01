/**
 * Protected endpoint to seed demo data.
 * Only callable with a secret key so it can't be abused in production.
 *
 * Trigger: curl -X POST https://nozar.co.za/api/seed-demo \
 *   -H "Content-Type: application/json" \
 *   -d '{"key":"<SEED_SECRET>"}'
 */
import { db } from "~/lib/db.server";
import * as schema from "~/lib/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const SEED_SECRET = process.env.SEED_SECRET || "nozar-seed-2026";

function uid() {
  return randomUUID();
}

function img(name: string, w = 800, h = 600) {
  return `https://picsum.photos/seed/${name}/${w}/${h}`;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400_000);
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405 });
  }

  const body = await request.json();
  if (body.key !== SEED_SECRET) {
    return Response.json({ error: "Invalid key" }, { status: 403 });
  }

  // Check if already seeded
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, "thandi@nozar.demo"))
    .limit(1);

  if (existing.length > 0) {
    return Response.json({ message: "Already seeded" });
  }

  const users = [
    {
      id: uid(), name: "Thandi Mokoena", email: "thandi@nozar.demo",
      suburb: "Observatory", city: "Cape Town", province: "Western Cape",
      lat: -33.9375, lng: 18.4712,
      level: "verified" as const, completedTrades: 4, averageRating: 4.8,
      bio: "📍 Cape Town. Designer & photographer. Love trading skills as much as things.",
    },
    {
      id: uid(), name: "James van der Merwe", email: "james@nozar.demo",
      suburb: "Stellenbosch Central", city: "Stellenbosch", province: "Western Cape",
      lat: -33.9371, lng: 18.8601,
      level: "verified" as const, completedTrades: 2, averageRating: 4.5,
      bio: "📍 Stellenbosch. Mountain biker and tech nerd. Swapping gear is my hobby.",
    },
    {
      id: uid(), name: "Priya Naidoo", email: "priya@nozar.demo",
      suburb: "Durbanville", city: "Cape Town", province: "Western Cape",
      lat: -33.8342, lng: 18.6476,
      level: "newcomer" as const, completedTrades: 1, averageRating: 4.0,
      bio: "📍 Durbanville. Yoga instructor and plant mom. Bartering is the future.",
    },
  ];

  for (const u of users) {
    await db.insert(schema.users).values({
      id: u.id, name: u.name, email: u.email, emailVerified: true,
      createdAt: daysAgo(60), updatedAt: daysAgo(1),
    });
    await db.insert(schema.profiles).values({
      userId: u.id, displayName: u.name.split(" ")[0],
      suburb: u.suburb, city: u.city, province: u.province,
      lat: u.lat, lng: u.lng, searchRadiusKm: 25, bio: u.bio,
    });
    await db.insert(schema.trustProfiles).values({
      userId: u.id, level: u.level, completedTrades: u.completedTrades,
      averageRating: u.averageRating, lastActiveAt: daysAgo(1),
    });
  }

  const listings = [
    { userId: users[0].id, title: "Canon EOS 200D DSLR Camera", description: "Lightweight DSLR with 24.2MP sensor, 18-55mm kit lens, EF-S 55-250mm telephoto lens, bag, and 2 extra batteries. Bought in 2022, well looked after.", category: "Electronics", estimatedValueZar: 4500, condition: "Good", seekingDescription: "Looking for a laptop (MacBook or Windows ultrabook) or photography gear + cash difference.", type: "item", lat: -33.9375, lng: 18.4712, imgSeed: "canon-eos-200d" },
    { userId: users[1].id, title: "Giant Talon 3 Mountain Bike", description: "29er hardtail with hydraulic disc brakes, SRAM 12-speed drivetrain. Ride-ready with new tyres fitted last month.", category: "Sports", estimatedValueZar: 3200, condition: "Good", seekingDescription: "Open to offers — looking for camera equipment, power tools, or a laptop.", type: "item", lat: -33.9371, lng: 18.8601, imgSeed: "giant-talon-3" },
    { userId: users[0].id, title: "Professional Logo & Brand Design", description: "Custom logo design + brand guide including colour palette, typography, and social media kit. 3 rounds of revisions. Designed for 15+ local SA startups.", category: "Services", estimatedValueZar: 1500, condition: "New", seekingDescription: "Barter for furniture, home decor, or photography services.", type: "service", lat: -33.9375, lng: 18.4712, imgSeed: "brand-design" },
    { userId: users[2].id, title: "Leather 3-Seater Sofa — Cognac Brown", description: "Genuine leather, bought from @Home in 2023. Cognac brown, in excellent condition with 2 matching scatter cushions.", category: "Home & Garden", estimatedValueZar: 6000, condition: "Like New", seekingDescription: "Looking for a laptop for my daughter's studies, or furniture exchange.", type: "item", lat: -33.8342, lng: 18.6476, imgSeed: "leather-sofa" },
    { userId: users[1].id, title: "MacBook Pro 2019 — 16-inch", description: "Intel Core i7, 16GB RAM, 512GB SSD. Space grey. Includes original charger and Tomtoc sleeve. Battery at 82 cycles.", category: "Electronics", estimatedValueZar: 12000, condition: "Good", seekingDescription: "Open to trades — especially camera gear (mirrorless or DSLR), or a mechanical keyboard + cash.", type: "item", lat: -33.9371, lng: 18.8601, imgSeed: "macbook-pro-2019" },
    { userId: users[2].id, title: "Monthly Yoga Pass — 4 Sessions", description: "Vinyasa flow at Zen Studio in Durbanville. Valid for 4 sessions in a calendar month. Includes mat hire. Suitable for all levels.", category: "Services", estimatedValueZar: 500, condition: "New", seekingDescription: "Swap for art prints, plants, or homemade preserves!", type: "service", lat: -33.8342, lng: 18.6476, imgSeed: "yoga-pass" },
  ];

  const listingIds: number[] = [];
  for (const l of listings) {
    const [ins] = await db.insert(schema.listings).values({
      userId: l.userId, title: l.title, description: l.description,
      category: l.category, estimatedValueZar: l.estimatedValueZar,
      condition: l.condition, seekingDescription: l.seekingDescription,
      type: l.type, status: "active", lat: l.lat, lng: l.lng,
      createdAt: daysAgo(14), updatedAt: daysAgo(1),
    }).returning({ id: schema.listings.id });
    const lid = ins.id;
    for (let i = 0; i < 3; i++) {
      await db.insert(schema.listingImages).values({ listingId: lid, url: img(`${l.imgSeed}-${i}`, 800, 600), order: i });
    }
    listingIds.push(lid);
  }

  // Trade 1: Thandi's camera ↔ James's bike + R1,300
  const [t1] = await db.insert(schema.trades).values({
    initiatorId: users[0].id, responderId: users[1].id, listingId: listingIds[0],
    status: "completed", createdAt: daysAgo(10), updatedAt: daysAgo(8),
  }).returning({ id: schema.trades.id });

  await db.insert(schema.messages).values([
    { tradeId: t1.id, senderId: users[0].id, text: "Hey James! Keen to swap my camera for your bike. Looks like there's a R1,300 gap — want to balance with cash?", type: "text", createdAt: daysAgo(10) },
    { tradeId: t1.id, senderId: users[1].id, text: "Shot Thandi! Yeah that works for me. The bike's ready to ride 😎", type: "text", createdAt: daysAgo(10) },
    { tradeId: t1.id, senderId: users[0].id, text: "Both parties agreed — deal locked in! 🎉", type: "system", createdAt: daysAgo(9) },
    { tradeId: t1.id, senderId: users[0].id, text: "Trade marked as completed — thank you for using NoZar!", type: "system", createdAt: daysAgo(8) },
  ]);
  await db.insert(schema.ratings).values([
    { tradeId: t1.id, raterId: users[0].id, rateeId: users[1].id, score: 5, comment: "Smooth trade, bike was in great condition!" },
    { tradeId: t1.id, raterId: users[1].id, rateeId: users[0].id, score: 5, comment: "Camera is perfect. Would trade again 👊" },
  ]);
  await db.insert(schema.threadReadCursors).values([
    { userId: users[0].id, tradeId: t1.id, lastReadAt: daysAgo(8) },
    { userId: users[1].id, tradeId: t1.id, lastReadAt: daysAgo(8) },
  ]);

  // Trade 2: Priya's sofa ↔ Thandi's design services
  const [t2] = await db.insert(schema.trades).values({
    initiatorId: users[2].id, responderId: users[0].id, listingId: listingIds[3],
    status: "completed", createdAt: daysAgo(7), updatedAt: daysAgo(5),
  }).returning({ id: schema.trades.id });

  await db.insert(schema.messages).values([
    { tradeId: t2.id, senderId: users[2].id, text: "Hi Thandi! Love your design work. Would you swap a full brand package for my leather sofa?", type: "text", createdAt: daysAgo(7) },
    { tradeId: t2.id, senderId: users[0].id, text: "Priya that sofa is gorgeous! Yes absolutely — I'll do the full brand guide for it 😍", type: "text", createdAt: daysAgo(7) },
    { tradeId: t2.id, senderId: users[0].id, text: "Both parties agreed — deal locked in! 🎉", type: "system", createdAt: daysAgo(6) },
    { tradeId: t2.id, senderId: users[0].id, text: "Trade marked as completed — thank you for using NoZar!", type: "system", createdAt: daysAgo(5) },
  ]);
  await db.insert(schema.ratings).values([
    { tradeId: t2.id, raterId: users[2].id, rateeId: users[0].id, score: 4, comment: "Brand guide is beautiful! Sofa is all hers now 😊" },
    { tradeId: t2.id, raterId: users[0].id, rateeId: users[2].id, score: 5, comment: "Sofa is in perfect condition. My lounge is complete!" },
  ]);
  await db.insert(schema.threadReadCursors).values([
    { userId: users[2].id, tradeId: t2.id, lastReadAt: daysAgo(5) },
    { userId: users[0].id, tradeId: t2.id, lastReadAt: daysAgo(5) },
  ]);

  return Response.json({
    message: "Seeded successfully",
    users: users.map(u => u.name),
    listings: listings.length,
    trades: 2,
  });
}

export async function loader() {
  return Response.json({
    message: "Send a POST with {\"key\":\"<secret>\"} to seed demo data.",
  });
}
