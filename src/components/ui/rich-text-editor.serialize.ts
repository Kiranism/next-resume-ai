/**
 * Pure Tiptap-JSON <-> markdown-subset string conversion for
 * `rich-text-editor.tsx`. No React / Tiptap imports here on purpose: this
 * module must stay SSR-safe and independently unit-testable, and it must
 * only ever depend on the SAME format contract the PDF renderer parses
 * (`@/features/resume/utils/rich-text`'s `parseRichText`) — never diverge
 * from it.
 *
 * `DocNode` is a minimal structural shape for a ProseMirror/Tiptap JSON
 * node. It is intentionally NOT imported from `@tiptap/core`'s
 * `JSONContent` (that would pull a Tiptap dependency into this module) —
 * but it is structurally compatible with it, so values coming out of
 * `editor.getJSON()` / going into `editor.commands.setContent()` on the
 * `.tsx` side pass through without a cast.
 */

import { parseRichText, RichRun } from '@/features/resume/utils/rich-text';

export type DocNode = {
  type?: string;
  text?: string;
  marks?: { type: string }[];
  content?: DocNode[];
};

function runsToTextNodes(runs: RichRun[]): DocNode[] {
  return runs
    .filter((r) => r.text.length > 0)
    .map((r) =>
      r.bold
        ? { type: 'text', text: r.text, marks: [{ type: 'bold' }] }
        : { type: 'text', text: r.text }
    );
}

/**
 * Build a Tiptap JSON `doc` node from the markdown-subset string
 * (`parseRichText`'s format). Consecutive bullet blocks are grouped into a
 * single `bulletList`; paragraph blocks become `paragraph` nodes. An empty
 * string becomes the canonical empty doc (one empty paragraph) — the shape
 * Tiptap itself uses for an empty editor.
 */
export function richTextToDoc(value?: string | null): DocNode {
  const blocks = parseRichText(value);
  if (blocks.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }

  const content: DocNode[] = [];
  let currentBulletItems: DocNode[] | null = null;

  const flushList = () => {
    if (currentBulletItems) {
      content.push({ type: 'bulletList', content: currentBulletItems });
      currentBulletItems = null;
    }
  };

  for (const block of blocks) {
    const textNodes = runsToTextNodes(block.runs);
    const paragraph: DocNode = textNodes.length
      ? { type: 'paragraph', content: textNodes }
      : { type: 'paragraph' };

    if (block.kind === 'bullet') {
      if (!currentBulletItems) currentBulletItems = [];
      currentBulletItems.push({ type: 'listItem', content: [paragraph] });
    } else {
      flushList();
      content.push(paragraph);
    }
  }
  flushList();

  return { type: 'doc', content };
}

function runText(node: DocNode): string {
  const isBold = node.marks?.some((m) => m.type === 'bold') ?? false;
  const text = node.text ?? '';
  return isBold ? `**${text}**` : text;
}

function paragraphText(node: DocNode): string {
  return (node.content ?? []).map(runText).join('');
}

/**
 * Walk a Tiptap JSON `doc` node back to the markdown-subset string. This is
 * the inverse of `richTextToDoc` / `parseRichText`: `paragraph` nodes become
 * plain lines, each `bulletList` > `listItem` > `paragraph` becomes a `- `
 * line, bold runs are wrapped in `**`. Empty paragraphs (blank lines) are
 * dropped, matching `parseRichText`'s "blank lines are separators, not
 * content" contract.
 */
export function docToRichText(doc: DocNode): string {
  const lines: string[] = [];

  for (const node of doc.content ?? []) {
    if (node.type === 'paragraph') {
      const text = paragraphText(node);
      if (text.length > 0) lines.push(text);
    } else if (node.type === 'bulletList') {
      for (const item of node.content ?? []) {
        const para = item.content?.find((c) => c.type === 'paragraph');
        const text = para ? paragraphText(para) : '';
        if (text.length > 0) lines.push(`- ${text}`);
      }
    }
  }

  return lines.join('\n');
}
