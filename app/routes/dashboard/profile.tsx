"use client";

import { useEffect, useRef, useState } from "react";
import { Form, useNavigation, useFetcher, Link } from "react-router";
import { eq, or, and, count, avg, inArray } from "drizzle-orm";
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
  Archive,
  RotateCcw,
  X,
  Save,
  Camera,
  Trash2,
  ImagePlus,
  Plus,
  Phone,
} from "lucide-react";

import type { Route } from "./+types/profile";
import { requireAuth, auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { profiles, trades, ratings, listings, listingImages, users } from "~/lib/schema";
import {
  validateImageUrl,
  sanitizeImageUrl,
} from "~/lib/media-validation.server";
import { uploadToBlob, isBlobConfigured } from "~/lib/blob.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";
import { MVP_REGIONS, REGION_SLUGS } from "~/lib/regions";

// ─── MVP provinces (WC & GP only) ──────────────────────────────
const MVP_PROVINCES = REGION_SLUGS.map((slug) => MVP_REGIONS[slug].province);

// ─── Listing option constants ──────────────────────────────────
const CATEGORIES = [
  "Electronics",
  "Home & Garden",
  "Fashion",
  "Skills",
  "Vehicles",
  "Sports",
  "Books",
  "Services",
] as const;

const CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"] as const;

const DELIVERY_METHODS = ["Pickup", "Delivery", "Either"] as const;

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
    try {
      const [created] = await db
        .insert(profiles)
        .values({
          userId: user.id,
          displayName: user.name || "NoZar User",
        })
        .returning();
      profile = created;
    } catch (insertErr) {
      console.error(
        "[profile] DB insert failed — has migration 0003 been applied? Run: psql $DATABASE_URL -f drizzle/0003_phone_verification.sql",
        insertErr,
      );
      const msg = insertErr instanceof Error ? insertErr.message : String(insertErr);
      // Column-not-found errors indicate migration 0003 hasn't been applied.
      // Fall back to an insert that omits phone/phoneVerified from RETURNING so
      // the SQL doesn't reference columns the DB doesn't yet have.
      if (msg.includes("column") || msg.includes("does not exist")) {
        const [created] = await db
          .insert(profiles)
          .values({
            userId: user.id,
            displayName: user.name || "NoZar User",
          })
          .returning({
            id: profiles.id,
            userId: profiles.userId,
            displayName: profiles.displayName,
            bio: profiles.bio,
            suburb: profiles.suburb,
            city: profiles.city,
            province: profiles.province,
            lat: profiles.lat,
            lng: profiles.lng,
            searchRadiusKm: profiles.searchRadiusKm,
            avatarUrl: profiles.avatarUrl,
            createdAt: profiles.createdAt,
            updatedAt: profiles.updatedAt,
          });
        // Augment with defaults for the missing migration columns.
        profile = { ...created, phone: null, phoneVerified: false } as typeof profile;
      } else {
        throw insertErr;
      }
    }
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

  // User's listings — both active and archived for management
  const userListings = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      category: listings.category,
      type: listings.type,
      estimatedValueZar: listings.estimatedValueZar,
      condition: listings.condition,
      deliveryMethod: listings.deliveryMethod,
      seekingDescription: listings.seekingDescription,
      status: listings.status,
      createdAt: listings.createdAt,
    })
    .from(listings)
    .where(
      and(
        eq(listings.userId, user.id),
        inArray(listings.status, ["active", "archived"]),
      ),
    );

  // Fetch images for all user listings
  const listingIds = userListings.map((l) => l.id);
  const allImages =
    listingIds.length > 0
      ? await db
          .select({
            listingId: listingImages.listingId,
            url: listingImages.url,
            order: listingImages.order,
          })
          .from(listingImages)
          .where(inArray(listingImages.listingId, listingIds))
          .orderBy(listingImages.order)
      : [];

  // Group images by listing ID
  const imagesByListing: Record<number, { url: string; order: number }[]> = {};
  for (const img of allImages) {
    const arr = imagesByListing[img.listingId] ?? [];
    arr.push({ url: img.url, order: img.order });
    imagesByListing[img.listingId] = arr;
  }

  return {
    user,
    profile,
    blobConfigured: isBlobConfigured(),
    stats: {
      tradeCount: tradeStats.tradeCount,
      completedCount: completedStats.completedCount,
      avgRating: ratingStats.avgRating
        ? parseFloat(ratingStats.avgRating)
        : null,
    },
    listings: userListings,
    listingImagesMap: imagesByListing,
  };
}

