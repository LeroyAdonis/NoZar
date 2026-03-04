"use client";

import { useNavigate, useParams } from "react-router";
import type { Route } from "./+types/asset.$id";
import {
  ChevronLeft,
  MapPin,
  MessageSquare,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import { MOCK_ASSETS } from "~/lib/mock-data";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Asset — Nozar" },
    { name: "description", content: "View asset details" },
  ];
}

export default function AssetDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const asset = MOCK_ASSETS.find((a) => a.id === Number(params.id));

  if (!asset) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-50">Asset not found</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 text-emerald-500 text-xs font-mono uppercase tracking-widest hover:text-emerald-400"
          >
            Return to Index
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in slide-in-from-right-4 duration-300">
      {/* Back button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Return to Index
      </button>

      {/* Hero image block */}
      <div
        className={`w-full aspect-video rounded-3xl ${asset.image} border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl`}
      >
        <Repeat className="w-16 h-16 text-white/10" />
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded px-2 py-1 text-[10px] font-mono text-white uppercase border border-white/10">
          {asset.category}
        </div>
        <div className="absolute top-4 right-4 bg-emerald-500/10 backdrop-blur-md rounded px-2 py-1 text-[10px] font-mono text-emerald-400 uppercase border border-emerald-500/20">
          {asset.tier}
        </div>
      </div>

      {/* Title & exchange request */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-2">
          {asset.title}
        </h1>
        <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-4 mb-6">
          <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest block mb-1">
            Target Value Exchange
          </span>
          <p className="font-medium text-slate-200">{asset.need}</p>
        </div>

        {/* Description */}
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-2">
          Asset Details
        </span>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          {asset.desc}
        </p>

        {/* User info card */}
        <div className="flex items-center justify-between p-4 border border-white/10 rounded-2xl bg-[#0F172A]/50 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5">
              <span className="font-bold text-slate-400">
                {asset.user.charAt(0)}
              </span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">{asset.user}</h4>
              {asset.isVerified ? (
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
          <div className="text-right">
            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
              <MapPin className="w-3 h-3 text-cyan-500" /> {asset.distance}
            </span>
          </div>
        </div>

        {/* Initialize Ping CTA */}
        <button
          onClick={() => navigate("/dashboard/pings")}
          className="w-full py-4 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-sm hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-4 h-4 fill-[#030712]" /> Initialize Ping
        </button>
      </div>
    </div>
  );
}
