/**
 * Protected endpoint to seed demo data with real product images
 * uploaded to Vercel Blob for reliable hosting.
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

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400_000);
}

/**
 * Generate image URLs directly from Unsplash (reliable CDN, free to hotlink).
 * We use specific photo IDs for authentic product shots per item.
 */
function img(unsplashId: string): string {
  return `https://images.unsplash.com/photo-${unsplashId}?w=800&h=600&fit=crop&q=80`;
}

// Unsplash photo IDs for each listing (3 per item for variety)
const ITEM_IMAGES: Record<string, string[]> = {
  "canon-eos-200d": [
    "1516035069371-29a1b244cc32",
    "1502920917128-1aa500764cbd",
    "1510127034890-ba27508e9f1c",
  ],
  "giant-talon-3": [
    "1576436185224-2c6690bda11b",
    "1485965120184-e220f721d03e",
    "1561736778-92e52a7769ef",
  ],
  "brand-design": [
    "1626785774573-4b799315345d",
    "1561070791-2526d30994b5",
    "1453928582365-b6ad33cbcf64",
  ],
  "leather-sofa": [
    "1555041469-a586c61ea9bc",
    "1493663284031-b7e3aefcae8e",
    "1540574163026-643ea20ade25",
  ],
  "macbook-pro-2019": [
    "1517336714731-489689fd1ca8",
    "1496181133206-80ce9b88a853",
    "1629131726692-1accd0c53ce0",
  ],
  "yoga-pass": [
    "1545205597-3d9d02c29597",
    "1506126613408-eca07ce68773",
    "1552196563-55cd4e45efb3",
  ],
};

interface ListingSeed {
  userId: string;
  title: string;
  description: string;
  category: string;
  estimatedValueZar: number;
  condition: string;
  seekingDescription: string;
  type: string;
  lat: number;
  lng: number;
  imgKey: string;
  imgIds: string[];
}

