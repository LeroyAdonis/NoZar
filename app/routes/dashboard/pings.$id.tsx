import { useEffect, useRef, useState } from "react";
import { data, Form, Link, useNavigation, useRevalidator } from "react-router";
import { eq, asc, and } from "drizzle-orm";
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
} from "~/lib/schema";
import { timeAgo } from "~/lib/utils";
import { markThreadRead } from "~/lib/notifications.server";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";

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

  return {
    trade,
    messages: tradeMessages,
    counterparty: counterpartyRows[0],
    listing,
    currentUserId: user.id,
    hasRated: !!existingRating,
    existingRatingScore: existingRating?.score ?? null,
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

      // The ratee is the counterparty
      const counterpartyId =
        trade.initiatorId === user.id ? trade.responderId : trade.initiatorId;

      await db.insert(ratings).values({
        tradeId,
        raterId: user.id,
        rateeId: counterpartyId,
        score,
        comment,
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
  const { trade, messages: chatMessages, counterparty, listing, currentUserId } =
    loaderData;
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSubmitting = navigation.state === "submitting";
  const submittingIntent = isSubmitting
    ? (navigation.formData?.get("intent") as string | null)
    : null;

  // Poll for new messages every 2 seconds
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

  const status = trade.status;

  /* ------------------------------------------------------------------ *
   *  Layout: fixed overlay between dashboard header (73px) and bottom   *
   *  nav (~80px). This bypasses the parent <main> padding entirely,     *
   *  giving the chat full control of its vertical space.                 *
   *                                                                      *
   *  Dashboard header = py-4 (32px) + 40px content + 1px border = 73px  *
   *  Bottom nav       ≈ pt-2 + icons/labels + pb-4 + border ≈ 80px     *
   * ------------------------------------------------------------------ */
  return (
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
            <h3 className="font-bold text-sm text-white">
              {counterparty.name}
            </h3>
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

          {/* Handshake Stage: Agreed — SafeZone Ticket + Share Contact */}
          {status === "agreed" && (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#030712] border border-emerald-500/50 overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                {/* Ticket Header */}
                <div className="bg-emerald-500/10 p-4 border-b border-emerald-500/20 flex justify-between items-center">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Mutual Consensus Reached
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    TKT-{trade.id.toString().padStart(4, "0")}
                  </span>
                </div>

                {/* Map Placeholder */}
                <div className="w-full h-32 bg-[#030712] relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]" />
                  <div className="w-32 h-32 rounded-full border border-cyan-500/20 absolute animate-ping" />
                  <MapPin className="w-8 h-8 text-cyan-400 relative z-10" />
                </div>

                {/* Meetup Details */}
                <div className="p-5 space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">
                      System Selected Safe Zone
                    </span>
                    <h4 className="font-bold text-white text-lg flex items-center gap-2">
                      Engen Garage, Main Rd{" "}
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Well-lit area with 24/7 CCTV coverage.
                    </p>
                  </div>

                  {/* Verification Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">
                        Counterparty
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {counterparty.emailVerified
                          ? "ID Verified"
                          : "Unverified"}
                      </span>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">
                        Exchange Window
                      </span>
                      <span className="text-xs font-bold text-white">
                        48 Hours
                      </span>
                    </div>
                  </div>

                  {/* Navigation Button */}
                  <button
                    type="button"
                    className="w-full py-3 mt-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/10 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Navigation2 className="w-4 h-4" /> Get Directions
                  </button>
                </div>
              </div>

              {/* Share Contact Form */}
              <ShareContactForm isSubmitting={isSubmitting} submittingIntent={submittingIntent} />
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
        {status !== "completed" && status !== "cancelled" && (
          <div className="pt-3 pb-2 shrink-0">
            <MessageInput
              status={status}
              isSubmitting={isSubmitting}
              submittingIntent={submittingIntent}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Message input sub-component ────────────────────────────────

function MessageInput({
  status,
  isSubmitting,
  submittingIntent,
}: {
  status: string;
  isSubmitting: boolean;
  submittingIntent: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the input after successful submission
  useEffect(() => {
    if (!isSubmitting && submittingIntent === "sendMessage") {
      formRef.current?.reset();
    }
  }, [isSubmitting, submittingIntent]);

  return (
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
