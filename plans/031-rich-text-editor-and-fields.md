# Plan 031: Constrained Tiptap editor (bold + bullets) for summary & descriptions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Depends on Plan 030** — do not start until 030 is DONE (the PDF renderer and
> `src/features/resume/utils/rich-text.ts` must exist, or the editor's output
> renders as literal `**`/`- ` in the PDF).
>
> **Drift check (run first)**:
> `git diff --stat 60583fb..HEAD -- src/features/resume/components src/features/profile/components/create-profile-form.tsx src/components/ui/textarea.tsx src/server/services`
> Compare "Current state" excerpts against live code; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M/L
- **Risk**: MED (new dep on Tiptap; controlled-component wiring into react-hook-form + autosave + AI updates)
- **Depends on**: plans/030-rich-text-pdf-renderer.md
- **Category**: direction (feature)
- **Planned at**: commit `60583fb`, 2026-07-23

## Why this matters

Users need to write achievements as **bullet lists** and **bold** the values that
grab attention ("**1M downloads**", "**32%** faster"). Today the summary and
every description are plain `<Textarea>`s producing flat text. This plan swaps
those for a headless Tiptap editor constrained to exactly two marks — bold and
bullet list — that serializes to the same tiny markdown subset Plan 030's PDF
renderer already understands. It stays a plain `string` field end-to-end, so
react-hook-form, zod, autosave, the DB, and the AI chat need no structural
change — only the AI prompt gets a one-line formatting instruction so its edits
produce the same markup.

## Current state

### The fields (6 `<Textarea>` sites to swap)

All follow the same shape: a react-hook-form `FormField` whose `render` puts a
`<Textarea {...field} value={field.value ?? ''} />` inside `<FormControl>`.

1. `src/features/resume/components/personal-details.tsx:154-176` — `personal_details.summary`:
   ```tsx
   <FormControl>
     <Textarea
       className={cn('min-h-[100px]', summary.isHidden && 'opacity-50')}
       {...field}
       value={field.value ?? ''}
     />
   </FormControl>
   ```
2. `src/features/resume/components/work-experience.tsx:140-158` — `jobs.${index}.description`:
   ```tsx
   <FormControl>
     <Textarea className='min-h-[100px]' {...field} value={field.value ?? ''} />
   </FormControl>
   ```
3. `src/features/resume/components/education.tsx:157` — `educations.${index}.description` (same shape).
4. `src/features/resume/components/projects.tsx:95` — `projects.${index}.description` (same shape).
5. `src/features/profile/components/create-profile-form.tsx:515-521` — `jobs.${index}.description`:
   ```tsx
   <Textarea placeholder='Enter job description' ... />
   ```
6. `src/features/profile/components/create-profile-form.tsx` — the `educations.${index}.description` `<Textarea>` (find with the grep in Step 4).

`Textarea` is `src/components/ui/textarea.tsx` (a styled `<textarea>`). Its
classes (`border-input ... rounded-md ... min-h-16 ... focus-visible:ring-[3px]`)
are the visual target the editor container should match.

### The data + consumers (all plain `string`, no change needed)

- zod: `resumeEditFormSchema` / `create-profile-form` treat these as
  `z.string().optional()` (summary: `.min(3).optional().nullable()`), in
  `src/features/resume/utils/form-schema.ts`. **Keep them string** — markdown is
  a string.
- Autosave (`use-autosave-resume`) watches the RHF form and persists strings.
- AI chat writes `updatedResume` (a full form object) back via `setValue`, which
  flows into the field `value` — so the editor must accept external `value`
  changes (see the controlled guard in Step 2).

### The AI prompt (produces description/summary text)

- `src/server/services/ai-chat.ts:146` starts the system prompt; `:170` says
  "Experience bullets go in jobs[].description and educations[].description";
  `:187` is the JSON schema it must return (descriptions/summary are `""`
  strings).
- `src/server/services/ai-resume.ts:121` instructs writing the summary; it
  generates the initial resume.
- `src/server/services/resume-guidance.ts` holds the shared bullet-writing
  guidance (X-Y-Z formula) injected into prompts.

### The format contract (defined in Plan 030 — the editor MUST match it)

- Line starting with `- ` → bullet item. Other non-empty line → paragraph.
- `**text**` → bold. Legacy plain text → paragraphs. Nothing else.
- Parser lives in `src/features/resume/utils/rich-text.ts` (`parseRichText`).

## Commands you will need

| Purpose        | Command                              | Expected on success   |
|----------------|--------------------------------------|-----------------------|
| Install dep    | `pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit` | exit 0 |
| Typecheck      | `pnpm typecheck`                     | exit 0                |
| Lint           | `pnpm lint`                          | exit 0                |
| Dev server     | `pnpm dev`                           | serves localhost:3000 |
| Render a cover | `node scripts/generate-template-covers.mjs template-six` | `✓` |

No test runner exists. Verification is typecheck/lint + a manual dev check
(type bold + a bullet, confirm the field value and the live PDF preview) — see
Test plan.

