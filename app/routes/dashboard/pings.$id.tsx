import { useEffect, useRef, useState } from "react";
import { data, Form, Link, useFetcher, useNavigation, useRevalidator } from "react-router";
import { AiServiceError, generateContent } from "~/lib/ai.server";
import { eq, asc, and, or, count, avg } from "drizzle-orm";
import {
  ChevronLeft,
  Lock,
  Send,
  ShieldCheck,
  Unlock,
  MapPin,
  CheckCircle2,
  Phone,
  Mail,
  Handshake,
  X,
  ShieldAlert,
  Scale,
} from "lucide-react";
import type { Route } from "./+types/pings.$id";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import {
  trades,
  messages,
  users,
  profiles,
  listings,
  contactDisclosures,
  ratings,
  trustProfiles,
  tradeReports,
  readinessFlags,
  meetupSpots,
  meetupVotes,
  tradeItems,
} from "~/lib/schema";
import { timeAgo } from "~/lib/utils";
import { markThreadRead } from "~/lib/notifications.server";
import {
  newMessageEmail,
  tradeAcceptedEmail,
  contactSharedEmail,
  tradeCompletedEmail,
} from "~/lib/email.server";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";
import { TrustBadge } from "~/components/ui/trust-badge";
import { ReportModal } from "~/components/ui/report-modal";
import { SafeZonePicker } from "~/components/ui/safezone-picker";
import { BalancePile } from "~/components/ui/balance-pile";

// ─── Meta ──────────────────────────────────────────────────────

export function meta({ data: loaderData }: Route.MetaArgs) {
  const title = loaderData?.listing?.title ?? "Ping";
  return [
    { title: `${title} — Nozar` },
    { name: "description", content: "View ping conversation" },
  ];
}

// ─── Loader ────────────────────────────────────────────────────

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const tradeId = Number(params.id);

  if (Number.isNaN(tradeId)) {
    throw data(null, { status: 404 });
  }

  // Fetch trade
  const [trade] = await db
    .select()
    .from(trades)
    .where(eq(trades.id, tradeId))
    .limit(1);

  if (!trade) {
    throw data(null, { status: 404 });
  }

  // Verify user is a participant
  if (trade.initiatorId !== user.id && trade.responderId !== user.id) {
    throw data({ error: "Not authorized" }, { status: 403 });
  }

  // Determine counterparty
  const counterpartyId =
    trade.initiatorId === user.id ? trade.responderId : trade.initiatorId;

  // Fetch counterparty, messages, listing, and current user's active listings in parallel
  const [counterpartyRows, tradeMessages, [listing], userListings] = await Promise.all([
    db
      .select({
        name: users.name,
        image: profiles.avatarUrl,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, counterpartyId))
      .limit(1),

    db
      .select()
      .from(messages)
      .where(eq(messages.tradeId, tradeId))
      .orderBy(asc(messages.createdAt)),

    db
      .select()
      .from(listings)
      .where(eq(listings.id, trade.listingId))
      .limit(1),

    // Current user's active listings for BalancePile "Add Listing" picker
    db
      .select({
        id: listings.id,
        title: listings.title,
        estimatedValueZar: listings.estimatedValueZar,
      })
      .from(listings)
      .where(and(eq(listings.userId, user.id), eq(listings.status, "active"))),
  ]);

  if (!counterpartyRows[0] || !listing) {
    throw data(null, { status: 404 });
  }

  // Mark thread as read now that the user is viewing it
  await markThreadRead(db, user.id, tradeId);

  // Check if current user already rated this trade
  const [existingRating] = await db
    .select({ id: ratings.id, score: ratings.score })
    .from(ratings)
    .where(and(eq(ratings.tradeId, tradeId), eq(ratings.raterId, user.id)))
    .limit(1);

  // ── Trust system extra queries ──────────────────────────────

  // Trust profile for current user — auto-create if missing (same pattern as profile.tsx loader)
  let [myTrust] = await db
    .select({ level: trustProfiles.level, completedTrades: trustProfiles.completedTrades })
    .from(trustProfiles)
    .where(eq(trustProfiles.userId, user.id))
    .limit(1);

  if (!myTrust) {
    const [created] = await db
      .insert(trustProfiles)
      .values({
        userId: user.id,
        level: "newcomer",
        completedTrades: 0,
      })
      .returning({ level: trustProfiles.level, completedTrades: trustProfiles.completedTrades });
    myTrust = created;
  }

  // Readiness flags for double-blind contact reveal
  const [myReadyRow, theirReadyRow] = await Promise.all([
    db.select().from(readinessFlags)
      .where(and(eq(readinessFlags.tradeId, tradeId), eq(readinessFlags.userId, user.id)))
      .limit(1),
    db.select().from(readinessFlags)
      .where(and(eq(readinessFlags.tradeId, tradeId), eq(readinessFlags.userId, counterpartyId)))
      .limit(1),
  ]);

  // Meetup spots
  const spots = await db.select().from(meetupSpots)
    .where(eq(meetupSpots.tradeId, tradeId))
    .orderBy(meetupSpots.order);
  const votes = await db.select().from(meetupVotes)
    .where(eq(meetupVotes.tradeId, tradeId));
  const myVote = votes.find(v => v.userId === user.id);

  // Trade items for value balancing
  const tradeItemsForTrade = await db.select()
    .from(tradeItems)
    .where(eq(tradeItems.tradeId, tradeId))
    .orderBy(tradeItems.createdAt);

  // Count user's messages in this trade (for newcomer limit)
  const [{ count: userMsgCount }] = await db
    .select({ count: count() })
    .from(messages)
    .where(and(
      eq(messages.tradeId, tradeId),
      eq(messages.senderId, user.id),
      eq(messages.type, "text"),
    ));

  // Active report if frozen
  const activeReport = trade.status === "frozen"
    ? await db.select().from(tradeReports)
        .where(and(eq(tradeReports.tradeId, tradeId), eq(tradeReports.status, "active")))
        .limit(1)
    : null;

  // Contact disclosures — visible once status is contact_shared or completed
  const disclosures = await db.select().from(contactDisclosures)
    .where(eq(contactDisclosures.tradeId, tradeId));

  return {
    trade,
    messages: tradeMessages,
    counterparty: counterpartyRows[0],
    listing,
    currentUserId: user.id,
    hasRated: !!existingRating,
    existingRatingScore: existingRating?.score ?? null,
    myTrust: myTrust || { level: "newcomer" as const, completedTrades: 0 },
    isReady: myReadyRow[0]?.ready ?? false,
    theyReady: theirReadyRow[0]?.ready ?? false,
    spots,
    votes,
    myVote: myVote ?? null,
    tradeItemsForTrade,
    userListings,
    userMsgCount,
    activeReport,
    disclosures,
    maxItems: 5,
  };
}

// ─── Action ────────────────────────────────────────────────────

