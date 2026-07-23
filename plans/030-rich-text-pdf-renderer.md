# Plan 030: Render a bold/bullets markdown subset in every resume PDF template

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 60583fb..HEAD -- src/features/resume/templates scripts/generate-template-covers.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (touches all 8 PDF templates; visual regression risk)
- **Depends on**: none
- **Category**: direction (feature enablement)
- **Planned at**: commit `60583fb`, 2026-07-23

## Why this matters

Résumé descriptions and the summary currently render as a single plain-text
paragraph (or, in templates six/seven/eight, one bullet per `\n` line). The
product wants users to **bold** the values that catch a reader's eye (e.g. "1M
downloads") and to write achievements as **bullet lists**. A rich-text editor
(Plan 031) will produce that content, but react-pdf renders plain text — it
cannot display HTML. This plan adds the *display* half: one shared react-pdf
component that parses a tiny markdown subset (`- ` bullets, `**bold**`) and
renders it, wired into all 8 templates. It ships first and is backward
compatible (existing plain text renders as a paragraph, exactly as today), so
Plan 031's editor has something to render into.

## Current state

The 8 templates live in `src/features/resume/templates/template{One..Eight}.tsx`.
They are `@react-pdf/renderer` components styled with `react-pdf-tailwind`
(`const tw = createTw(...)`, then `tw('...')`). They render `job.description`,
`edu.description`, `proj.description`, and `personal_details.summary` in three
different ways today:

1. **templateSix / templateSeven / templateEight** — split on `\n` into bullets
   via a local `bullets()` helper. e.g. `templateSix.tsx:158`:
   ```tsx
   {bullets(job?.description).map((b, j) => (
     <Bullet key={j} text={b} />
   ))}
   ```
   Their local `bullets()` is:
   ```tsx
   const bullets = (text?: string | null) =>
     (text || '').split('\n').map((t) => t.trim()).filter(Boolean);
   ```
   and their local `Bullet` renders a `•` marker + text (colors differ per
   template). `templateEight` is a **serif** template: its `<Page>` sets
   `fontFamily: 'Times-Roman'` and bold spans use `fontFamily: 'Times-Bold'`
   (NOT `fontWeight: 'bold'` — react-pdf's built-in Times family needs the
   explicit bold face).

2. **templateFour** — one `BulletPoint` for the whole description.
   `templateFour.tsx:131`: `<BulletPoint text={job.description} />`, where
   `BulletPoint` (defined at `templateFour.tsx:31`) renders a single marker +
   the entire text.

3. **templateOne / templateTwo / templateThree / templateFive** — a single
   `<Text>` paragraph. e.g. `templateFive.tsx:123-127`:
   ```tsx
   {job?.description ? (
     <Text style={tw('text-[10px] mt-1 leading-relaxed')}>
       {job.description}
     </Text>
   ) : null}
   ```
   Summary is likewise a single `<Text>` in every template, e.g.
   `templateFive.tsx:85-87` (inside a `SUMMARY` section) and
   `templateSix.tsx:126-132`.

`bullets()` currently treats **every** `\n` line as a bullet (no `- ` prefix
needed). This plan changes the contract (see below): a line is a bullet only if
it starts with `- `. Existing multi-line descriptions that relied on the
implicit-bullet behaviour will render as paragraph lines instead — an accepted,
documented behaviour change (see Maintenance notes). Summary was always a
paragraph, so it is unaffected for legacy data.

**react-pdf facts that matter** (verified in this repo):
- Bold works: `templateFive` uses `font-bold` (→ `fontWeight: 700`) with the
  default Helvetica and renders bold. Nested `<Text>` inherit + override parent
  style, so `<Text>plain <Text style={{ fontWeight: 'bold' }}>bold</Text></Text>`
  renders a bold run inline. This is real, selectable text (ATS-safe).
- Only `•` (U+2022) and standard Latin glyphs render. Do not introduce other
  bullet glyphs.
- The cover generator `scripts/generate-template-covers.mjs` renders every
  template with a placeholder résumé (Ethan Carter) and rasterizes page 1 to
  `public/templates/<id>.png`. It accepts a template-id arg to render just one:
  `node scripts/generate-template-covers.mjs template-six`.

### The format contract (shared with Plan 031 — do not change without updating both)

A description/summary string is plain text with this minimal markup:

- A line beginning with `- ` (dash, space) is a **bullet** item (strip the `- `).
- Any other non-empty line is **paragraph** text.
- `**text**` anywhere is **bold** (inline). Unmatched `**` is treated literally.
- No other markdown is recognised (no italics, headings, links in v1).
- Legacy plain text (no `- `, no `**`) → one paragraph per line.

## Commands you will need

| Purpose        | Command                                                    | Expected on success              |
|----------------|------------------------------------------------------------|----------------------------------|
| Typecheck      | `pnpm typecheck`                                            | exit 0, no errors                |
| Lint           | `pnpm lint`                                                 | exit 0 (warnings ok)             |
| Render one cover | `node scripts/generate-template-covers.mjs template-six` | `✓ template-six.png (1000×1414)` |
| Render all covers | `pnpm covers:generate`                                  | 8 `✓ ...png` lines               |

