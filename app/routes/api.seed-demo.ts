import { db } from "~/lib/db.server";
import * as s from "~/lib/schema";
import { eq } from "drizzle-orm";

const KEY = "nozar-seed-2026";

function uid() { return crypto.randomUUID(); }
function ago(n: number) { return new Date(Date.now() - n * 86400_000); }
function img(id: string) { return `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=80`; }

export async function action({ request }: { request: Request }) {
  const body = await request.json();
  if (body.key !== KEY) return Response.json({ error: "bad key" }, { status: 403 });

  const DEMO = ["thandi@nozar.demo", "james@nozar.demo", "priya@nozar.demo", "nomsa@nozar.demo", "thabo@nozar.demo"];

  // Reset mode
  if (body.reset) {
    for (const email of DEMO) {
      const rows = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email)).limit(1);
      if (!rows.length) continue;
      const id = rows[0].id;
      await db.delete(s.ratings).where(eq(s.ratings.raterId, id));
      await db.delete(s.ratings).where(eq(s.ratings.rateeId, id));
      await db.delete(s.threadReadCursors).where(eq(s.threadReadCursors.userId, id));
      await db.delete(s.messages).where(eq(s.messages.senderId, id));
      await db.delete(s.tradeItems).where(eq(s.tradeItems.userId, id));
      await db.delete(s.tradeReports).where(eq(s.tradeReports.reporterId, id));
      await db.delete(s.readinessFlags).where(eq(s.readinessFlags.userId, id));
      await db.delete(s.meetupVotes).where(eq(s.meetupVotes.userId, id));
      await db.delete(s.contactDisclosures).where(eq(s.contactDisclosures.userId, id));
      await db.delete(s.trades).where(eq(s.trades.initiatorId, id));
      await db.delete(s.trades).where(eq(s.trades.responderId, id));
      await db.delete(s.listingImages).where(eq(s.listingImages.listingId, -1)); // no-op cleanup as listing cascade handles these
      await db.delete(s.listings).where(eq(s.listings.userId, id));
      await db.delete(s.trustProfiles).where(eq(s.trustProfiles.userId, id));
      await db.delete(s.profiles).where(eq(s.profiles.userId, id));
      await db.delete(s.users).where(eq(s.users.id, id));
    }
    return Response.json({ message: "Reset." });
  }

  // Seed mode — skip if already exists
  const hit = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, DEMO[0])).limit(1);
  if (hit.length) return Response.json({ message: "Already seeded — call with reset:true first." });

  const USERS = [
    { id: uid(), name: "Thandi Mokoena", email: DEMO[0], sub: "Observatory", city: "Cape Town", lat: -33.9375, lng: 18.4712, level: "verified" as const, tr: 4, rat: 4.8, bio: "Cape Town. Designer & photographer." },
    { id: uid(), name: "James van der Merwe", email: DEMO[1], sub: "Stellenbosch Central", city: "Stellenbosch", lat: -33.9371, lng: 18.8601, level: "verified" as const, tr: 2, rat: 4.5, bio: "Stellenbosch. Mountain biker & tech nerd." },
    { id: uid(), name: "Priya Naidoo", email: DEMO[2], sub: "Durbanville", city: "Cape Town", lat: -33.8342, lng: 18.6476, level: "newcomer" as const, tr: 1, rat: 4.0, bio: "Durbanville. Yoga instructor & plant mom." },
    { id: uid(), name: "Nomsa Dlamini", email: DEMO[3], sub: "Sandton Central", city: "Johannesburg", lat: -26.1077, lng: 28.0567, level: "verified" as const, tr: 3, rat: 4.7, bio: "Joburg. UX designer & vintage collector." },
    { id: uid(), name: "Thabo Molefe", email: DEMO[4], sub: "Soweto", city: "Johannesburg", lat: -26.2557, lng: 27.8581, level: "newcomer" as const, tr: 1, rat: 4.0, bio: "Soweto. Mechanic & DIY handyman." },
  ];

  const PH: Record<string, string[]> = {
    c: ["1516035069371-29a1b244cc32","1502920917128-1aa500764cbd","1500634245200-e5245c7574ef"],
    b: ["1444491741275-3747c53c99b4","1452573992436-6d508f200b30","1485965120184-e220f721d03e"],
    d: ["1626785774573-4b799315345d","1561070791-2526d30994b5","1453928582365-b6ad33cbcf64"],
    s: ["1555041469-a586c61ea9bc","1493663284031-b7e3aefcae8e","1540574163026-643ea20ade25"],
    m: ["1517336714731-489689fd1ca8","1496181133206-80ce9b88a853","1629131726692-1accd0c53ce0"],
    y: ["1545205597-3d9d02c29597","1506126613408-eca07ce68773","1552196563-55cd4e45efb3"],
    j1: ["1498709112912-9be3173d30be","1534201569625-ed4662d8be97","1542372147193-a7aca54189cd"],
    j2: ["1484704849700-f032a568e944","1491927570842-0261e477d937","1505740420928-5e560c06d30e"],
    j3: ["1461870083782-4d7b4f364728","1501621965065-c6e1cf6b53e2","1511306404404-ad607bd7c601"],
    j4: ["1522322512347-a0e57fd1744c","1555793373-21b9a44c3909","1564182872950-978e194a05cd"],
  };

  for (const u of USERS) {
    const prov = u.city === "Johannesburg" ? "Gauteng" : "Western Cape";
    await db.insert(s.users).values({ id: u.id, name: u.name, email: u.email, emailVerified: true, createdAt: ago(60), updatedAt: ago(1) });
    await db.insert(s.profiles).values({ userId: u.id, displayName: u.name.split(" ")[0], suburb: u.sub, city: u.city, province: prov, lat: u.lat, lng: u.lng, searchRadiusKm: 25, bio: u.bio });
    await db.insert(s.trustProfiles).values({ userId: u.id, level: u.level, completedTrades: u.tr, averageRating: u.rat, lastActiveAt: ago(1) });
  }

  const ITEMS = [
    { u: 0, t: "Canon EOS 200D DSLR Camera", ca: "Electronics", v: 4500, d: "Lightweight DSLR with 24.2MP sensor, 18-55mm kit lens, telephoto lens, bag & 2 batteries.", co: "Good", s: "Looking for a laptop or photography gear + cash.", tp: "item", ph: "c" },
    { u: 1, t: "Giant Talon 3 Mountain Bike", ca: "Sports", v: 3200, d: "29er hardtail with hydraulic disc brakes, SRAM 12-speed. New tyres.", co: "Good", s: "Open to offers — camera gear, power tools, or a laptop.", tp: "item", ph: "b" },
    { u: 0, t: "Professional Logo & Brand Design", ca: "Services", v: 1500, d: "Custom logo + brand guide with colour palette, typography & social kit.", co: "New", s: "Barter for furniture, home decor, or photography services.", tp: "service", ph: "d" },
    { u: 2, t: "Leather 3-Seater Sofa — Cognac Brown", ca: "Home & Garden", v: 6000, d: "Genuine leather, bought 2023. Excellent condition with 2 scatter cushions.", co: "Like New", s: "Looking for a laptop or furniture exchange.", tp: "item", ph: "s" },
    { u: 1, t: "MacBook Pro 2019 — 16-inch", ca: "Electronics", v: 12000, d: "Intel i7, 16GB RAM, 512GB SSD. Space grey. 82 battery cycles.", co: "Good", s: "Camera gear (mirrorless/DSLR) or mech keyboard + cash.", tp: "item", ph: "m" },
    { u: 2, t: "Monthly Yoga Pass — 4 Sessions", ca: "Services", v: 500, d: "Vinyasa flow at Zen Studio, Durbanville. 4 sessions. All levels.", co: "New", s: "Swap for art prints, plants, or preserves!", tp: "service", ph: "y" },
    { u: 3, t: "Vintage Mid-Century Coffee Table", ca: "Home & Garden", v: 3500, d: "Teak wood, hairpin legs. Sandton pickup. Danish modern style.", co: "Good", s: "Swap for designer furniture, vinyl records, or art prints.", tp: "item", ph: "j1" },
    { u: 3, t: "Sony WH-1000XM5 Headphones", ca: "Electronics", v: 2800, d: "Noise-cancelling, 30h battery, USB-C. Mint condition with case & cable.", co: "Like New", s: "Open to camera gear, smartwatch, or a coffee machine.", tp: "item", ph: "j2" },
    { u: 4, t: "Soweto Experience Walking Tour", ca: "Services", v: 800, d: "Half-day guided walking tour of Soweto. Vilakazi Street, Mandela House, local bunny chow lunch included.", co: "New", s: "Barter for photography services, hiking gear, or art supplies.", tp: "service", ph: "j3" },
    { u: 4, t: "DeWalt 4½\" Angle Grinder", ca: "Tools", v: 1800, d: "Corded 850W, 11,000 RPM. Like-new condition with 5 cutting discs & carry case.", co: "Good", s: "Swap for power tools, a toolkit, or decent Bluetooth speaker.", tp: "item", ph: "j4" },
  ];

  const ids: number[] = [];
  for (const item of ITEMS) {
    const u = USERS[item.u];
    const [ins] = await db.insert(s.listings).values({ userId: u.id, title: item.t, description: item.d, category: item.ca, estimatedValueZar: item.v, condition: item.co, seekingDescription: item.s, type: item.tp, status: "active", lat: u.lat, lng: u.lng, createdAt: ago(14), updatedAt: ago(1) }).returning({ id: s.listings.id });
    for (let i = 0; i < PH[item.ph].length; i++) await db.insert(s.listingImages).values({ listingId: ins.id, url: img(PH[item.ph][i]), order: i });
    ids.push(ins.id);
  }

  const [t, j, p] = USERS;
  const [t1] = await db.insert(s.trades).values({ initiatorId: t.id, responderId: j.id, listingId: ids[0], status: "completed", createdAt: ago(10), updatedAt: ago(8) }).returning({ id: s.trades.id });
  await db.insert(s.messages).values([{ tradeId: t1.id, senderId: t.id, text: "Hey James! Keen to swap my camera for your bike. R1,300 gap — balance with cash?", type: "text", createdAt: ago(10) }, { tradeId: t1.id, senderId: j.id, text: "Shot Thandi! Works for me. The bike's ready to ride 😎", type: "text", createdAt: ago(10) }, { tradeId: t1.id, senderId: t.id, text: "Both parties agreed — deal locked in! 🎉", type: "system", createdAt: ago(9) }, { tradeId: t1.id, senderId: t.id, text: "Trade marked as completed!", type: "system", createdAt: ago(8) }]);
  await db.insert(s.ratings).values([{ tradeId: t1.id, raterId: t.id, rateeId: j.id, score: 5, comment: "Smooth trade!" }, { tradeId: t1.id, raterId: j.id, rateeId: t.id, score: 5, comment: "Camera is perfect 👊" }]);

  const [t2] = await db.insert(s.trades).values({ initiatorId: p.id, responderId: t.id, listingId: ids[3], status: "completed", createdAt: ago(7), updatedAt: ago(5) }).returning({ id: s.trades.id });
  await db.insert(s.messages).values([{ tradeId: t2.id, senderId: p.id, text: "Hi Thandi! Swap a full brand package for my leather sofa?", type: "text", createdAt: ago(7) }, { tradeId: t2.id, senderId: t.id, text: "Yes absolutely! That sofa is gorgeous 😍", type: "text", createdAt: ago(7) }, { tradeId: t2.id, senderId: p.id, text: "Both parties agreed! 🎉", type: "system", createdAt: ago(6) }, { tradeId: t2.id, senderId: p.id, text: "Trade completed!", type: "system", createdAt: ago(5) }]);
  await db.insert(s.ratings).values([{ tradeId: t2.id, raterId: p.id, rateeId: t.id, score: 4, comment: "Beautiful brand guide!" }, { tradeId: t2.id, raterId: t.id, rateeId: p.id, score: 5, comment: "Sofa is perfect!" }]);

  return Response.json({ message: "Seeded with real images 📸", users: USERS.length, listings: ITEMS.length, trades: 2 });
}

export async function loader() {
  return Response.json({ message: 'POST {"key":"nozar-seed-2026"} to seed. POST {"key":"nozar-seed-2026","reset":true} to reset.' });
}
