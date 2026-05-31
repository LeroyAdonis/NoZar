import { useRef, useState, useEffect } from "react";
import { Form, useNavigation, useFetcher, Link, useNavigate } from "react-router";
import { eq, or, and, count, avg, inArray } from "drizzle-orm";
import {
  Star,
  ArrowRightLeft,
  CheckCircle2,
  ShieldCheck,
  Pencil,
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
  ChevronRight,
} from "lucide-react";

import type { Route } from "./+types/profile";
import { requireAuth, auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { profiles, trades, ratings, listings, listingImages, users } from "~/lib/schema";
import {
  validateImageUrl,
  sanitizeImageUrl,
} from "~/lib/media-validation.server";
import { isBlobConfigured } from "~/lib/blob.server";
import { getListingUsage } from "~/lib/tier-limits.server";
import { Button } from "~/components/ui/button";
import { useHaptics } from "~/components/ui/haptic-provider";
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
    { title: "Profile — NoZar" },
    { name: "description", content: "Your NoZar profile and settings" },
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
          avatarUrl: user.image ?? null,
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

  // Backfill avatarUrl from users.image for Google OAuth users whose profile
  // was created before this sync was implemented.
  if (!profile.avatarUrl && user.image) {
    await db
      .update(profiles)
      .set({ avatarUrl: user.image, updatedAt: new Date() })
      .where(eq(profiles.userId, user.id));
    profile = { ...profile, avatarUrl: user.image };
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

  const usage = await getListingUsage(user.id);

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
    usage,
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

  // NOTE: "upload-avatar-file" is now handled entirely on the client via
  // @vercel/blob/client → /api/upload.  After the file lands in Blob storage
  // the client submits the resulting URL through the "update-avatar" intent
  // above, so no file bytes ever pass through this serverless function.

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
      return { success: false, intent: "activate-listing", listingId, error: "Invalid listing ID" };
    }

    const usage = await getListingUsage(user.id);
    if (usage.atLimit) {
      return {
        success: false,
        intent: "activate-listing",
        error: `You're at your ${usage.listingLimit}-listing limit on the ${usage.planCode} plan. Hide another listing or upgrade to reactivate this one.`,
      };
    }

    // Ownership enforced in SQL WHERE clause
    const result = await db
      .update(listings)
      .set({ status: "active", updatedAt: new Date() })
      .where(and(eq(listings.id, listingId), eq(listings.userId, user.id)))
      .returning({ id: listings.id });

    if (result.length === 0) {
      return { success: false, intent: "activate-listing", listingId, error: "Listing not found or not owned by you" };
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

const SAFETY_TIPS = [
  "Only meet in safe, well-lit public locations — cafés, shopping centres, police stations",
  "Never share your home address in the chat",
  "Use the 2/2 Agree mechanic to lock in deal terms before meeting",
  "Use Balance Trade to compare values fairly before agreeing",
  "If something feels off, cancel the trade — your safety comes first",
  "Report suspicious behaviour using the 🚩 flag in any trade chat",
];

// ─── Component ─────────────────────────────────────────────────

export default function Profile({ loaderData, actionData }: Route.ComponentProps) {
  const { user, profile, blobConfigured, stats, listings: userListings, listingImagesMap, usage } = loaderData;
  const navigation = useNavigation();
  const [profileTab, setProfileTab] = useState<"listings" | "account">("listings");
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);
  const navigate = useNavigate();
  const haptics = useHaptics();

  const handleReplayTutorial = () => {
    localStorage.removeItem("nozar_tutorial_seen");
    navigate("/dashboard");
  };

  const avatarFetcher = useFetcher();
  const [avatarInput, setAvatarInput] = useState(profile.avatarUrl ?? "");
  // Hidden file input for avatar upload
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

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

  // Auto-close the edit sheet when profile update succeeds
  useEffect(() => {
    if (navigation.state === "idle" && didUpdate) {
      haptics.success();
      setShowEditSheet(false);
    }
  }, [navigation.state, didUpdate]);

  // Fire error haptic when a profile action fails
  useEffect(() => {
    if (
      actionData &&
      "success" in actionData &&
      actionData.success === false &&
      "intent" in actionData &&
      (actionData.intent === "updateProfile" || actionData.intent === "update-avatar")
    ) {
      haptics.error();
    }
  }, [actionData]);

  // Escape key closes the sheet
  useEffect(() => {
    if (!showEditSheet) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowEditSheet(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showEditSheet]);

  // Focus the sheet panel when it opens
  useEffect(() => {
    if (showEditSheet) {
      sheetRef.current?.focus();
    }
  }, [showEditSheet]);

  // Lock body scroll while sheet is open
  useEffect(() => {
    if (showEditSheet) {
      document.body.style.overflow = "hidden";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showEditSheet]);

  // Partition listings into active and archived
  const activeListings = userListings.filter((l) => l.status === "active");
  const archivedListings = userListings.filter((l) => l.status === "archived");

  // Error returned from activate-listing action (e.g. limit reached) - scoped by listingId
  const activateErrors: Record<number, string> =
    actionData &&
    "intent" in actionData &&
    actionData.intent === "activate-listing" &&
    !actionData.success &&
    "error" in actionData &&
    "listingId" in actionData &&
    typeof actionData.listingId === "number"
      ? { [actionData.listingId]: actionData.error as string }
      : {};

  const avatarActionData = avatarFetcher.data as { success?: boolean; intent?: string; error?: string; avatarUrl?: string } | undefined;
  const isAvatarSubmitting = avatarFetcher.state === "submitting";

  // Client-side direct-to-blob upload state
  const [isAvatarFileUploading, setIsAvatarFileUploading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

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
      {/* Tab navigation */}
      <div className="flex gap-1 bg-[#0F172A] border border-white/10 rounded-2xl p-1 mt-2">
        {(["listings", "account"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => { setProfileTab(tab); setShowEditSheet(false); }}
            className={`flex-1 py-2 rounded-xl text-[11px] font-mono uppercase tracking-widest transition-all ${
              profileTab === tab
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab === "listings" ? "My listings" : "Account"}
          </button>
        ))}
      </div>

      {/* My listings tab */}
      {profileTab === "listings" && (
        <div className="space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {activeListings.length} active
            </p>
            <Link
              to="/dashboard/add"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
            >
              + Add item
            </Link>
          </div>

          {/* Active listings */}
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
                  activationBlocked={false}
                  onEditToggle={() =>
                    setEditingListingId(editingListingId === listing.id ? null : listing.id)
                  }
                  onArchiveToggle={() =>
                    setConfirmArchiveId(confirmArchiveId === listing.id ? null : listing.id)
                  }
                />
              ))}
            </div>
          ) : (
            <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-slate-600 text-3xl mb-3">⊘</div>
              <p className="text-slate-500 text-xs mb-3">You have no active listings</p>
              <Link
                to="/dashboard/add"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500 text-[#030712] text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors"
              >
                + Add your first item
              </Link>
            </div>
          )}

          {/* Hidden (archived) listings */}
          {archivedListings.length > 0 && (
            <div className="space-y-3 mt-4">
              <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                Hidden ({archivedListings.length})
              </p>

              {Object.keys(activateErrors).length > 0 && (
                <div
                  role="alert"
                  className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 rounded-xl px-3 py-2.5"
                >
                  <span className="text-rose-400 font-mono text-[10px] mt-0.5 shrink-0">
                    !
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-rose-300 leading-relaxed">
                      {Object.values(activateErrors)[0]}
                    </p>
                    <Link
                      to="/dashboard/billing"
                      className="inline-block mt-1 text-[10px] font-mono uppercase tracking-widest text-emerald-400 hover:text-emerald-300"
                    >
                      View plans →
                    </Link>
                  </div>
                </div>
              )}

              {usage.atLimit && (
                <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
                  You&apos;re at your {usage.listingLimit}-listing limit — hide an
                  active listing or{" "}
                  <Link
                    to="/dashboard/billing"
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    upgrade
                  </Link>{" "}
                  to reactivate any hidden item.
                </p>
              )}

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
                    activationBlocked={usage.atLimit}
                    onEditToggle={() =>
                      setEditingListingId(editingListingId === listing.id ? null : listing.id)
                    }
                    onArchiveToggle={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account tab */}
      {profileTab === "account" && (
        <div className="space-y-6">
          {/* Avatar + name + Edit button */}
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/30 flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-400 font-black text-lg">{initials}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">{profile.displayName || user.name}</p>
              {locationStr && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {locationStr}
                </p>
              )}
              {user.emailVerified && (
                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 uppercase mt-1">
                  <ShieldCheck className="w-2.5 h-2.5" /> Email verified
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowEditSheet(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-widest text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors flex-shrink-0"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          </div>

          {/* Stats grid — renamed labels */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<ArrowRightLeft className="w-4 h-4 text-cyan-400" />}
              label="Swaps started"
              value={stats.tradeCount}
            />
            <StatCard
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              label="Completed"
              value={stats.completedCount}
            />
            <StatCard
              icon={<Star className="w-4 h-4 text-amber-400" />}
              label="Your rating"
              value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : "—"}
            />
          </div>

          {/* Safety & Trust — permanent safe trading guidelines */}
          <div className="p-4 bg-[#0F172A] border border-emerald-500/20 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-black">
                Safe Trading Guidelines
              </span>
            </div>
            <ul className="space-y-2">
              {SAFETY_TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="text-emerald-500 text-[10px] font-mono mt-0.5 shrink-0">✓</span>
                  <span className="text-[11px] font-mono text-slate-400 leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Phone verification card */}
          {profile.phone && profile.phoneVerified ? (
            <div className="p-4 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-sm text-slate-200">{profile.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-widest">Verified</span>
              </div>
            </div>
          ) : profile.phone && !profile.phoneVerified ? (
            <div className="p-4 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-sm text-slate-200">{profile.phone}</span>
              </div>
              <Link
                to="/dashboard/verify-phone"
                className="text-[10px] font-mono text-amber-400 uppercase tracking-widest hover:text-amber-300"
              >
                Unverified — verify →
              </Link>
            </div>
          ) : (
            <div className="p-4 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-400">Phone</span>
              </div>
              <Link
                to="/dashboard/verify-phone"
                className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest hover:text-emerald-300"
              >
                + Add &amp; verify →
              </Link>
            </div>
          )}

          {/* Plan row */}
          <div className="p-4 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-between">
            <span className="text-sm text-slate-400">Free plan — 5 listings</span>
            <Link
              to="/dashboard/billing"
              className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest hover:text-emerald-300"
            >
              Upgrade →
            </Link>
          </div>

          {/* Tutorial row */}
          <div className="p-4 bg-[#0F172A] border border-white/10 rounded-2xl flex items-center justify-between">
            <span className="text-sm text-slate-400">Tutorial</span>
            <button
              type="button"
              onClick={handleReplayTutorial}
              className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
            >
              Replay tutorial →
            </button>
          </div>

          {/* Security settings */}
          <Link
            to="/dashboard/settings/security"
            className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-[#0F172A] hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Security</p>
                <p className="text-xs text-slate-400">Two-factor authentication</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </Link>

          {/* Sign out */}
          <div className="pt-2 pb-4">
            <Form method="post">
              <input type="hidden" name="intent" value="logout" />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-sm font-mono uppercase tracking-widest hover:bg-red-500/5 transition-colors disabled:opacity-50"
              >
                {submittingIntent === "logout" ? (
                  <><Spinner /> Signing out...</>
                ) : (
                  "Sign out"
                )}
              </button>
            </Form>
          </div>
        </div>
      )}

      {/* Edit profile slide-in sheet */}
      {showEditSheet && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowEditSheet(false)}
          />
          <div
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-sheet-title"
            className="relative w-full max-w-sm h-full bg-[#0F172A] border-l border-white/10 overflow-y-auto p-6 flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <h3 id="edit-profile-sheet-title" className="font-bold text-white">Edit profile</h3>
              <button
                type="button"
                onClick={() => setShowEditSheet(false)}
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Avatar management */}
            <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-4">
                Profile Photo
              </span>

              <div className="flex items-start gap-5">
                {/* Current avatar display */}
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
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          e.target.value = "";

                          if (!file.type.startsWith("image/")) {
                            setAvatarUploadError("File must be an image.");
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            setAvatarUploadError("Image must be under 5 MB.");
                            return;
                          }

                          setAvatarUploadError(null);
                          setIsAvatarFileUploading(true);

                          try {
                            const { upload } = await import("@vercel/blob/client");
                            const blob = await upload(`avatars/${file.name}`, file, {
                              access: "public",
                              handleUploadUrl: "/api/upload",
                            });

                            setAvatarInput(blob.url);
                            const fd = new FormData();
                            fd.set("intent", "update-avatar");
                            fd.set("avatarUrl", blob.url);
                            avatarFetcher.submit(fd, { method: "post" });
                          } catch (err) {
                            console.error("[avatar] client upload failed:", err);
                            setAvatarUploadError(
                              err instanceof Error ? err.message : "Upload failed. Please try again.",
                            );
                          } finally {
                            setIsAvatarFileUploading(false);
                          }
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

                      {avatarUploadError && (
                        <p className="mt-1.5 text-red-400 text-xs font-mono">
                          {avatarUploadError}
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

                    {avatarActionData && !avatarActionData.success && avatarActionData.intent === "update-avatar" && (
                      <p className="text-red-400 text-xs font-mono">
                        {avatarActionData.error}
                      </p>
                    )}

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

            {/* Profile update form */}
            <Form method="post" className="space-y-4 flex-1">
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
        </div>
      )}
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
  activationBlocked,
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
  activationBlocked: boolean;
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
                disabled={isSubmitting || activationBlocked}
                aria-disabled={isSubmitting || activationBlocked}
                className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest border transition-all disabled:opacity-50 ${
                  activationBlocked
                    ? "text-slate-500 border-white/10 cursor-not-allowed"
                    : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/20"
                }`}
                title={
                  activationBlocked
                    ? "Listing limit reached — hide an active listing or upgrade to reactivate this one"
                    : "Re-activate listing"
                }
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
                className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all ${
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
                        "Hide listing"
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
                  title="Hide listing"
                >
                  <Archive className="w-3 h-3" />
                  Hide
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
    <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-2 sm:p-4 text-center">
      <div className="flex justify-center mb-1.5 sm:mb-2">{icon}</div>
      <div className="text-base sm:text-lg font-bold text-white leading-tight">{value}</div>
      <div className="text-[8px] sm:text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1 leading-tight">
        {label}
      </div>
    </div>
  );
}
