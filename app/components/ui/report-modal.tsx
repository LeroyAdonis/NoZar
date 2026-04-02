import { ShieldAlert, MessageSquare, Eye, XCircle, X } from "lucide-react";
import { useState } from "react";
import { Spinner } from "./loading-indicator";

export type ReportReason = "safety_concern" | "harassment" | "scam_suspicion" | "not_interested";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, description: string) => void;
  isSubmitting?: boolean;
}

const reasons: { id: ReportReason; label: string; icon: typeof ShieldAlert; color: string }[] = [
  { id: "safety_concern", label: "Safety Concern", icon: ShieldAlert, color: "border-red-500/40 bg-red-500/5 hover:bg-red-500/10" },
  { id: "harassment", label: "Harassment", icon: MessageSquare, color: "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10" },
  { id: "scam_suspicion", label: "Scam Suspicion", icon: Eye, color: "border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10" },
  { id: "not_interested", label: "Not Interested", icon: XCircle, color: "border-slate-500/40 bg-slate-500/5 hover:bg-slate-500/10" },
];

export function ReportModal({ isOpen, onClose, onSubmit, isSubmitting }: Props) {
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (selected) {
      onSubmit(selected, description);
      setSelected(null);
      setDescription("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#111827] border border-white/10 rounded-t-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-white">Report this trade</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {reasons.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selected === r.id
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : r.color
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-mono text-slate-300 uppercase">
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Details (optional)..."
          maxLength={500}
          rows={3}
          className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none mb-3"
        />

        <p className="text-[10px] font-mono text-amber-400 mb-4">
          ⚠️ This will freeze the trade.
          {isSubmitting ? " Processing freeze..." : ""}
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected || isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm font-bold text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <><Spinner /> Freezing...</> : "Freeze & Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
