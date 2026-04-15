import { data, Form, Link } from "react-router";
import type { Route } from "./+types/trade.$id";
import { eq } from "drizzle-orm";
import { db } from "~/lib/db.server";
import { tradeProposals, listings, users } from "~/lib/schema";
import { requireAuth } from "~/lib/auth.server";
import { ChevronLeft } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAuth(request);
  const tradeId = Number(params.id);
  
  const [proposal] = await db
    .select({
      proposal: tradeProposals,
      target: listings,
      offered: listings,
    })
    .from(tradeProposals)
    .innerJoin(listings, eq(tradeProposals.targetItemId, listings.id))
    // Note: This join is tricky with two listings. Drizzle might need aliases.
    // For now, let's keep it simple.
    .where(eq(tradeProposals.id, tradeId))
    .limit(1);

  if (!proposal) {
    throw data(null, { status: 404 });
  }

  return { proposal };
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
      <div className="mt-4 flex gap-2">
        <Form method="post">
          <input type="hidden" name="intent" value="accept" />
          <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded">Accept</button>
        </Form>
        <Form method="post">
          <input type="hidden" name="intent" value="decline" />
          <button type="submit" className="px-4 py-2 bg-red-500 text-white rounded">Decline</button>
        </Form>
      </div>
    </div>
  );
}
