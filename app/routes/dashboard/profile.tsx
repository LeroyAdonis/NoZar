"use client";

import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { eq, or, and, count, avg } from "drizzle-orm";
import {
  Star,
  ArrowRightLeft,
  CheckCircle2,
  ShieldCheck,
  ShieldX,
  Pencil,
  LogOut,
  MapPin,
  Package,
} from "lucide-react";

import type { Route } from "./+types/profile";
import { requireAuth, auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { profiles, trades, ratings, listings } from "~/lib/schema";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";

// ─── South African provinces ───────────────────────────────────
const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

// ─── Meta ──────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile — Nozar" },
    { name: "description", content: "Your Nozar profile and settings" },
  ];
}

// ─── Loader ────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);

  // Upsert profile — fetch existing or create default
  let [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  if (!profile) {
    const [created] = await db
      .insert(profiles)
      .values({
        userId: user.id,
        displayName: user.name || "NoZar User",
      })
      .returning();
    profile = created;
  }

  // Trade stats — count all trades where user is participant
  const [tradeStats] = await db
    .select({
      tradeCount: count(),
    })
    .from(trades)
    .where(
      or(eq(trades.initiatorId, user.id), eq(trades.responderId, user.id)),
    );

  // Completed trades
  const [completedStats] = await db
    .select({
      completedCount: count(),
    })
    .from(trades)
    .where(
      and(
        or(eq(trades.initiatorId, user.id), eq(trades.responderId, user.id)),
        eq(trades.status, "completed"),
      ),
    );

  // Average rating where user is ratee
  const [ratingStats] = await db
    .select({
      avgRating: avg(ratings.score),
    })
    .from(ratings)
    .where(eq(ratings.rateeId, user.id));

  // User's active listings
  const activeListings = await db
    .select({
      id: listings.id,
      title: listings.title,
      category: listings.category,
      type: listings.type,
      estimatedValueZar: listings.estimatedValueZar,
      condition: listings.condition,
      status: listings.status,
      createdAt: listings.createdAt,
    })
    .from(listings)
    .where(and(eq(listings.userId, user.id), eq(listings.status, "active")));

  return {
    user,
    profile,
    stats: {
      tradeCount: tradeStats.tradeCount,
      completedCount: completedStats.completedCount,
      avgRating: ratingStats.avgRating
        ? parseFloat(ratingStats.avgRating)
        : null,
    },
    listings: activeListings,
  };
}

// ─── Action ────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "updateProfile") {
    const displayName =
      (formData.get("displayName") as string)?.trim() || user.name || "NoZar User";
    const bio = (formData.get("bio") as string)?.trim() || null;
    const suburb = (formData.get("suburb") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const province = (formData.get("province") as string)?.trim() || null;

    await db
      .update(profiles)
      .set({
        displayName,
        bio,
        suburb,
        city,
        province,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, user.id));

    return { success: true, intent: "updateProfile" };
  }

  if (intent === "logout") {
    // Sign out via Better Auth API then redirect to home
    await auth.api.signOut({
      headers: request.headers,
    });

    // Redirect to landing page after sign-out
    return new Response(null, {
      status: 302,
      headers: { Location: "/" },
    });
  }

  return { success: false, intent: "unknown" };
}

// ─── Component ─────────────────────────────────────────────────

