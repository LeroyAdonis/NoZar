import type { Route } from "./+types/add";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Add Asset — Nozar" },
    { name: "description", content: "List a new item for barter" },
  ];
}

export default function AddAsset() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-50">Add Asset</h1>
        <p className="mt-2 text-slate-400">Coming Soon</p>
      </div>
    </div>
  );
}
