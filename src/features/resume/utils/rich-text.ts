/**
 * Pure parser for the tiny markdown subset used in résumé descriptions and
 * the summary. No React / react-pdf imports — this module also runs inside
 * the node covers-generation bundle (scripts/generate-template-covers.mjs).
 *
 * Contract:
 * - A line beginning with "- " or "* " (dash/star, space) is a bullet item
 *   (the marker is stripped).
 * - Any other non-empty line is paragraph text.
 * - "**text**" anywhere is bold (inline). Unmatched "**" is treated
 *   literally.
 * - No other markdown is recognised (no italics, headings, links).
 * - Blank lines are separators, not content.
 */

export type RichRun = { text: string; bold: boolean };
export type RichBlock = { kind: 'bullet' | 'para'; runs: RichRun[] };

function parseInline(line: string): RichRun[] {
  const runs: RichRun[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: line.slice(lastIndex, match.index), bold: false });
    }
    runs.push({ text: match[1], bold: true });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < line.length) {
    runs.push({ text: line.slice(lastIndex), bold: false });
  }
  if (runs.length === 0) {
    runs.push({ text: line, bold: false });
  }
  return runs;
}

export function parseRichText(src?: string | null): RichBlock[] {
  const lines = (src || '').split('\n');
  const blocks: RichBlock[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue; // blank lines are separators, not content
    const m = /^[-*]\s+(.*)$/.exec(line);
    if (m) blocks.push({ kind: 'bullet', runs: parseInline(m[1]) });
    else blocks.push({ kind: 'para', runs: parseInline(line) });
  }
  return blocks;
}

export function richToPlain(src?: string | null): string {
  return parseRichText(src)
    .map((b) => b.runs.map((r) => r.text).join(''))
    .join('\n');
}