export default function Profile({ loaderData, actionData }: Route.ComponentProps) {
  const { user, profile, stats, listings: activeListings } = loaderData;
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);

  const isSubmitting = navigation.state === "submitting";

  // Close edit form after successful profile update
  const didUpdate =
    actionData && "intent" in actionData && actionData.intent === "updateProfile" && actionData.success;

  // Generate initials for avatar fallback
  const initials = (profile.displayName || user.name || "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Format location string
  const locationParts = [profile.suburb, profile.city, profile.province].filter(
    Boolean,
  );
  const locationStr = locationParts.length > 0 ? locationParts.join(", ") : null;

  return (
    <div className="space-y-6">
      {/* Section label */}
      <div className="pt-2">
        <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1">
          // Your Profile
        </span>
        <h2 className="text-xl font-bold uppercase tracking-tight">
          Account
        </h2>
      </div>

      {/* Profile card */}
      <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="w-16 h-16 rounded-2xl object-cover border border-white/10"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-400 font-black text-lg">
                {initials}
              </span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-white truncate">
                {profile.displayName}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-slate-500 hover:text-emerald-400 transition-colors p-1"
                aria-label="Edit profile"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            {profile.bio && (
              <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                {profile.bio}
              </p>
            )}

            {locationStr && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="w-3 h-3 text-cyan-500" />
                <span>{locationStr}</span>
              </div>
            )}

            {/* Email + verification badge */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-mono text-slate-500 truncate">
                {user.email}
              </span>
              {user.emailVerified ? (
                <Badge variant="verified">
                  <ShieldCheck className="w-3 h-3 mr-0.5" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="unverified">
                  <ShieldX className="w-3 h-3 mr-0.5" />
                  Unverified
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Success message */}
        {didUpdate && !isEditing && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-mono text-emerald-400 uppercase tracking-widest">
            Profile updated
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<ArrowRightLeft className="w-4 h-4 text-cyan-400" />}
          label="Total Trades"
          value={stats.tradeCount}
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          label="Completed"
          value={stats.completedCount}
        />
        <StatCard
          icon={<Star className="w-4 h-4 text-amber-400" />}
          label="Avg Rating"
          value={
            stats.avgRating !== null ? stats.avgRating.toFixed(1) : "—"
          }
        />
      </div>

      {/* Edit form (toggled) */}
      {isEditing && (
        <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-300">
              Edit Profile
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-slate-500 hover:text-slate-300 font-mono uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>

          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="updateProfile" />

            <Input
              variant="nozar"
              label="Display Name"
              name="displayName"
              defaultValue={profile.displayName}
              placeholder="Your display name"
              required
              maxLength={50}
            />

            <div>
              <label
                htmlFor="bio"
                className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
              >
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                defaultValue={profile.bio ?? ""}
                placeholder="Tell people what you're about..."
                maxLength={280}
                rows={3}
                className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                variant="nozar"
                label="Suburb"
                name="suburb"
                defaultValue={profile.suburb ?? ""}
                placeholder="e.g. Braamfontein"
                maxLength={100}
              />
              <Input
                variant="nozar"
                label="City"
                name="city"
                defaultValue={profile.city ?? ""}
                placeholder="e.g. Johannesburg"
                maxLength={100}
              />
            </div>

            <div>
              <label
                htmlFor="province"
                className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
              >
                Province
              </label>
              <select
                id="province"
                name="province"
                defaultValue={profile.province ?? ""}
                className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 appearance-none"
              >
                <option value="">Select province</option>
                {SA_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              variant="nozar"
              size="md"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </Form>
        </div>
      )}

      {/* Active listings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm uppercase tracking-widest text-slate-300">
            Your Listings
          </h3>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            {activeListings.length} active
          </span>
        </div>

        {activeListings.length > 0 ? (
          <div className="space-y-2">
            {activeListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-[#0F172A] border border-white/10 rounded-2xl p-4 flex items-center gap-3 hover:border-white/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-white truncate">
                    {listing.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      {listing.category}
                    </span>
                    {listing.estimatedValueZar && (
                      <span className="text-[10px] font-mono text-emerald-500">
                        ~R{listing.estimatedValueZar.toLocaleString("en-ZA")}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="verified" className="flex-shrink-0">
                  {listing.type}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-8 text-center">
            <div className="text-slate-600 text-3xl mb-3">⊘</div>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-widest mb-1">
              No active listings
            </p>
            <p className="text-slate-600 text-xs">
              Create your first listing to start trading
            </p>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="pt-2 pb-4">
        <Form method="post">
          <input type="hidden" name="intent" value="logout" />
          <Button
            type="submit"
            variant="danger"
            size="md"
            disabled={isSubmitting}
            className="w-full"
          >
            <LogOut className="w-4 h-4" />
            {isSubmitting ? "Signing out..." : "Sign Out"}
          </Button>
        </Form>
      </div>
    </div>
  );
}

// ─── Stat card sub-component ───────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">
        {label}
      </div>
    </div>
  );
}