export async function action({ request, params }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const tradeId = Number(params.id);
  const formData = await request.formData();
  const intent = formData.get("intent") as string | null;

  // Verify trade and participation
  const [trade] = await db
    .select()
    .from(trades)
    .where(eq(trades.id, tradeId))
    .limit(1);

  if (!trade) {
    throw data(null, { status: 404 });
  }

  if (trade.initiatorId !== user.id && trade.responderId !== user.id) {
    throw data({ error: "Not authorized" }, { status: 403 });
  }

  switch (intent) {
    case "sendMessage": {
      // Newcomer message limit (max 3 per trade)
      const [tp] = await db
        .select({ level: trustProfiles.level })
        .from(trustProfiles)
        .where(eq(trustProfiles.userId, user.id))
        .limit(1);

      if (tp?.level === "newcomer") {
        const [{ msgCount }] = await db
          .select({ msgCount: count() })
          .from(messages)
          .where(and(
            eq(messages.tradeId, tradeId),
            eq(messages.senderId, user.id),
            eq(messages.type, "text"),
          ));
        if (msgCount >= 5) {
          return { error: "New users can send 5 messages per trade. Complete your first trade to unlock unlimited messaging." };
        }
      }

      const rawText = (formData.get("text") as string)?.trim();
      if (!rawText) {
        return { error: "Message cannot be empty" };
      }

      // Scrub PII (phone numbers & emails) during blind-chat stage
      let text = rawText;
      if (trade.status === "proposed" || trade.status === "negotiating") {
        text = text
          .replace(/(\+?27|0)\s*\d[\d\s\-]{7,12}/g, "[phone redacted]")
          .replace(/\b[\w.\-+]+@[\w.\-]+\.\w{2,}\b/gi, "[email redacted]");
      }

      await db.insert(messages).values({
        tradeId,
        senderId: user.id,
        text,
        type: "text",
      });

      // Email counterparty about new message (non-blocking)
      const counterpartyId_msg =
        trade.initiatorId === user.id ? trade.responderId : trade.initiatorId;
      const [[listForMsg], [cpForMsg]] = await Promise.all([
        db.select({ title: listings.title }).from(listings).where(eq(listings.id, trade.listingId)).limit(1),
        db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, counterpartyId_msg)).limit(1),
      ]);
      if (cpForMsg?.email) {
        newMessageEmail({
          to: cpForMsg.email,
          recipientName: cpForMsg.name,
          senderName: user.name,
          messageSnippet: text,
          tradeId,
          listingTitle: listForMsg?.title ?? "a listing",
        });
      }

      return { ok: true };
    }

    case "counterOffer": {
      await db.insert(messages).values({
        tradeId,
        senderId: user.id,
        text: `Counter-offer: ${offerText}`,
        type: "system",
      });
      return { ok: true };
    }

    case "archive": {
      await db
        .update(trades)
        .set({ archived: true, updatedAt: new Date() })
        .where(eq(trades.id, tradeId));
      return { ok: true };
    }

    case "proposeHandshake": {
      if (trade.status !== "proposed") {
        return { error: "Handshake can only be proposed from initial state" };
      }

      await db
        .update(trades)
        .set({ status: "negotiating", updatedAt: new Date() })
        .where(eq(trades.id, tradeId));

      await db.insert(messages).values({
        tradeId,
        senderId: user.id,
        text: `${user.name} proposed a Secure Handshake`,
        type: "system",
      });

      return { ok: true };
    }

    case "acceptHandshake": {
      if (trade.status !== "negotiating") {
        return { error: "No handshake to accept" };
      }

      await db
        .update(trades)
        .set({ status: "agreed", updatedAt: new Date() })
        .where(eq(trades.id, tradeId));

      await db.insert(messages).values({
        tradeId,
        senderId: user.id,
        text: `${user.name} accepted the Handshake — mutual consensus reached`,
        type: "system",
      });

      // Email initiator that handshake was accepted (non-blocking)
      const counterpartyId_accept =
        trade.initiatorId === user.id ? trade.responderId : trade.initiatorId;
      const [[listForAccept], [cpForAccept]] = await Promise.all([
        db.select({ title: listings.title }).from(listings).where(eq(listings.id, trade.listingId)).limit(1),
        db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, counterpartyId_accept)).limit(1),
      ]);
      if (cpForAccept?.email) {
        tradeAcceptedEmail({
          to: cpForAccept.email,
          recipientName: cpForAccept.name,
          senderName: user.name,
          tradeId,
          listingTitle: listForAccept?.title ?? "a listing",
        });
      }

      return { ok: true };
    }

    case "shareContact": {
      if (trade.status !== "agreed") {
        return { error: "Trade must be agreed before sharing contact" };
      }

      // Server-side readiness gate — both parties must be ready
      const [myReady] = await db.select({ ready: readinessFlags.ready })
        .from(readinessFlags)
        .where(and(eq(readinessFlags.tradeId, tradeId), eq(readinessFlags.userId, user.id)))
        .limit(1);
      const counterpartyId_ready =
        trade.initiatorId === user.id ? trade.responderId : trade.initiatorId;
      const [theirReady] = await db.select({ ready: readinessFlags.ready })
        .from(readinessFlags)
        .where(and(eq(readinessFlags.tradeId, tradeId), eq(readinessFlags.userId, counterpartyId_ready)))
        .limit(1);
      if (!myReady?.ready || !theirReady?.ready) {
        return { error: "Both parties must confirm readiness before sharing contacts" };
      }

      const phone = (formData.get("phone") as string)?.trim() || null;
      const email = (formData.get("email") as string)?.trim() || null;

      if (!phone && !email) {
        return { error: "Please provide at least a phone number or email" };
      }

      await db.insert(contactDisclosures).values({
        tradeId,
        userId: user.id,
        disclosedFields: { phone, email },
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      });

      // Only advance status when BOTH parties have shared contacts
      const allDisclosures = await db.select({ userId: contactDisclosures.userId })
        .from(contactDisclosures)
        .where(eq(contactDisclosures.tradeId, tradeId));
      const uniqueDisclosers = new Set(allDisclosures.map(d => d.userId));

      if (uniqueDisclosers.size >= 2) {
        await db
          .update(trades)
          .set({ status: "contact_shared", updatedAt: new Date() })
          .where(eq(trades.id, tradeId));
      }

      await db.insert(messages).values({
        tradeId,
        senderId: user.id,
        text: `${user.name} shared their contact details`,
        type: "system",
      });

      // Email counterparty that contact was shared (non-blocking)
      const counterpartyId_contact =
        trade.initiatorId === user.id ? trade.responderId : trade.initiatorId;
      const [cpForContact] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, counterpartyId_contact))
        .limit(1);
      const [listingForContact] = await db
        .select({ title: listings.title })
        .from(listings)
        .where(eq(listings.id, trade.listingId))
        .limit(1);
      if (cpForContact?.email) {
        contactSharedEmail({
          to: cpForContact.email,
          recipientName: cpForContact.name,
          senderName: user.name,
          tradeId,
          listingTitle: listingForContact?.title ?? "a listing",
        });
      }

      return { ok: true };
    }

    case "completeTrade": {
      if (trade.status !== "contact_shared") {
        return { error: "Contacts must be shared before completing" };
      }

      await db
        .update(trades)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(trades.id, tradeId));

      await db.insert(messages).values({
        tradeId,
        senderId: user.id,
        text: "Trade marked as completed — thank you for using NoZar!",
        type: "system",
      });

      // ── Update trust profiles for both participants ──────────
      const counterpartyId =
        trade.initiatorId === user.id ? trade.responderId : trade.initiatorId;

      // Fetch counterparty before updating trust profiles (counterpartyId already computed)
      const [cpForComplete] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, counterpartyId))
        .limit(1);
      const [listingForComplete] = await db
        .select({ title: listings.title })
        .from(listings)
        .where(eq(listings.id, trade.listingId))
        .limit(1);

      for (const uid of [user.id, counterpartyId]) {
        // Auto-create trust profile if missing
        let [tp] = await db
          .select()
          .from(trustProfiles)
          .where(eq(trustProfiles.userId, uid))
          .limit(1);

        if (!tp) {
          [tp] = await db
            .insert(trustProfiles)
            .values({ userId: uid, level: "newcomer", completedTrades: 0 })
            .returning();
        }

        // Count completed trades for this user
        const [{ completedCount }] = await db
          .select({ completedCount: count() })
          .from(trades)
          .where(and(
            eq(trades.status, "completed"),
            or(eq(trades.initiatorId, uid), eq(trades.responderId, uid)),
          ));

        // Calculate average rating
        const [ratingAvg] = await db
          .select({ avgRating: avg(ratings.score) })
          .from(ratings)
          .where(eq(ratings.rateeId, uid));

        const averageRating = ratingAvg.avgRating ? parseFloat(ratingAvg.avgRating) : null;
        const completedTrades = Number(completedCount);

        // Determine level from thresholds
        const level = completedTrades >= 4 ? "trusted"
          : completedTrades >= 1 ? "verified"
          : "newcomer";

        await db
          .update(trustProfiles)
          .set({ level, completedTrades, averageRating, lastActiveAt: new Date(), updatedAt: new Date() })
          .where(eq(trustProfiles.userId, uid));

        // Email both participants about trade completion (non-blocking)
        if (cpForComplete?.email) {
          tradeCompletedEmail({
            to: cpForComplete.email,
            recipientName: cpForComplete.name,
            otherName: uid === counterpartyId ? user.name : cpForComplete.name,
            tradeId,
            listingTitle: listingForComplete?.title ?? "a listing",
          });
        }
        // Also email the current user (they initiated completion)
        tradeCompletedEmail({
          to: user.email,
          recipientName: user.name,
          otherName: cpForComplete?.name ?? "your trading partner",
          tradeId,
          listingTitle: listingForComplete?.title ?? "a listing",
        });
      }

      return { ok: true };
    }

    case "cancelTrade": {
      if (trade.status === "completed") {
        return { error: "Cannot cancel a completed trade" };
      }

      await db
        .update(trades)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(trades.id, tradeId));

      await db.insert(messages).values({
        tradeId,
        senderId: user.id,
        text: `${user.name} cancelled this trade`,
        type: "system",
      });

      return { ok: true };
    }

    case "submitRating": {
      if (trade.status !== "completed") {
        return { error: "Can only rate completed trades" };
      }

      // Prevent double-rating
      const [existing] = await db
        .select({ id: ratings.id })
        .from(ratings)
        .where(and(eq(ratings.tradeId, tradeId), eq(ratings.raterId, user.id)))
        .limit(1);

      if (existing) {
        return { error: "You have already rated this trade" };
      }

      const score = Number(formData.get("score"));
      if (!score || score < 1 || score > 5) {
        return { error: "Please select a rating (1-5 stars)" };
      }

      const comment = (formData.get("comment") as string)?.trim() || null;
      const counterpartyId =
        trade.initiatorId === user.id ? trade.responderId : trade.initiatorId;

      await db.insert(ratings).values({
        tradeId,
        raterId: user.id,
        rateeId: counterpartyId,
        score,
        comment,
      });

      // ── Recalculate rated user's trust profile ───────────────
      // Auto-create trust profile if missing
      let [tp] = await db
        .select()
        .from(trustProfiles)
        .where(eq(trustProfiles.userId, counterpartyId))
        .limit(1);

      if (!tp) {
        [tp] = await db
          .insert(trustProfiles)
          .values({ userId: counterpartyId, level: "newcomer", completedTrades: 0 })
          .returning();
      }

      // Recount completed trades
      const [{ completedCount }] = await db
        .select({ completedCount: count() })
        .from(trades)
        .where(and(
          eq(trades.status, "completed"),
          or(eq(trades.initiatorId, counterpartyId), eq(trades.responderId, counterpartyId)),
        ));

      // Recalculate average rating
      const [ratingAvg] = await db
        .select({ avgRating: avg(ratings.score) })
        .from(ratings)
        .where(eq(ratings.rateeId, counterpartyId));

      const averageRating = ratingAvg.avgRating ? parseFloat(ratingAvg.avgRating) : null;
      const completedTrades = Number(completedCount);
      const level = completedTrades >= 4 ? "trusted"
        : completedTrades >= 1 ? "verified"
        : "newcomer";

      await db
        .update(trustProfiles)
        .set({ level, completedTrades, averageRating, lastActiveAt: new Date(), updatedAt: new Date() })
        .where(eq(trustProfiles.userId, counterpartyId));

      return { ok: true };
    }

    // ── Trust system new actions ──────────────────────────────

    case "reportTrade": {
      const reason = (formData.get("reason") as string) || "other";
      const description = (formData.get("description") as string) || "";

      await db.insert(tradeReports).values({
        tradeId,
        reporterId: user.id,
        reason,
        description,
        freezeExpiry: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72h cooldown
      });

      await db
        .update(trades)
        .set({ status: "frozen", updatedAt: new Date() })
        .where(eq(trades.id, tradeId));

      await db.insert(messages).values({
        tradeId,
        senderId: user.id,
        text: `Trade frozen — report filed (${reason})`,
        type: "system",
      });

      return { success: true };
    }

    case "unfreezeTrade": {
      const [activeReport] = await db
        .select({ id: tradeReports.id, reason: tradeReports.reason })
        .from(tradeReports)
        .where(
          and(
            eq(tradeReports.tradeId, tradeId),
            eq(tradeReports.reporterId, user.id),
            eq(tradeReports.status, "active"),
          ),
        )
        .limit(1);

      if (activeReport) {
        await db
          .update(tradeReports)
          .set({ status: "dismissed", resolvedAt: new Date() })
          .where(eq(tradeReports.id, activeReport.id));

        await db
          .update(trades)
          .set({ status: "negotiating", updatedAt: new Date() })
          .where(eq(trades.id, tradeId));

        await db.insert(messages).values({
          tradeId,
          senderId: user.id,
          text: "Trade unfrozen by reporter",
          type: "system",
        });
      }

      return { success: true };
    }

    case "toggleReady": {
      if (trade.status !== "agreed") {
        return { error: "Trade must be in agreed state" };
      }

      const [existing] = await db
        .select()
        .from(readinessFlags)
        .where(
          and(
            eq(readinessFlags.tradeId, tradeId),
            eq(readinessFlags.userId, user.id),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(readinessFlags)
          .set({ ready: !existing.ready, readyAt: existing.ready ? null : new Date() })
          .where(eq(readinessFlags.id, existing.id));
      } else {
        await db.insert(readinessFlags).values({
          tradeId,
          userId: user.id,
          ready: true,
          readyAt: new Date(),
        });
      }

      return { success: true };
    }

    case "addTradeItem": {
      const listingId = formData.get("listingId")
        ? Number(formData.get("listingId"))
        : null;
      const description = (formData.get("description") as string) || null;
      const estimatedValue = formData.get("estimatedValue")
        ? Number(formData.get("estimatedValue"))
        : null;
      const itemType = (formData.get("type") as string) || "listing";

      // Count user's current items in this trade
      const [{ itemCount }] = await db
        .select({ itemCount: count() })
        .from(tradeItems)
        .where(
          and(
            eq(tradeItems.tradeId, tradeId),
            eq(tradeItems.userId, user.id),
          ),
        );

      if (itemCount >= 5) {
        return { error: "Maximum 5 items per side" };
      }

      await db.insert(tradeItems).values({
        tradeId,
        userId: user.id,
        listingId,
        description,
        estimatedValue,
        type: itemType,
      });

      const itemName = listingId ? `Listing #${listingId}` : description || "Item";
      await db.insert(messages).values({
        tradeId,
        senderId: user.id,
        text: `⚖️ Added to pile: ${itemName}`,
        type: "system",
      });

      return { success: true, itemCount: itemCount + 1 };
    }

    case "generateSafeZone": {
      if (trade.status !== "agreed") {
        return { error: "Trade must be agreed before generating meetup spots" };
      }

      // ── Idempotency guard: return early if spots already exist ────────
      const existingSpots = await db
        .select({ id: meetupSpots.id })
        .from(meetupSpots)
        .where(eq(meetupSpots.tradeId, tradeId))
        .limit(1);

      if (existingSpots.length > 0) {
        return { ok: true };
      }

      // ── Resolve location from listing owner's profile ────────────────
      const [listingRow] = await db
        .select({ userId: listings.userId })
        .from(listings)
        .where(eq(listings.id, trade.listingId))
        .limit(1);

      const [ownerProfile] = listingRow
        ? await db
            .select({ suburb: profiles.suburb, city: profiles.city, province: profiles.province })
            .from(profiles)
            .where(eq(profiles.userId, listingRow.userId))
            .limit(1)
        : [];

      const location =
        ownerProfile?.suburb ??
        ownerProfile?.city ??
        ownerProfile?.province ??
        "South Africa";

      // ── Call NVIDIA AI ───────────────────────────────────────────
      try {
        const prompt = `Suggest exactly 3 safe public meetup spots near ${location}, South Africa for a barter exchange.
           Prefer shopping malls, police stations, community centres, or busy well-lit public spaces.
           Return ONLY a JSON array of exactly 3 objects with keys: name, address, reason.
           No markdown, no explanation, no code fences. Example:
           [{"name":"Sandton City Mall","address":"83 Rivonia Rd, Sandton, Johannesburg","reason":"High foot traffic with 24/7 security"}]`;

        const text = await generateContent(prompt);
        const raw = (text || "").trim();
        // Strip markdown code fences if the model adds them despite instructions
        const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        const match = stripped.match(/\[.*\]/s);
        if (!match) {
          console.error("[generateSafeZone] No JSON array found in response:", raw);
          return { error: "invalid_ai_response" };
        }

        const parsed: unknown = JSON.parse(match[0]);
        if (!Array.isArray(parsed)) return { error: "invalid_ai_response" };

        type SpotShape = { name: string; address: string; reason: string };
        const validSpots = parsed.filter(
          (s): s is SpotShape =>
            typeof s === "object" &&
            s !== null &&
            typeof (s as Record<string, unknown>).name === "string" &&
            typeof (s as Record<string, unknown>).address === "string" &&
            typeof (s as Record<string, unknown>).reason === "string",
        );

        if (validSpots.length === 0) return { error: "invalid_ai_response" };

        await db.insert(meetupSpots).values(
          validSpots.map((spot, idx) => ({
            tradeId,
            name: spot.name,
            address: spot.address,
            reason: spot.reason,
            order: idx,
          })),
        );

        return { ok: true };
      } catch (err) {
        console.error("[generateSafeZone] AI call failed:", err);
        return {
          error:
            err instanceof AiServiceError && err.code === "nvidia_not_configured"
              ? "no_nvidia_key"
              : "ai_failed",
        };
      }
    }

    case "voteMeetupSpot": {
      if (trade.status !== "agreed") {
        return { error: "Trade must be agreed to vote on meetup spots" };
      }

      const spotId = Number(formData.get("spotId"));
      if (!spotId || Number.isNaN(spotId)) {
        return { error: "spotId is required" };
      }

      // Verify spot belongs to this trade
      const [spot] = await db
        .select({ id: meetupSpots.id })
        .from(meetupSpots)
        .where(
          and(eq(meetupSpots.id, spotId), eq(meetupSpots.tradeId, tradeId)),
        )
        .limit(1);

      if (!spot) return { error: "spot_not_found" };

      // Upsert: delete any existing vote for this user+trade, then insert
      await db
        .delete(meetupVotes)
        .where(
          and(
            eq(meetupVotes.tradeId, tradeId),
            eq(meetupVotes.userId, user.id),
          ),
        );

      await db.insert(meetupVotes).values({
        tradeId,
        userId: user.id,
        spotId,
      });

      return { ok: true };
    }

    default:
      return { error: "Unknown intent" };
  }
}