// ─── Action ────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update-avatar") {
    const avatarUrl = (formData.get("avatarUrl") as string)?.trim() || "";

    if (avatarUrl === "") {
      return { success: false, intent: "update-avatar", error: "Please enter an image URL" };
    }

    const validation = validateImageUrl(avatarUrl);
    if (!validation.valid) {
      return { success: false, intent: "update-avatar", error: validation.error };
    }

    await db
      .update(profiles)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(profiles.userId, user.id));

    return { success: true, intent: "update-avatar" };
  }

  if (intent === "upload-avatar-file") {
    if (!isBlobConfigured()) {
      return { success: false, intent: "upload-avatar-file", error: "File upload is not configured. Use URL input instead." };
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return { success: false, intent: "upload-avatar-file", error: "No file received." };
    }

    if (!file.type.startsWith("image/")) {
      return { success: false, intent: "upload-avatar-file", error: "File must be an image." };
    }

    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return { success: false, intent: "upload-avatar-file", error: "Image must be under 5 MB." };
    }

    try {
      const avatarUrl = await uploadToBlob(file, "avatars");
      await db
        .update(profiles)
        .set({ avatarUrl, updatedAt: new Date() })
        .where(eq(profiles.userId, user.id));
      return { success: true, intent: "upload-avatar-file", avatarUrl };
    } catch {
      return { success: false, intent: "upload-avatar-file", error: "Upload failed. Please try again." };
    }
  }

  if (intent === "remove-avatar") {
    await db
      .update(profiles)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(profiles.userId, user.id));

    return { success: true, intent: "remove-avatar" };
  }

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

    // Keep users.name in sync so sidebar and other UI reflects the update
    await db
      .update(users)
      .set({ name: displayName })
      .where(eq(users.id, user.id));

    return { success: true, intent: "updateProfile" };
  }

  if (intent === "update-listing") {
    const listingId = Number(formData.get("listingId"));
    if (!listingId || isNaN(listingId)) {
      return { success: false, intent: "update-listing", error: "Invalid listing ID" };
    }

    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const category = (formData.get("category") as string)?.trim();
    const condition = (formData.get("condition") as string)?.trim() || null;
    const deliveryMethod = (formData.get("deliveryMethod") as string)?.trim() || null;
    const seekingDescription = (formData.get("seekingDescription") as string)?.trim() || null;
    const estimatedValueRaw = formData.get("estimatedValueZar") as string;
    const estimatedValueZar = estimatedValueRaw ? Number(estimatedValueRaw) : null;

    if (!title || !description || !category) {
      return { success: false, intent: "update-listing", error: "Title, description, and category are required" };
    }

    // ── Collect & validate image URLs ─────────────────────────
    const validImageUrls: string[] = [];
    const imageErrors: Record<string, string> = {};
    for (let i = 0; i < 5; i++) {
      const raw = formData.get(`imageUrl_${i}`) as string | null;
      if (!raw || raw.trim() === "") continue;
      const sanitized = sanitizeImageUrl(raw);
      const result = validateImageUrl(sanitized);
      if (!result.valid) {
        imageErrors[`imageUrl_${i}`] = result.error ?? "Invalid image URL";
      } else {
        validImageUrls.push(sanitized);
      }
    }

    if (Object.keys(imageErrors).length > 0) {
      return {
        success: false,
        intent: "update-listing",
        error: "Some image URLs are invalid",
        imageErrors,
      };
    }

    // Ownership enforced in SQL WHERE clause
    const result = await db
      .update(listings)
      .set({
        title,
        description,
        category,
        condition,
        deliveryMethod,
        seekingDescription,
        estimatedValueZar,
        updatedAt: new Date(),
      })
      .where(and(eq(listings.id, listingId), eq(listings.userId, user.id)))
      .returning({ id: listings.id });

    if (result.length === 0) {
      return { success: false, intent: "update-listing", error: "Listing not found or not owned by you" };
    }

    // Replace strategy: delete old images, insert new ones
    await db
      .delete(listingImages)
      .where(eq(listingImages.listingId, listingId));

    if (validImageUrls.length > 0) {
      await db.insert(listingImages).values(
        validImageUrls.map((url, order) => ({
          listingId,
          url,
          order,
        })),
      );
    }

    return { success: true, intent: "update-listing", listingId };
  }

  if (intent === "archive-listing") {
    const listingId = Number(formData.get("listingId"));
    if (!listingId || isNaN(listingId)) {
      return { success: false, intent: "archive-listing", error: "Invalid listing ID" };
    }

    // Ownership enforced in SQL WHERE clause
    const result = await db
      .update(listings)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(listings.id, listingId), eq(listings.userId, user.id)))
      .returning({ id: listings.id });

    if (result.length === 0) {
      return { success: false, intent: "archive-listing", error: "Listing not found or not owned by you" };
    }

    return { success: true, intent: "archive-listing", listingId };
  }

  if (intent === "activate-listing") {
    const listingId = Number(formData.get("listingId"));
    if (!listingId || isNaN(listingId)) {
      return { success: false, intent: "activate-listing", error: "Invalid listing ID" };
    }

    // Ownership enforced in SQL WHERE clause
    const result = await db
      .update(listings)
      .set({ status: "active", updatedAt: new Date() })
      .where(and(eq(listings.id, listingId), eq(listings.userId, user.id)))
      .returning({ id: listings.id });

    if (result.length === 0) {
      return { success: false, intent: "activate-listing", error: "Listing not found or not owned by you" };
    }

    return { success: true, intent: "activate-listing", listingId };
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
  const { user, profile, blobConfigured, stats, listings: userListings, listingImagesMap } = loaderData;
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);
  const avatarFetcher = useFetcher();
  const [avatarInput, setAvatarInput] = useState(profile.avatarUrl ?? "");
  // Hidden file input for avatar upload
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  const isSubmitting = navigation.state === "submitting";
  const submittingIntent = isSubmitting
    ? (navigation.formData?.get("intent") as string | null)
    : null;
  const submittingListingId = isSubmitting
    ? Number(navigation.formData?.get("listingId"))
    : null;

  // Close edit form after successful profile update
  const didUpdate =
    actionData && "intent" in actionData && actionData.intent === "updateProfile" && actionData.success;

  // Partition listings into active and archived
  const activeListings = userListings.filter((l) => l.status === "active");
  const archivedListings = userListings.filter((l) => l.status === "archived");

  const avatarActionData = avatarFetcher.data as { success?: boolean; intent?: string; error?: string; avatarUrl?: string } | undefined;
  const isAvatarSubmitting = avatarFetcher.state === "submitting";
  const isAvatarFileUploading =
    isAvatarSubmitting && avatarFetcher.formData?.get("intent") === "upload-avatar-file";

  // When file upload succeeds, mirror the new URL into the URL input field
  const prevAvatarState = useRef<string>("idle");
  useEffect(() => {
    if (
      prevAvatarState.current === "submitting" &&
      avatarFetcher.state === "idle" &&
      avatarActionData?.intent === "upload-avatar-file" &&
      avatarActionData?.success &&
      avatarActionData?.avatarUrl
    ) {
      setAvatarInput(avatarActionData.avatarUrl);
    }
    prevAvatarState.current = avatarFetcher.state;
  }, [avatarFetcher.state, avatarActionData]);

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
      {isSubmitting && <LoadingBar />}
      {/* Section label */}
      <div className="pt-2">
        <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1">
          // Your Profile
        </span>
        <h2 className="text-xl font-bold uppercase tracking-tight">
          Account
        </h2>
      </div>

      {/* Avatar management */}
      <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-4">
          Profile Photo
        </span>

        <div className="flex items-start gap-5">
          {/* Current avatar display — large circle */}
          <div className="flex-shrink-0">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-700 border-2 border-white/10 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-2xl">
                  {(profile.displayName || user.name || "?").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Avatar controls */}
          <div className="flex-1 space-y-3">
            {/* ── File upload (when blob is configured) ── */}
            {blobConfigured && (
              <div>
                {/* Hidden file input */}
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  disabled={isAvatarSubmitting}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.set("intent", "upload-avatar-file");
                    fd.set("file", file);
                    avatarFetcher.submit(fd, { method: "post", encType: "multipart/form-data" });
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={isAvatarSubmitting}
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 text-xs font-mono uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {isAvatarFileUploading ? (
                    <>
                      <Spinner />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-3.5 h-3.5" />
                      Upload Photo
                    </>
                  )}
                </button>

                {/* File upload error */}
                {avatarActionData && !avatarActionData.success && avatarActionData.intent === "upload-avatar-file" && (
                  <p className="mt-1.5 text-red-400 text-xs font-mono">
                    {avatarActionData.error}
                  </p>
                )}
                {/* File upload success */}
                {avatarActionData?.success && avatarActionData.intent === "upload-avatar-file" && (
                  <p className="mt-1.5 text-emerald-400 text-xs font-mono uppercase tracking-widest">
                    Photo uploaded ✓
                  </p>
                )}
              </div>
            )}

            {/* ── URL form ── */}
            <avatarFetcher.Form method="post" className="space-y-3">
              <input type="hidden" name="intent" value="update-avatar" />

              <div>
                <label
                  htmlFor="avatarUrl"
                  className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
                >
                  {blobConfigured ? "Or paste an image URL" : "Image URL"}
                </label>
                <input
                  id="avatarUrl"
                  name="avatarUrl"
                  type="url"
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 font-mono text-sm"
                />
              </div>

              {/* Validation error */}
              {avatarActionData && !avatarActionData.success && avatarActionData.intent === "update-avatar" && (
                <p className="text-red-400 text-xs font-mono">
                  {avatarActionData.error}
                </p>
              )}

              {/* Success message */}
              {avatarActionData?.success && (avatarActionData.intent === "update-avatar" || avatarActionData.intent === "remove-avatar") && (
                <p className="text-emerald-400 text-xs font-mono uppercase tracking-widest">
                  {avatarActionData.intent === "remove-avatar" ? "Avatar removed" : "Avatar updated"}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isAvatarSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 text-xs font-mono uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {isAvatarSubmitting && avatarFetcher.formData?.get("intent") === "update-avatar" ? (
                    <Spinner />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  Save URL
                </button>

                {profile.avatarUrl && (
                  <button
                    type="button"
                    disabled={isAvatarSubmitting}
                    onClick={() => {
                      const fd = new FormData();
                      fd.set("intent", "remove-avatar");
                      avatarFetcher.submit(fd, { method: "post" });
                      setAvatarInput("");
                    }}
                    className="text-red-400 hover:text-red-300 text-xs font-mono uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>
            </avatarFetcher.Form>
          </div>
        </div>
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

            {/* Phone + verification badge */}
            <div className="flex items-center gap-2 mt-1.5">
              <Phone className="w-3 h-3 text-slate-600 flex-shrink-0" />
              {profile.phone ? (
                <>
                  <span className="text-[10px] font-mono text-slate-500 truncate">
                    {profile.phone}
                  </span>
                  {profile.phoneVerified ? (
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
                  <Link
                    to="/dashboard/verify-phone"
                    className="text-[10px] font-mono uppercase tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors ml-auto"
                  >
                    {profile.phoneVerified ? "Change" : "Verify"}
                  </Link>
                </>
              ) : (
                <Link
                  to="/dashboard/verify-phone"
                  className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  + Add Phone
                </Link>
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
                className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 appearance-none cursor-pointer"
              >
                <option value="">Select province</option>
                {MVP_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mt-1">
                More provinces coming soon
              </p>
            </div>

            <Button
              type="submit"
              variant="nozar"
              size="md"
              disabled={isSubmitting}
              className="w-full"
            >
              {submittingIntent === "updateProfile" ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
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
              <ListingCard
                key={listing.id}
                listing={listing}
                images={listingImagesMap[listing.id] ?? []}
                isEditingThis={editingListingId === listing.id}
                isConfirmingArchive={confirmArchiveId === listing.id}
                isSubmitting={isSubmitting}
                submittingIntent={submittingIntent}
                submittingListingId={submittingListingId}
                onEditToggle={() =>
                  setEditingListingId(
                    editingListingId === listing.id ? null : listing.id,
                  )
                }
                onArchiveToggle={() =>
                  setConfirmArchiveId(
                    confirmArchiveId === listing.id ? null : listing.id,
                  )
                }
              />
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

      {/* Archived listings */}
      {archivedListings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-500">
              Archived
            </h3>
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
              {archivedListings.length} archived
            </span>
          </div>

          <div className="space-y-2">
            {archivedListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                images={listingImagesMap[listing.id] ?? []}
                isEditingThis={editingListingId === listing.id}
                isConfirmingArchive={false}
                isSubmitting={isSubmitting}
                submittingIntent={submittingIntent}
                submittingListingId={submittingListingId}
                onEditToggle={() =>
                  setEditingListingId(
                    editingListingId === listing.id ? null : listing.id,
                  )
                }
                onArchiveToggle={() => {}}
              />
            ))}
          </div>
        </div>
      )}

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
            {submittingIntent === "logout" ? (
              <>
                <Spinner />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Sign Out
              </>
            )}
          </Button>
        </Form>
      </div>
    </div>
  );
}

// ─── Listing card with edit/archive controls ───────────────────

type ListingData = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  estimatedValueZar: number | null;
  condition: string | null;
  deliveryMethod: string | null;
  seekingDescription: string | null;
  status: string;
  createdAt: Date;
};

type ListingImageData = { url: string; order: number };

function ListingCard({
  listing,
  images,
  isEditingThis,
  isConfirmingArchive,
  isSubmitting,
  submittingIntent,
  submittingListingId,
  onEditToggle,
  onArchiveToggle,
}: {
  listing: ListingData;
  images: ListingImageData[];
  isEditingThis: boolean;
  isConfirmingArchive: boolean;
  isSubmitting: boolean;
  submittingIntent: string | null;
  submittingListingId: number | null;
  onEditToggle: () => void;
  onArchiveToggle: () => void;
}) {
  const isArchived = listing.status === "archived";
  const isThisSubmitting =
    isSubmitting && submittingListingId === listing.id;

  return (
    <div
      className={`bg-[#0F172A] border rounded-2xl transition-colors ${
        isArchived
          ? "border-white/5 opacity-60"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      {/* Listing summary row */}
      <div className="p-4 flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
            isArchived
              ? "bg-slate-800/50 border border-slate-700/30"
              : "bg-emerald-500/10 border border-emerald-500/20"
          }`}
        >
          {images[0]?.url ? (
            <img
              src={images[0].url}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package
              className={`w-5 h-5 ${isArchived ? "text-slate-600" : "text-emerald-400"}`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className={`font-semibold text-sm truncate ${
              isArchived ? "text-slate-500" : "text-white"
            }`}
          >
            {listing.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              {listing.category}
            </span>
            {listing.estimatedValueZar != null && (
              <span
                className={`text-[10px] font-mono ${
                  isArchived ? "text-slate-600" : "text-emerald-500"
                }`}
              >
                ~R{listing.estimatedValueZar.toLocaleString("en-ZA")}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isArchived ? (
            /* Activate button for archived listings */
            <Form method="post">
              <input type="hidden" name="intent" value="activate-listing" />
              <input type="hidden" name="listingId" value={listing.id} />
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all disabled:opacity-50"
                title="Re-activate listing"
              >
                {isThisSubmitting && submittingIntent === "activate-listing" ? (
                  <Spinner />
                ) : (
                  <RotateCcw className="w-3 h-3" />
                )}
                Activate
              </button>
            </Form>
          ) : (
            <>
              {/* Edit toggle */}
              <button
                type="button"
                onClick={onEditToggle}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${
                  isEditingThis
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                    : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 border border-transparent"
                }`}
                title="Edit listing"
              >
                {isEditingThis ? (
                  <X className="w-3 h-3" />
                ) : (
                  <Pencil className="w-3 h-3" />
                )}
                {isEditingThis ? "Close" : "Edit"}
              </button>

              {/* Archive button with confirmation */}
              {isConfirmingArchive ? (
                <div className="flex items-center gap-1">
                  <Form method="post">
                    <input
                      type="hidden"
                      name="intent"
                      value="archive-listing"
                    />
                    <input
                      type="hidden"
                      name="listingId"
                      value={listing.id}
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 transition-all disabled:opacity-50"
                    >
                      {isThisSubmitting &&
                      submittingIntent === "archive-listing" ? (
                        <Spinner />
                      ) : (
                        "Confirm"
                      )}
                    </button>
                  </Form>
                  <button
                    type="button"
                    onClick={onArchiveToggle}
                    className="px-2 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onArchiveToggle}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest text-red-400/70 hover:text-red-400 hover:bg-red-500/5 border border-transparent transition-all"
                  title="Archive listing"
                >
                  <Archive className="w-3 h-3" />
                  Archive
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Inline edit form */}
      {isEditingThis && !isArchived && (
        <div className="border-t border-white/5 p-4">
          <ListingEditForm
            listing={listing}
            images={images}
            isSubmitting={isSubmitting}
            submittingIntent={submittingIntent}
            submittingListingId={submittingListingId}
          />
        </div>
      )}
    </div>
  );
}

// ─── Inline edit form for a listing ────────────────────────────

function ListingEditForm({
  listing,
  images,
  isSubmitting,
  submittingIntent,
  submittingListingId,
}: {
  listing: ListingData;
  images: ListingImageData[];
  isSubmitting: boolean;
  submittingIntent: string | null;
  submittingListingId: number | null;
}) {
  const isSaving =
    isSubmitting &&
    submittingIntent === "update-listing" &&
    submittingListingId === listing.id;

  // Initialise image URL state from existing images (or one empty slot)
  const [imageUrls, setImageUrls] = useState<string[]>(() => {
    if (images.length > 0) {
      return images.map((img) => img.url);
    }
    return [""];
  });

  return (
    <Form method="post" className="space-y-3">
      <input type="hidden" name="intent" value="update-listing" />
      <input type="hidden" name="listingId" value={listing.id} />

      <Input
        variant="nozar"
        label="Title"
        name="title"
        defaultValue={listing.title}
        required
        maxLength={120}
      />

      <div>
        <label
          htmlFor={`desc-${listing.id}`}
          className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
        >
          Description
        </label>
        <textarea
          id={`desc-${listing.id}`}
          name="description"
          defaultValue={listing.description}
          required
          maxLength={2000}
          rows={3}
          className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 resize-none text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`cat-${listing.id}`}
            className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
          >
            Category
          </label>
          <select
            id={`cat-${listing.id}`}
            name="category"
            defaultValue={listing.category}
            required
            className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 appearance-none cursor-pointer text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`cond-${listing.id}`}
            className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
          >
            Condition
          </label>
          <select
            id={`cond-${listing.id}`}
            name="condition"
            defaultValue={listing.condition ?? ""}
            className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 appearance-none cursor-pointer text-sm"
          >
            <option value="">Not specified</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`del-${listing.id}`}
            className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
          >
            Delivery Method
          </label>
          <select
            id={`del-${listing.id}`}
            name="deliveryMethod"
            defaultValue={listing.deliveryMethod ?? ""}
            className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 appearance-none cursor-pointer text-sm"
          >
            <option value="">Not specified</option>
            {DELIVERY_METHODS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <Input
          variant="nozar"
          label="Estimated Value (ZAR)"
          name="estimatedValueZar"
          type="number"
          min={0}
          defaultValue={listing.estimatedValueZar ?? ""}
          placeholder="e.g. 500"
        />
      </div>

      <div>
        <label
          htmlFor={`seek-${listing.id}`}
          className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block"
        >
          Seeking / Will Trade For
        </label>
        <textarea
          id={`seek-${listing.id}`}
          name="seekingDescription"
          defaultValue={listing.seekingDescription ?? ""}
          maxLength={500}
          rows={2}
          placeholder="What are you looking for in return?"
          className="w-full rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 resize-none text-sm"
        />
      </div>

      {/* ── Image URLs ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <ImagePlus className="w-3.5 h-3.5" />
            Image URLs
            <span className="text-slate-600">
              ({imageUrls.filter((u) => u.trim() !== "").length}/5)
            </span>
          </span>
        </div>

        {/* Current image thumbnails */}
        {imageUrls.some((u) => u.trim().startsWith("https://")) && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {imageUrls.map(
              (url, idx) =>
                url.trim().startsWith("https://") && (
                  <div
                    key={idx}
                    className="w-14 h-14 rounded-lg border border-white/10 overflow-hidden flex-shrink-0 bg-slate-800"
                  >
                    <img
                      src={url.trim()}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ),
            )}
          </div>
        )}

        <div className="space-y-2">
          {imageUrls.map((url, index) => (
            <div key={index}>
              <div className="flex gap-2">
                <input
                  name={`imageUrl_${index}`}
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const next = [...imageUrls];
                    next[index] = e.target.value;
                    setImageUrls(next);
                  }}
                  placeholder={
                    index === 0
                      ? "https://i.imgur.com/example.jpg"
                      : `Image URL ${index + 1}`
                  }
                  className="flex-1 rounded-xl bg-[#0F172A] border border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 focus:outline-none px-4 py-2.5 text-sm"
                />
                {imageUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setImageUrls(imageUrls.filter((_, i) => i !== index))
                    }
                    className="shrink-0 w-10 h-10 rounded-xl border border-white/10 bg-[#0F172A] flex items-center justify-center text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {imageUrls.length < 5 && (
          <button
            type="button"
            onClick={() => setImageUrls([...imageUrls, ""])}
            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add another image
          </button>
        )}

        <p className="mt-1.5 text-[11px] text-slate-600">
          Paste HTTPS image URLs from Imgur, Unsplash, Cloudinary, or any
          direct image link.
        </p>
      </div>

      <Button
        type="submit"
        variant="nozar"
        size="sm"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSaving ? (
          <>
            <Spinner />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </>
        )}
      </Button>
    </Form>
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