There is **no test runner** in this repo (no `test` script in `package.json`).
Verification is typecheck + lint + rendering a cover and **reading the PNG**
(use the Read tool on `public/templates/<id>.png`).

## Scope

**In scope**:
- `src/features/resume/utils/rich-text.ts` (create) — the pure parser.
- `src/features/resume/templates/rich-text.tsx` (create) — the react-pdf renderer.
- `src/features/resume/templates/template{One,Two,Three,Four,Five,Six,Seven,Eight}.tsx` — swap description + summary rendering to `<RichText>`.
- `scripts/generate-template-covers.mjs` — update the placeholder so descriptions use `- ` bullets + one `**bold**` metric (so thumbnails showcase the feature).
- `public/templates/*.png` — regenerated covers (commit them).

**Out of scope** (do NOT touch):
- Any form component, the editor, or `@tiptap/*` — that is Plan 031.
- The DB schema / zod schema — descriptions stay `string`.
- The AI services — Plan 031 updates the prompt.
- Template layout/colors/spacing beyond the description+summary rendering swap.

## Git workflow

- Branch: `advisor/001-rich-text-pdf-renderer`.
- Commit style matches `git log` (conventional commits, e.g.
  `feat: shared RichText renderer for bold + bullets in PDF templates`). Do NOT
  add a `Co-Authored-By`/`Claude` trailer (repo convention).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the pure parser `src/features/resume/utils/rich-text.ts`

No React / react-pdf imports (it must run in the node covers bundle too). Export:

```ts
export type RichRun = { text: string; bold: boolean };
export type RichBlock = { kind: 'bullet' | 'para'; runs: RichRun[] };

// Split "**bold**" runs out of a single line.
function parseInline(line: string): RichRun[] { /* regex split on /\*\*(.+?)\*\*/ */ }

// Parse a description/summary string into blocks.
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

// Convenience for callers that just want plain text (e.g. length checks).
export function richToPlain(src?: string | null): string { /* strip ** and leading - */ }
```

`parseInline`: match `/\*\*(.+?)\*\*/g`; text between matches is `bold:false`,
captured groups are `bold:true`. Preserve order; keep a trailing/leading
non-bold segment. An unmatched `**` (odd count) stays literal in a `bold:false`
run — never throw.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Create the react-pdf renderer `src/features/resume/templates/rich-text.tsx`

```tsx
import { Text, View } from '@react-pdf/renderer';
import { Style } from '@react-pdf/types';
import { parseRichText, RichRun } from '../utils/rich-text';

type Props = {
  content?: string | null;
  textStyle: Style | Style[];       // per-template text style (size, color, leading)
  boldStyle?: Style;                 // default { fontWeight: 'bold' }; serif passes { fontFamily: 'Times-Bold' }
  bulletStyle?: Style;               // marker style (color/size); defaults to textStyle
  gap?: Style;                       // spacing between blocks; e.g. tw('mb-0.5')
};

function Runs({ runs, boldStyle }: { runs: RichRun[]; boldStyle: Style }) {
  return <>{runs.map((r, i) => (r.bold ? <Text key={i} style={boldStyle}>{r.text}</Text> : <Text key={i}>{r.text}</Text>))}</>;
}

export function RichText({ content, textStyle, boldStyle = { fontWeight: 'bold' }, bulletStyle, gap }: Props) {
  const blocks = parseRichText(content);
  if (blocks.length === 0) return null;
  return (
    <View>
      {blocks.map((b, i) =>
        b.kind === 'bullet' ? (
          <View key={i} style={[/* flex-row */ gap]}>
            <Text style={[bulletStyle ?? textStyle, /* w-3 */]}>•</Text>
            <Text style={[textStyle, /* flex-1 */]}><Runs runs={b.runs} boldStyle={boldStyle} /></Text>
          </View>
        ) : (
          <Text key={i} style={[textStyle, gap]}><Runs runs={b.runs} boldStyle={boldStyle} /></Text>
        )
      )}
    </View>
  );
}
```

Use `tw()` from `react-pdf-tailwind` for the flex/spacing utility styles
(`tw('flex flex-row mb-0.5')`, `tw('w-3')`, `tw('flex-1')`) to match the other
templates. Keep the component styling-agnostic: callers pass `textStyle` so
each template keeps its own size/color.

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Swap the three bullet templates (Six, Seven, Eight)

In `templateSix.tsx`, `templateSeven.tsx`, `templateEight.tsx`: replace each
`{bullets(x?.description).map(...)}` block (and the summary `<Text>`) with
`<RichText content={x?.description} textStyle={...} .../>`, reusing that
template's existing text style values. Then **delete the now-unused local
`bullets` and `Bullet`** helpers if nothing else references them
(`grep -n "bullets\|Bullet" <file>` to confirm). For `templateEight`
(serif), pass `boldStyle={{ fontFamily: 'Times-Bold' }}`.

