# Plan 032: Make `font-bold` actually render bold in templates One–Five

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. Touch
> only the in-scope files. If a STOP condition occurs, stop and report. SKIP
> updating `plans/README.md` — the reviewer maintains it.
>
> **Executed in the Plan 030 worktree, stacking on commit `4cae445`.** Your
> working tree already contains 030's changes (the shared `RichText` renderer +
> template swaps). This plan adds a second commit on top.

## Status

- **Priority**: P2
- **Effort**: M (mechanical, ~38 edit sites across 5 files)
- **Risk**: LOW (pure style change; no logic; visually makes intended-bold text bold)
- **Depends on**: plans/030-rich-text-pdf-renderer.md (stacks on it)
- **Category**: bug (latent rendering defect)
- **Planned at**: stacks on worktree commit `4cae445` (base `60583fb`), 2026-07-23

## Why this matters

`@react-pdf/renderer@4.1.6` **ignores `fontWeight` for its built-in Standard-14
fonts** (Helvetica/Times/Courier). Verified in the source
`@react-pdf/font@2.5.2/lib/index.js:172-181`:
```js
this.getFont = descriptor => {
  const { fontFamily } = descriptor;
  const isStandard = standard.includes(fontFamily); // standard = ['Helvetica','Helvetica-Bold',...]
  if (isStandard) return null;                       // ← standard fonts: NO weight resolution
  ...
};
```
So every `font-bold` (which `react-pdf-tailwind` compiles to `fontWeight: 700`)
on a default-Helvetica template renders at **regular weight**. Templates One–Five
use `font-bold` for the candidate name, section headers, job titles, company
names, degrees — none of which are actually bold in the PDF today. What looks
"heavier" is larger font size, not weight. The only ATS-safe way to bold a
standard font is to switch `fontFamily` to the explicit bold face
(`Helvetica-Bold`) — registering a weighted family needs real font files, which
corrupt the ATS text layer (the known Lato ligature issue). This plan applies
that explicit-bold-face fix to templates One–Five.

## Current state

Enumerate every site first (run in your worktree):
```
grep -rn "font-bold\|font-medium\|font-semibold" src/features/resume/templates/templateOne.tsx src/features/resume/templates/templateTwo.tsx src/features/resume/templates/templateThree.tsx src/features/resume/templates/templateFour.tsx src/features/resume/templates/templateFive.tsx
```
There are **37 `font-bold`** occurrences (One: 11, Two: 11, Four: 6, Five: 5,
Three: 5) and **1 `font-medium`**. All five templates set **no** `<Page>`
`fontFamily`, so their base font is the default **Helvetica** and the bold face
is **`Helvetica-Bold`**.

They appear as single `tw(...)` string styles, e.g. in `templateFive.tsx`:
```tsx
// line 65 — the name
<Text style={tw('text-[24px] font-bold text-[#111827] leading-none')}>
// line 112 — a job title
style={tw('flex-1 text-[11px] font-bold text-[#111827]')}
// line 30 — a section header
'text-[10px] font-bold tracking-[1.5px] text-[#111827] border-b border-[#9ca3af] pb-1 mb-2'
```
and in `templateOne.tsx`:
```tsx
<Text style={tw('text-2xl font-bold leading-none mb-4')}>       // line 63 — name
<Text style={tw('text-sm font-bold text-white mb-1.5')}>       // line 94 — sidebar heading
```

**Out of scope — do NOT touch:**
- `templateSix.tsx`, `templateSeven.tsx` — they use **0** `font-bold`; their
  hierarchy is color/size based, by design. Leave them.
- `templateEight.tsx` — already uses explicit `Times-Bold` (`SERIF_BOLD`)
  everywhere; already correct. Leave it.
- `src/features/resume/templates/rich-text.tsx` and `utils/rich-text.ts` — 030's
  work; already use `Helvetica-Bold`/`Times-Bold` correctly.
