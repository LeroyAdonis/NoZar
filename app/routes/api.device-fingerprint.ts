/**
 * POST /api/device-fingerprint
 *
 * Upserts a device_fingerprints row for the authenticated user.
 * Also checks whether this fingerprint belongs to another free-tier
 * account (duplicate detection for OAuth users — see D-06).
 *
 * Returns:
 *   { ok: true }                                — fingerprint recorded
 *   { duplicate: true, reason: string }         — fingerprint linked to another account
 *   { error: string }          (400)            — bad input
 */
import type { Route } from "./+types/api.device-fingerprint";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { deviceFingerprints, subscriptions } from "~/lib/schema";
import { eq, and, ne, gte } from "drizzle-orm";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const { user } = await requireAuth(request);

  let fingerprintHash: unknown;
  try {
    const body = await request.json() as Record<string, unknown>;
    fingerprintHash = body.fingerprintHash;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Security: validate hash format to prevent injection (T-02-03-01)
  if (
    !fingerprintHash ||
    typeof fingerprintHash !== "string" ||
    !/^[a-zA-Z0-9]{1,64}$/.test(fingerprintHash)
  ) {
    return Response.json({ error: "Invalid fingerprint hash" }, { status: 400 });
  }

  const hash = fingerprintHash;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Check if this fingerprint is already linked to a DIFFERENT free-tier user
  // (D-06: duplicate detection for OAuth users encountering the dashboard prompt)
  const duplicatesFromOthers = await db
    .select({ userId: deviceFingerprints.userId })
    .from(deviceFingerprints)
    .where(
      and(
        eq(deviceFingerprints.fingerprintHash, hash),
        ne(deviceFingerprints.userId, user.id),
        gte(deviceFingerprints.firstSeenAt, thirtyDaysAgo),
      ),
    )
    .limit(2);

  let isDuplicate = false;
  for (const dup of duplicatesFromOthers) {
    const [sub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.userId, dup.userId))
      .limit(1);
    if (!sub) {
      isDuplicate = true;
      break;
    }
  }

  // Upsert: create if new, update lastSeenAt if existing (D-04)
  await db
    .insert(deviceFingerprints)
    .values({
      fingerprintHash: hash,
      userId: user.id,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [deviceFingerprints.userId, deviceFingerprints.fingerprintHash],
      set: { lastSeenAt: new Date() },
    });

  if (isDuplicate) {
    return Response.json({ duplicate: true, reason: "DEVICE_ALREADY_REGISTERED" });
  }

  return Response.json({ ok: true });
}
