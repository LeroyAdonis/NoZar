import type { MarkdownBlock } from "~/lib/parse-markdown";

/**
 * Parse inline markdown formatting into React elements.
 * Handles **bold**, *italic*, [links](url), and `code`.
 */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Regex matches: **bold**, *italic*, [text](url), `code`
  const pattern = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\[(.+?)\]\((.+?)\))|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold**
      nodes.push(
        <strong key={match.index} className="text-slate-200 font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      nodes.push(
        <em key={match.index} className="text-slate-300 italic">
          {match[4]}
        </em>
      );
    } else if (match[5]) {
      // [text](url)
      nodes.push(
        <a
          key={match.index}
          href={match[7]}
          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
          target={match[7].startsWith("http") ? "_blank" : undefined}
          rel={match[7].startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {match[6]}
        </a>
      );
    } else if (match[8]) {
      // `code`
      nodes.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-white/5 text-emerald-300 font-mono text-sm"
        >
          {match[9]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

function HeadingBlock({ level, text }: { level: 1 | 2 | 3; text: string }) {
  const styles = {
    1: "text-2xl sm:text-3xl font-black tracking-tight text-white mt-0 mb-6",
    2: "text-xl sm:text-2xl font-bold tracking-tight text-white mt-12 mb-4",
    3: "text-lg font-semibold text-slate-200 mt-8 mb-3",
  } as const;

  const Tag = `h${level}` as const;
  return <Tag className={styles[level]}>{renderInline(text)}</Tag>;
}

function ParagraphBlock({ text }: { text: string }) {
  return (
    <p className="text-slate-400 leading-relaxed mb-4">
      {renderInline(text)}
    </p>
  );
}

function ListBlock({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 mb-4 ml-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-slate-400 leading-relaxed">
          <span className="text-emerald-500/60 mt-1.5 shrink-0">•</span>
          <span>{renderInline(item)}</span>
        </li>
      ))}
    </ul>
  );
}

function TableBlock({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto mb-6 rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            {headers.map((header, i) => (
              <th
                key={i}
                className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-slate-400"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-white/5 last:border-0"
            >
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-slate-400">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HrBlock() {
  return <hr className="border-white/10 my-8" />;
}

export function MarkdownRenderer({ blocks }: { blocks: MarkdownBlock[] }) {
  return (
    <div>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <HeadingBlock key={i} level={block.level} text={block.text} />
            );
          case "paragraph":
            return <ParagraphBlock key={i} text={block.text} />;
          case "list":
            return <ListBlock key={i} items={block.items} />;
          case "table":
            return (
              <TableBlock key={i} headers={block.headers} rows={block.rows} />
            );
          case "hr":
            return <HrBlock key={i} />;
        }
      })}
    </div>
  );
}
