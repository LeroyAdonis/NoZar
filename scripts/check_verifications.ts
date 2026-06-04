import { db } from "../app/lib/db.server";
import { users, accounts } from "../app/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { readFileSync } from "node:fs";

// Load .env.local
const envContent = readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  process.env[key] = val;
}

const UNVERIFIED_EMAILS = [
  "jnhulley@gmail.com",
  "esprobinadams@gmail.com",
  "jiyedig947@googxs.com",
  "test123@kollektiv.co.za",
  "ricky.debug40359@temp-mail.org",
  "playwright-map-1779693016500-0-chromium@example.com",
  "playwright-map-1779693331338-0-chromium@example.com",
  "playwright-map-1779693440647-0-chromium@example.com",
  "mahen-test-3@nozar-test.co.za",
  "playwright-map-1779693181154-0-chromium@example.com",
  "playwright-chat-1779895401749-0-chromium@example.com",
  "playwright-chat-1780390239684-0-chromium@example.com",
  "playwright-chat-1780391222938-0-chromium@example.com",
  "playwright-chat-1780391267056-0-chromium@example.com",
  "playwright-chat-1780391309424-0-chromium@example.com",
  "test2@gmail.com",
  "playwright-chat-1779897958011-0-chromium@example.com",
  "test@test.com",
  "verify-test@test.com",
  "test-berlin@nozar-test.co.za",
  "test-mahen-flow@nozar-test.co.za",
];

async function main() {
  const results = await db
    .select({
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(inArray(users.email, UNVERIFIED_EMAILS));

  const verified = results.filter((r) => r.emailVerified);
  const stillUnverified = results.filter((r) => !r.emailVerified);

  console.log("=== Verification Status ===");
  console.log(`Total tracked: ${results.length}`);
  console.log(`Verified: ${verified.length}`);
  console.log(`Still unverified: ${stillUnverified.length}`);
  console.log("");
  if (verified.length > 0) {
    console.log("✅ Just verified:");
    verified.forEach((u) => console.log(`  - ${u.email} (${u.name})`));
  }
  if (stillUnverified.length > 0) {
    console.log("⏳ Still waiting:");
    stillUnverified.forEach((u) => console.log(`  - ${u.email} (${u.name})`));
  }
}

main().catch(console.error);