- The **1 `font-medium`**: leave it. Standard-14 has no medium face; it renders
  regular today and there is no ATS-safe medium. Changing it to bold would be
  wrong. (Note which file/line it's in in your report.)

## Commands you will need

| Purpose        | Command                                                    | Expected              |
|----------------|------------------------------------------------------------|-----------------------|
| Typecheck      | `pnpm typecheck`                                           | exit 0                |
| Lint           | `pnpm lint`                                                | exit 0 (warnings ok)  |
| Render covers  | `pnpm covers:generate`                                     | 8 `✓ ...png` lines    |
| Render one     | `node scripts/generate-template-covers.mjs template-five`  | `✓`                   |

No test runner. Verify with typecheck/lint + `covers:generate` and **reading the
PNGs** (Read tool on `public/templates/<id>.png`).

## Scope

**In scope** (only these):
- `src/features/resume/templates/templateOne.tsx`
- `src/features/resume/templates/templateTwo.tsx`
- `src/features/resume/templates/templateThree.tsx`
- `src/features/resume/templates/templateFour.tsx`
- `src/features/resume/templates/templateFive.tsx`
- `public/templates/template-{one,two,three,four,five}.png` — regenerated covers.

**Out of scope**: everything else (see "Current state" list above).

## Git workflow

- Commit ON the existing worktree branch (stacks on `4cae445`). Conventional
  message, e.g. `fix: render true bold in templates one-five via explicit bold font face`.
  No `Co-Authored-By`/`Claude` trailer.
- Do NOT push/PR/merge.

## Steps

### Step 1: Add a `BOLD` constant to each of templateOne–Five

At the top of each file (near the existing `const tw = createTw(...)`), add:
```ts
// react-pdf ignores fontWeight for the Standard-14 fonts; the only ATS-safe way
// to bold the default Helvetica is the explicit bold face.
const BOLD = 'Helvetica-Bold';
```

### Step 2: Convert every `font-bold` style to use the bold face

For each `font-bold` site, change the style so it applies `fontFamily: BOLD`, and
remove the now-redundant `font-bold` token. Convert a single `tw(...)` to a style
array. Examples:
```tsx
// before
<Text style={tw('text-[24px] font-bold text-[#111827] leading-none')}>
// after
<Text style={[tw('text-[24px] text-[#111827] leading-none'), { fontFamily: BOLD }]}>

// before (a bare style string passed elsewhere)
'text-[10px] font-bold tracking-[1.5px] text-[#111827] border-b ...'
// after — wrap: tw of the string minus font-bold, plus { fontFamily: BOLD }
```
If a `font-bold` style is a plain string handed to a `Section`/helper (not
directly `tw()`), follow how that helper consumes it and apply the same result
(strip `font-bold`, ensure `fontFamily: BOLD` reaches the rendered `<Text>`).
Keep every other class (size/color/tracking/margins) unchanged. Do all 37 sites
across the five files. Leave the single `font-medium` untouched.

**Verify after each file**: `pnpm typecheck` → exit 0.

### Step 3: Regenerate covers and confirm true bold

`pnpm covers:generate` → 8 `✓`. Then **Read** `public/templates/template-one.png`
and `template-five.png` and confirm the candidate **name**, **section headers**,
and **job titles** now render visibly **bold** (heavier stroke), matching the
weight of 030's bold description metrics (e.g. "2M+ users"). Nothing else should
change (layout, colors, sizes identical).

**Verify**: the headings/name/titles are visibly bolder than before.

### Step 4: Commit

`git add` the five templates + the five regenerated PNGs
(`git add public/templates/template-{one,two,three,four,five}.png`). Commit with
the conventional message.

**Verify**: `git status` shows only in-scope files; `pnpm typecheck` → exit 0.

## Done criteria

- [ ] `pnpm typecheck` exits 0; `pnpm lint` exits 0
- [ ] `grep -rn "font-bold" src/features/resume/templates/template{One,Two,Three,Four,Five}.tsx` returns nothing (all converted)
- [ ] `grep -rn "Helvetica-Bold\|const BOLD" src/features/resume/templates/template{One,Two,Three,Four,Five}.tsx` shows the bold face wired in each
- [ ] `pnpm covers:generate` succeeds; template-one/five PNGs show visibly bold names/headers/titles
- [ ] Only the 5 templates + their 5 PNGs changed (`git status`); templateSix/Seven/Eight untouched

## STOP conditions

Stop and report if:
- Any `font-bold` site is not a simple style you can safely convert (e.g. a
  computed className) — report it rather than guessing.
- After conversion, a heading renders in a *different font* (not just bolder) —
  it means a non-Helvetica base leaked in; report.
- `templateSix/Seven/Eight` or `rich-text.tsx` would need changing to satisfy a
  step — they must not; report.

## Maintenance notes

- New templates that use the default Helvetica must bold via `fontFamily:
  'Helvetica-Bold'` (or `Times-Bold` for a serif base), never `font-bold` /
  `fontWeight` — the scaffolder skeleton and the shared `RichText` already do
  this; keep it consistent.
- `react-pdf-tailwind`'s `font-bold` is effectively a no-op on standard fonts;
  don't reintroduce it expecting bold.