Note: `pnpm add` may (re)create a stray `pnpm-workspace.yaml`; it is already
gitignored (`/pnpm-workspace.yaml`). Do NOT commit it.

## Suggested executor toolkit

- The repo has a `shadcn` skill and Base UI components; the editor **toolbar**
  buttons should reuse `@/components/ui/button` (`Button`, `variant='ghost'`,
  `size='sm'`) for the Bold / Bullet toggles — do not hand-roll buttons.

## Scope

**In scope**:
- `package.json` — add `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`.
- `src/components/ui/rich-text-editor.tsx` (create) — the editor + Tiptap↔string helpers.
- `src/app/globals.css` — minimal `.ProseMirror` styles (list markers, bold, placeholder, min-height).
- The 6 form sites above — swap `<Textarea>` → `<RichTextEditor>`.
- `src/server/services/ai-chat.ts`, `ai-resume.ts`, `resume-guidance.ts` — add the formatting instruction.

**Out of scope** (do NOT touch):
- The PDF templates / `rich-text.tsx` / the parser's parsing rules — owned by Plan 030.
- `src/features/resume/utils/form-schema.ts` (zod) — fields stay `string`.
- `resume-create-form.tsx` (that `<Textarea>` is the **job-description input** for AI, `jd_post_details` — not résumé content) and `import-profile-dialog.tsx` / `resume-chat.tsx` (paste box / chat input).
- The DB schema.

## Git workflow

- Branch: `advisor/002-rich-text-editor`.
- Conventional commits, no `Co-Authored-By`/`Claude` trailer (repo convention).
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Install Tiptap

```
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit
```
`@tiptap/starter-kit` bundles Bold + BulletList + ListItem + Paragraph +
Document + Text + History (and more we will disable). Pin to the `^2` line
(React 19 compatible).

**Verify**: `pnpm typecheck` → exit 0; `grep '@tiptap' package.json` shows 3 deps.

### Step 2: Build `src/components/ui/rich-text-editor.tsx`

A `'use client'` component. Public API (controlled):
```tsx
export function RichTextEditor(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}): JSX.Element
```

Configure `useEditor` with `StarterKit.configure({ heading: false,
orderedList: false, blockquote: false, codeBlock: false, code: false,
horizontalRule: false, strike: false, italic: false })` — leaving Bold,
BulletList, ListItem, Paragraph, History enabled (adjust option names to the
installed StarterKit version; the goal is **only bold + bullet list** are
producible). Set `editorProps.attributes.class` to match the Textarea box
(e.g. `'min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'`).

**Serialization (must match the Plan 030 format):**
- **Load (string → editor)**: on mount and whenever the incoming `value` differs
  from the editor's current serialized output, build a Tiptap JSON doc from
  `parseRichText(value)` (import from `@/features/resume/utils/rich-text`):
  consecutive `bullet` blocks → one `bulletList` of `listItem>paragraph`;
  `para` blocks → `paragraph`; each `RichRun` → a `text` node, bold runs get
  `marks: [{ type: 'bold' }]`. Call `editor.commands.setContent(doc, false)`.
- **Save (editor → string)**: on `onUpdate`, walk `editor.getJSON()`:
  `paragraph` → join its text runs (wrap bold runs in `**...**`) as one line;
  `bulletList` → each `listItem`'s paragraph text as a `- ` line; join blocks
  with `\n`. Call `props.onChange(serialized)`.
- Put both helpers (`richTextToDoc`, `docToRichText`) in this file. They are the
  inverse of `parseRichText`; keep the markup identical (`- ` prefix, `**` bold).

**Controlled guard**: keep the last value you emitted in a ref; in the effect
that syncs the incoming `value`, skip `setContent` when `value === lastEmitted`
— otherwise every keystroke round-trips and the cursor jumps. This guard also
lets AI `setValue` updates flow in (external value ≠ lastEmitted → setContent).

**Toolbar**: a row above the editable area with two `Button`
(`variant='ghost' size='sm'`) toggles:
- Bold → `editor.chain().focus().toggleBold().run()`, active when `editor.isActive('bold')`.
- Bullet list → `toggleBulletList()`, active when `editor.isActive('bulletList')`.
Show active state with a class (e.g. `bg-accent`). Render `<EditorContent editor={editor} />` below. Wrap toolbar+content in a container styled like the Textarea border box (so the toolbar sits inside the border).

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Add `.ProseMirror` styles to `src/app/globals.css`

Append minimal rules so lists and bold show while editing:
```css
.ProseMirror { outline: none; }
.ProseMirror ul { list-style: disc; padding-left: 1.25rem; margin: 0; }
.ProseMirror li { margin: 0.15rem 0; }
.ProseMirror strong { font-weight: 700; }
.ProseMirror p { margin: 0.15rem 0; }
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder); color: var(--muted-foreground); float: left; height: 0; pointer-events: none;
}
```
(The placeholder rule requires Tiptap's `Placeholder` extension; if you didn't
add it, drop that rule and pass no `placeholder`.)