const LISTINGS: ListingSeed[] = [
  {
    userId: "", // filled below
    title: "Canon EOS 200D DSLR Camera",
    description: "Lightweight DSLR with 24.2MP sensor, 18-55mm kit lens, EF-S 55-250mm telephoto lens, bag, and 2 extra batteries. Bought in 2022, well looked after. Perfect for photography beginners or content creators.",
    category: "Electronics", estimatedValueZar: 4500, condition: "Good",
    seekingDescription: "Looking for a laptop (MacBook or Windows ultrabook) or photography gear + cash difference.",
    type: "item", lat: -33.9375, lng: 18.4712,
    imgKey: "canon-eos-200d", imgIds: ITEM_IMAGES["canon-eos-200d"],
  },
  {
    userId: "",
    title: "Giant Talon 3 Mountain Bike",
    description: "29er hardtail with hydraulic disc brakes, SRAM 12-speed drivetrain. Ride-ready with new tyres fitted last month. Perfect for Table Mountain trails or Jonkershoek.",
    category: "Sports", estimatedValueZar: 3200, condition: "Good",
    seekingDescription: "Open to offers — looking for camera equipment, power tools, or a laptop.",
    type: "item", lat: -33.9371, lng: 18.8601,
    imgKey: "giant-talon-3", imgIds: ITEM_IMAGES["giant-talon-3"],
  },
  {
    userId: "",
    title: "Professional Logo & Brand Design",
    description: "Custom logo design + brand guide including colour palette, typography, and social media kit. 3 rounds of revisions. Designed for 15+ local SA startups. Portfolio available on request.",
    category: "Services", estimatedValueZar: 1500, condition: "New",
    seekingDescription: "Barter for furniture, home decor, or photography services.",
    type: "service", lat: -33.9375, lng: 18.4712,
    imgKey: "brand-design", imgIds: ITEM_IMAGES["brand-design"],
  },
  {
    userId: "",
    title: "Leather 3-Seater Sofa — Cognac Brown",
    description: "Genuine leather, bought from @Home in 2023. Cognac brown, in excellent condition — no scratches or stains. Includes 2 matching scatter cushions. Moving and can't take it with me.",
    category: "Home & Garden", estimatedValueZar: 6000, condition: "Like New",
    seekingDescription: "Looking for a laptop for my daughter's studies, or furniture exchange.",
    type: "item", lat: -33.8342, lng: 18.6476,
    imgKey: "leather-sofa", imgIds: ITEM_IMAGES["leather-sofa"],
  },
  {
    userId: "",
    title: "MacBook Pro 2019 — 16-inch",
    description: "Intel Core i7, 16GB RAM, 512GB SSD. Space grey. Includes original charger and Tomtoc sleeve. Battery at 82 cycles. Upgrading to M-series, so this needs a new home.",
    category: "Electronics", estimatedValueZar: 12000, condition: "Good",
    seekingDescription: "Open to trades — especially camera gear (mirrorless or DSLR), or a mechanical keyboard + cash.",
    type: "item", lat: -33.9371, lng: 18.8601,
    imgKey: "macbook-pro-2019", imgIds: ITEM_IMAGES["macbook-pro-2019"],
  },
  {
    userId: "",
    title: "Monthly Yoga Pass — 4 Sessions",
    description: "Vinyasa flow at Zen Studio in Durbanville. Valid for 4 sessions in a calendar month. Includes mat hire. Suitable for all levels — beginners welcome!",
    category: "Services", estimatedValueZar: 500, condition: "New",
    seekingDescription: "Swap for art prints, plants, or homemade preserves!",
    type: "service", lat: -33.8342, lng: 18.6476,
    imgKey: "yoga-pass", imgIds: ITEM_IMAGES["yoga-pass"],
  },
];

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405 });
  }

  const body = await request.json();
  if (body.key !== SEED_SECRET) {
    return Response.json({ error: "Invalid key" }, { status: 403 });
  }

  // Check if already seeded — clean up for re-seed
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, "thandi@nozar.demo"))
    .limit(1);

  if (existing.length > 0) {
    // Delete in dependency order — many FK refs don't cascade
    for (const u of existing) {
      try {
        await db.delete(schema.threadReadCursors).where(eq(schema.threadReadCursors.userId, u.id));
        await db.delete(schema.ratings).where(eq(schema.ratings.raterId, u.id));
        await db.delete(schema.ratings).where(eq(schema.ratings.rateeId, u.id));
        await db.delete(schema.messages).where(eq(schema.messages.senderId, u.id));
        await db.delete(schema.tradeItems).where(eq(schema.tradeItems.userId, u.id));
        await db.delete(schema.tradeReports).where(eq(schema.tradeReports.reporterId, u.id));
        await db.delete(schema.readinessFlags).where(eq(schema.readinessFlags.userId, u.id));
        await db.delete(schema.meetupVotes).where(eq(schema.meetupVotes.userId, u.id));
        await db.delete(schema.contactDisclosures).where(eq(schema.contactDisclosures.userId, u.id));
        // Trades reference users without cascade — use raw SQL to bypass FK issues
        await db.delete(schema.meetupSpots).where(eq(schema.meetupSpots.id, 0)); // no-op, trades are new
        await db.delete(schema.trades).where(eq(schema.trades.initiatorId, u.id));
        await db.delete(schema.trades).where(eq(schema.trades.responderId, u.id));
        await db.delete(schema.listings).where(eq(schema.listings.userId, u.id));
        await db.delete(schema.trustProfiles).where(eq(schema.trustProfiles.userId, u.id));
        await db.delete(schema.profiles).where(eq(schema.profiles.userId, u.id));
        await db.delete(schema.users).where(eq(schema.users.id, u.id));
      } catch (e) {
        return Response.json({
          error: "Cleanup failed",
          detail: (e as Error).message,
          userId: u.id,
        }, { status: 500 });
      }
    }
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

  // 1. Insert users, profiles, trust profiles
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

  // Assign users to listings
  LISTINGS[0].userId = users[0].id; // Camera → Thandi
  LISTINGS[1].userId = users[1].id; // Bike → James
  LISTINGS[2].userId = users[0].id; // Brand design → Thandi
  LISTINGS[3].userId = users[2].id; // Sofa → Priya
  LISTINGS[4].userId = users[1].id; // MacBook → James
  LISTINGS[5].userId = users[2].id; // Yoga → Priya

  // 2. Insert listings with real images
  const listingIds: number[] = [];
  for (const l of LISTINGS) {
    const [ins] = await db.insert(schema.listings).values({
      userId: l.userId, title: l.title, description: l.description,
      category: l.category, estimatedValueZar: l.estimatedValueZar,
      condition: l.condition, seekingDescription: l.seekingDescription,
      type: l.type, status: "active", lat: l.lat, lng: l.lng,
      createdAt: daysAgo(14), updatedAt: daysAgo(1),
    }).returning({ id: schema.listings.id });
    const lid = ins.id;

    // Generate image URLs (no upload needed — direct from Unsplash CDN)
    const urls = l.imgIds.map(photoId => img(photoId));

    for (let i = 0; i < urls.length; i++) {
      await db.insert(schema.listingImages).values({
        listingId: lid,
        url: urls[i],
        order: i,
      });
    }
    listingIds.push(lid);
  }

  // 3. Trade 1: Thandi's camera ↔ James's bike + R1,300
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

  // 4. Trade 2: Priya's sofa ↔ Thandi's design services
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
    message: "Seeded with real product images 📸",
    users: users.map(u => u.name),
    listings: LISTINGS.length,
    trades: 2,
  });
}

export async function loader() {
  return Response.json({
    message: 'Send a POST with {"key":"<secret>"} to seed demo data with real product images.',
  });
}
