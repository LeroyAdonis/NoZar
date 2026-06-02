#!/usr/bin/env tsx
/**
 * NoZar Support CLI — run support actions from the terminal.
 *
 * Usage:
 *   npx tsx scripts/support-cli.ts <command> [options]
 *
 * Commands:
 *   lookup          Look up user(s) by email
 *   change-email    Update a user's email address
 *   verify-user     Manually mark a user's email as verified
 *   unblock-device  Clear device fingerprints for a user
 *   resend-verify   Trigger a verification email resend
 *   check-otp       Check Africa's Talking OTP config and recent codes
 *   list-sessions   List active sessions for a user
 *   signout-user    Force sign-out all sessions for a user
 *
 * Options:
 *   --email <email>     User's email address
 *   --userId <id>       User's internal ID (UUID)
 *   --newEmail <email>  New email address (for change-email)
 *   --dry-run           Show what would be done without doing it
 *   --yes / -y          Skip confirmation prompts
 *   --json              Output raw JSON
 *
 * Examples:
 *   npx tsx scripts/support-cli.ts lookup --email mahen@gmail.com
 *   npx tsx scripts/support-cli.ts change-email --email old@x.com --newEmail new@x.com --yes
 *   npx tsx scripts/support-cli.ts verify-user --email mahen@gmail.com
 *   npx tsx scripts/support-cli.ts unblock-device --email mahen@gmail.com
 */

import { db } from "../app/lib/db.server";
import {
  users,
  sessions,
  accounts,
  profiles,
  deviceFingerprints,
  verifications,
  trustProfiles,
} from "../app/lib/schema";
import { eq, and, or, sql } from "drizzle-orm";

// ─── Argument parser ─────────────────────────────────────────────

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (key === "dry-run" || key === "yes" || key === "json") {
        args[key] = true;
        if (key === "dry-run") i++; // skip the "true" value if passed
      } else if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else if (arg === "-y") {
      args["yes"] = true;
    }
  }
  return args;
}

// ─── Helpers ─────────────────────────────────────────────────────

function fmtUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? "(no name)",
    emailVerified: u.emailVerified,
    createdAt: u.createdAt.toISOString(),
    referralCode: (u as Record<string, unknown>).referralCode ?? "(none)",
  };
}

async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return user ?? null;
}

async function findUserById(id: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return user ?? null;
}

function confirm(msg: string): Promise<boolean> {
  // In non-interactive mode, just log and return false
  console.log(`[CONFIRM] ${msg} — pass --yes to auto-confirm`);
  return Promise.resolve(false);
}

// ─── Commands ────────────────────────────────────────────────────

