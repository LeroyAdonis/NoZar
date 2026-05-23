import { data, Form, Link } from "react-router";
import type { Route } from "./+types/trade.$id";
import { eq, aliasedTable } from "drizzle-orm";
import { db } from "~/lib/db.server";
import { tradeProposals, listings } from "~/lib/schema";
import { requireAuth } from "~/lib/auth.server";
import { ChevronLeft } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const tradeId = Number(params.id);

  const targetListing = aliasedTable(listings, "target_listing");
  const offeredListing = aliasedTable(listings, "offered_listing");
  
  const [proposal] = await db
    .select({
      proposal: tradeProposals,
      target: targetListing,
      offered: offeredListing,
    })
    .from(tradeProposals)
    .innerJoin(targetListing, eq(tradeProposals.targetItemId, targetListing.id))
    .innerJoin(offeredListing, eq(tradeProposals.offeredItemId, offeredListing.id))
    .where(eq(tradeProposals.id, tradeId))
    .limit(1);

  if (!proposal) {
    throw data(null, { status: 404 });
  }

  return { proposal, currentUserId: user.id };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const tradeId = Number(params.id);
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Verify proposal exists and user is the receiver
  const [proposal] = await db
    .select({ receiverId: tradeProposals.receiverId, status: tradeProposals.status })
    .from(tradeProposals)
    .where(eq(tradeProposals.id, tradeId))
    .limit(1);

  if (!proposal) {
    return { success: false, error: "Trade proposal not found." };
  }

  if (proposal.receiverId !== user.id) {
    return { success: false, error: "Only the recipient can respond to this proposal." };
  }

  if (proposal.status !== "pending") {
    return { success: false, error: "This proposal has already been responded to." };
  }

  let newStatus: string;
  switch (intent) {
    case "accept":
      newStatus = "accepted";
      break;
    case "decline":
      newStatus = "declined";
      break;
    case "counter":
      newStatus = "countered";
      break;
    default:
      return { success: false, error: "Invalid intent." };
  }

  await db
    .update(tradeProposals)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(tradeProposals.id, tradeId));

  return { success: true, intent };
}

export default function TradePage({ loaderData }: Route.ComponentProps) {
  const { proposal } = loaderData;
  
  return (
    <div className="p-4">
      <Link to="/dashboard" className="flex items-center text-sm text-gray-500 mb-4">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </Link>
      <h1 className="text-xl font-bold mb-4">Trade Proposal</h1>
      <div className="flex gap-4">
        <div className="flex-1 p-4 border rounded">
          <h2 className="font-semibold">You want</h2>
          <p>{proposal.target.title}</p>
        </div>
        <div className="flex-1 p-4 border rounded">
          <h2 className="font-semibold">They offer</h2>
          <p>{proposal.offered.title}</p>
        </div>
      </div>
      <div className="mt-4 p-2 bg-yellow-50 text-yellow-800 rounded text-sm">
        Reputation Score: ⭐⭐⭐⭐
      </div>
      <div className="mt-4 flex gap-2">
        <Form method="post">
          <input type="hidden" name="intent" value="accept" />
          <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded">Accept</button>
        </Form>
        <Form method="post">
          <input type="hidden" name="intent" value="decline" />
          <button type="submit" className="px-4 py-2 bg-red-500 text-white rounded">Decline</button>
        </Form>
        <Form method="post">
          <input type="hidden" name="intent" value="counter" />
          <input type="hidden" name="counterMsg" value="Can you add another item?" />
          <button type="submit" className="px-4 py-2 bg-blue-100 text-blue-800 rounded">Can you add another item?</button>
        </Form>
      </div>
    </div>
  );
}
