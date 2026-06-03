#!/usr/bin/env node

/**
 * AI Match Notification Script
 * ==============================
 * Scans for new potential barter matches and logs them.
 * Can be run as a cron job to notify users of fresh matches.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/ai-match-notify.mjs
 *
 * Requires DATABASE_URL in environment.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";

// ─── DB Setup ──────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const sqlClient = neon(DATABASE_URL);

// We define our own pgTable references inline instead of importing
// from app/lib/schema.ts (which requires a .ts runtime).
// Using sql`` tagged templates for the queries instead.

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Simple text overlap score (Jaccard-like) between two strings.
 * Used as a lightweight similarity metric.
 */
function textOverlapScore(a, b) {
  const STOP_WORDS = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "need", "want",
    "looking", "trade", "barter", "swap", "exchange", "offers", "open",
    "offering", "willing", "much", "many", "stuff", "items", "things",
    "something", "anything", "good", "great", "nice", "like", "new", "used",
    "including", "includes", "please", "thank", "thanks", "also", "quality",
    "excellent", "perfect", "well", "really", "some", "any", "get", "got",
    "interested", "must", "can", "work", "way", "make", "done", "ever",
    "say", "still", "even", "back", "put", "keep", "let", "know", "see",
    "come", "take", "use", "made", "power",
  ]);

  const tokenize = (text) => {
    const words = text
      .toLowerCase()
      .split(/[\W_]+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    return new Set(words);
  };

  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Combine listing fields into a single text for matching.
 */
function listingText(listing) {
  return [
    listing.title,
    listing.description,
    listing.category,
    listing.seeking_description ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  console.log("🔍 AI Match Notification Scan\n");
  const startedAt = Date.now();

  // 1. Get all active listings with user + profile info
  const rows = await sqlClient`
    SELECT
      l.id AS listing_id,
      l.user_id,
      l.title,
      l.description,
      l.category,
      l.seeking_description,
      l.status,
      u.name AS user_name,
      p.province
    FROM listings l
    JOIN users u ON u.id = l.user_id
    JOIN profiles p ON p.user_id = l.user_id
    WHERE l.status = 'active'
    ORDER BY l.user_id
  `;

  console.log(`📊 Found ${rows.length} active listings\n`);

  if (rows.length === 0) {
    console.log("✅ No active listings to match. Exiting.");
    return;
  }

  // 2. Group listings by user
  const listingsByUser = new Map();
  for (const row of rows) {
    const userId = row.user_id;
    if (!listingsByUser.has(userId)) {
      listingsByUser.set(userId, {
        userId,
        userName: row.user_name,
        province: row.province,
        listings: [],
      });
    }
    listingsByUser.get(userId).listings.push({
      id: row.listing_id,
      title: row.title,
      description: row.description,
      category: row.category,
      seeking_description: row.seeking_description,
    });
  }

  const users = Array.from(listingsByUser.values());
  console.log(`👤 Found ${users.length} users with active listings\n`);

  // 3. Cross-match each user against others in the same province
  let totalMatches = 0;
  const matchReport = [];

  for (let i = 0; i < users.length; i++) {
    const userA = users[i];
    const userMatches = [];

    for (let j = i + 1; j < users.length; j++) {
      const userB = users[j];

      // Skip if not in the same province
      if (
        !userA.province ||
        !userB.province ||
        userA.province.toLowerCase() !== userB.province.toLowerCase()
      ) {
        continue;
      }

      // Cross-compare all of user A's listings with user B's listings
      for (const listingA of userA.listings) {
        for (const listingB of userB.listings) {
          const textA = listingText(listingA);
          const textB = listingText(listingB);

          const score = textOverlapScore(textA, textB);

          // Only report meaningful matches
          if (score >= 0.4) {
            userMatches.push({
              userA: userA.userName,
              userB: userB.userName,
              listingA: listingA.title,
              listingB: listingB.title,
              score: Math.round(score * 100),
              province: userA.province,
            });
          }
        }
      }
    }

    if (userMatches.length > 0) {
      totalMatches += userMatches.length;
      matchReport.push({
        user: userA.userName,
        matches: userMatches,
      });
    }
  }

  // 4. Print report
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  if (matchReport.length === 0) {
    console.log("📭 No new matches found in this scan.\n");
  } else {
    console.log("🎯 Potential Matches Found:\n");
    for (const report of matchReport) {
      console.log(`  ✦ ${report.user}`);
      for (const m of report.matches) {
        console.log(
          `    ${m.listingA} ↔ ${m.listingB}  (${m.score}% match, ${m.province})`,
        );
      }
      console.log("");
    }
  }

  console.log("─".repeat(50));
  console.log(`📋 Summary`);
  console.log(`   Users scanned:  ${users.length}`);
  console.log(`   Listings:       ${rows.length}`);
  console.log(`   Potential matches: ${totalMatches}`);
  console.log(`   Scan time:      ${elapsed}s`);
  console.log("─".repeat(50));
  console.log("✅ AI Match Notification scan complete.\n");
}

main().catch((err) => {
  console.error("❌ Match notification scan failed:", err);
  process.exit(1);
});