async function cmdLookup(args: Record<string, string | boolean>) {
  const email = args["email"] as string | undefined;
  const userId = args["userId"] as string | undefined;

  let user = null;
  if (email) {
    user = await findUserByEmail(email);
  } else if (userId) {
    user = await findUserById(userId);
  } else {
    console.log("❌ Provide --email or --userId");
    process.exit(1);
  }

  if (!user) {
    console.log("❌ No user found");
    return;
  }

  console.log("\n── User ──────────────────────");
  console.log(`  ID:            ${user.id}`);
  console.log(`  Email:         ${user.email}`);
  console.log(`  Name:          ${user.name ?? "(not set)"}`);
  console.log(`  Email verified: ${user.emailVerified ? "✅ Yes" : "❌ No"}`);
  console.log(`  Created:       ${user.createdAt.toISOString()}`);
  console.log(`  Referral code: ${(user as Record<string, unknown>).referralCode ?? "(none)"}`);

  // Fetch profile
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  if (profile) {
    console.log(`\n── Profile ────────────────────`);
    console.log(`  Display name:  ${profile.displayName}`);
    console.log(`  Phone:         ${profile.phone ?? "(not set)"} ${profile.phoneVerified ? "✅" : "❌"}`);
    console.log(`  Location:      ${[profile.suburb, profile.city, profile.province].filter(Boolean).join(", ") || "(not set)"}`);
    console.log(`  Bio:           ${profile.bio ? profile.bio.slice(0, 60) + (profile.bio.length > 60 ? "…" : "") : "(not set)"}`);
  }

  // Fetch account providers
  const userAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, user.id));

  if (userAccounts.length > 0) {
    console.log(`\n── Auth Methods ───────────────`);
    for (const acct of userAccounts) {
      const provider = acct.providerId === "credential" ? "Email/Password" : acct.providerId;
      console.log(`  ${provider}`);
    }
  }

  // Fetch active sessions
  const activeSessions = await db
    .select({ id: sessions.id, createdAt: sessions.createdAt, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(and(eq(sessions.userId, user.id), sql`${sessions.expiresAt} > NOW()`));

  console.log(`\n── Sessions ──────────────────`);
  console.log(`  Active:        ${activeSessions.length}`);

  // Fetch device fingerprints
  const fingerprints = await db
    .select({ hash: deviceFingerprints.fingerprintHash, firstSeen: deviceFingerprints.firstSeenAt })
    .from(deviceFingerprints)
    .where(eq(deviceFingerprints.userId, user.id));

  if (fingerprints.length > 0) {
    console.log(`\n── Device Fingerprints ────────`);
    for (const fp of fingerprints) {
      console.log(`  ${fp.hash} (since ${fp.firstSeen.toISOString()})`);
    }
  }

  // Check trust profile flags
  const [trust] = await db
    .select({ flagged: trustProfiles.flagged })
    .from(trustProfiles)
    .where(eq(trustProfiles.userId, user.id))
    .limit(1);

  if (trust?.flagged) {
    console.log(`\n⚠️  FLAGGED in trust_profiles — admin review needed`);
  }
}

async function cmdChangeEmail(args: Record<string, string | boolean>) {
  const email = args["email"] as string | undefined;
  const newEmail = args["newEmail"] as string | undefined;

  if (!email || !newEmail) {
    console.log("❌ Provide --email (current) and --newEmail");
    process.exit(1);
  }

  const user = await findUserByEmail(email);
  if (!user) {
    console.log(`❌ No user found with email: ${email}`);
    return;
  }

  if (args["dry-run"]) {
    console.log(`🔍 DRY RUN: Would change ${user.email} → ${newEmail}`);
    return;
  }

  // Update email in users table. Accounts table has no email column (Better Auth stores it on users).
  await db.update(users).set({ email: newEmail.toLowerCase(), emailVerified: false }).where(eq(users.id, user.id));

  console.log(`✅ Email changed: ${user.email} → ${newEmail.toLowerCase()}`);
  console.log(`ℹ️  User must verify the new email before signing in.`);
  console.log(`   Tell them to check their inbox for a verification link,`);
  console.log(`   or run: npx tsx scripts/support-cli.ts resend-verify --email ${newEmail.toLowerCase()}`);
}

async function cmdVerifyUser(args: Record<string, string | boolean>) {
  const email = args["email"] as string | undefined;
  const userId = args["userId"] as string | undefined;

  let user = null;
  if (email) user = await findUserByEmail(email);
  else if (userId) user = await findUserById(userId);

  if (!user) {
    console.log("❌ User not found. Provide --email or --userId");
    process.exit(1);
  }

  if (user.emailVerified) {
    console.log(`ℹ️  Email already verified for ${user.email}`);
    return;
  }

  if (args["dry-run"]) {
    console.log(`🔍 DRY RUN: Would mark ${user.email} as verified`);
    return;
  }

  await db.update(users).set({ emailVerified: true }).where(eq(users.id, user.id));
  console.log(`✅ ${user.email} is now verified`);
  console.log(`ℹ️  User can now sign in at nozar.co.za/login`);
}

async function cmdUnblockDevice(args: Record<string, string | boolean>) {
  const email = args["email"] as string | undefined;
  const userId = args["userId"] as string | undefined;

  let user = null;
  if (email) user = await findUserByEmail(email);
  else if (userId) user = await findUserById(userId);

  if (!user) {
    console.log("❌ User not found. Provide --email or --userId");
    process.exit(1);
  }

  if (args["dry-run"]) {
    console.log(`🔍 DRY RUN: Would delete device fingerprints and clear trust flags for ${user.email}`);
    return;
  }

  // Delete device fingerprints
  const fpDeleted = await db
    .delete(deviceFingerprints)
    .where(eq(deviceFingerprints.userId, user.id));

  // Clear trust profile flag
  await db
    .update(trustProfiles)
    .set({ flagged: false, updatedAt: new Date() })
    .where(eq(trustProfiles.userId, user.id))
    .catch(() => {}); // trust profile may not exist

  // Clear phone_otp verifications for this user's phone number
  const [profile] = await db
    .select({ phone: profiles.phone })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  if (profile?.phone) {
    const otpPrefix = `phone_otp:${profile.phone}`;
    await db
      .delete(verifications)
      .where(sql`${verifications.identifier} LIKE ${otpPrefix + "%"}`);
  }

  console.log(`✅ Device unblocked for ${user.email}`);
  console.log(`   - Device fingerprints cleared`);
  console.log(`   - Trust profile flag reset`);
  console.log(`   - Phone OTP records cleared`);
  console.log(`ℹ️  User can now register a new account from their device`);
}

async function cmdResendVerify(args: Record<string, string | boolean>) {
  const email = args["email"] as string | undefined;

  if (!email) {
    console.log("❌ Provide --email");
    process.exit(1);
  }

  const user = await findUserByEmail(email);
  if (!user) {
    console.log(`❌ No user found with email: ${email}`);
    return;
  }

  if (user.emailVerified) {
    console.log(`ℹ️  Email already verified for ${user.email}`);
    return;
  }

  if (args["dry-run"]) {
    console.log(`🔍 DRY RUN: Would trigger verification email to ${user.email}`);
    return;
  }

  // We need to call the Better Auth API to send a verification email
  // This requires constructing the request within the app context.
  // For CLI use, we trigger via the Better Auth server API.
  const { auth } = await import("../app/lib/auth.server");

  try {
    await auth.api.sendVerificationEmail({
      body: {
        email: user.email,
        callbackURL: "/dashboard",
      },
    });
    console.log(`✅ Verification email sent to ${user.email}`);
    console.log(`ℹ️  Check inbox (and spam folder)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to send: ${msg}`);
    process.exit(1);
  }
}

async function cmdCheckOtp(args: Record<string, string | boolean>) {
  console.log("\n── Africa's Talking OTP Status ──");

  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;
  const sandbox = process.env.AFRICASTALKING_SANDBOX === "true";

  console.log(`  API Key set:   ${apiKey ? "✅ Yes (" + apiKey.slice(0, 8) + "…)" : "❌ No"}`);
  console.log(`  Username:      ${username ? `✅ ${username}` : "❌ Not set"}`);
  console.log(`  Sandbox mode:  ${sandbox ? "✅ Yes" : "❌ No (production)"}`);

  if (apiKey && username) {
    // Test the connection
    const base = sandbox ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
    try {
      const res = await fetch(`${base}/version1/messaging`, {
        method: "POST",
        headers: {
          apiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username,
          to: "+27820000000", // dummy — just testing auth
          message: "NoZar OTP test",
        }).toString(),
      });
      if (res.status === 1001 || res.status === 201 || res.status === 200) {
        console.log(`  API reachable: ✅`);
      } else if (res.status === 403) {
        console.log(`  API reachable: ⚠️  Got 403 — try Bearer token fallback`);
        const res2 = await fetch(`${base}/version1/messaging`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            username,
            to: "+27820000000",
            message: "NoZar OTP test",
          }).toString(),
        });
        console.log(`  Bearer auth:   ${res2.ok ? "✅ Works" : `❌ ${res2.status}`}`);
      } else {
        const text = await res.text();
        console.log(`  API reachable: ⚠️  ${res.status} — ${text.slice(0, 100)}`);
      }
    } catch (err) {
      console.log(`  API reachable: ❌ ${err instanceof Error ? err.message : "Connection failed"}`);
    }
  }

  // Show recent OTP records from DB
  const recentOtps = await db
    .select({
      identifier: verifications.identifier,
      value: verifications.value,
      expiresAt: verifications.expiresAt,
      createdAt: verifications.createdAt,
    })
    .from(verifications)
    .where(sql`${verifications.identifier} LIKE 'phone_otp:%'`)
    .orderBy(sql`${verifications.createdAt} DESC`)
    .limit(5);

  if (recentOtps.length > 0) {
    console.log(`\n── Recent OTP Records (last 5) ──`);
    for (const otp of recentOtps) {
      const phone = otp.identifier.replace("phone_otp:", "");
      const expired = new Date(otp.expiresAt) < new Date();
      console.log(`  ${phone}: code=${otp.value} ${expired ? "⏰ expired" : "⏳ active"} (${otp.createdAt?.toISOString() ?? "(unknown)"})`);
    }
  } else {
    console.log(`\n  No recent OTP records found`);
  }
}

