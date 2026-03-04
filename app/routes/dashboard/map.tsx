import type { Route } from "./+types/map";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Map — Nozar" },
    { name: "description", content: "Find swaps near you on the map" },
  ];
}

export default function Map() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-50">Map</h1>
        <p className="mt-2 text-slate-400">Coming Soon</p>
      </div>
    </div>
  );
}
