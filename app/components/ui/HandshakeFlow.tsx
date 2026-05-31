import { Form } from "react-router";
import { Spinner } from "~/components/ui/loading-indicator";
import { useHaptics } from "~/components/ui/haptic-provider";

interface HandshakeFlowProps {
  tradeId: number;
  status: string;
  isReady: boolean;
  theyReady: boolean;
  isSubmitting: boolean;
  submittingIntent: string | null;
}

export default function HandshakeFlow({
  status,
  isReady,
  theyReady,
  isSubmitting,
  submittingIntent,
}: HandshakeFlowProps) {
  const haptics = useHaptics();
  const agreedCount = (isReady ? 1 : 0) + (theyReady ? 1 : 0);

  if (status === "negotiating") {
    return (
      <div className="p-5 rounded-2xl bg-[#0F172A] border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)] space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg">🎉</span>
          <h4 className="font-black uppercase tracking-tighter text-emerald-400 text-sm">
            Deal Agreed!
          </h4>
        </div>
        <p className="text-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
          Both parties have agreed. Arrange your meetup.
        </p>
      </div>
    );
  }

  if (status !== "proposed") return null;

  return (
    <div className="space-y-4">
      {/* 2/2 counter */}
      <div className="flex items-center justify-center gap-4 py-2">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
            isReady
              ? "border-emerald-500 bg-emerald-500/20"
              : "border-slate-600 bg-slate-700/30"
          }`}
        >
          <span
            className={`text-[9px] font-mono font-black ${
              isReady ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            YOU
          </span>
        </div>
        <span className="text-xl font-black text-white tabular-nums">
          {agreedCount}/2
        </span>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
            theyReady
              ? "border-emerald-500 bg-emerald-500/20"
              : "border-slate-600 bg-slate-700/30"
          }`}
        >
          <span
            className={`text-[9px] font-mono font-black ${
              theyReady ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            THEM
          </span>
        </div>
      </div>
      <p className="text-center text-[10px] font-mono text-slate-500 uppercase tracking-widest">
        {agreedCount}/2 agreed
      </p>

      <Form method="post">
        <input type="hidden" name="intent" value="agreeToTrade" />
        <button
          type="submit"
          disabled={isSubmitting || isReady}
          onClick={() => haptics?.medium?.()}
          className="w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting && submittingIntent === "agreeToTrade" ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="w-3.5 h-3.5" /> Locking in...
            </span>
          ) : isReady ? (
            "✓ You agreed — waiting for them"
          ) : theyReady ? (
            "Confirm Deal"
          ) : (
            "Agree to Trade"
          )}
        </button>
      </Form>
    </div>
  );
}
