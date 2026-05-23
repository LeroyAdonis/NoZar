import { data, Link } from "react-router";
import type { Route } from "./+types/$";

export function loader() {
  return data(null, { status: 404 });
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "404 — NoZar" },
    { name: "description", content: "Page not found." },
  ];
}

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#030712] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-3">
          404
        </p>
        <h1 className="font-black uppercase tracking-tighter text-5xl text-white mb-4">
          Node Not Found
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          This path doesn't exist on the NoZar network.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-xl bg-emerald-500 text-[#030712] font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all"
        >
          Return to Base
        </Link>
      </div>
    </main>
  );
}
