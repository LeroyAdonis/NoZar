import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseMarkdown } from "~/lib/parse-markdown";
import { MarkdownRenderer } from "~/components/markdown-renderer";
import type { Route } from "./+types/privacy";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Privacy Policy — NoZar" },
    {
      name: "description",
      content:
        "Read the NoZar Privacy Policy. POPIA-compliant data handling for the South African barter platform.",
    },
  ];
}

export async function loader(_args: Route.LoaderArgs) {
  const filePath = resolve("docs/legal/privacy-policy.md");
  const source = await readFile(filePath, "utf-8");
  const blocks = parseMarkdown(source);
  return { blocks };
}

export default function PrivacyPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 sm:p-10">
      <div className="mb-8">
        <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
          Legal
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
          Privacy Policy
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          POPIA-compliant data handling · Last updated: January 2025
        </p>
      </div>
      <MarkdownRenderer blocks={loaderData.blocks} />

      <nav className="mt-12 pt-6 border-t border-white/5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600 mb-3">Other Documents</p>
        <div className="flex flex-wrap gap-3">
          <a href="/legal/terms" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Terms of Service →</a>
          <a href="/legal/community-guidelines" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Community Guidelines →</a>
          <a href="/legal/complaints" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Complaints Process →</a>
        </div>
      </nav>
    </div>
  );
}
