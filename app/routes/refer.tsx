import { redirect } from "react-router";
import { useState, useEffect } from "react";

export async function loader() {
  return {};
}

export default function ReferPage() {
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/refer")
      .then((res) => res.json())
      .then((data) => setReferralCode(data.referralCode));
  }, []);

  const referralLink = referralCode ? `${window.location.origin}/r/${referralCode}` : "Loading...";

  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-8">Invite to Nozar</h1>
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
            onClick={() => window.open(`https://wa.me/?text=Join%20Nozar!%20${referralLink}`)}
            className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-500 rounded text-white font-bold transition-all"
        >
            Share on WhatsApp
        </button>
      </div>
    </div>
  );
}
