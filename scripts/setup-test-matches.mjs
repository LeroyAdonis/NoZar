/**
 * Test setup script — creates a test user with listings that match demo data
 * Run: node scripts/setup-test-matches.mjs
 *
 * This creates:
 * 1. A test user "Ricky Demo" with email rickytest@nozar.demo / password TestPass123!
 * 2. 4 listings that would trigger Swap Score matches with seed demo data
 * 3. Seeds the demo data if not already present
 */
import { db } from "../app/lib/db.server.js";
import * as s from "../app/lib/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword } from "@better-auth/utils/password";
import { randomUUID } from "node:crypto";

const DEMO_EMAILS = [
  "thandi@nozar.demo",
  "james@nozar.demo",
  "priya@nozar.demo",
  "nomsa@nozar.demo",
  "thabo@nozar.demo",
];

const TEST_EMAIL = "rickytest@nozar.demo";
const TEST_PASS = "TestPass123!";
const TEST_ID = randomUUID();

function ago(n) {
  return new Date(Date.now() - n * 86400_000);
}

function img(id) {
  return `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=80`;
}

async function main() {
  console.log("--- NoZar Test Match Setup ---\n");

  // 1. Check/seed demo data
  const existing = await db
    .select({ id: s.users.id })
    .from(s.users)
    .where(eq(s.users.email, DEMO_EMAILS[0]))
    .limit(1);

  if (existing.length) {
    console.log("✅ Demo data already seeded");
  } else {
    console.log("⚠️  Demo data not found — please call POST /api/seed-demo first");
    console.log("   curl -X POST https://<preview-url>/api/seed-demo \\");
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"key":"nozar-seed-2026"}\'\n');
  }

  // 2. Check/remove existing test user
  const existingTest = await db
    .select({ id: s.users.id })
    .from(s.users)
    .where(eq(s.users.email, TEST_EMAIL))
    .limit(1);

  if (existingTest.length) {
    console.log("🗑️  Removing existing test user...");
    const uid = existingTest[0].id;
    await db.delete(s.ratings).where(eq(s.ratings.raterId, uid));
    await db.delete(s.ratings).where(eq(s.ratings.rateeId, uid));
    await db.delete(s.threadReadCursors).where(eq(s.threadReadCursors.userId, uid));
    await db.delete(s.messages).where(eq(s.messages.senderId, uid));
    await db.delete(s.tradeItems).where(eq(s.tradeItems.userId, uid));
    await db.delete(s.tradeReports).where(eq(s.tradeReports.reporterId, uid));
    await db.delete(s.readinessFlags).where(eq(s.readinessFlags.userId, uid));
    await db.delete(s.meetupVotes).where(eq(s.meetupVotes.userId, uid));
    await db.delete(s.contactDisclosures).where(eq(s.contactDisclosures.userId, uid));
    await db.delete(s.trades).where(eq(s.trades.initiatorId, uid));
    await db.delete(s.trades).where(eq(s.trades.responderId, uid));
    await db.delete(s.listingImages).where(eq(s.listingImages.listingId, -1));
    await db.delete(s.listings).where(eq(s.listings.userId, uid));
    await db.delete(s.trustProfiles).where(eq(s.trustProfiles.userId, uid));
    await db.delete(s.profiles).where(eq(s.profiles.userId, uid));
    await db.delete(s.sessions).where(eq(s.sessions.userId, uid));
    await db.delete(s.accounts).where(eq(s.accounts.userId, uid));
    await db.delete(s.users).where(eq(s.users.id, uid));
    console.log("✅ Removed old test user");
  }

  // 3. Create test user
  console.log("\n👤 Creating test user...");
  const passwordHash = await hashPassword(TEST_PASS);

  await db.insert(s.users).values({
    id: TEST_ID,
    name: "Ricky Demo",
    email: TEST_EMAIL,
    emailVerified: true,
    createdAt: ago(7),
    updatedAt: ago(1),
  });

  await db.insert(s.accounts).values({
    id: randomUUID(),
    userId: TEST_ID,
    accountId: TEST_ID,
    providerId: "credential",
    password: passwordHash,
    createdAt: ago(7),
    updatedAt: ago(1),
  });

  await db.insert(s.profiles).values({
    userId: TEST_ID,
    displayName: "Ricky",
    suburb: "Observatory",
    city: "Cape Town",
    province: "Western Cape",
    lat: -33.9375,
    lng: 18.4712,
    searchRadiusKm: 75,
    bio: "Testing the new AI features!",
  });

  await db.insert(s.trustProfiles).values({
    userId: TEST_ID,
    level: "verified",
    completedTrades: 2,
    averageRating: 4.5,
    lastActiveAt: ago(1),
  });

  console.log("✅ Test user created: rickytest@nozar.demo / TestPass123!");

  // 4. Create listings that match with demo data
  // We'll create listings where the seeking description matches what demo users have
  // and vice versa — so Swap Scores will fire

  const PH = {
    laptop: [
      "1496181133206-80ce9b88a853",
      "1517336714731-489689fd1ca8",
      "1629131726692-1accd0c53ce0",
    ],
    camera: [
      "1516035069371-29a1b244cc32",
      "1502920917128-1aa500764cbd",
      "1500634245200-e5245c7574ef",
    ],
    headphones: [
      "1505740420928-5e560c06d30e",
      "1555793373-21b9a44c3909",
      "1564182872950-978e194a05cd",
    ],
    bike: [
      "1444491741275-3747c53c99b4",
      "1452573992436-6d508f200b30",
      "1485965120184-e220f721d03e",
    ],
  };

  const MY_LISTINGS = [
    {
      title: "Sony A7 III Mirrorless Camera",
      description:
        "Full-frame mirrorless camera with 24.2MP sensor, 4K video, 5-axis stabilization. Comes with 28-70mm kit lens, spare battery, and UV filter.",
      category: "Electronics",
      estimatedValueZar: 8500,
      condition: "excellent",
      seekingDescription:
        "Looking for a MacBook Pro or high-end laptop for photography editing, or a mountain bike + cash.",
      type: "item",
    },
    {
      title: "Gaming Laptop — ASUS ROG Zephyrus G14",
      description:
        "AMD Ryzen 9, 16GB RAM, 1TB SSD, RTX 3060. Lightweight 14-inch gaming laptop. Excellent condition, used for 6 months.",
      category: "Electronics",
      estimatedValueZar: 14000,
      condition: "good",
      seekingDescription:
        "Want to swap for a camera setup (DSLR/mirrorless) or high-end headphones + cash. Open to furniture trades too.",
      type: "item",
    },
    {
      title: "Bose QuietComfort Ultra Headphones",
      description:
        "Premium noise-cancelling headphones with spatial audio, 24h battery, USB-C. Complete with carry case and cables.",
      category: "Electronics",
      estimatedValueZar: 3200,
      condition: "mint",
      seekingDescription:
        "Looking for a leather sofa, home decor, or a coffee machine. Also open to hiking gear or a yoga pass.",
      type: "item",
    },
    {
      title: "Custom WordPress Website Design",
      description:
        "Full custom WordPress site or landing page with responsive design, SEO basics, and 3 rounds of revisions. Perfect for small businesses.",
      category: "Services",
      estimatedValueZar: 2500,
      condition: "new",
      seekingDescription:
        "Would trade for photography services, graphic design, furniture, or a decent Bluetooth speaker.",
      type: "service",
    },
  ];

  console.log("\n📦 Creating test listings...");
  const listingIds = [];

  for (const item of MY_LISTINGS) {
    const [ins] = await db
      .insert(s.listings)
      .values({
        userId: TEST_ID,
        title: item.title,
        description: item.description,
        category: item.category,
        estimatedValueZar: item.estimatedValueZar,
        condition: item.condition,
        seekingDescription: item.seekingDescription,
        type: item.type,
        status: "active",
        lat: -33.9375,
        lng: 18.4712,
        createdAt: ago(3),
        updatedAt: ago(1),
      })
      .returning({ id: s.listings.id });

    listingIds.push(ins.id);

    // Add images — use appropriate photos based on category
    let photoSet = PH.laptop;
    if (item.title.toLowerCase().includes("camera")) photoSet = PH.camera;
    else if (item.title.toLowerCase().includes("headphone")) photoSet = PH.headphones;
    else if (item.title.toLowerCase().includes("bike")) photoSet = PH.bike;

    for (let i = 0; i < Math.min(photoSet.length, 3); i++) {
      await db.insert(s.listingImages).values({
        listingId: ins.id,
        url: img(photoSet[i]),
        order: i,
      });
    }

    console.log(`  ✅ ${item.title} — ~R${item.estimatedValueZar.toLocaleString("en-ZA")}`);
  }

  console.log(`\n--- Setup Complete! ---`);
  console.log(`\n📧 Email: rickytest@nozar.demo`);
  console.log(`🔑 Password: TestPass123!`);
  console.log(`\nYour listings will match with demo users Thandi (camera, design), James (bike, MacBook),`);
  console.log(`Priya (sofa, yoga pass), and Nomsa (headphones, coffee table).`);
  console.log(`\nOpen Dashboard → tap "AI Match" → see Swap Score badges ✨`);
}

main().catch((e) => {
  console.error("Setup failed:", e);
  process.exit(1);
});