Enumerate every site first:
```
grep -n "description\|bullets(\|summary" src/features/resume/templates/templateSix.tsx src/features/resume/templates/templateSeven.tsx src/features/resume/templates/templateEight.tsx
```

**Verify**: `pnpm typecheck` → exit 0, and
`node scripts/generate-template-covers.mjs template-six` → `✓`, then **Read
`public/templates/template-six.png`** and confirm the experience bullets still
render with `•` markers.

### Step 4: Swap templateFour (single BulletPoint) and the paragraph templates (One, Two, Three, Five)

For each, replace the description rendering and the summary `<Text>` with
`<RichText content={...} textStyle={...} />`, preserving the exact `tw(...)`
text style that was on the old `<Text>` (size/leading/color/margins → pass as
`textStyle` and `gap`). For `templateFour`, remove its `BulletPoint` helper if
unused after the swap. Enumerate sites:
```
grep -n "description\|BulletPoint\|summary" src/features/resume/templates/templateOne.tsx src/features/resume/templates/templateTwo.tsx src/features/resume/templates/templateThree.tsx src/features/resume/templates/templateFour.tsx src/features/resume/templates/templateFive.tsx
```

**Verify**: `pnpm typecheck` → exit 0.

### Step 5: Update the covers placeholder to showcase bold + bullets

In `scripts/generate-template-covers.mjs`, change the three `jobs[].description`
strings so each line is a **`- ` bullet** and one metric per description is
wrapped in `**...**`. Example for job 1:
```
'- Led development of a microservices platform serving **2M+ users**.\n- Built CI/CD pipelines that cut deployment time by **60%**.\n- Mentored 6 engineers and drove TypeScript adoption across teams.'
```
Do the same for the first education `description` and leave `projects[]`
descriptions as single lines (they render as paragraphs — good coverage of both
block kinds). Keep the summary as prose (verifies paragraph + optional bold).

**Verify**: `pnpm covers:generate` → 8 `✓` lines. Then **Read**
`public/templates/template-five.png`, `template-six.png`, and
`template-eight.png` and confirm: bullets have `•` markers, the `**...**`
metrics render **bold** (in template-eight the bold is the serif Times-Bold
face), and nothing shows literal `**` or leading `- `.

### Step 6: Commit

Stage the new files, the 8 templates, the covers script, and **all 8 changed
PNGs** (`git add public/templates/`). Commit with the conventional message.
Committing the PNGs is required — untracked public assets 404 in production.

**Verify**: `git status` shows only in-scope files; `pnpm typecheck` → exit 0.

## Test plan

No test runner exists. Behaviour is verified by:
- `pnpm typecheck` (type correctness of the parser + renderer + templates).
- `pnpm covers:generate` + reading the PNGs (visual: bullets render as `•`,
  `**x**` renders bold, no literal markup leaks). This is the established
  verification method for templates in this repo.
- Manual parser spot-check (optional): `parseRichText('- a **b** c\nplain')`
  should yield `[{kind:'bullet',runs:[{text:'a ',bold:false},{text:'b',bold:true},{text:' c',bold:false}]},{kind:'para',runs:[{text:'plain',bold:false}]}]`.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `src/features/resume/utils/rich-text.ts` and `src/features/resume/templates/rich-text.tsx` exist
- [ ] `grep -rn "const bullets =\|BulletPoint" src/features/resume/templates/*.tsx` returns nothing (all replaced by the shared renderer)
- [ ] `pnpm covers:generate` succeeds; template-five/six/eight PNGs show `•` bullets and a **bold** metric, no literal `**`/`- `
- [ ] Only in-scope files modified (`git status`); all 8 PNGs staged
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report (do not improvise) if:
- The template excerpts in "Current state" don't match the live code (drift).
- A `**bold**` run renders literally (asterisks visible) in the PDF after a
  reasonable fix — the nested-`<Text>` bold approach may need adjusting; report.
- In `template-eight`, bold text renders in the sans font instead of Times-Bold
  after passing `boldStyle={{ fontFamily: 'Times-Bold' }}`.
- Removing a local `bullets`/`Bullet`/`BulletPoint` helper breaks typecheck
  because it's used somewhere unexpected.

## Maintenance notes

- **Behaviour change for legacy data**: before this plan, templates six/seven/
  eight rendered every `\n` line of a description as a bullet. Now a line is a
  bullet only if it starts with `- `. Existing multi-line descriptions with no
  `- ` prefix render as paragraph lines. This is intentional (the Plan 031
  editor produces correct `- ` bullets going forward). If real user data relied
  on implicit bullets and this looks wrong in production, a one-time,
  opt-in data migration could prefix `- ` to multi-line descriptions — but it is
  a heuristic and is explicitly deferred, not part of this plan.
- The **format contract** in "Current state" is shared with Plan 031. If you
  change what `parseRichText` accepts, update the editor's serializer in Plan
  031 to match, or bold/bullets will diverge between the editor and the PDF.
- A reviewer should scrutinise each template's `textStyle`/`boldStyle` values
  (they must match the pre-swap `tw(...)` styles) and the serif bold face in
  template-eight.