async function cmdSignoutUser(args: Record<string, string | boolean>) {
  const email = args["email"] as string | undefined;
  const userId = args["userId"] as string | undefined;

  let user = null;
  if (email) user = await findUserByEmail(email);
  else if (userId) user = await findUserById(userId);

  if (!user) {
    console.log("❌ User not found. Provide --email or --userId");
    process.exit(1);
  }

  if (args["dry-run"]) {
    console.log(`🔍 DRY RUN: Would delete all sessions for ${user.email}`);
    return;
  }

  const deleted = await db.delete(sessions).where(eq(sessions.userId, user.id));
  console.log(`✅ All sessions cleared for ${user.email}`);
  console.log(`ℹ️  User will need to sign in again`);
}

async function cmdListSessions(args: Record<string, string | boolean>) {
  const email = args["email"] as string | undefined;
  const userId = args["userId"] as string | undefined;

  let user = null;
  if (email) user = await findUserByEmail(email);
  else if (userId) user = await findUserById(userId);

  if (!user) {
    console.log("❌ User not found. Provide --email or --userId");
    process.exit(1);
  }

  const allSessions = await db
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
    })
    .from(sessions)
    .where(eq(sessions.userId, user.id))
    .orderBy(sql`${sessions.createdAt} DESC`);

  if (allSessions.length === 0) {
    console.log(`ℹ️  No sessions for ${user.email}`);
    return;
  }

  console.log(`\n── Sessions for ${user.email} ──────`);
  for (const s of allSessions) {
    const active = new Date(s.expiresAt) > new Date();
    console.log(`  ${active ? "🟢" : "🔴"} Created: ${s.createdAt.toISOString()}`);
    console.log(`     Expires: ${s.expiresAt.toISOString()}`);
    if (s.ipAddress) console.log(`     IP:      ${s.ipAddress}`);
    if (s.userAgent) console.log(`     UA:      ${s.userAgent.slice(0, 60)}`);
    console.log();
  }
}

