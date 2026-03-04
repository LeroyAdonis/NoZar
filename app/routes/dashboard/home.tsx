"use client";

import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { MOCK_ASSETS } from "~/lib/mock-data";
import { AssetCard } from "~/components/ui/asset-card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard — Nozar" },
    { name: "description", content: "Your Nozar dashboard" },
  ];
}

const CATEGORIES = ["All", "Electronics", "Furniture", "Service", "Vehicles"];

export default function DashboardHome() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredAssets =
    activeCategory === "All"
      ? MOCK_ASSETS
      : MOCK_ASSETS.filter((asset) => asset.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex justify-between items-end pt-2">
        <div>
          <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest block mb-1">
            // Local Index
          </span>
          <h2 className="text-xl font-bold uppercase tracking-tight">
            Nearby Assets
          </h2>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-mono uppercase tracking-widest transition-all border ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-[#0F172A] text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-300"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Asset feed */}
      {filteredAssets.length > 0 ? (
        <div className="space-y-4">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onClick={() => navigate(`/dashboard/asset/${asset.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-slate-600 text-4xl mb-4">⊘</div>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest mb-1">
            No results
          </p>
          <p className="text-slate-600 text-xs">
            No assets found in{" "}
            <span className="font-mono text-slate-500">
              {activeCategory}
            </span>
          </p>
        </div>
      )}

      {/* Footer action */}
      <div className="py-8 text-center">
        <button className="text-emerald-500 text-xs font-mono uppercase tracking-widest mt-2 hover:text-emerald-400">
          Expand Radius
        </button>
      </div>
    </div>
  );
}
