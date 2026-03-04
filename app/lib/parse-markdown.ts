/**
 * Lightweight markdown parser for legal documents.
 * Handles headings, paragraphs, lists, tables, horizontal rules,
 * and inline formatting (bold, italic, links).
 *
 * Only used for our own trusted markdown files — not for user input.
 */

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" };

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim()) || /^[\s\-:|]+\|/.test(line.trim());
}

export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (trimmed === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: headingMatch[2] });
      i++;
      continue;
    }

    // Table (starts with |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const headers = parseTableRow(trimmed);
      i++;

      // Skip separator row (e.g. |---|---|)
      if (i < lines.length && isTableSeparator(lines[i])) {
        i++;
      }

      const rows: string[][] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|")
      ) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }

      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // Unordered list items (- item)
    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const current = lines[i].trim();
      if (
        current === "" ||
        current.match(/^#{1,3}\s/) ||
        current === "---" ||
        current === "***" ||
        current === "___" ||
        (current.startsWith("|") && current.endsWith("|")) ||
        current.startsWith("- ")
      ) {
        break;
      }
      paragraphLines.push(current);
      i++;
    }

    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
    }
  }

  return blocks;
}