// ─── Component ─────────────────────────────────────────────────

export default function PingDetail({
  loaderData,
}: Route.ComponentProps) {
  const { trade, messages: chatMessages, counterparty, listing, currentUserId,
    myTrust, isReady, theyReady, spots, myVote, tradeItemsForTrade,
    userListings, userMsgCount, activeReport, hasRated, existingRatingScore, maxItems,
    disclosures } =
    loaderData;
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSubmitting = navigation.state === "submitting";
  const submittingIntent = isSubmitting
    ? (navigation.formData?.get("intent") as string | null)
    : null;
  const status = trade.status;

  // ── SafeZone fetchers ─────────────────────────────────────
  const generateFetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const voteFetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const isGeneratingSpots = generateFetcher.state !== "idle";

  // Map DB spots to SafeZonePicker's MeetupSpot shape
  const mappedSpots = spots.map((s) => ({
    name: s.name,
    address: s.address,
    reason: s.reason ?? "",
  }));

  // Derive the selected index (null when not voted, -1 if vote is stale)
  const selectedSpotIdx =
    myVote != null
      ? spots.findIndex((s) => s.id === myVote.spotId)
      : null;

  // Optimistic selected index while a vote is in-flight
  const pendingSpotId = voteFetcher.formData
    ? Number(voteFetcher.formData.get("spotId"))
    : null;
  const optimisticSelectedIdx =
    pendingSpotId != null
      ? spots.findIndex((s) => s.id === pendingSpotId)
      : selectedSpotIdx;

  // ── Trust system state ────────────────────────────────────
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBalancePile, setShowBalancePile] = useState(false);

  // ── BalancePile: derive trade values from loaded items ────
  // The listing's owner contributes its estimated value to their side of the scale.
  // Both parties may also add extra tradeItems to close the value gap.
  const counterpartyId =
    trade.initiatorId === currentUserId ? trade.responderId : trade.initiatorId;
  const listingValue = listing.estimatedValueZar ?? 0;
  const listingBelongsToCounterparty = listing.userId !== currentUserId;

  const theirBaseValue = listingBelongsToCounterparty ? listingValue : 0;
  const yourBaseValue = listingBelongsToCounterparty ? 0 : listingValue;

  const theirItemsValue = tradeItemsForTrade
    .filter((item) => item.userId === counterpartyId)
    .reduce((sum, item) => sum + (item.estimatedValue ?? 0), 0);
  const yourItemsValue = tradeItemsForTrade
    .filter((item) => item.userId === currentUserId)
    .reduce((sum, item) => sum + (item.estimatedValue ?? 0), 0);

  const theirValue = theirBaseValue + theirItemsValue;
  const yourValue = yourBaseValue + yourItemsValue;

  // Submit each BalancePile item as a separate addTradeItem action, then revalidate
  const handleBalanceSubmit = (
    items: Array<{ listingId?: number; description?: string; estimatedValue?: number }>,
  ) => {
    const requests = items.map((item) => {
      const fd = new FormData();
      fd.set("intent", "addTradeItem");
      if (item.listingId != null) fd.set("listingId", String(item.listingId));
      if (item.description) fd.set("description", item.description);
      if (item.estimatedValue != null)
        fd.set("estimatedValue", String(item.estimatedValue));
      fd.set("type", item.listingId != null ? "listing" : "service_extension");
      return fetch(`/dashboard/pings/${trade.id}`, { method: "post", body: fd });
    });
    Promise.all(requests).then(() => revalidator.revalidate());
    setShowBalancePile(false);
  };

  // ── Polling for new messages ──────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (revalidator.state === "idle") {
        revalidator.revalidate();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [revalidator]);

  // Immediate revalidation after action completes
  const prevNavState = useRef(navigation.state);
  useEffect(() => {
    if (prevNavState.current === "loading" && navigation.state === "idle") {
      if (revalidator.state === "idle") revalidator.revalidate();
    }
    prevNavState.current = navigation.state;
  }, [navigation.state, revalidator]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMessages.length]);

  /* ------------------------------------------------------------------ *
   *  Layout: fixed overlay between dashboard header (73px) and bottom   *
   *  nav (~80px) on mobile. On desktop (md+) the sidebar is 240px wide  *
   *  (set on root via md:pl-60), so we use md:left-60 to avoid overlap. *
   *  Two-column layout on desktop: chat left (3/5), status panel right. *
   *                                                                      *
   *  Dashboard header = py-4 (32px) + 40px content + 1px border = 73px  *
   *  Bottom nav       ≈ pt-2 + icons/labels + pb-4 + border ≈ 80px     *
   * ------------------------------------------------------------------ */

  // Status panel JSX — rendered in scroll area on mobile (md:hidden),
  // and in the dedicated right column on desktop (hidden md:flex).
  // Using a local function so it closes over all component state without
  // prop drilling. display:none on the hidden instance removes its form
  // elements from tab order, so duplicate DOM is safe.
  function renderTradeStatusPanel() {
    return (
      <>
        {/* Frozen banner */}
        {trade.status === "frozen" && (
          <div className="p-4 rounded-2xl bg-red-900/10 border border-red-500/20">
            <div className="flex justify-center mb-2">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <h4 className="text-center font-bold text-red-400 mb-1 uppercase tracking-wide text-sm">
              Trade Frozen
            </h4>
            <p className="text-center text-xs text-slate-400 mb-3">
              Contact details are hidden. This trade is under review.
            </p>
            {activeReport && activeReport[0]?.reporterId === currentUserId && (
              <Form method="post">
                <input type="hidden" name="intent" value="unfreezeTrade" />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono uppercase tracking-widest"
                >
                  {submittingIntent === "unfreezeTrade" ? (
                    <><Spinner /> Unfreezing...</>
                  ) : (
                    "Unfreeze Trade"
                  )}
                </button>
              </Form>
            )}
          </div>
        )}

        {/* Proposed — initial open-chat phase (Stage 01) */}
        {status === "proposed" && (
          <div className="p-5 rounded-2xl bg-[#0F172A] border border-slate-700/50 space-y-4">
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-slate-700/30 flex items-center justify-center border border-slate-600/30">
                <Handshake className="w-5 h-5 text-slate-300" />
              </div>
            </div>
            <h4 className="text-center font-black uppercase tracking-tighter text-white text-sm">
              Stage 01 — Open Chat
            </h4>

            {/* Trade summary */}
            <div className="space-y-2">
              <span className="font-mono uppercase tracking-widest text-[10px] text-slate-500 block">
                // Trade Summary
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="font-mono uppercase tracking-widest text-[9px] text-slate-500 block mb-1">You offer</span>
                  <p className="text-xs text-white font-bold leading-snug">
                    {listing.userId === currentUserId ? listing.title : "Your items"}
                  </p>
                  {yourValue > 0 && (
                    <p className="text-[9px] font-mono text-emerald-400 mt-0.5">~R{yourValue.toLocaleString()}</p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="font-mono uppercase tracking-widest text-[9px] text-slate-500 block mb-1">They offer</span>
                  <p className="text-xs text-white font-bold leading-snug">
                    {listing.userId !== currentUserId ? listing.title : "Their items"}
                  </p>
                  {theirValue > 0 && (
                    <p className="text-[9px] font-mono text-emerald-400 mt-0.5">~R{theirValue.toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Safe trading tips */}
            <div className="space-y-2">
              <span className="font-mono uppercase tracking-widest text-[10px] text-slate-500 block">
                // Safe Trading Tips
              </span>
              <ul className="space-y-1.5">
                {[
                  "Use the Handshake flow to agree on terms",
                  "Never share personal details in chat",
                  "Use Balance Trade to compare values fairly",
                  "Meet only at safe, well-lit public locations",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="text-emerald-500 text-[10px] font-mono mt-0.5 shrink-0">✓</span>
                    <span className="text-[10px] font-mono text-slate-400">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Handshake prompt */}
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[10px] font-mono text-emerald-400 leading-relaxed">
                  When both parties are ready, use{" "}
                  <span className="font-bold text-emerald-300">Initiate Handshake</span>{" "}
                  (🛡 button in the chat footer) to lock in terms and proceed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Handshake Stage: Negotiating */}
        {status === "negotiating" && (
          <div className="p-5 rounded-2xl bg-[#0F172A] border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 animate-pulse">
                <Unlock className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <h4 className="text-center font-bold text-white mb-2 uppercase tracking-wide">
              Stage 02: Handshake Initiated
            </h4>
            <p className="text-center text-xs text-slate-400 mb-4">
              Both parties must commit to reveal the Safe Zone meetup ticket
              and identity verification.
            </p>
            <Form method="post">
              <input type="hidden" name="intent" value="acceptHandshake" />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50"
              >
                {submittingIntent === "acceptHandshake" ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="w-3.5 h-3.5" />
                    Committing...
                  </span>
                ) : (
                  "Commit & Reveal"
                )}
              </button>
            </Form>
          </div>
        )}

        {/* Handshake Stage: Agreed — Dual-Blind Contact + SafeZone */}
        {status === "agreed" && (
          <div className="space-y-4">
            {/* Dual-Blind Contact Reveal */}
            <div className="rounded-2xl bg-[#0F172A] border border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-white uppercase tracking-wide text-sm">
                  Contact Exchange
                </h4>
              </div>

              {/* Readiness Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`text-center p-3 rounded-xl border transition-all ${
                  isReady
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-white/5 border-white/10"
                }`}>
                  <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">You</span>
                  <span className={`text-sm font-bold ${isReady ? "text-emerald-400" : "text-slate-400"}`}>
                    {isReady ? "✓ Ready" : "Not Ready"}
                  </span>
                </div>
                <div className={`text-center p-3 rounded-xl border transition-all ${
                  theyReady
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-white/5 border-white/10"
                }`}>
                  <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">
                    {counterparty.name}
                  </span>
                  <span className={`text-sm font-bold ${theyReady ? "text-emerald-400" : "text-slate-400"}`}>
                    {theyReady ? "✓ Ready" : "Not Ready"}
                  </span>
                </div>
              </div>

              {isReady && theyReady ? (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-xs font-mono text-emerald-400">
                      Both parties ready! Proceed to contact sharing.
                    </p>
                  </div>
                  <ShareContactForm isSubmitting={isSubmitting} submittingIntent={submittingIntent} />
                </>
              ) : isReady ? (
                <div className="space-y-2">
                  <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs font-mono text-emerald-400">
                      Waiting for {counterparty.name} to confirm...
                    </p>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggleReady" />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 font-mono uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                    >
                      {submittingIntent === "toggleReady" ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner className="w-3 h-3" /> Updating...
                        </span>
                      ) : (
                        "Un-mark Ready"
                      )}
                    </button>
                  </Form>
                </div>
              ) : (
                <Form method="post">
                  <input type="hidden" name="intent" value="toggleReady" />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 font-mono uppercase tracking-widest text-xs transition-all disabled:opacity-50"
                  >
                    {submittingIntent === "toggleReady" ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner className="w-3.5 h-3.5" /> Committing...
                      </span>
                    ) : (
                      "I'm Ready — Exchange Contacts"
                    )}
                  </button>
                </Form>
              )}
            </div>

            {/* SafeZone — NVIDIA-powered meetup spot picker */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Safe Meetup Zone
                <span className="ml-auto text-slate-600">
                  TKT-{trade.id.toString().padStart(4, "0")}
                </span>
              </span>

              {spots.length === 0 ? (
                <div className="rounded-2xl bg-[#0F172A] border border-white/10 overflow-hidden">
                  <div className="w-full h-20 bg-[#030712] relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]" />
                    <div className="w-20 h-20 rounded-full border border-cyan-500/20 absolute animate-ping" />
                    <MapPin className="w-6 h-6 text-cyan-400 relative z-10" />
                  </div>
                  <div className="p-4 space-y-3">
                    {generateFetcher.data?.error && (
                      <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
                        {generateFetcher.data.error === "no_nvidia_key"
                          ? "⚠ NVIDIA AI not configured — contact support"
                          : "⚠ Could not generate spots — try again"}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={isGeneratingSpots}
                      onClick={() =>
                        generateFetcher.submit(
                          { intent: "generateSafeZone" },
                          { method: "post" },
                        )
                      }
                      className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 font-mono uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGeneratingSpots ? (
                        <><Spinner className="w-3 h-3" /> Finding safe spots...</>
                      ) : (
                        "✦ Generate Safe Meetup Spots"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <SafeZonePicker
                  spots={mappedSpots}
                  selected={optimisticSelectedIdx ?? null}
                  onSelect={(idx) => {
                    const spot = spots[idx];
                    if (!spot) return;
                    voteFetcher.submit(
                      { intent: "voteMeetupSpot", spotId: String(spot.id) },
                      { method: "post" },
                    );
                  }}
                  isGenerating={isGeneratingSpots}
                  isConfirmed={myVote != null && voteFetcher.state === "idle"}
                />
              )}
            </div>
          </div>
        )}

        {/* Contact Shared — show complete button */}
        {status === "contact_shared" && (
          <div className="p-5 rounded-2xl bg-[#0F172A] border border-emerald-500/30">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                <Handshake className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <h4 className="text-center font-bold text-white mb-2 uppercase tracking-wide">
              Contact Details Shared
            </h4>
            <p className="text-center text-xs text-slate-400 mb-4">
              Coordinate your meetup, then mark the trade as complete.
            </p>
            <DisclosedContactsCard
              disclosures={disclosures}
              currentUserId={currentUserId}
              counterpartyName={counterparty.name}
            />
            <Form method="post" className="mt-4">
              <input type="hidden" name="intent" value="completeTrade" />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50"
              >
                {submittingIntent === "completeTrade" ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="w-3.5 h-3.5" />
                    Completing...
                  </span>
                ) : (
                  "Mark Trade Complete"
                )}
              </button>
            </Form>
          </div>
        )}

        {/* Completed */}
        {status === "completed" && (
          <>
            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <h4 className="text-center font-bold text-emerald-400 mb-2 uppercase tracking-wide">
                Trade Completed
              </h4>
              <p className="text-center text-xs text-slate-400">
                This exchange has been successfully completed. Thank you for
                using NoZar!
              </p>
            </div>
            <Form method="post" className="mt-4">
              <input type="hidden" name="intent" value="archive" />
              <button type="submit" className="w-full p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-xs font-bold uppercase tracking-wide">
                Archive Trade
              </button>
            </Form>
            {disclosures.length > 0 && (
              <div className="mt-4">
                <DisclosedContactsCard
                  disclosures={disclosures}
                  currentUserId={currentUserId}
                  counterpartyName={counterparty.name}
                />
              </div>
            )}

            {/* Post-completion CTA */}
            <div className="mt-4 rounded-2xl bg-[#0F172A] border border-white/10 p-5 space-y-3">
              <span className="font-mono uppercase tracking-widest text-[10px] text-slate-500 block">
                // What&apos;s Next?
              </span>
              <Link
                to="/dashboard/add"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all"
              >
                + List Another Item
              </Link>
              <Link
                to="/refer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#0F172A] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-mono uppercase tracking-widest text-[10px] transition-all"
              >
                Invite a Friend
              </Link>
            </div>
          </>
        )}

        {/* Rating */}
        {status === "completed" && !loaderData.hasRated && (
          <RatingForm
            isSubmitting={isSubmitting}
            submittingIntent={submittingIntent}
            counterpartyName={counterparty.name}
          />
        )}
        {status === "completed" && loaderData.hasRated && (
          <div className="mt-4 p-4 rounded-2xl bg-[#0F172A] border border-emerald-500/20 text-center">
            <span className="text-emerald-400 text-sm font-mono">
              ★ You rated this trade {loaderData.existingRatingScore}/5
            </span>
          </div>
        )}

        {/* Cancelled */}
        {status === "cancelled" && (
          <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
                <X className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <h4 className="text-center font-bold text-red-400 mb-2 uppercase tracking-wide">
              Trade Cancelled
            </h4>
            <p className="text-center text-xs text-slate-400">
              This trade has been cancelled.
            </p>
          </div>
        )}
      </>
    );
  }

  return (
    <>
        {/* Outer: fixed overlay — sidebar-offset on desktop, full-width on mobile */}
        <div className="fixed inset-x-0 md:left-60 top-[73px] bottom-20 md:bottom-0 z-20 bg-[#030712] flex flex-col md:flex-row">
          {/* ── Left column: chat ───────────────────────────────────── */}
          <div className="flex flex-col flex-1 md:flex-none md:w-3/5 min-h-0 md:border-r md:border-white/5">
      <div className="mx-auto w-full max-w-md px-4 flex flex-col h-full min-h-0 md:max-w-none md:mx-0 md:px-6">
        {isSubmitting && <LoadingBar className="mt-2" />}
        {/* Chat header */}
        <div className="flex items-center justify-between pt-4 pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-1">
            <Link
              to="/dashboard/pings"
              className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            {status !== "completed" && status !== "cancelled" && status !== "frozen" && (
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="text-[9px] font-mono uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors px-1"
                title="Report this trade"
              >
                🚩
              </button>
            )}
            {status !== "completed" && status !== "cancelled" && (
              <Form
                method="post"
                onSubmit={(e) => {
                  if (!confirm("Cancel this trade?")) e.preventDefault();
                }}
              >
                <input type="hidden" name="intent" value="cancelTrade" />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-[9px] font-mono uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors px-1 disabled:opacity-50"
                >
                  {submittingIntent === "cancelTrade" ? "Cancelling..." : "Cancel"}
                </button>
              </Form>
            )}
          </div>
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center">
              <h3 className="font-bold text-sm text-white">
                {counterparty.name}
              </h3>
              <TrustBadge level={(myTrust as any).level || "newcomer"} completedTrades={(myTrust as any).completedTrades || 0} averageRating={null} />
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              {listing.title}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#0F172A] border border-emerald-500/30 flex items-center justify-center overflow-hidden">
            {counterparty.image ? (
              <img
                src={counterparty.image}
                alt={counterparty.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-emerald-500">
                {counterparty.name.charAt(0)}
              </span>
            )}
          </div>
        </div>

        {/* Trust Protocol Banner — only in initial "proposed" state */}
        {status === "proposed" && (
          <div className="my-4 p-3 rounded-xl bg-cyan-900/10 border border-cyan-500/20 flex gap-3 shrink-0">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[10px] font-mono text-cyan-400 leading-relaxed uppercase tracking-wider">
              Stage 01: Chat is encrypted. Phone numbers and emails are
              automatically scrubbed for your safety.
            </p>
          </div>
        )}

        {/* Message Scroll Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto py-4 space-y-4 pr-2 min-h-0"
        >
          {chatMessages.map((msg) => {
            // System messages — centered, muted
            if (msg.type === "system") {
              return (
                <div key={msg.id} className="flex justify-center my-4">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 bg-[#0F172A] px-3 py-1 rounded-full border border-white/5">
                    [ {msg.text} ]
                  </span>
                </div>
              );
            }

            // User messages
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 ${
                    isMe
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-50"
                      : "bg-[#0F172A] border border-white/10 text-slate-300"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <span
                    className={`text-[8px] font-mono mt-1 block ${
                      isMe ? "text-emerald-500/50 text-right" : "text-slate-500"
                    }`}
                  >
                    {timeAgo(new Date(msg.createdAt))}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Frozen banner */}
          {trade.status === "frozen" && (
            <div className="my-4 p-4 rounded-2xl bg-red-900/10 border border-red-500/20">
              <div className="flex justify-center mb-2">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <h4 className="text-center font-bold text-red-400 mb-1 uppercase tracking-wide text-sm">
                Trade Frozen
              </h4>
              <p className="text-center text-xs text-slate-400 mb-3">
                Contact details are hidden. This trade is under review.
              </p>
              {activeReport && activeReport[0]?.reporterId === currentUserId && (
                <Form method="post">
                  <input type="hidden" name="intent" value="unfreezeTrade" />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono uppercase tracking-widest"
                  >
                    {submittingIntent === "unfreezeTrade" ? <><Spinner /> Unfreezing...</> : "Unfreeze Trade"}
                  </button>
                </Form>
              )}
            </div>
          )}

          {/* Status panels — mobile only; desktop shows them in right column */}
          <div className="md:hidden">

          {/* Proposed — initial open-chat phase (Stage 01), mobile */}
          {status === "proposed" && (
            <div className="mt-6 p-5 rounded-2xl bg-[#0F172A] border border-slate-700/50 space-y-4">
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-slate-700/30 flex items-center justify-center border border-slate-600/30">
                  <Handshake className="w-5 h-5 text-slate-300" />
                </div>
              </div>
              <h4 className="text-center font-black uppercase tracking-tighter text-white text-sm">
                Stage 01 — Open Chat
              </h4>

              {/* Trade summary */}
              <div className="space-y-2">
                <span className="font-mono uppercase tracking-widest text-[10px] text-slate-500 block">
                  // Trade Summary
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="font-mono uppercase tracking-widest text-[9px] text-slate-500 block mb-1">You offer</span>
                    <p className="text-xs text-white font-bold leading-snug">
                      {listing.userId === currentUserId ? listing.title : "Your items"}
                    </p>
                    {yourValue > 0 && (
                      <p className="text-[9px] font-mono text-emerald-400 mt-0.5">~R{yourValue.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="font-mono uppercase tracking-widest text-[9px] text-slate-500 block mb-1">They offer</span>
                    <p className="text-xs text-white font-bold leading-snug">
                      {listing.userId !== currentUserId ? listing.title : "Their items"}
                    </p>
                    {theirValue > 0 && (
                      <p className="text-[9px] font-mono text-emerald-400 mt-0.5">~R{theirValue.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Safe trading tips */}
              <div className="space-y-2">
                <span className="font-mono uppercase tracking-widest text-[10px] text-slate-500 block">
                  // Safe Trading Tips
                </span>
                <ul className="space-y-1.5">
                  {[
                    "Use the Handshake flow to agree on terms",
                    "Never share personal details in chat",
                    "Use Balance Trade to compare values fairly",
                    "Meet only at safe, well-lit public locations",
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-2">
                      <span className="text-emerald-500 text-[10px] font-mono mt-0.5 shrink-0">✓</span>
                      <span className="text-[10px] font-mono text-slate-400">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Handshake prompt */}
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-mono text-emerald-400 leading-relaxed">
                    When both parties are ready, use{" "}
                    <span className="font-bold text-emerald-300">Initiate Handshake</span>{" "}
                    (🛡 button below) to lock in terms and proceed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Handshake Stage: Negotiating — waiting for acceptance */}
          {status === "negotiating" && (
            <div className="mt-6 p-5 rounded-2xl bg-[#0F172A] border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 animate-pulse">
                  <Unlock className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <h4 className="text-center font-bold text-white mb-2 uppercase tracking-wide">
                Stage 02: Handshake Initiated
              </h4>
              <p className="text-center text-xs text-slate-400 mb-4">
                Both parties must commit to reveal the Safe Zone meetup ticket
                and identity verification.
              </p>
              <Form method="post">
                <input type="hidden" name="intent" value="acceptHandshake" />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50"
                >
                  {submittingIntent === "acceptHandshake" ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="w-3.5 h-3.5" />
                      Committing...
                    </span>
                  ) : (
                    "Commit & Reveal"
                  )}
                </button>
              </Form>
            </div>
          )}

          {/* Handshake Stage: Agreed — Dual-Blind Contact + SafeZone */}
          {status === "agreed" && (
            <div className="mt-6 space-y-4">
              {/* Dual-Blind Contact Reveal */}
              <div className="rounded-2xl bg-[#0F172A] border border-white/10 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-white uppercase tracking-wide text-sm">
                    Contact Exchange
                  </h4>
                </div>

                {/* Readiness Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className={`text-center p-3 rounded-xl border transition-all ${
                    isReady
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-white/5 border-white/10"
                  }`}>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">
                      You
                    </span>
                    <span className={`text-sm font-bold ${
                      isReady ? "text-emerald-400" : "text-slate-400"
                    }`}>
                      {isReady ? "✓ Ready" : "Not Ready"}
                    </span>
                  </div>
                  <div className={`text-center p-3 rounded-xl border transition-all ${
                    theyReady
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-white/5 border-white/10"
                  }`}>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">
                      {counterparty.name}
                    </span>
                    <span className={`text-sm font-bold ${
                      theyReady ? "text-emerald-400" : "text-slate-400"
                    }`}>
                      {theyReady ? "✓ Ready" : "Not Ready"}
                    </span>
                  </div>
                </div>

                {isReady && theyReady ? (
                  /* Both ready — reveal contacts */
                  <>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-xs font-mono text-emerald-400">
                        Both parties ready! Proceed to contact sharing.
                      </p>
                    </div>
                    <ShareContactForm isSubmitting={isSubmitting} submittingIntent={submittingIntent} />
                  </>
                ) : isReady ? (
                  <div className="space-y-2">
                    <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-xs font-mono text-emerald-400">
                        Waiting for {counterparty.name} to confirm...
                      </p>
                    </div>
                    <Form method="post">
                      <input type="hidden" name="intent" value="toggleReady" />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 font-mono uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                      >
                        {submittingIntent === "toggleReady" ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="w-3 h-3" /> Updating...
                          </span>
                        ) : (
                          "Un-mark Ready"
                        )}
                      </button>
                    </Form>
                  </div>
                ) : (
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggleReady" />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 font-mono uppercase tracking-widest text-xs transition-all disabled:opacity-50"
                    >
                      {submittingIntent === "toggleReady" ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner className="w-3.5 h-3.5" /> Committing...
                        </span>
                      ) : (
                        "I'm Ready — Exchange Contacts"
                      )}
                    </button>
                  </Form>
                )}
              </div>

              {/* SafeZone — NVIDIA-powered meetup spot picker */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  Safe Meetup Zone
                  <span className="ml-auto text-slate-600">
                    TKT-{trade.id.toString().padStart(4, "0")}
                  </span>
                </span>

                {spots.length === 0 ? (
                  /* ── No spots yet: show generate button ── */
                  <div className="rounded-2xl bg-[#0F172A] border border-white/10 overflow-hidden">
                    {/* decorative pulse header */}
                    <div className="w-full h-20 bg-[#030712] relative flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]" />
                      <div className="w-20 h-20 rounded-full border border-cyan-500/20 absolute animate-ping" />
                      <MapPin className="w-6 h-6 text-cyan-400 relative z-10" />
                    </div>

                    <div className="p-4 space-y-3">
                      {generateFetcher.data?.error && (
                        <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
                          {generateFetcher.data.error === "no_nvidia_key"
                            ? "⚠ NVIDIA AI not configured — contact support"
                            : "⚠ Could not generate spots — try again"}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={isGeneratingSpots}
                        onClick={() =>
                          generateFetcher.submit(
                            { intent: "generateSafeZone" },
                            { method: "post" },
                          )
                        }
                        className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 font-mono uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isGeneratingSpots ? (
                          <>
                            <Spinner className="w-3 h-3" />
                            Finding safe spots...
                          </>
                        ) : (
                          "✦ Generate Safe Meetup Spots"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Spots loaded: show picker or confirmed view ── */
                  <SafeZonePicker
                    spots={mappedSpots}
                    selected={optimisticSelectedIdx ?? null}
                    onSelect={(idx) => {
                      const spot = spots[idx];
                      if (!spot) return;
                      voteFetcher.submit(
                        { intent: "voteMeetupSpot", spotId: String(spot.id) },
                        { method: "post" },
                      );
                    }}
                    isGenerating={isGeneratingSpots}
                    isConfirmed={myVote != null && voteFetcher.state === "idle"}
                  />
                )}
              </div>
            </div>
          )}

          {/* Contact Shared — show complete button */}
          {status === "contact_shared" && (
            <div className="mt-6 p-5 rounded-2xl bg-[#0F172A] border border-emerald-500/30">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                  <Handshake className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <h4 className="text-center font-bold text-white mb-2 uppercase tracking-wide">
                Contact Details Shared
              </h4>
              <p className="text-center text-xs text-slate-400 mb-4">
                Coordinate your meetup, then mark the trade as complete.
              </p>
              <DisclosedContactsCard
                disclosures={disclosures}
                currentUserId={currentUserId}
                counterpartyName={counterparty.name}
              />
              <Form method="post" className="mt-4">
                <input type="hidden" name="intent" value="completeTrade" />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50"
                >
                  {submittingIntent === "completeTrade" ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="w-3.5 h-3.5" />
                      Completing...
                    </span>
                  ) : (
                    "Mark Trade Complete"
                  )}
                </button>
              </Form>
            </div>
          )}

          {/* Completed */}
          {status === "completed" && (
            <>
              <div className="mt-6 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <h4 className="text-center font-bold text-emerald-400 mb-2 uppercase tracking-wide">
                  Trade Completed
                </h4>
                <p className="text-center text-xs text-slate-400">
                  This exchange has been successfully completed. Thank you for
                  using NoZar!
                </p>
              </div>
              {disclosures.length > 0 && (
                <div className="mt-4">
                  <DisclosedContactsCard
                    disclosures={disclosures}
                    currentUserId={currentUserId}
                    counterpartyName={counterparty.name}
                  />
                </div>
              )}

              {/* Post-completion CTA */}
              <div className="mt-4 rounded-2xl bg-[#0F172A] border border-white/10 p-5 space-y-3">
                <span className="font-mono uppercase tracking-widest text-[10px] text-slate-500 block">
                  // What&apos;s Next?
                </span>
                <Link
                  to="/dashboard/add"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all"
                >
                  + List Another Item
                </Link>
                <Link
                  to="/refer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#0F172A] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-mono uppercase tracking-widest text-[10px] transition-all"
                >
                  Invite a Friend
                </Link>
              </div>
            </>
          )}

          {/* Rating — show form if not yet rated, confirmation if already rated */}
          {status === "completed" && !loaderData.hasRated && (
            <RatingForm
              isSubmitting={isSubmitting}
              submittingIntent={submittingIntent}
              counterpartyName={counterparty.name}
            />
          )}
          {status === "completed" && loaderData.hasRated && (
            <div className="mt-4 p-4 rounded-2xl bg-[#0F172A] border border-emerald-500/20 text-center">
              <span className="text-emerald-400 text-sm font-mono">
                ★ You rated this trade {loaderData.existingRatingScore}/5
              </span>
            </div>
          )}

          {/* Cancelled */}
          {status === "cancelled" && (
            <div className="mt-6 p-5 rounded-2xl bg-red-500/5 border border-red-500/20">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
                  <X className="w-5 h-5 text-red-400" />
                </div>
              </div>
              <h4 className="text-center font-bold text-red-400 mb-2 uppercase tracking-wide">
                Trade Cancelled
              </h4>
              <p className="text-center text-xs text-slate-400">
                This trade has been cancelled.
              </p>
            </div>
          )}
          </div>{/* end md:hidden status panels */}
        </div>

        {/* Chat Input Footer — hidden when trade is completed or cancelled */}
        {status !== "completed" && status !== "cancelled" && status !== "frozen" && (
          <div className="pt-3 pb-2 shrink-0">
            <MessageInput
              status={status}
              isSubmitting={isSubmitting}
              submittingIntent={submittingIntent}
              myTrust={myTrust as any}
              messagesRemaining={Math.max(0, 5 - ((userMsgCount ?? 0) as number))}
              onBalanceClick={() => setShowBalancePile(true)}
            />
          </div>
        )}
      </div>
          </div>{/* end left chat column */}

          {/* ── Right column: trade status panel — desktop only ─────── */}
          <div className="hidden md:flex flex-col w-2/5 overflow-y-auto px-6 py-6 gap-4 bg-[#0F172A]/20 border-l border-white/5">
            <div className="shrink-0 pb-3 border-b border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                // Trade Status
              </span>
            </div>
            {renderTradeStatusPanel()}
          </div>
    </div>

    {/* Report Modal */}
    <ReportModal
      isOpen={showReportModal}
      onClose={() => setShowReportModal(false)}
      onSubmit={(reason, description) => {
        const fd = new FormData();
        fd.set("intent", "reportTrade");
        fd.set("reason", reason);
        fd.set("description", description);
        fetch(`/dashboard/pings/${trade.id}`, { method: "post", body: fd })
          .then(() => { setShowReportModal(false); revalidator.revalidate(); });
      }}
      isSubmitting={isSubmitting && submittingIntent === "reportTrade"}
    />

    {/* Balance Pile */}
    <BalancePile
      isOpen={showBalancePile}
      onClose={() => setShowBalancePile(false)}
      onSubmit={handleBalanceSubmit}
      maxItems={maxItems ?? 5}
      userListings={userListings}
      theirValue={theirValue}
      yourValue={yourValue}
    />
  </>
);
}

// ─── Message input sub-component ────────────────────────────────

function MessageInput({
  status,
  isSubmitting,
  submittingIntent,
  myTrust,
  messagesRemaining,
  onBalanceClick,
}: {
  status: string;
  isSubmitting: boolean;
  submittingIntent: string | null;
  myTrust?: { level: string; completedTrades: number };
  messagesRemaining?: number;
  onBalanceClick?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  // Track the last submitting intent in a ref so we still have it when
  // isSubmitting flips back to false (at which point submittingIntent is null).
  const lastIntentRef = useRef<string | null>(null);

  useEffect(() => {
    if (isSubmitting && submittingIntent) {
      lastIntentRef.current = submittingIntent;
    }
  }, [isSubmitting, submittingIntent]);

  // Clear the input once the sendMessage submission completes
  useEffect(() => {
    if (!isSubmitting && lastIntentRef.current === "sendMessage") {
      formRef.current?.reset();
      lastIntentRef.current = null;
    }
  }, [isSubmitting]);

  return (
    <div>
      <div className="flex gap-2">
      {/* Propose Handshake button — only in "proposed" (initial) state */}
      {status === "proposed" && (
        <Form method="post">
          <input type="hidden" name="intent" value="proposeHandshake" />
          <button
            type="submit"
            disabled={isSubmitting}
            className="p-3 rounded-xl bg-[#0F172A] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Initiate Handshake"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
        </Form>
      )}

      {/* Balance Trade button — only in "proposed" state */}
      {status === "proposed" && onBalanceClick && (
        <button
          type="button"
          onClick={onBalanceClick}
          className="p-3 rounded-xl bg-[#0F172A] border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
          title="Balance the Trade"
        >
          <Scale className="w-5 h-5" />
        </button>
      )}

      {/* Counter-offer quick replies */}
      <div className="flex flex-wrap gap-2 mb-2">
        <Form method="post">
          <input type="hidden" name="intent" value="counterOffer" />
          <input type="hidden" name="text" value="Can you add another item?" />
          <button type="submit" className="px-3 py-1.5 rounded-full bg-[#1E293B] border border-white/10 text-xs text-slate-300 hover:border-emerald-500/50 transition-colors">
            Can you add another item?
          </button>
        </Form>
        <Form method="post">
          <input type="hidden" name="intent" value="counterOffer" />
          <input type="hidden" name="text" value="No thanks." />
          <button type="submit" className="px-3 py-1.5 rounded-full bg-[#1E293B] border border-white/10 text-xs text-slate-300 hover:border-emerald-500/50 transition-colors">
            No thanks.
          </button>
        </Form>
        <Form method="post">
          <input type="hidden" name="intent" value="counterOffer" />
          <input type="hidden" name="text" value="What else do you have?" />
          <button type="submit" className="px-3 py-1.5 rounded-full bg-[#1E293B] border border-white/10 text-xs text-slate-300 hover:border-emerald-500/50 transition-colors">
            What else do you have?
          </button>
        </Form>
      </div>

      {/* Message text input */}
      <Form ref={formRef} method="post" className="flex flex-1 gap-2">
        <input type="hidden" name="intent" value="sendMessage" />
        <input
          type="text"
          name="text"
          placeholder="Encrypted transmission..."
          required
          autoComplete="off"
          className="flex-1 bg-[#0F172A] border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50"
        />
        <button
          type="submit"
          disabled={isSubmitting && submittingIntent === "sendMessage"}
          className="p-3 rounded-xl bg-emerald-500 text-[#030712] hover:bg-emerald-400 transition-colors disabled:opacity-50"
        >
          {isSubmitting && submittingIntent === "sendMessage" ? (
            <Spinner className="w-5 h-5" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </Form>
      </div>

      {/* Newcomer message counter */}
      {myTrust?.level === "newcomer" && (messagesRemaining ?? 0) >= 0 && (
        <div className="text-center mt-1.5">
          <span className="text-[8px] font-mono text-amber-400/80 tracking-wider">
            {(messagesRemaining ?? 0) > 0
              ? `${messagesRemaining} message${(messagesRemaining ?? 0) !== 1 ? "s" : ""} remaining this trade`
              : "⚠️ Message limit reached — complete a trade to unlock"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Share contact sub-component ────────────────────────────────

function ShareContactForm({
  isSubmitting,
  submittingIntent,
}: {
  isSubmitting: boolean;
  submittingIntent: string | null;
}) {
  return (
    <div className="p-5 rounded-2xl bg-[#0F172A] border border-cyan-500/20">
      <h4 className="font-bold text-white mb-1 uppercase tracking-wide text-sm">
        Share Contact Details
      </h4>
      <p className="text-xs text-slate-400 mb-4">
        Share your phone or email so you can coordinate the meetup. Details
        expire after 48 hours.
      </p>
      <Form method="post" className="space-y-3">
        <input type="hidden" name="intent" value="shareContact" />
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            type="tel"
            name="phone"
            placeholder="e.g. 072 123 4567"
            className="flex-1 bg-[#030712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            type="email"
            name="email"
            placeholder="your@email.co.za"
            className="flex-1 bg-[#030712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-cyan-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:bg-cyan-400 transition-all disabled:opacity-50"
        >
          {submittingIntent === "shareContact" ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="w-3.5 h-3.5" />
              Sharing...
            </span>
          ) : (
            "Share & Continue"
          )}
        </button>
      </Form>
    </div>
  );
}

// ─── Rating form sub-component ───────────────────────────────────

function RatingForm({
  isSubmitting,
  submittingIntent,
  counterpartyName,
}: {
  isSubmitting: boolean;
  submittingIntent: string | null;
  counterpartyName: string;
}) {
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);

  return (
    <Form method="post" className="mt-4 p-5 rounded-2xl bg-[#0F172A] border border-emerald-500/20">
      <h4 className="font-bold text-white mb-1 uppercase tracking-wide text-sm">
        Rate Your Trade
      </h4>
      <p className="text-xs text-slate-400 mb-4">
        How was your experience with {counterpartyName}?
      </p>
      <input type="hidden" name="intent" value="submitRating" />
      <input type="hidden" name="score" value={score} />

      {/* Star rating */}
      <div className="flex gap-2 justify-center mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setScore(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className={`text-2xl transition-transform hover:scale-110 ${
              star <= (hovered || score) ? "text-emerald-400" : "text-slate-600"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        name="comment"
        placeholder="Leave a comment (optional)..."
        rows={2}
        className="w-full bg-[#030712] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-none mb-3"
      />

      <button
        type="submit"
        disabled={isSubmitting || score === 0}
        className="w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-all disabled:opacity-50"
      >
        {submittingIntent === "submitRating" ? (
          <span className="inline-flex items-center gap-2">
            <Spinner className="w-3.5 h-3.5" />
            Submitting...
          </span>
        ) : (
          "Submit Rating"
        )}
      </button>
    </Form>
  );
}

// ─── Disclosed Contacts Card sub-component ───────────────────────

type ContactDisclosureFields = { phone?: string; email?: string };

type ContactDisclosure = {
  userId: string;
  disclosedFields: unknown;
  expiresAt: Date | null;
};

function DisclosedContactsCard({
  disclosures,
  currentUserId,
  counterpartyName,
}: {
  disclosures: ContactDisclosure[];
  currentUserId: string;
  counterpartyName: string;
}) {
  const myDisclosure = disclosures.find((d) => d.userId === currentUserId);
  const theirDisclosure = disclosures.find((d) => d.userId !== currentUserId);

  if (!myDisclosure && !theirDisclosure) return null;

  return (
    <div className="rounded-2xl bg-[#0F172A] border border-emerald-500/20 overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/5 border-b border-white/5">
        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-mono uppercase tracking-widest text-[10px] text-emerald-400">
          Disclosed Contact Info
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Counterparty's disclosed info — the primary display */}
        {theirDisclosure && (() => {
          const fields = theirDisclosure.disclosedFields as ContactDisclosureFields;
          const hasAny = fields.phone ?? fields.email;
          if (!hasAny) return null;
          return (
            <div>
              <p className="font-mono uppercase tracking-widest text-[10px] text-slate-500 mb-2">
                {counterpartyName}
              </p>
              <div className="space-y-2">
                {fields.phone && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono text-xs text-white">{fields.phone}</span>
                  </div>
                )}
                {fields.email && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono text-xs text-white">{fields.email}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Separator when both parties have shared */}
        {myDisclosure && theirDisclosure && (
          <div className="border-t border-white/5" />
        )}

        {/* Your own disclosure — shown dimmed for confirmation */}
        {myDisclosure && (() => {
          const fields = myDisclosure.disclosedFields as ContactDisclosureFields;
          const hasAny = fields.phone ?? fields.email;
          if (!hasAny) return null;
          return (
            <div>
              <p className="font-mono uppercase tracking-widest text-[10px] text-slate-500 mb-2">
                You shared
              </p>
              <div className="space-y-2 opacity-50">
                {fields.phone && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-xs text-slate-300">{fields.phone}</span>
                  </div>
                )}
                {fields.email && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-xs text-slate-300">{fields.email}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Expiry notice — use the earliest non-null expiresAt */}
        {(theirDisclosure?.expiresAt ?? myDisclosure?.expiresAt) && (
          <p className="font-mono text-[9px] text-slate-600 text-center pt-1">
            Contact info expires{" "}
            {new Date(
              (theirDisclosure?.expiresAt ?? myDisclosure?.expiresAt)!
            ).toLocaleDateString("en-ZA", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
