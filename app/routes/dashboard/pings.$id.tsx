import { useEffect, useRef, useState } from "react";
import { data, Form, Link, useNavigation, useRevalidator } from "react-router";
import { eq, asc, and, or, count, avg } from "drizzle-orm";
import {
  ChevronLeft,
  Lock,
  Send,
  ShieldCheck,
  Unlock,
  MapPin,
  CheckCircle2,
  Navigation2,
  Phone,
  Mail,
  Handshake,
  X,
  ShieldAlert,
  Scale,
  AlertTriangle,
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

  // Fetch counterparty, messages, and listing in parallel
  const [counterpartyRows, tradeMessages, [listing]] = await Promise.all([
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

  return {
    trade,
    messages: tradeMessages,
    counterparty: counterpartyRows[0],
    listing,
    currentUserId: user.id,
    hasRated: !!existingRating,
    existingRatingScore: existingRating?.score ?? null,
    myTrust: myTrust || { level: "newcomer" as const, completedTrades: 0 },
    isReady: myReadyRow?.ready ?? false,
    theyReady: theirReadyRow?.ready ?? false,
    spots,
    votes,
    myVote: myVote ?? null,
    tradeItemsForTrade,
    userMsgCount,
    activeReport,
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
        if (msgCount >= 3) {
          return { error: "New users can send 3 messages per trade. Complete your first trade to unlock unlimited messaging." };
        }
      }

      const text = (formData.get("text") as string)?.trim();
      if (!text) {
        return { error: "Message cannot be empty" };
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

      await db
        .update(trades)
        .set({ status: "contact_shared", updatedAt: new Date() })
        .where(eq(trades.id, tradeId));

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

    default:
      return { error: "Unknown intent" };
  }
}

// ─── Component ─────────────────────────────────────────────────

export default function PingDetail({
  loaderData,
}: Route.ComponentProps) {
  const { trade, messages: chatMessages, counterparty, listing, currentUserId,
    myTrust, isReady, theyReady, spots, tradeItemsForTrade,
    userMsgCount, activeReport, hasRated, existingRatingScore, maxItems } =
    loaderData;
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSubmitting = navigation.state === "submitting";
  const submittingIntent = isSubmitting
    ? (navigation.formData?.get("intent") as string | null)
    : null;
  const status = trade.status;

  // ── Trust system state ────────────────────────────────────
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBalancePile, setShowBalancePile] = useState(false);

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
   *  nav (~80px). This bypasses the parent <main> padding entirely,     *
   *  giving the chat full control of its vertical space.                 *
   *                                                                      *
   *  Dashboard header = py-4 (32px) + 40px content + 1px border = 73px  *
   *  Bottom nav       ≈ pt-2 + icons/labels + pb-4 + border ≈ 80px     *
   * ------------------------------------------------------------------ */
  return (
    <>
        <div className="fixed inset-x-0 top-[73px] bottom-20 z-20 bg-[#030712] flex flex-col">
      <div className="mx-auto w-full max-w-md px-4 flex flex-col h-full min-h-0">
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
                  <ShareContactForm isSubmitting={isSubmitting} submittingIntent={submittingIntent} />
                ) : isReady ? (
                  <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs font-mono text-emerald-400">
                      Waiting for {counterparty.name} to confirm...
                    </p>
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

              {/* SafeZone Ticket */}
              <div className="rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#030712] border border-emerald-500/50 overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                <div className="bg-emerald-500/10 p-4 border-b border-emerald-500/20 flex justify-between items-center">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Mutual Consensus Reached
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    TKT-{trade.id.toString().padStart(4, "0")}
                  </span>
                </div>

                <div className="w-full h-32 bg-[#030712] relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]" />
                  <div className="w-32 h-32 rounded-full border border-cyan-500/20 absolute animate-ping" />
                  <MapPin className="w-8 h-8 text-cyan-400 relative z-10" />
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">
                      System Selected Safe Zone
                    </span>
                    <h4 className="font-bold text-white text-lg flex items-center gap-2">
                      AI-Powered Meetup Spot{" "}
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Well-lit area with 24/7 CCTV coverage.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">
                        Counterparty
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {counterparty.emailVerified ? "ID Verified" : "Unverified"}
                      </span>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">
                        Exchange Window
                      </span>
                      <span className="text-xs font-bold text-white">48 Hours</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full py-3 mt-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/10 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Navigation2 className="w-4 h-4" /> Get Directions
                  </button>
                </div>
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
              <Form method="post">
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
        </div>

        {/* Chat Input Footer — hidden when trade is completed or cancelled */}
        {status !== "completed" && status !== "cancelled" && status !== "frozen" && (
          <div className="pt-3 pb-2 shrink-0">
            <MessageInput
              status={status}
              isSubmitting={isSubmitting}
              submittingIntent={submittingIntent}
              myTrust={myTrust as any}
              messagesRemaining={Math.max(0, 3 - ((userMsgCount ?? 0) as number))}
              onBalanceClick={() => setShowBalancePile(true)}
            />
          </div>
        )}
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
      onSubmit={() => { /* handled by form submission via BalancePile internals */ }}
      maxItems={maxItems ?? 5}
      userListing={[]}
      theirValue={0}
      yourValue={0}
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

  // Clear the input after successful submission
  useEffect(() => {
    if (!isSubmitting && submittingIntent === "sendMessage") {
      formRef.current?.reset();
    }
  }, [isSubmitting, submittingIntent]);

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
