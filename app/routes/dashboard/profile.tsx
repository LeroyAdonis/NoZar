import type { Route } from "./+types/profile";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile — Nozar" },
    { name: "description", content: "Your Nozar profile and settings" },
  ];
}

export default function Profile() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-50">Profile</h1>
        <p className="mt-2 text-slate-400">Coming Soon</p>
      </div>
    </div>
  );
}
