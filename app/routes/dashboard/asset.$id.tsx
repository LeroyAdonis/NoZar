import { data, redirect, useFetcher, Form, Link } from "react-router";
import type { Route } from "./+types/asset.$id";
import { ChevronLeft, MessageSquare, Repeat, ShieldCheck, Pencil, Trash2, RotateCcw, ChevronRight, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { eq, and, ne } from "drizzle-orm";
import { motion, AnimatePresence } from "motion/react";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import {
  listings,
  users,
  profiles,
  listingImages,
  trades,
  messages,
} from "~/lib/schema";
import { Button } from "~/components/ui/button";
import { LoadingBar, Spinner } from "~/components/ui/loading-indicator";
import { haversineKm, formatDistance } from "~/lib/utils";
import { Globe, MapPin, AlertCircle } from "lucide-react";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const title = loaderData?.listing?.title ?? "Asset";
  return [
    { title: `${title} — Nozar` },
    { name: "description", content: "View asset details" },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const listingId = Number(params.id);
  if (Number.isNaN(listingId)) {
    throw data(null, { status: 404 });
  }

  const { user } = await requireAuth(request);
  const currentUserId = user.id;

  const result = await db
    .select({
      listing: listings,
      owner: {
        id: users.id,
        name: users.name,
        emailVerified: users.emailVerified,
        image: profiles.avatarUrl,
      },
    })
    .from(listings)
    .innerJoin(users, eq(listings.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(listings.id, listingId), eq(listings.status, "active")))
    .limit(1);

  if (result.length === 0) {
    throw data(null, { status: 404 });
  }

  const images = await db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId))
    .orderBy(listingImages.order);

  const listing = result[0].listing;

  // Fetch current user's location for distance calculation
  const [userProfile] = await db
    .select({
      lat: profiles.lat,
      lng: profiles.lng,
      searchRadiusKm: profiles.searchRadiusKm,
    })
    .from(profiles)
    .where(eq(profiles.userId, currentUserId))
    .limit(1);

  const userInventory = await db
    .select()
    .from(listings)
    .where(and(eq(listings.userId, currentUserId), eq(listings.status, "active")));

  let distance: number | null = null;
  if (userProfile?.lat && userProfile?.lng && listing.lat && listing.lng) {
    distance = haversineKm(userProfile.lat, userProfile.lng, listing.lat, listing.lng);
  }

  return {
    listing,
    owner: result[0].owner,
    images,
    isOwner: listing.userId === currentUserId,
    distance,
    searchRadiusKm: userProfile?.searchRadiusKm ?? 25,
    userInventory,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const listingId = Number(params.id);
  const formData = await request.formData();
  const intent = formData.get("intent") as string | null;

  // Propose Trade is initiated by non-owners
  if (intent === "propose_trade") {
    const offerItemId = Number(formData.get("offerItemId"));
    
    if (Number.isNaN(offerItemId)) {
       return { error: "Invalid offer item" };
    }

    const [listing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, listingId), eq(listings.status, "active")))
      .limit(1);

    if (!listing) {
      throw data(null, { status: 404 });
    }

    if (listing.userId === user.id) {
      return { error: "You cannot trade with your own listing" };
    }

    const [trade] = await db.insert(trades).values({
      initiatorId: user.id,
      responderId: listing.userId,
      listingId: listingId,
      status: "proposed",
    }).returning();

    throw redirect(`/dashboard/pings/${trade.id}`);
  }

  // Owner-only actions below — verify ownership
  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.userId, user.id)))
    .limit(1);

  if (!listing) {
    throw data(null, { status: 404 });
  }

  if (intent === "archive") {
    await db
      .update(listings)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(listings.id, listingId), eq(listings.userId, user.id)));
    throw redirect("/dashboard/profile");
  }

  if (intent === "activate") {
    await db
      .update(listings)
      .set({ status: "active", updatedAt: new Date() })
      .where(and(eq(listings.id, listingId), eq(listings.userId, user.id)));
    throw redirect(`/dashboard/asset/${listingId}`);
  }

  return { error: "Unknown intent" };
}

