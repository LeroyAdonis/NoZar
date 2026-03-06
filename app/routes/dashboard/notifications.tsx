import { Link, useFetcher } from "react-router";
import { Bell, MessageSquare } from "lucide-react";
import { data } from "react-router";

import type { Route } from "./+types/notifications";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import {
  getNotifications,
  markThreadRead,
} from "~/lib/notifications.server";
import { timeAgo } from "~/lib/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Notifications — Nozar" },
    {
      name: "description",
      content: "Your trade notifications and unread messages",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const notifications = await getNotifications(db, user.id);

  return {
    notifications: notifications.map((n) => ({
      ...n,
      // Serialize Date to ISO string for transport
      lastMessageAt: n.lastMessageAt?.toISOString() ?? null,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "mark-read") {
    const tradeId = Number(formData.get("tradeId"));
    if (!tradeId || Number.isNaN(tradeId)) {
      throw data({ error: "Invalid tradeId" }, { status: 400 });
    }
    await markThreadRead(db, user.id, tradeId);
    return { ok: true };
  }

  throw data({ error: "Unknown intent" }, { status: 400 });
}

/** Format an ISO timestamp into a human-readable relative time. */
function formatTime(iso: string | null): string {
  if (!iso) return "";
  return timeAgo(new Date(iso));
}

/** Truncate long message previews. */
function truncate(text: string, max = 60): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export default function Notifications({ loaderData }: Route.ComponentProps) {
  const { notifications } = loaderData;

  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-28 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1">
            // Signal.Feed
          </span>
          <h2 className="text-xl font-bold uppercase tracking-tight text-white">
            Notifications
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400 border border-white/10 px-2 py-1 rounded bg-[#0F172A]">
          {notifications.filter((n) => n.unread).length} Unread
        </span>
      </div>

      {/* Notification list */}
      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.tradeId}
              notification={notification}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0F172A] border border-white/10 flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-400 mb-1">
            No Notifications Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-[240px]">
            When you start swapping, your trade updates and messages will appear
            here.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── NotificationCard ─────────────────────────────────────

interface NotificationCardProps {
  notification: {
    tradeId: number;
    counterpartyName: string;
    listingTitle: string;
    tradeStatus: string;
    lastMessageText: string | null;
    lastMessageAt: string | null;
    unread: boolean;
  };
}

function NotificationCard({ notification }: NotificationCardProps) {
  const fetcher = useFetcher();
  const isMarking = fetcher.state !== "idle";

  // Optimistic: treat as read once the mark-read action is submitted
  const isUnread = notification.unread && !isMarking;

  function handleMarkRead() {
    fetcher.submit(
      { intent: "mark-read", tradeId: String(notification.tradeId) },
      { method: "post" },
    );
  }

  return (
    <Link
      to={`/dashboard/pings/${notification.tradeId}`}
      onClick={handleMarkRead}
      className={`group block rounded-xl border p-4 transition-all duration-200 ${
        isUnread
          ? "bg-[#0F172A] border-emerald-500/30 hover:border-emerald-500/50"
          : "bg-[#0F172A]/60 border-white/5 hover:border-white/15"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        <div className="mt-1.5 flex-shrink-0">
          {isUnread ? (
            <span className="block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          ) : (
            <span className="block w-2.5 h-2.5 rounded-full bg-slate-700" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3
              className={`text-sm truncate ${
                isUnread
                  ? "font-bold text-white"
                  : "font-medium text-slate-300"
              }`}
            >
              {notification.counterpartyName}
            </h3>
            <span className="text-[10px] font-mono text-slate-500 flex-shrink-0 uppercase tracking-wider">
              {formatTime(notification.lastMessageAt)}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-0.5 truncate">
            Re: {notification.listingTitle}
          </p>

          {notification.lastMessageText && (
            <p
              className={`text-xs mt-1.5 ${
                isUnread ? "text-slate-300" : "text-slate-500"
              }`}
            >
              <MessageSquare className="w-3 h-3 inline-block mr-1 -mt-0.5 text-slate-600" />
              {truncate(notification.lastMessageText)}
            </p>
          )}

          {/* Trade status badge */}
          <div className="mt-2">
            <span
              className={`inline-block text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${
                notification.tradeStatus === "accepted"
                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                  : notification.tradeStatus === "rejected"
                    ? "text-red-400 border-red-500/30 bg-red-500/10"
                    : "text-slate-400 border-white/10 bg-white/5"
              }`}
            >
              {notification.tradeStatus}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
