import { data, redirect, Form, Link } from "react-router";
import type { Route } from "./+types/asset.$id";
import {
  ChevronLeft,
  MessageSquare,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import {
  listings,
  users,
  listingImages,
  trades,
  messages,
} from "~/lib/schema";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const title = loaderData?.listing?.title ?? "Asset";
  return [
    { title: `${title} — Nozar` },
    { name: "description", content: "View asset details" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const listingId = Number(params.id);
  if (Number.isNaN(listingId)) {
    throw data(null, { status: 404 });
  }

  const result = await db
    .select({
      listing: listings,
      owner: {
        id: users.id,
        name: users.name,
        emailVerified: users.emailVerified,
        image: users.image,
      },
    })
    .from(listings)
    .innerJoin(users, eq(listings.userId, users.id))
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

  return {
    listing: result[0].listing,
    owner: result[0].owner,
    images,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const listingId = Number(params.id);

  // Fetch the listing to find the owner
  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.status, "active")))
    .limit(1);

  if (!listing) {
    throw data(null, { status: 404 });
  }

  // Self-ping prevention
  if (listing.userId === user.id) {
    throw data({ error: "You cannot ping your own listing" }, { status: 400 });
  }

  // Create trade record
  const [trade] = await db
    .insert(trades)
    .values({
      initiatorId: user.id,
      responderId: listing.userId,
      listingId,
      status: "proposed",
    })
    .returning();

  // Create initial system message
  await db.insert(messages).values({
    tradeId: trade.id,
    senderId: user.id,
    text: `Trade initiated by ${user.name}`,
    type: "system",
  });

  throw redirect(`/dashboard/pings/${trade.id}`);
}

export default function AssetDetail({ loaderData }: Route.ComponentProps) {
  const { listing, owner, images } = loaderData;

  const heroImage = images[0]?.url;

  return (
    <div className="space-y-6 pb-24 animate-in slide-in-from-right-4 duration-300">
      {/* Back button */}
      <Link
        to="/dashboard"
        className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Return to Index
      </Link>

      {/* Hero image block */}
      <div
        className={`w-full aspect-video rounded-3xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl ${heroImage ? "" : "bg-emerald-900/20"}`}
      >
        {heroImage ? (
          <img
            src={heroImage}
            alt={listing.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
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
      </div>

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

        {/* Initialize Ping CTA */}
        <Form method="post">
          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4 fill-[#030712]" /> Initialize
            Ping
          </button>
        </Form>
      </div>
    </div>
  );
}
