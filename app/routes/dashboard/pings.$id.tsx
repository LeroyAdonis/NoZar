import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ChevronLeft,
  Lock,
  Send,
  ShieldCheck,
  Unlock,
  MapPin,
  CheckCircle2,
  Navigation2,
} from "lucide-react";
import type { Route } from "./+types/pings.$id";
import type { HandshakeStage, Message } from "~/lib/types";
import { MOCK_PINGS, MOCK_ASSETS } from "~/lib/mock-data";

/** Internal message type that extends Message with system messages */
type ChatMessage =
  | Message
  | { type: "system"; text: string; time: string };

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ping Detail — Nozar" },
    { name: "description", content: "View ping conversation" },
  ];
}

export default function PingDetail() {
  const navigate = useNavigate();
  const params = useParams();
  const pingId = Number(params.id);

  const ping = MOCK_PINGS.find((p) => p.id === pingId);
  const asset = MOCK_ASSETS.find((a) => a.id === ping?.assetId);

  const initialStage: HandshakeStage =
    ping?.status === "handshake_ready" ? "proposed" : "chatting";

  const [handshakeStage, setHandshakeStage] =
    useState<HandshakeStage>(initialStage);
  const [messages, setMessages] = useState<ChatMessage[]>(
    ping?.messages ?? [],
  );
  const [input, setInput] = useState("");

  if (!ping || !asset) {
    return (
      <div className="max-w-md mx-auto px-4 pt-8 pb-28">
        <button
          onClick={() => navigate("/dashboard/pings")}
          className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-sm font-bold text-slate-400 mb-1">
            Ping Not Found
          </h3>
          <p className="text-xs text-slate-500">
            This conversation doesn&apos;t exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { text: input, sender: "me" as const, time: "Just now" },
    ]);
    setInput("");
  };

  const handleProposeHandshake = () => {
    setHandshakeStage("proposed");
    setMessages((prev) => [
      ...prev,
      {
        type: "system" as const,
        text: "You proposed a Secure Handshake.",
        time: "Just now",
      },
    ]);
  };

  const handleAcceptHandshake = () => {
    setHandshakeStage("accepted");
  };

  /* ------------------------------------------------------------------ *
   *  Layout: fixed overlay between dashboard header (73px) and bottom   *
   *  nav (~80px). This bypasses the parent <main> padding entirely,     *
   *  giving the chat full control of its vertical space.                 *
   *                                                                      *
   *  Dashboard header = py-4 (32px) + 40px content + 1px border = 73px  *
   *  Bottom nav       ≈ pt-2 + icons/labels + pb-4 + border ≈ 80px     *
   * ------------------------------------------------------------------ */
  return (
    <div className="fixed inset-x-0 top-[73px] bottom-20 z-20 bg-[#030712] flex flex-col">
      <div className="mx-auto w-full max-w-md px-4 flex flex-col h-full min-h-0">
        {/* Chat header — always visible (shrink-0 inside flex col) */}
        <div className="flex items-center justify-between pt-4 pb-4 border-b border-white/5 shrink-0">
          <button
            onClick={() => navigate("/dashboard/pings")}
            className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h3 className="font-bold text-sm text-white">{ping.user}</h3>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              {asset.title}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#0F172A] border border-emerald-500/30 flex items-center justify-center">
            <span className="text-xs font-bold text-emerald-500">
              {ping.user.charAt(0)}
            </span>
          </div>
        </div>

        {/* Trust Protocol Banner — Stage 1 */}
        {handshakeStage === "chatting" && (
          <div className="my-4 p-3 rounded-xl bg-cyan-900/10 border border-cyan-500/20 flex gap-3 shrink-0">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[10px] font-mono text-cyan-400 leading-relaxed uppercase tracking-wider">
              Stage 01: Chat is encrypted. Phone numbers and emails are
              automatically scrubbed for your safety.
            </p>
          </div>
        )}

        {/* Message Scroll Area — flex-1 + min-h-0 ensures it shrinks properly */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2 min-h-0">
          {messages.map((msg, i) => {
            // System messages
            if ("type" in msg && msg.type === "system") {
              return (
                <div key={i} className="flex justify-center my-4">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 bg-[#0F172A] px-3 py-1 rounded-full border border-white/5">
                    [ {msg.text} ]
                  </span>
                </div>
              );
            }

            // User messages — narrowed to Message type after system check
            const userMsg = msg as Message;
            const isMe = userMsg.sender === "me";
            return (
              <div
                key={i}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 ${
                    isMe
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-50"
                      : "bg-[#0F172A] border border-white/10 text-slate-300"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <span
                    className={`text-[8px] font-mono mt-1 block ${
                      isMe ? "text-emerald-500/50 text-right" : "text-slate-500"
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Handshake Stage 2: Proposed */}
          {handshakeStage === "proposed" && (
            <div className="mt-6 p-5 rounded-2xl bg-[#0F172A] border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 animate-pulse">
                  <Unlock className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <h4 className="text-center font-bold text-white mb-2 uppercase tracking-wide">
                Stage 02: Handshake Initiated
              </h4>
              <p className="text-center text-xs text-slate-400 mb-4">
                Both parties must commit to reveal the Safe Zone meetup ticket
                and identity verification.
              </p>
              <button
                onClick={handleAcceptHandshake}
                className="w-full py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all"
              >
                Commit &amp; Reveal
              </button>
            </div>
          )}

          {/* Handshake Stage 3: Accepted — SafeZone Ticket */}
          {handshakeStage === "accepted" && (
            <div className="mt-6 rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#030712] border border-emerald-500/50 overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.2)]">
              {/* Ticket Header */}
              <div className="bg-emerald-500/10 p-4 border-b border-emerald-500/20 flex justify-between items-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Mutual Consensus Reached
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  TKT-8842
                </span>
              </div>

              {/* Map Placeholder */}
              <div className="w-full h-32 bg-[#030712] relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]" />
                <div className="w-32 h-32 rounded-full border border-cyan-500/20 absolute animate-ping" />
                <MapPin className="w-8 h-8 text-cyan-400 relative z-10" />
              </div>

              {/* Meetup Details */}
              <div className="p-5 space-y-4">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-1">
                    System Selected Safe Zone
                  </span>
                  <h4 className="font-bold text-white text-lg flex items-center gap-2">
                    Engen Garage, Main Rd{" "}
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Well-lit area with 24/7 CCTV coverage.
                  </p>
                </div>

                {/* Verification Grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">
                      Party B Status
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      ID Verified
                    </span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block mb-1">
                      Exchange Window
                    </span>
                    <span className="text-xs font-bold text-white">
                      48 Hours
                    </span>
                  </div>
                </div>

                {/* Navigation Button */}
                <button className="w-full py-3 mt-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-xs hover:bg-white/10 flex items-center justify-center gap-2 transition-colors">
                  <Navigation2 className="w-4 h-4" /> Get Directions
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Footer — hidden when handshake accepted */}
        {handshakeStage !== "accepted" && (
          <div className="pt-3 pb-2 shrink-0">
            <div className="flex gap-2">
              <button
                onClick={handleProposeHandshake}
                disabled={handshakeStage === "proposed"}
                className="p-3 rounded-xl bg-[#0F172A] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Initiate Handshake"
              >
                <ShieldCheck className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Encrypted transmission..."
                className="flex-1 bg-[#0F172A] border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={handleSend}
                className="p-3 rounded-xl bg-emerald-500 text-[#030712] hover:bg-emerald-400 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
