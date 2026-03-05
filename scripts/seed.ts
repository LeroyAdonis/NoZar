import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../app/lib/schema";

// ─── Database Connection ────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ─── Seed User IDs (hardcoded for reproducibility) ─────────────
const USER_ZANELE = "seed-zanele-m-001";
const USER_SIPHO = "seed-sipho-k-002";
const USER_SARAH = "seed-sarah-t-003";

// ─── Locations (Gauteng, South Africa) ─────────────────────────
const LOCATIONS = {
  zanele: { suburb: "Sandton", city: "Johannesburg", province: "Gauteng", lat: -26.1076, lng: 28.0567 },
  sipho: { suburb: "Soweto", city: "Johannesburg", province: "Gauteng", lat: -26.2485, lng: 27.8546 },
  sarah: { suburb: "Braamfontein", city: "Johannesburg", province: "Gauteng", lat: -26.1929, lng: 28.0338 },
} as const;

/** Add a small random offset (±0.005 degrees ≈ ±500m) to a coordinate */
function jitter(value: number): number {
  return value + (Math.random() - 0.5) * 0.01;
}

// ─── Seed Function ──────────────────────────────────────────────
async function seed() {
  console.log("🌱 Seeding NoZar database...\n");

  // 1. Clear existing data in reverse FK order
  console.log("🗑️  Clearing existing data...");
  await db.delete(schema.ratings);
  await db.delete(schema.contactDisclosures);
  await db.delete(schema.messages);
  await db.delete(schema.trades);
  await db.delete(schema.listingImages);
  await db.delete(schema.listings);
  await db.delete(schema.profiles);
  await db.delete(schema.sessions);
  await db.delete(schema.accounts);
  await db.delete(schema.verifications);
  await db.delete(schema.users);
  console.log("   ✓ All tables cleared\n");

  // 2. Create users
  // NOTE: These users are inserted directly — they won't have login credentials.
  // Real users should register via the Better Auth sign-up flow.
  // These seed users exist so listings and trades show up in the feed.
  console.log("👤 Creating users...");
  const now = new Date();

  await db.insert(schema.users).values([
    {
      id: USER_ZANELE,
      name: "Zanele M.",
      email: "zanele@example.com",
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: USER_SIPHO,
      name: "Sipho K.",
      email: "sipho@example.com",
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: USER_SARAH,
      name: "Sarah T.",
      email: "sarah@example.com",
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  console.log("   ✓ 3 users created (Zanele, Sipho, Sarah)\n");

  // 3. Create profiles
  console.log("📋 Creating profiles...");
  await db.insert(schema.profiles).values([
    {
      userId: USER_ZANELE,
      displayName: "Zanele M.",
      bio: "Tech enthusiast from Sandton. Always looking to swap gadgets and sneakers! 📱👟",
      suburb: LOCATIONS.zanele.suburb,
      city: LOCATIONS.zanele.city,
      province: LOCATIONS.zanele.province,
      lat: LOCATIONS.zanele.lat,
      lng: LOCATIONS.zanele.lng,
      searchRadiusKm: 15,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: USER_SIPHO,
      displayName: "Sipho K.",
      bio: "Musician & green thumb based in Soweto. I barter tools, teach guitar, and grow the best tomatoes in Gauteng 🌱🎸",
      suburb: LOCATIONS.sipho.suburb,
      city: LOCATIONS.sipho.city,
      province: LOCATIONS.sipho.province,
      lat: LOCATIONS.sipho.lat,
      lng: LOCATIONS.sipho.lng,
      searchRadiusKm: 20,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: USER_SARAH,
      displayName: "Sarah T.",
      bio: "Freelance designer in Braamfontein. Will trade design work for interesting things! 🎨✨",
      suburb: LOCATIONS.sarah.suburb,
      city: LOCATIONS.sarah.city,
      province: LOCATIONS.sarah.province,
      lat: LOCATIONS.sarah.lat,
      lng: LOCATIONS.sarah.lng,
      searchRadiusKm: 10,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  console.log("   ✓ 3 profiles created\n");

  // 4. Create listings
  console.log("📦 Creating listings...");
  const listingRows = await db
    .insert(schema.listings)
    .values([
      {
        userId: USER_ZANELE,
        title: "Sony A7III Camera",
        description:
          "Full-frame mirrorless camera in excellent condition. Includes 28-70mm kit lens, 2 batteries, and a carrying case. Shutter count under 15k. Perfect for aspiring photographers.",
        category: "Electronics",
        estimatedValueZar: 18000,
        condition: "excellent",
        deliveryMethod: "meetup",
        seekingDescription: "Looking for a MacBook Pro or high-end drone",
        type: "item",
        status: "active",
        lat: jitter(LOCATIONS.zanele.lat),
        lng: jitter(LOCATIONS.zanele.lng),
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        userId: USER_SIPHO,
        title: "Garden Tool Set",
        description:
          "Complete 12-piece garden tool set: spade, fork, rake, pruning shears, trowel, weeder, and more. All in great condition, used for one season only.",
        category: "Home & Garden",
        estimatedValueZar: 1200,
        condition: "good",
        deliveryMethod: "meetup",
        seekingDescription: "Would love some guitar strings, a capo, or any musical accessories",
        type: "item",
        status: "active",
        lat: jitter(LOCATIONS.sipho.lat),
        lng: jitter(LOCATIONS.sipho.lng),
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        userId: USER_SARAH,
        title: "UI/UX Design Services",
        description:
          "Professional UI/UX design services — logo design, app wireframes, brand identity packages. 5 years experience. Portfolio available on request.",
        category: "Services",
        estimatedValueZar: 5000,
        condition: null,
        deliveryMethod: "delivery",
        seekingDescription: "Open to anything interesting — electronics, art supplies, or unique experiences",
        type: "service",
        status: "active",
        lat: jitter(LOCATIONS.sarah.lat),
        lng: jitter(LOCATIONS.sarah.lng),
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        userId: USER_ZANELE,
        title: "Nike Air Max 90",
        description:
          "Nike Air Max 90 in the SA-exclusive Protea colourway 🇿🇦. Size UK 7 / US 8. Worn twice, basically brand new with box.",
        category: "Fashion",
        estimatedValueZar: 2500,
        condition: "like_new",
        deliveryMethod: "meetup",
        seekingDescription: "Looking for Adidas Ultraboost or any running shoes size UK 7",
        type: "item",
        status: "active",
        lat: jitter(LOCATIONS.zanele.lat),
        lng: jitter(LOCATIONS.zanele.lng),
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        userId: USER_SIPHO,
        title: "Guitar Lessons (4 Sessions)",
        description:
          "Offering 4x 1-hour guitar lessons for beginners or intermediate players. I've been playing for 12 years and have taught at community centres across Soweto. Acoustic or electric.",
        category: "Skills",
        estimatedValueZar: 2000,
        condition: null,
        deliveryMethod: "meetup",
        seekingDescription: "Need help with basic plumbing or electrical work around the house",
        type: "service",
        status: "active",
        lat: jitter(LOCATIONS.sipho.lat),
        lng: jitter(LOCATIONS.sipho.lng),
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        userId: USER_SARAH,
        title: "Trek Mountain Bike",
        description:
          "Trek Marlin 7 mountain bike, 2024 model. Medium frame, 29\" wheels. Recently serviced — new brake pads, chain, and tyres. Great for Joburg trails.",
        category: "Sports",
        estimatedValueZar: 12000,
        condition: "good",
        deliveryMethod: "meetup",
        seekingDescription: "Looking for a road bike, camera gear, or a good quality tent",
        type: "item",
        status: "active",
        lat: jitter(LOCATIONS.sarah.lat),
        lng: jitter(LOCATIONS.sarah.lng),
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      },
    ])
    .returning({ id: schema.listings.id });

  const [camera, gardenTools, designServices, nikes, guitarLessons, bike] = listingRows;
  console.log(`   ✓ 6 listings created (IDs: ${listingRows.map((r) => r.id).join(", ")})\n`);

  // 5. Create listing images (placeholder URLs)
  console.log("🖼️  Creating listing images...");
  await db.insert(schema.listingImages).values([
    { listingId: camera.id, url: "https://picsum.photos/seed/sony-a7iii/640/480", blurHash: null, order: 0 },
    { listingId: gardenTools.id, url: "https://picsum.photos/seed/garden-tools/640/480", blurHash: null, order: 0 },
    { listingId: designServices.id, url: "https://picsum.photos/seed/design-services/640/480", blurHash: null, order: 0 },
    { listingId: nikes.id, url: "https://picsum.photos/seed/nike-air-max/640/480", blurHash: null, order: 0 },
    { listingId: guitarLessons.id, url: "https://picsum.photos/seed/guitar-lessons/640/480", blurHash: null, order: 0 },
    { listingId: bike.id, url: "https://picsum.photos/seed/trek-bike/640/480", blurHash: null, order: 0 },
  ]);
  console.log("   ✓ 6 listing images created\n");

  // 6. Create trades
  console.log("🤝 Creating trades...");

  // Trade 1: Sipho wants Zanele's camera, offering garden tools
  // Trade 2: Sarah wants Sipho's guitar lessons, offering design services
  const tradeRows = await db
    .insert(schema.trades)
    .values([
      {
        initiatorId: USER_SIPHO,
        responderId: USER_ZANELE,
        listingId: camera.id,
        status: "proposed",
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        initiatorId: USER_SARAH,
        responderId: USER_SIPHO,
        listingId: guitarLessons.id,
        status: "accepted",
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
    ])
    .returning({ id: schema.trades.id });

  const [tradeCameraTool, tradeGuitarDesign] = tradeRows;
  console.log(`   ✓ 2 trades created (IDs: ${tradeRows.map((r) => r.id).join(", ")})\n`);

  // 7. Create messages for each trade
  console.log("💬 Creating messages...");
  await db.insert(schema.messages).values([
    // Trade 1: Sipho ↔ Zanele (Camera)
    {
      tradeId: tradeCameraTool.id,
      senderId: USER_SIPHO,
      text: "Hi Zanele! Love the Sony A7III. I've got a complete garden tool set — barely used. Would you consider a swap?",
      type: "text",
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      tradeId: tradeCameraTool.id,
      senderId: USER_ZANELE,
      text: "Hey Sipho! Thanks for reaching out. The camera's in great condition. The tools sound interesting but the value difference is quite big — do you have anything else to add?",
      type: "text",
      createdAt: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000),
    },
    {
      tradeId: tradeCameraTool.id,
      senderId: USER_SIPHO,
      text: "Fair point! I could throw in 4 guitar lessons as well — that brings the total value closer. What do you think?",
      type: "text",
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },

    // Trade 2: Sarah ↔ Sipho (Guitar Lessons)
    {
      tradeId: tradeGuitarDesign.id,
      senderId: USER_SARAH,
      text: "Hi Sipho! I'd love to learn guitar. I can offer a full brand identity package — logo, colour palette, and social media templates — in exchange for the 4 lessons.",
      type: "text",
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      tradeId: tradeGuitarDesign.id,
      senderId: USER_SIPHO,
      text: "That's an amazing offer, Sarah! I've been wanting a proper logo for my music page. Let's do it! When can you start?",
      type: "text",
      createdAt: new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000),
    },
    {
      tradeId: tradeGuitarDesign.id,
      senderId: USER_SARAH,
      text: "Lekker! 🎉 I can start the design work this week. Shall we meet at a coffee shop in Braamfontein for the first lesson on Saturday?",
      type: "text",
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      tradeId: tradeGuitarDesign.id,
      senderId: USER_SIPHO,
      text: "Saturday works perfectly! There's a great spot on Juta Street. See you at 10am? 🎸",
      type: "text",
      createdAt: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000),
    },
  ]);
  console.log("   ✓ 7 messages created across 2 trades\n");

  // ─── Summary ──────────────────────────────────────────────────
  console.log("─".repeat(50));
  console.log("✅ Seeding complete!\n");
  console.log("   Users:    3 (Zanele, Sipho, Sarah)");
  console.log("   Profiles: 3");
  console.log("   Listings: 6");
  console.log("   Images:   6");
  console.log("   Trades:   2");
  console.log("   Messages: 7");
  console.log("");
  console.log("   ⚠️  These users have no login credentials.");
  console.log("   Register via the auth flow to create loginable accounts.");
  console.log("─".repeat(50));
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
