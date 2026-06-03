"use client";
import React, { useState } from "react";
import { Languages } from "lucide-react";
import { checkMessageForFraud, type FraudCheckResult, severityIcon } from "~/lib/fraud-detection";

interface ChatMessage {
  id?: number;
  text: string;
  role?: string;
  /** DB-level sender ID — used to determine if this message is "from me" */
  senderId?: string;
  /** Whether this message was sent by the current user */
  isMe?: boolean;
}

export default function ChatWindow({
  messages,
  currentUserId,
}: {
  messages: ChatMessage[];
  currentUserId?: string;
}) {
  // Track dismissed warnings by message ID
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  // Track translated text per message ID
  const [translated, setTranslated] = useState<Map<number, string>>(new Map());
  const [translatingId, setTranslatingId] = useState<number | null>(null);

  // Compute fraud flags for messages from the OTHER user
  const fraudResults = React.useMemo(() => {
    const map = new Map<number, FraudCheckResult>();
    for (const m of messages) {
      // Only check messages from the other user
      const isOtherUser =
        m.senderId && currentUserId && m.senderId !== currentUserId;
      if (m.id && isOtherUser) {
        const result = checkMessageForFraud(m.text);
        if (result.hasFraud) {
          map.set(m.id, result);
        }
      }
    }
    return map;
  }, [messages, currentUserId]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[#030712] p-4 gap-3">
      {messages.map((m, i) => {
        const isMe = m.isMe ?? m.role !== "assistant";
        const msgId = m.id;
        const fraud = msgId ? fraudResults.get(msgId) : undefined;
        const isDismissed = msgId ? dismissed.has(msgId) : false;

        return (
          <div key={msgId ?? i}>
            {/* Message bubble */}
            <div
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  isMe
                    ? "bg-emerald-500 text-[#030712] font-medium"
                    : "bg-[#1E293B] border border-white/15 text-white"
                }`}
              >
                <p className="text-[15px] leading-relaxed">{translated.get(msgId ?? i) ?? m.text}</p>
              </div>
            </div>

            {/* Translate button — only for other user's messages */}
            {!isMe && (
              <div className="flex justify-start ml-2 mt-1">
                <button
                  type="button"
                  onClick={async () => {
                    const id = msgId ?? i;
                    setTranslatingId(id);
                    try {
                      const res = await fetch(`/api/translate?type=message&text=${encodeURIComponent(m.text)}`);
                      const data = await res.json();
                      if (data.translated) {
                        setTranslated((prev) => {
                          const next = new Map(prev);
                          next.set(id, data.text);
                          return next;
                        });
                      }
                    } catch {}
                    setTranslatingId(null);
                  }}
                  className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-emerald-400 transition-colors"
                  disabled={translatingId === (msgId ?? i)}
                >
                  <Languages className="w-3 h-3" />
                  {translatingId === (msgId ?? i) ? "Translating..." : "Translate"}
                </button>
              </div>
            )}

            {/* Fraud warning — shown below messages from the other user */}
            {fraud && !isDismissed && (
              <div className="mt-2 mx-1 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold mb-1.5">
                      Safety Alert — Suspicious content
                    </p>
                    <ul className="space-y-1">
                      {fraud.flags.map((flag, fi) => (
                        <li
                          key={fi}
                          className="flex items-center gap-1.5 text-xs text-slate-300"
                        >
                          <span>{severityIcon(flag.severity)}</span>
                          <span>
                            {flag.label}
                            <span
                              className={`ml-1.5 text-[10px] font-mono uppercase ${
                                flag.severity === "high"
                                  ? "text-red-400"
                                  : flag.severity === "medium"
                                  ? "text-amber-400"
                                  : "text-slate-400"
                              }`}
                            >
                              ({flag.severity} risk)
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 ml-6">
                  <button
                    onClick={() => {
                      if (msgId) {
                        setDismissed((prev) => new Set(prev).add(msgId));
                      }
                    }}
                    className="text-[10px] font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                  >
                    Dismiss
                  </button>
                  <span className="text-slate-600 text-[10px]">·</span>
                  <a
                    href={`/dashboard/settings/security`}
                    className="text-[10px] font-mono uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Report to NoZar →
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
