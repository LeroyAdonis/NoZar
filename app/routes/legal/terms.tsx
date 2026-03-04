import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseMarkdown } from "~/lib/parse-markdown";
import { MarkdownRenderer } from "~/components/markdown-renderer";
import type { Route } from "./+types/terms";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Terms of Service — NoZar" },
    {
      name: "description",
      content:
        "Read the NoZar Terms of Service governing your use of the barter platform.",
    },
  ];
}

export async function loader(_args: Route.LoaderArgs) {
  const filePath = resolve("docs/legal/terms-of-service.md");
  const source = await readFile(filePath, "utf-8");
  const blocks = parseMarkdown(source);
  return { blocks };
}

export default function TermsPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 sm:p-10">
      <div className="mb-8">
        <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
          Legal
        </span>
      </div>
      <MarkdownRenderer blocks={loaderData.blocks} />
    </div>
  );
}
