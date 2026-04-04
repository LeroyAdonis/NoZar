/**
 * simulate-handshake.ts
 *
 * Simulates the full handshake flow between Zanele M. and Sipho K.
 * on Trade 1 (Sipho wants Zanele's Sony A7III Camera):
 *
 *   proposed → negotiating → agreed → readiness set → contacts shared
 *   → safe meetup spots generated → both users vote
 *
 * Idempotent: skips steps that are already complete.
 * Run with: npx tsx scripts/simulate-handshake.ts
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import * as schema from "../app/lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const USER_ZANELE = "seed-zanele-m-001";
const USER_SIPHO  = "seed-sipho-k-002";

// ─── Hardcoded meetup spots near Sandton, Johannesburg ─────────
const SPOTS = [
  {
    name: "Sandton City Mall",
    address: "83 Rivonia Rd, Sandton, Johannesburg, 2196",
    reason: "Busy 24/7 mall with security, cameras and food court — ideal neutral ground",
    order: 0,
  },
  {
    name: "Sandton Police Station",
    address: "Cnr West St & Rivonia Rd, Sandton, Johannesburg, 2196",
    reason: "Police presence makes this the safest possible handover point",
    order: 1,
  },
  {
    name: "Nelson Mandela Square",
    address: "Corner Maude & 5th St, Sandton, Johannesburg, 2196",
    reason: "Open public piazza with security, restaurants and high foot traffic",
    order: 2,
  },
];

function step(msg: string) {
  console.log(`\n  ${msg}`);
}
function ok(msg: string) {
  console.log(`     ✓ ${msg}`);
}
function skip(msg: string) {
  console.log(`     ↩ ${msg} (already done)`);
}

async function run() {
  console.log("\n🤝 NoZar Handshake Simulator — Zanele M. × Sipho K.");
  console.log("─".repeat(55));

  // ── 0. Verify seed users exist ────────────────────────────────
  step("0. Verifying seed users exist...");
  const zanele = await db.query.users.findFirst({ where: eq(schema.users.id, USER_ZANELE) });
  const sipho  = await db.query.users.findFirst({ where: eq(schema.users.id, USER_SIPHO)  });

  if (!zanele || !sipho) {
    console.error("\n❌ Seed users not found. Please run `npx tsx scripts/seed.ts` first.\n");
    process.exit(1);
  }
  ok(`Found Zanele M. (${zanele.email}) and Sipho K. (${sipho.email})`);

  // ── 1. Find the Sipho ↔ Zanele trade ─────────────────────────
  step("1. Locating trade (Sipho → Zanele / Camera)...");
  const trade = await db.query.trades.findFirst({
    where: and(
      eq(schema.trades.initiatorId, USER_SIPHO),
      eq(schema.trades.responderId, USER_ZANELE),
    ),
  });

  if (!trade) {
    console.error("\n❌ Trade not found. Please run `npx tsx scripts/seed.ts` first.\n");
    process.exit(1);
  }
  ok(`Trade #${trade.id} found — current status: "${trade.status}"`);

  // ── 2. proposed → negotiating ─────────────────────────────────
  step("2. Stage 01 → Sipho proposes the Secure Handshake...");
  if (trade.status === "proposed") {
    await db
      .update(schema.trades)
      .set({ status: "negotiating", updatedAt: new Date() })
      .where(eq(schema.trades.id, trade.id));

    await db.insert(schema.messages).values({
      tradeId: trade.id,
      senderId: USER_SIPHO,
      text: "Sipho K. proposed a Secure Handshake",
      type: "system",
    });
    ok("Trade moved to 'negotiating'; system message added");
  } else {
    skip("Already past 'proposed'");
  }

  // ── 3. negotiating → agreed ───────────────────────────────────
  step("3. Stage 02 → Zanele accepts the Handshake...");
  const currentTrade = await db.query.trades.findFirst({ where: eq(schema.trades.id, trade.id) });
  if (currentTrade!.status === "negotiating") {
    await db
      .update(schema.trades)
      .set({ status: "agreed", updatedAt: new Date() })
      .where(eq(schema.trades.id, trade.id));

    await db.insert(schema.messages).values({
      tradeId: trade.id,
      senderId: USER_ZANELE,
      text: "Zanele M. accepted the Handshake — mutual consensus reached",
      type: "system",
    });
    ok("Trade moved to 'agreed'; mutual consensus system message added");
  } else {
    skip("Already past 'negotiating'");
  }

  // ── 4. Both parties set readiness flags ───────────────────────
  step("4. Both parties commit to the dual-blind exchange...");

  for (const [userId, name] of [[USER_SIPHO, "Sipho"], [USER_ZANELE, "Zanele"]] as const) {
    const existing = await db.query.readinessFlags.findFirst({
      where: and(
        eq(schema.readinessFlags.tradeId, trade.id),
        eq(schema.readinessFlags.userId, userId),
      ),
    });
    if (!existing) {
      await db.insert(schema.readinessFlags).values({
        tradeId: trade.id,
        userId,
        ready: true,
        readyAt: new Date(),
      });
      ok(`${name} — readiness flag set ✔`);
    } else if (!existing.ready) {
      await db
        .update(schema.readinessFlags)
        .set({ ready: true, readyAt: new Date() })
        .where(eq(schema.readinessFlags.id, existing.id));
      ok(`${name} — readiness flag updated to true ✔`);
    } else {
      skip(`${name} already marked ready`);
    }
  }

  // ── 5. Exchange contacts ──────────────────────────────────────
  step("5. Both parties share contact details...");

  const contacts: Array<{ userId: string; name: string; phone: string; email: string }> = [
    { userId: USER_ZANELE, name: "Zanele", phone: "+27 83 555 0001", email: "zanele@example.com" },
    { userId: USER_SIPHO,  name: "Sipho",  phone: "+27 71 555 0002", email: "sipho@example.com"  },
  ];

  for (const contact of contacts) {
    const existing = await db.query.contactDisclosures.findFirst({
      where: and(
        eq(schema.contactDisclosures.tradeId, trade.id),
        eq(schema.contactDisclosures.userId, contact.userId),
      ),
    });
    if (!existing) {
      await db.insert(schema.contactDisclosures).values({
        tradeId: trade.id,
        userId: contact.userId,
        disclosedFields: { phone: contact.phone, email: contact.email },
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
      });
      ok(`${contact.name} disclosed — phone: ${contact.phone}, email: ${contact.email}`);
    } else {
      skip(`${contact.name} already disclosed contacts`);
    }
  }

  // Move trade to contact_shared
  const afterContacts = await db.query.trades.findFirst({ where: eq(schema.trades.id, trade.id) });
  if (afterContacts!.status === "agreed") {
    await db
      .update(schema.trades)
      .set({ status: "contact_shared", updatedAt: new Date() })
      .where(eq(schema.trades.id, trade.id));

    await db.insert(schema.messages).values([
      {
        tradeId: trade.id,
        senderId: USER_ZANELE,
        text: "Zanele M. shared their contact details",
        type: "system",
      },
      {
        tradeId: trade.id,
        senderId: USER_SIPHO,
        text: "Sipho K. shared their contact details",
        type: "system",
      },
    ]);
    ok("Trade moved to 'contact_shared'; system messages added");
  } else {
    skip("Trade already past 'agreed' for contact sharing");
  }

  // ── 6. Generate safe meetup spots (hardcoded — no Gemini key needed) ──
  step("6. Generating safe meetup spots near Sandton...");
  const existingSpots = await db.query.meetupSpots.findMany({
    where: eq(schema.meetupSpots.tradeId, trade.id),
  });

  let spotIds: number[];
  if (existingSpots.length === 0) {
    const inserted = await db
      .insert(schema.meetupSpots)
      .values(SPOTS.map((s) => ({ ...s, tradeId: trade.id })))
      .returning({ id: schema.meetupSpots.id });

    spotIds = inserted.map((r) => r.id);
    ok(`3 meetup spots inserted near Sandton:`);
    SPOTS.forEach((s, i) => ok(`  [${i + 1}] ${s.name} — ${s.address}`));
  } else {
    spotIds = existingSpots.map((s) => s.id);
    skip(`${existingSpots.length} spots already exist`);
    existingSpots.forEach((s, i) => ok(`  [${i + 1}] ${s.name}`));
  }

  // ── 7. Both users vote for spot 1 (Sandton City Mall) ────────
  step("7. Both parties vote for the meetup spot...");
  const chosenSpotId = spotIds[0]; // Sandton City Mall

  for (const [userId, name] of [[USER_SIPHO, "Sipho"], [USER_ZANELE, "Zanele"]] as const) {
    const existingVote = await db.query.meetupVotes.findFirst({
      where: and(
        eq(schema.meetupVotes.tradeId, trade.id),
        eq(schema.meetupVotes.userId, userId),
      ),
    });
    if (!existingVote) {
      await db.insert(schema.meetupVotes).values({
        tradeId: trade.id,
        userId,
        spotId: chosenSpotId,
      });
      ok(`${name} voted for Sandton City Mall ✔`);
    } else {
      skip(`${name} already voted`);
    }
  }

  // ── Final summary ─────────────────────────────────────────────
  const final = await db.query.trades.findFirst({ where: eq(schema.trades.id, trade.id) });
  const spotsCount = await db.query.meetupSpots.findMany({ where: eq(schema.meetupSpots.tradeId, trade.id) });
  const votesCount = await db.query.meetupVotes.findMany({ where: eq(schema.meetupVotes.tradeId, trade.id) });

  console.log("\n" + "─".repeat(55));
  console.log("✅ Simulation complete!\n");
  console.log(`   Trade #${trade.id}   status: "${final!.status}"`);
  console.log(`   Meetup spots: ${spotsCount.length}   Votes cast: ${votesCount.length}`);
  console.log(`   Chosen spot: Sandton City Mall`);
  console.log(`\n   → Open /dashboard/pings/${trade.id} to see the full thread\n`);
}

run().catch((err) => {
  console.error("\n❌ Simulation failed:", err);
  process.exit(1);
});