export default function AssetDetail({ loaderData }: Route.ComponentProps) {
  const archiveFetcher = useFetcher();
  const { listing, owner, images, isOwner, distance, searchRadiusKm, userInventory } = loaderData;
  const isManaging = archiveFetcher.state !== "idle";

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedOfferItemId, setSelectedOfferItemId] = useState<number | null>(
    userInventory?.length === 1 ? userInventory[0].id : null
  );
  const [showOfferSheet, setShowOfferSheet] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);

  // Value-gap warning
  const selectedItem = userInventory?.find((i: typeof listings.$inferSelect) => i.id === selectedOfferItemId);
  const listingValue = listing.estimatedValueZar ?? 0;
  const offerValue = selectedItem?.estimatedValueZar ?? 0;
  const hasMeaningfulValues = listingValue > 0 && offerValue > 0;
  const valueGapRatio = hasMeaningfulValues
    ? Math.abs(listingValue - offerValue) / Math.max(listingValue, offerValue)
    : 0;
  const isUnderOffering = hasMeaningfulValues && offerValue < listingValue && valueGapRatio > 0.2;
  const isOverOffering = hasMeaningfulValues && offerValue > listingValue && valueGapRatio > 0.2;
  const hasValueGap = isUnderOffering || isOverOffering;

  useEffect(() => {
    if (!isLightboxOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isLightboxOpen, images.length]);

  useEffect(() => {
    if (!showOfferSheet) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowOfferSheet(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showOfferSheet]);

  useEffect(() => {
    if (showOfferSheet) {
      sheetRef.current?.focus();
    }
  }, [showOfferSheet]);

  useEffect(() => {
    if (!showOfferSheet) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showOfferSheet]);

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const currentImage = images[activeImageIndex]?.url;

  const isOutOfRange = 
    listing.type === 'service' && 
    !listing.isDigital && 
    distance !== null && 
    distance > searchRadiusKm;

  return (
    <div className="space-y-6 pb-24 animate-in slide-in-from-right-4 duration-300">
      {isManaging && <LoadingBar />}
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Return to Index
        </Link>
        {isOwner && (
          <Link
            to="/dashboard/profile"
            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Link>
        )}
      </div>

      {/* Hero image block / Carousel */}
      <div
        onClick={() => currentImage && setIsLightboxOpen(true)}
        className={`w-full aspect-video rounded-3xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl group cursor-zoom-in ${currentImage ? "" : "bg-emerald-900/20"}`}
      >
        {currentImage ? (
          <>
            <img
              src={currentImage}
              alt={listing.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                  {images.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === activeImageIndex ? "bg-emerald-400 w-3" : "bg-white/30"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <Repeat className="w-16 h-16 text-white/10" />
        )}

        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded px-2 py-1 text-[10px] font-mono text-white uppercase border border-white/10">
          {listing.category}
        </div>
        {listing.condition && (
          <div className="absolute top-4 right-4 bg-emerald-500/10 backdrop-blur-md rounded px-2 py-1 text-[10px] font-mono text-emerald-400 uppercase border border-emerald-500/20">
            {listing.condition}
          </div>
        )}
        
        {/* Distance / Digital badge */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          {listing.isDigital ? (
            <div className="bg-blue-500/20 backdrop-blur-md rounded px-3 py-1.5 text-[10px] font-mono text-blue-400 uppercase border border-blue-500/30 flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Digital Service
            </div>
          ) : distance !== null ? (
            <div className="bg-slate-900/60 backdrop-blur-md rounded px-3 py-1.5 text-[10px] font-mono text-slate-300 uppercase border border-white/10 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> {formatDistance(distance)} away
            </div>
          ) : (
            <div className="bg-slate-900/60 backdrop-blur-md rounded px-3 py-1.5 text-[10px] font-mono text-slate-400 uppercase border border-white/10 flex items-center gap-1.5">
              <MapPin className="w-3 h-3 opacity-50" /> Dist. unknown
            </div>
          )}
        </div>
        
        {/* Owner badge */}
        {isOwner && (
          <div className="absolute bottom-4 right-4 bg-emerald-500/20 backdrop-blur-md rounded px-3 py-1.5 text-[10px] font-mono text-emerald-400 uppercase border border-emerald-500/30 flex items-center gap-1.5">
            <Pencil className="w-3 h-3" /> Your Listing
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mt-2">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setActiveImageIndex(idx)}
              className={`w-16 h-16 rounded-xl border overflow-hidden flex-shrink-0 transition-all hover:scale-105 ${
                idx === activeImageIndex
                  ? "border-emerald-500/60 ring-2 ring-emerald-500/20 scale-105"
                  : "border-white/10 opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={img.url}
                alt={`${listing.title} — image ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && currentImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl"
            onClick={() => setIsLightboxOpen(false)}
          >
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all z-[110] group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            </motion.button>

            {images.length > 1 && (
              <>
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={prevImage}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all z-[110] group"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={nextImage}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all z-[110] group"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </>
            )}

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="max-w-[90vw] max-h-[85vh] relative z-[110] p-1 bg-white/5 rounded-3xl border border-white/10 shadow-[0_0_100px_rgba(16,185,129,0.1)]"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={currentImage}
                alt={listing.title}
                className="max-w-full max-h-[80vh] object-contain rounded-2xl cursor-default"
              />
              {images.length > 1 && (
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4">
                  <div className="text-white/40 font-mono text-[10px] tracking-[0.2em] uppercase">
                    {activeImageIndex + 1} <span className="text-emerald-500 mx-1">/</span> {images.length}
                  </div>
                  <div className="flex gap-1">
                    {images.map((_, idx) => (
                      <div 
                        key={idx}
                        className={`w-1 h-1 rounded-full transition-all duration-300 ${idx === activeImageIndex ? 'bg-emerald-400 w-4' : 'bg-white/20'}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title & exchange request */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-2">
          {listing.title}
        </h1>
        {listing.seekingDescription && (
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-4 mb-6">
            <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest block mb-1">
              Target Value Exchange
            </span>
            <p className="font-medium text-slate-200">
              {listing.seekingDescription}
            </p>
          </div>
        )}

        {/* Description */}
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-2">
          Asset Details
        </span>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          {listing.description}
        </p>

        {/* User info card */}
        <div className="flex items-center justify-between p-4 border border-white/10 rounded-2xl bg-[#0F172A]/50 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 overflow-hidden">
              {owner.image ? (
                <img
                  src={owner.image}
                  alt={owner.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold text-slate-400">
                  {owner.name.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">{owner.name}</h4>
              {owner.emailVerified ? (
                <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 uppercase">
                  <ShieldCheck className="w-3 h-3" /> Node Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9px] font-mono text-slate-500 uppercase">
                  Unverified Node
                </span>
              )}
            </div>
          </div>
        </div>

        {isOwner ? (
          /* Owner controls */
          <div className="space-y-3">
            <Link
              to="/dashboard/profile"
              className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
            >
              <Pencil className="w-4 h-4" /> Manage This Listing
            </Link>
            <archiveFetcher.Form method="post" className="space-y-2">
              <input type="hidden" name="intent" value="archive" />
              <Button
                variant="nozarOutline"
                size="md"
                type="submit"
                disabled={isManaging}
                className="w-full text-red-400 border-red-500/20 hover:bg-red-500/5 hover:border-red-500/40"
              >
                {isManaging && archiveFetcher.formData?.get("intent") === "archive" ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Archive Listing
                  </>
                )}
              </Button>
            </archiveFetcher.Form>
          </div>
        ) : (
          <div className="space-y-4">
            {isOutOfRange && (
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-200/80">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider">Out of Radar Range</p>
                  <p className="text-xs leading-relaxed opacity-80">
                    This service is located {formatDistance(distance!)} away, which is outside your current trade radius ({searchRadiusKm}km).
                  </p>
                </div>
              </div>
            )}
            
            {userInventory && userInventory.length === 0 ? (
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-500/20 bg-slate-500/5 text-slate-300">
                <AlertCircle className="w-5 h-5 shrink-0 text-slate-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider">No Listings to Offer</p>
                  <p className="text-xs leading-relaxed opacity-80">
                    You need at least one active listing to initialize a ping. Add an item or service first.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isOutOfRange}
                  onClick={() => setShowOfferSheet(true)}
                  className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  <MessageSquare className="w-4 h-4 fill-[#030712]" />
                  {isOutOfRange ? "Out of Range" : "Offer a swap"}
                </button>

                {/* Report link */}
                <button
                  type="button"
                  className="w-full text-center text-[10px] font-mono text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors mt-2"
                  onClick={() => {}}
                >
                  Report this listing
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Offer a Swap bottom sheet ── */}
      <AnimatePresence>
        {showOfferSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              key="offer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOfferSheet(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />

            {/* Sheet */}
            <motion.div
              key="offer-sheet"
              ref={sheetRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="offer-sheet-title"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0F172A] border-t border-white/10 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
            >
              <div aria-hidden="true" className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

              <h3 id="offer-sheet-title" className="text-lg font-black uppercase tracking-tight text-white mb-4">
                Your swap offer
              </h3>

              {/* Trade summary */}
              <div className="flex items-center gap-3 p-4 bg-[#030712] rounded-xl border border-white/10 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">
                    You're offering
                  </p>
                  <p className="text-sm font-bold text-white truncate">
                    {selectedItem?.title ?? (userInventory && userInventory.length === 1 ? userInventory[0].title : "Select below")}
                  </p>
                  {(selectedItem?.estimatedValueZar ?? (userInventory?.length === 1 ? userInventory[0].estimatedValueZar : null)) != null && (
                    <p className="text-[10px] font-mono text-emerald-400">
                      ~R{((selectedItem?.estimatedValueZar ?? userInventory![0].estimatedValueZar) ?? 0).toLocaleString("en-ZA")}
                    </p>
                  )}
                </div>
                <span className="text-slate-400 font-bold text-lg">⇄</span>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">
                    You want
                  </p>
                  <p className="text-sm font-bold text-white truncate">{listing.title}</p>
                  {listing.estimatedValueZar != null && (
                    <p className="text-[10px] font-mono text-emerald-400">
                      ~R{listing.estimatedValueZar.toLocaleString("en-ZA")}
                    </p>
                  )}
                </div>
              </div>

              {/* Value gap warning */}
              {hasValueGap && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4">
                  <span className="text-amber-400 mt-0.5">⚠</span>
                  <p className="text-xs text-amber-300">
                    {isUnderOffering
                      ? "Value gap — you may need to top up or negotiate"
                      : "You're offering more than the asking value — confirm you're OK with this or negotiate"}
                  </p>
                </div>
              )}

              {/* Inventory picker (only when multiple items) */}
              {userInventory && userInventory.length > 1 && (
                <div className="mb-4 space-y-2">
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    Select what you're offering
                  </p>
                  {userInventory.map((item: typeof listings.$inferSelect) => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedOfferItemId === item.id
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="offerItemId"
                        value={item.id}
                        form="offer-swap-form"
                        checked={selectedOfferItemId === item.id}
                        onChange={() => setSelectedOfferItemId(item.id)}
                        className="accent-emerald-500"
                      />
                      <span className="text-sm text-white font-medium">{item.title}</span>
                      <span className="ml-auto text-[10px] font-mono text-slate-500 uppercase">{item.category}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Explanatory text */}
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Tapping "Start chatting" opens a conversation with {owner.name}. You can agree on details before anything is finalised.
              </p>

              {/* Form — actual trade creation */}
              <Form id="offer-swap-form" method="post" className="space-y-3">
                <input type="hidden" name="intent" value="propose_trade" />
                {userInventory && userInventory.length === 1 && (
                  <input type="hidden" name="offerItemId" value={userInventory[0].id} />
                )}
                <button
                  type="submit"
                  disabled={isOutOfRange || !selectedOfferItemId}
                  className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                >
                  <MessageSquare className="w-4 h-4 fill-[#030712]" />
                  Start chatting
                </button>
              </Form>

              <button
                type="button"
                onClick={() => setShowOfferSheet(false)}
                className="w-full py-3 text-sm font-mono text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