async function cmdListUsers(args: Record<string, string | boolean>) {
  const limit = typeof args["limit"] === "string" ? parseInt(args["limit"], 10) : 10;

  const userList = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(sql`${users.createdAt} DESC`)
    .limit(limit);

  if (userList.length === 0) {
    console.log("ℹ️  No users in database");
    return;
  }

  console.log(`\n── Recent Users (last ${userList.length}) ────────────────`);
  for (const u of userList) {
    console.log(`  ${u.emailVerified ? "✅" : "⏳"} ${u.email}${u.name ? ` (${u.name})` : ""} — ${u.createdAt.toISOString().split("T")[0]}`);
    console.log(`     ID: ${u.id}`);
    console.log();
  }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));

  if (!command || command === "--help" || command === "-h") {
    console.log(`
NoZar Support CLI

Usage:
  npx tsx scripts/support-cli.ts <command> [options]

Commands:
  lookup          Look up user by email or ID
  list            List recent users
  change-email    Change a user's email address
  verify-user     Manually mark email as verified
  unblock-device  Clear device fingerprints
  resend-verify   Resend verification email
  check-otp       Check AT SMS config and recent OTPs
  list-sessions   List active sessions
  signout-user    Force sign-out all sessions

Options:
  --email <email>     User email
  --userId <id>       User UUID
  --newEmail <email>  New email
  --dry-run           Preview without executing
  --yes / -y          Skip confirmation
  --json              Raw JSON output

Examples:
  npx tsx scripts/support-cli.ts lookup --email mahen@gmail.com
  npx tsx scripts/support-cli.ts verify-user --email mahen@gmail.com --yes
  npx tsx scripts/support-cli.ts unblock-device --email mahen@gmail.com
  npx tsx scripts/support-cli.ts check-otp
`);
    return;
  }

  switch (command) {
    case "lookup":
      await cmdLookup(args);
      break;
    case "change-email":
      await cmdChangeEmail(args);
      break;
    case "verify-user":
      await cmdVerifyUser(args);
      break;
    case "unblock-device":
      await cmdUnblockDevice(args);
      break;
    case "resend-verify":
      await cmdResendVerify(args);
      break;
    case "check-otp":
      await cmdCheckOtp(args);
      break;
    case "list-sessions":
      await cmdListSessions(args);
      break;
    case "signout-user":
      await cmdSignoutUser(args);
      break;
    case "list":
      await cmdListUsers(args);
      break;
    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log("Run with --help to see available commands");
      process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
