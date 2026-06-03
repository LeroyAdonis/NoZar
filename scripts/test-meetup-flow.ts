import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  console.log("\n=== AI Meetup Suggestion Flow Test ===\n");

  // 1. Find trades in 'agreed' status
  const trades = await sql`
    SELECT t.id, t.status, t.initiator_id, t.responder_id, t.listing_id,
           ui.name as initiator_name, ur.name as responder_name
    FROM trades t
    LEFT JOIN users ui ON t.initiator_id = ui.id
    LEFT JOIN users ur ON t.responder_id = ur.id
    ORDER BY t.status
  `;

  if (trades.length === 0) {
    console.log("No trades found in database.");
    console.log("Run 'POST /api/seed-demo' with key 'nozar-seed-2026' to create seed data.");
    return;
  }

  console.log(`Found ${trades.length} trades total:`);
  for (const t of trades) {
    console.log(`  Trade #${t.id}: status="${t.status}" (${t.initiator_name ?? "?"} ↔ ${t.responder_name ?? "?"})`);
  }

  // 2. Check for agreed trades and their meetup spots
  const agreedTrades = trades.filter((t: any) => t.status === "agreed");

  if (agreedTrades.length === 0) {
    console.log("\n✗ NO trades in 'agreed' status. Cannot test meetup flow directly.");
    console.log("  The seed data only creates 'completed' trades.");
    console.log("  To test: create a trade through the UI and advance it to 'agreed'.");
  } else {
    for (const t of agreedTrades) {
      console.log(`\n─ Trade #${t.id} (agreed) ─`);
      const spots = await sql`
        SELECT * FROM meetup_spots WHERE trade_id = ${t.id} ORDER BY "order"
      `;
      const votes = await sql`
        SELECT * FROM meetup_votes WHERE trade_id = ${t.id}
      `;

      console.log(`  Meetup spots: ${spots.length}`);
      for (const s of spots) {
        console.log(`    [${s.order + 1}] ${s.name} — ${s.address}`);
        console.log(`        Reason: ${s.reason}`);
      }
      console.log(`  Votes: ${votes.length}`);
    }
  }

  // 3. Check all statuses for a complete picture
  const statuses: Record<string, number> = {};
  for (const t of trades) {
    const s = t.status as string;
    statuses[s] = (statuses[s] || 0) + 1;
  }
  console.log("\nTrade status distribution:");
  for (const [status, count] of Object.entries(statuses)) {
    console.log(`  ${status}: ${count}`);
  }

  // 4. Check if NVIDIA key is configured
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  console.log(`\nNVIDIA_API_KEY configured: ${nvidiaKey ? "YES" : "NO"}`);

  // 5. Verify action handler guard logic from code analysis
  console.log("\n--- Guard Conditions for generateSafeZone (from code) ---");
  console.log("1. Trade status must be 'agreed'");
  console.log("2. No existing meetup spots for this trade (idempotency)");
  console.log("3. NVIDIA_API_KEY must be in env");
  console.log("4. Location resolved from listing owner profile (suburb > city > province > 'South Africa')");
  console.log("5. AI must return valid JSON array with name, address, reason");

  // 6. Check if demo seed users have profiles with locations
  const demoProfiles = await sql`
    SELECT u.email, p.suburb, p.city, p.province
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.email LIKE '%nozar.demo'
  `;
  console.log("\nDemo user locations:");
  for (const p of demoProfiles) {
    console.log(`  ${p.email}: ${p.suburb || "—"}, ${p.city || "—"}, ${p.province || "—"}`);
  }

  // 7. Check if the simulate-handshake script works
  console.log("\n--- Verdict ---");
  if (agreedTrades.length > 0) {
    console.log("✓ Trades in 'agreed' status exist");
  } else {
    console.log("✗ No trades in 'agreed' status");
    console.log("  → The AI meetup suggestion trigger path requires a trade to be in 'agreed' status.");
    console.log("  → The seed data only creates 'completed' trades.");
    console.log("  → To verify end-to-end, you must advance a trade via the UI handshake flow,");
    console.log("    then click 'Generate Safe Meetup Spots'.");
  }

  if (nvidiaKey) {
    console.log("✓ NVIDIA API key is configured");
    console.log("  → The AI call should work when triggered");
  } else {
    console.log("✗ NVIDIA API key NOT configured");
    console.log("  → The generateSafeZone action will return { error: 'no_nvidia_key' }");
    console.log("  → UI will show: 'NVIDIA AI not configured — contact support'");
  }

  console.log("\n=== End ===\n");
}

run().catch((err: unknown) => {
  console.error("Test failed:", err);
  process.exit(1);
});
