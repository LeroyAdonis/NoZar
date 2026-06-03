"use client";
import React, { useState } from "react";
import { MessageCircle } from "lucide-react";

function buildSafetyMessage(
  counterpartyName: string,
  listingTitle: string,
  spotName: string | null,
  _tradeId: number,
): string {
  const lines = [
    "\u{1F512} Meetup via NoZar",
    "",
    "Meeting: " + counterpartyName,
    "My item: " + listingTitle,
    "Location: " + (spotName ?? "TBD"),
    "",
    "If you don't hear from me within 1 hour after the meetup, please check on me.",
  ];
  return lines.join("\n");
}

function buildWhatsAppText(
  counterpartyName: string,
  listingTitle: string,
  spotName: string | null,
  _tradeId: number,
): string {
  const t = [
    "\u{1F512} Meetup via NoZar",
    "",
    "Meeting: " + counterpartyName,
    "My item: " + listingTitle,
    "Location: " + (spotName ?? "TBD"),
    "",
    "If I don't check in within 1hr please reach out.",
  ].join("\n");
  return encodeURIComponent(t);
}

export function SafetyShareMessage({
  counterpartyName,
  listingTitle,
  spotName,
  tradeId,
}: {
  counterpartyName: string;
  listingTitle: string;
  spotName: string | null;
  tradeId: number;
}) {
  const msg = buildSafetyMessage(counterpartyName, listingTitle, spotName, tradeId);
  return (
    <div className="bg-[#030712] border border-white/10 rounded-xl p-3 mb-3 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
      {msg}
    </div>
  );
}

export function SafetyShareWhatsApp({
  counterpartyName,
  listingTitle,
  spotName,
  tradeId,
}: {
  counterpartyName: string;
  listingTitle: string;
  spotName: string | null;
  tradeId: number;
}) {
  const waText = buildWhatsAppText(counterpartyName, listingTitle, spotName, tradeId);
  return (
    <a
      href={"https://wa.me/?text=" + waText}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 font-mono uppercase tracking-wider text-[11px] leading-none transition-all"
    >
      <MessageCircle className="w-3.5 h-3.5" />
      Share via WhatsApp
    </a>
  );
}

export function SafetyShareCopy({
  counterpartyName,
  listingTitle,
  spotName,
  tradeId,
}: {
  counterpartyName: string;
  listingTitle: string;
  spotName: string | null;
  tradeId: number;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(
          buildSafetyMessage(counterpartyName, listingTitle, spotName, tradeId),
        ).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 font-mono uppercase tracking-wider text-[11px] leading-none transition-all"
    >
      {copied ? "\u2713 Copied!" : "Copy Message"}
    </button>
  );
}