**Verify**: `pnpm typecheck` → exit 0.

### Step 4: Swap the 6 `<Textarea>` sites

For each site, replace the `<Textarea .../>` with:
```tsx
<RichTextEditor value={field.value ?? ''} onChange={field.onChange} />
```
Preserve any conditional class (e.g. the summary's `summary.isHidden &&
'opacity-50'` → pass via `className`). Remove the now-unused `Textarea` import
**only if** the file has no other `<Textarea>` (grep each file first). Find the
profile-form education description site:
```
grep -n "Textarea\|educations\.\|description" src/features/profile/components/create-profile-form.tsx
```

**Verify**: `pnpm typecheck` → exit 0; `pnpm lint` → exit 0.

### Step 5: Verify the round-trip in the running app

`pnpm dev`, open a resume in the editor (`/dashboard/resume/edit/<id>`), and in a
Job Description field: click Bullet, type "Increased signups by ", click Bold,
type "32%", unbold, type " in Q3". Confirm:
1. The live **PDF preview** (right pane) shows a `•` bullet with **32%** bold.
2. (Optional) In React DevTools or by logging, the stored field value is
   `- Increased signups by **32%** in Q3`.
3. Reload the page — the field reloads with the bullet + bold intact (load path
   works).

**Verify**: the three observations above hold. If the PDF preview shows literal
`**`/`- `, Plan 030 is not in place — STOP.

### Step 6: Update the AI prompt to emit the format

Add one instruction to the résumé-editing prompts so AI output matches the
editor. In `src/server/services/ai-chat.ts` (near the `:170` "Experience bullets
go in..." line) and `src/server/services/resume-guidance.ts` (the bullet
guidance), add:

> Format `jobs[].description`, `educations[].description`,
> `projects[].description`, and `personal_details.summary` using ONLY this
> minimal markup: put each achievement on its own line prefixed with `- ` to make
> a bullet; wrap the single most important metric/number in each bullet in
> `**double asterisks**` for bold (e.g. `- Increased signups by **32%** ...`).
> Do not use any other markdown (no headings, italics, links).

Mirror the same one-liner in `src/server/services/ai-resume.ts` where it writes
the summary/experience.

**Verify**: `pnpm typecheck` → exit 0. (Behaviour of the live model is checked
manually via the chat if a key is configured; not required for this gate.)

### Step 7: Commit

Stage in-scope files (incl. `package.json` + the lockfile). Do NOT stage
`pnpm-workspace.yaml`. Conventional commit message.

**Verify**: `git status` shows only in-scope files (+ lockfile); `pnpm typecheck` → exit 0.

## Test plan

No test runner. Gates:
- `pnpm typecheck` + `pnpm lint` (exit 0).
- Step 5 manual round-trip (edit → PDF preview → reload) is the behavioural gate.
- Regression check: open an existing resume whose description is legacy plain
  prose; confirm it loads into the editor as paragraph text (not mangled) and
  the PDF preview is unchanged.

## Done criteria

- [ ] `pnpm typecheck` exits 0 and `pnpm lint` exits 0
- [ ] `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` in `package.json`
- [ ] `src/components/ui/rich-text-editor.tsx` exists and is used at all 6 sites
- [ ] `grep -rn "<Textarea" src/features/resume/components src/features/profile/components/create-profile-form.tsx` returns only non-description textareas (chat/JD/paste), none for summary/description
- [ ] Step 5 round-trip verified: bullet + bold typed → PDF preview shows `•` + bold → survives reload
- [ ] AI prompt files contain the formatting instruction
- [ ] `pnpm-workspace.yaml` is NOT staged; only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report (do not improvise) if:
- Plan 030 is not merged (PDF preview shows literal `**`/`- `).
- The controlled editor causes an infinite update loop or cursor jumps that a
  single `lastEmitted` guard doesn't fix.
- `@tiptap/*@^2` fails to typecheck against React 19 in this repo — report the
  version conflict rather than forcing a major bump.
- The editor's serialized output does NOT match `parseRichText`'s expected
  format (e.g. it emits `*` italic, escaped `\*`, or `1.` ordered lists) — the
  StarterKit disable-list is wrong; report before shipping divergent markup.
- Swapping a field breaks autosave (the value stops persisting) — the `onChange`
  wiring to `field.onChange` is off.

## Maintenance notes

- The editor↔string helpers and the PDF `parseRichText` (Plan 030) are two sides
  of ONE format. Any change to the markup (e.g. adding italics later) must touch
  both `rich-text-editor.tsx` (produce it) and `rich-text.ts` + `rich-text.tsx`
  (parse + render it), plus the AI prompt.
- If you later want **italics** or **links**, that is the same pattern: enable
  the Tiptap mark, extend `parseRichText`/`RichText`, and update the AI prompt.
  Deferred here to keep the surface to "important résumé marks only".
- A reviewer should scrutinise: the controlled-component guard (no loops/cursor
  jumps), that legacy plain-text resumes still load unmangled, and that the AI
  chat's `updatedResume` round-trips through the editor.
