import { randomBytes } from "node:crypto";
import { redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { referrals, users } from "~/lib/schema";
import { count, eq } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireAuth(request);

  let referralCode = session.user.referralCode as string | null;

  if (!referralCode) {
    const newCode = randomBytes(4).toString("hex").toUpperCase();
    await db.update(users).set({ referralCode: newCode }).where(eq(users.id, session.user.id));
    referralCode = newCode;
  }

  const [{ value: referralCount }] = await db
    .select({ value: count() })
    .from(referrals)
    .where(eq(referrals.referrerId, session.user.id));

  const url = new URL(request.url);

  return {
    referralCode,
    referralCount,
    origin: url.origin,
  };
}

export default function ReferPage() {
  const { referralCode, referralCount, origin } = useLoaderData<typeof loader>();

  const referralLink = referralCode ? `${origin}/r/${referralCode}` : "Loading...";

  return (
    <div className="max-w-4xl mx-auto py-6 px-0">
      <h1 className="text-3xl font-bold mb-8">Invite to NoZar</h1>
      <div className="p-6 bg-[#0F172A] rounded-xl border border-white/10">
        <h2 className="text-xl mb-4 font-bold">Your Referral Link</h2>
        <div className="flex gap-2">
          <input type="text" readOnly value={referralLink} className="flex-1 bg-black/50 p-3 rounded border border-white/10 font-mono text-sm" />
          <button 
            onClick={() => navigator.clipboard.writeText(referralLink)} 
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 rounded text-slate-950 font-bold transition-all"
          >
            Copy
          </button>
        </div>
        <button
            onClick={() => window.open(`https://wa.me/?text=Join%20NoZar!%20${referralLink}`)}
            className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-500 rounded text-white font-bold transition-all"
        >
            Share on WhatsApp
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-[#0F172A] rounded-xl border border-white/10 text-center">
            <div className="text-4xl font-black text-emerald-500 mb-2">{referralCount}</div>
            <div className="text-sm text-slate-400 uppercase tracking-widest font-bold">Successful Referrals</div>
        </div>
      </div>
    </div>
  );
}
