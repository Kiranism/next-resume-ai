# Plan 002: Live PDF preview without the keystroke flash (keep native pagination + page nav)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat f464c9c..HEAD -- src/features/resume/components/pdf-renderer.tsx src/features/resume/components/resume-edit-content.tsx src/hooks/use-debounce.tsx`
> If any of those changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch, treat
> it as a STOP condition.

## Status

- **Priority**: P1 (explicitly requested by the maintainer)
- **Effort**: M (rewrites 1 file, edits 1)
- **Risk**: LOW — keeps the existing renderer; changes cadence + component stability, not output
- **Depends on**: none
- **Category**: perf / correctness
- **Planned at**: commit `f464c9c`, 2026-07-21
- **Supersedes**: plan 001 (the HTML-preview approach was set aside — the
  maintainer chose to keep the `@react-pdf`/pdf.js renderer because it already
  produces production-grade paginated pages, equal margins, and page navigation).

## Why this matters

Typing a single character in the resume editor currently regenerates the entire
PDF and the preview pane **blanks and flashes ("splash")** on every keystroke.
The maintainer wants the preview to stay live **and** keep production-grade
pagination — equal margins on every page, correct page-wrap, and the ability to
click page 1 / 2 / 3.

The good news: `@react-pdf` + `react-pdf` (pdf.js) **already** deliver perfect
A4 pagination, per-page margins, page-wrap, and `pdf-renderer.tsx` already tracks
`numPages`/`currentPage` with prev/next controls. The renderer's *only* real
problem is the flash, and the flash has three concrete, fixable causes:

1. The preview is wrapped in a component (`PdfPreview`) **defined inside render**,
   so React tears it down and remounts the whole viewer on every keystroke —
   wiping the `previousRenderValue` state that exists specifically to keep the
   old page visible during a swap. The built-in double-buffer therefore never
   works.
2. There is **no debounce**, so a full `pdf().toBlob()` runs on every keystroke.
3. Every render **leaks a blob URL** (`URL.createObjectURL` with no revoke).

This plan fixes all three: make the viewer a stable instance, debounce
regeneration to fire only after the user pauses typing, let the double-buffer do
its job (old page stays fully visible until the new page finishes rendering — no
blank), and revoke blob URLs safely. It also upgrades page navigation to direct
page-number buttons (click "1", "2", …). Result: during typing there is **no
flash**; the preview refreshes seamlessly ~0.4s after you pause, with pagination
and margins unchanged.

## Current state

### `src/features/resume/components/pdf-renderer.tsx` (full file today — you will rewrite it)

```tsx
'use client';

import { pdf } from '@react-pdf/renderer';
import { useEffect, useState, use } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { TResumeEditFormValues } from '../utils/form-schema';
import { getTemplate } from '../templates/registry';
import { Icons } from '@/components/icons';
import { useAsync } from 'react-use';
import { Button } from '@/components/ui/button';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

type TPdfRendererProps = {
  formData: TResumeEditFormValues;
  templateId: string;
};

const PdfRenderer = ({ formData, templateId }: TPdfRendererProps) => {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [previousRenderValue, setPreviousRenderValue] = useState<string | null>(null);

  const template = getTemplate(templateId);
  const Template = template?.component;

  const render = useAsync(async () => {
    if (!formData) return null;
    const blob = await pdf(<Template formData={formData} />).toBlob();
    const url = URL.createObjectURL(blob);
    return url;
  }, [formData]);

  console.log('render=>>>>', render.value);
  // ...onPreviousPage / onNextPage / onDocumentLoad ...
  // Document double-buffer (previousRenderValue) + Page nav + Download link
};
export default PdfRenderer;
```

Key facts:
- `useAsync(..., [formData])` — `formData` is `form.watch()` from the parent, a
  **new object every render**, so this refires constantly.
- `console.log('render=>>>>', ...)` runs on every render (hot path).
- The blob URL from `URL.createObjectURL` is **never revoked**.
- The double-buffer markup (`previousRenderValue`, `shouldShowPreviousDocument`)
  is already present and correct in shape — it just can't work while the
  component keeps remounting.

### `src/features/resume/components/resume-edit-content.tsx` (the flash-causing parts)

Lines 56–57 (hot-path logging to remove):

```tsx
  console.log('resume data', resume);
  console.log('intialdata', initalData);
```

Lines 99–106 (**the inline component that must be removed** — defining a
component inside render forces the remount):

```tsx
  // Extract PDF preview component
  const PdfPreview = () => (
    <div className='relative flex h-full justify-center bg-accent pt-2'>
      <div className='scale-90'>
        <PdfRenderer formData={formData} templateId={selectedTemplate} />
      </div>
    </div>
  );
```

Lines 133–139 (where `PdfPreview` is used in the desktop split view):

```tsx
          <ResizablePanel defaultSize={55} minSize={45}>
            <div className='h-full w-full'>
              <ScrollArea className='h-[calc(100vh)]'>
                <PdfPreview />
              </ScrollArea>
            </div>
          </ResizablePanel>
```

Note: `renderContent()` (lines 74–97) already renders `<PdfRenderer>` **directly**
via the imported (stable) component — that path is fine and needs no change.
Only the locally-defined `PdfPreview` is the problem.

### The debounce hook you will use — `src/hooks/use-debounce.tsx` (exists, currently unused)

```tsx
'use client';
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
```

### Conventions

- `Button` (`src/components/ui/button.tsx`) supports `variant`:
  `default | outline | secondary | ghost | link | destructive`, and `size`:
  `default | sm | lg | icon | xs`. `xs` is `h-4 w-4` (icon only — used for the
  chevrons); use `sm` for page-number buttons so the digit is legible.
- `Icons.chevronLeft` / `Icons.chevronRight` exist (already used in this file).

## Commands you will need

| Purpose   | Command                  | Expected on success           |
|-----------|--------------------------|-------------------------------|
| Install   | `pnpm install`           | exit 0 (node_modules built)   |
| Typecheck | `pnpm exec tsc --noEmit` | exit 0, no errors             |
| Lint      | `pnpm lint`              | exit 0, no **new** errors     |
| Dev (manual) | `pnpm dev`            | app on http://localhost:3000  |

Notes: `node_modules` is not installed on a fresh checkout — run `pnpm install`
first. There is no `typecheck` script — use `pnpm exec tsc --noEmit`. `pnpm dev`
needs env vars (see `env.example.txt`); if you don't have them, rely on
typecheck + lint + grep done-criteria and say so in your report.

## Scope

**In scope**:
- `src/features/resume/components/pdf-renderer.tsx` (rewrite — content below)
- `src/features/resume/components/resume-edit-content.tsx` (small edits only)

**Out of scope** (do NOT touch):
- `src/features/resume/templates/templateOne.tsx` … `templateFour.tsx` — the PDF
  designs; the output must stay identical. (Per-page margin equality is governed
  by each template's `<Page>` padding; `templateTwo`/`templateFour` put padding
  on `<Page>` (correct), `templateOne` puts it on inner columns — improving
  templateOne's per-page margins is a separate template task, not this plan.)
- `src/hooks/use-debounce.tsx` — use it as-is; don't modify it.
- `src/features/resume/components/edit-resume-form.tsx` — the save/snapshot flow
  reads `#resume-pdf-preview`; the rewrite keeps that id, so leave this file alone.
- Any other file. If plan 001's files (`templates/html/*`,
  `live-resume-preview.tsx`, `resume-download-button.tsx`) exist from an earlier
  run, do NOT wire them in — plan 001 is superseded. Leave them or delete them
  only if the operator asks; either way they are out of scope here.

## Git workflow

- Branch: `advisor/002-fix-pdf-preview-flash`.
- Conventional Commits (repo style). Example: `fix: live pdf preview without keystroke flash`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Rewrite `pdf-renderer.tsx`

Replace the **entire** contents of
`src/features/resume/components/pdf-renderer.tsx` with:

```tsx
'use client';

import { pdf } from '@react-pdf/renderer';
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { TResumeEditFormValues } from '../utils/form-schema';
import { getTemplate } from '../templates/registry';
import { Icons } from '@/components/icons';
import { useAsync } from 'react-use';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

type TPdfRendererProps = {
  formData: TResumeEditFormValues;
  templateId: string;
};

const PdfRenderer = ({ formData, templateId }: TPdfRendererProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [previousRenderValue, setPreviousRenderValue] = useState<string | null>(
    null
  );

  const template = getTemplate(templateId);
  const Template = template?.component;

  // Debounce a SERIALIZED snapshot: regenerate the PDF only after the user
  // pauses typing (~400ms), and never when identical values re-render. This is
  // the change that removes the per-keystroke flash.
  const serialized = JSON.stringify(formData);
  const debouncedSerialized = useDebounce(serialized, 400);

  const render = useAsync(async () => {
    if (!debouncedSerialized || !Template) return null;
    const data = JSON.parse(debouncedSerialized) as TResumeEditFormValues;
    const blob = await pdf(<Template formData={data} />).toBlob();
    return URL.createObjectURL(blob);
  }, [debouncedSerialized, templateId]);

  // Revoke blob URLs safely: only revoke a URL once it is neither the current
  // render value NOR the previous (double-buffered) one — otherwise we'd revoke
  // a URL a mounted <Document> still needs. Also revoke everything on unmount.
  const activeUrls = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (render.value) activeUrls.current.add(render.value);
    for (const url of Array.from(activeUrls.current)) {
      if (url !== render.value && url !== previousRenderValue) {
        URL.revokeObjectURL(url);
        activeUrls.current.delete(url);
      }
    }
  }, [render.value, previousRenderValue]);
  useEffect(() => {
    const urls = activeUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const onDocumentLoad = (d: { numPages: number }) => {
    setNumPages(d.numPages);
    setCurrentPage((prev) => Math.min(prev, d.numPages));
  };

  const isFirstRendering = !previousRenderValue;
  const isLatestValueRendered = previousRenderValue === render.value;
  const isBusy = render.loading || !isLatestValueRendered;

  const shouldShowTextLoader = isFirstRendering && isBusy;
  const shouldShowPreviousDocument = !isFirstRendering && isBusy;

  const goToPage = (page: number) => {
    if (!numPages) return;
    setCurrentPage(Math.min(Math.max(1, page), numPages));
  };

  return (
    <div className='relative flex h-full flex-1 flex-col'>
      {/* Previous already-rendered page stays visible underneath while the new
          one renders on top — this is what removes the blank flash. */}
      {shouldShowPreviousDocument && previousRenderValue ? (
        <Document key={previousRenderValue} file={previousRenderValue} loading={null}>
          <Page key={currentPage} pageNumber={currentPage} />
        </Document>
      ) : null}

      <div id='resume-pdf-preview'>
        <Document
          key={render.value}
          className={shouldShowPreviousDocument ? 'absolute inset-0' : undefined}
          file={render.value}
          loading={null}
          onLoadSuccess={onDocumentLoad}
        >
          <Page
            key={currentPage}
            pageNumber={currentPage}
            onRenderSuccess={() => setPreviousRenderValue(render.value ?? null)}
          />
        </Document>
      </div>

      {shouldShowTextLoader && (
        <p className='py-8 text-center text-sm text-muted-foreground'>
          Rendering preview…
        </p>
      )}

      {/* Page navigation: prev, direct page-number buttons, next, download */}
      <div className='my-4'>
        {numPages && numPages > 0 && (
          <div className='flex items-center justify-between gap-2'>
            <div className='flex flex-wrap items-center gap-1'>
              <Button
                size='xs'
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className='disabled:opacity-50'
              >
                <Icons.chevronLeft className='h-4 w-4' />
              </Button>

              {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  size='sm'
                  variant={page === currentPage ? 'default' : 'outline'}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </Button>
              ))}

              <Button
                size='xs'
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= numPages}
                className='disabled:opacity-50'
              >
                <Icons.chevronRight className='h-4 w-4' />
              </Button>
            </div>

            {render.value && (
              <Button asChild>
                <a
                  href={render.value}
                  download={`next-resume-${Date.now()}.pdf`}
                  className='text-primary'
                >
                  Download PDF
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfRenderer;
```

Why this removes the flash:
- **Debounce + serialized dep**: the expensive `pdf().toBlob()` runs only after
  the user stops typing for ~400ms, and only when values actually changed — no
  per-keystroke regeneration.
- **Double-buffer works now** (once Step 2 stops the remount): while the new PDF
  renders, the previously-rendered page stays fully visible; when the new page's
  `onRenderSuccess` fires, `previousRenderValue` advances and the swap completes
  with no blank frame.
- **Safe revoke**: a blob URL is revoked only when it is no longer referenced by
  either `<Document>`, plus a full cleanup on unmount — no leak, no premature
  revoke.
- **Native pagination preserved**: `numPages`, `currentPage`, page-wrap, and
  per-page margins are all still handled by `@react-pdf`/pdf.js exactly as before.

**Verify**: `pnpm exec tsc --noEmit` → exit 0 (may still show issues from
`resume-edit-content.tsx` until Step 2 — re-run after Step 2).

### Step 2: Make the preview a stable instance in `resume-edit-content.tsx`

Edit **only** `src/features/resume/components/resume-edit-content.tsx`:

1. **Delete** the two hot-path logs (currently lines 56–57):
   `console.log('resume data', resume);` and `console.log('intialdata', initalData);`.

2. **Delete** the entire inline `PdfPreview` component definition (currently lines
   99–106 — the `const PdfPreview = () => ( … );` block, including the
   `// Extract PDF preview component` comment above it).

3. In the desktop split view (currently lines 133–139), replace `<PdfPreview />`
   with the same wrapper markup rendering the imported `PdfRenderer` **directly**
   (so it is a stable component instance that never remounts on keystroke):

   ```tsx
           <ResizablePanel defaultSize={45} minSize={45}>
             <div className='h-full w-full'>
               <ScrollArea className='h-[calc(100vh)]'>
                 <div className='relative flex h-full justify-center bg-accent pt-2'>
                   <div className='origin-top scale-90'>
                     <PdfRenderer
                       formData={formData}
                       templateId={selectedTemplate}
                     />
                   </div>
                 </div>
               </ScrollArea>
             </div>
           </ResizablePanel>
   ```

   (Keep `defaultSize`/`minSize` as they are in the file; the block above shows
   the structure — do not change unrelated props.)

Leave the `PdfRenderer` import (line 11) in place, and leave `renderContent()`
and everything else unchanged.

**Verify**:
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0, no new errors
- `grep -n "PdfPreview" src/features/resume/components/resume-edit-content.tsx` → **no matches**
- `grep -n "console.log" src/features/resume/components/resume-edit-content.tsx` → **no matches**
- `grep -n "console.log" src/features/resume/components/pdf-renderer.tsx` → **no matches**

### Step 3: Manual verification (only if you have a runnable env)

With env vars + a working `DATABASE_URL`:

1. `pnpm dev`, sign in, open an existing resume's edit page (or the split editor).
2. Type several characters quickly in a field (e.g. First name).
   - **Expect**: the preview does **not** blank or flash while you type. It
     stays showing the current page. ~0.4s after you stop, it updates in place.
3. Create enough content to span 2+ pages; confirm the page-number buttons (1, 2,
   …) appear and clicking a number switches the visible page, with equal margins
   on each page.
4. Click **Download PDF** — the downloaded file matches the preview.
5. Click **Sync & Save** — no error toast; the resume list thumbnail updates.

If you cannot run the app, state so and rely on the automated gates.

## Test plan

This repo has **no test runner** and this plan must not add one (that is separate,
already-identified work). Verification is: `pnpm exec tsc --noEmit` + `pnpm lint`
green, the grep assertions in the Done criteria, and the Step 3 manual check when
an env is available. Do not add test dependencies or `package.json` scripts.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm lint` exits 0 with no new errors
- [ ] `grep -rn "PdfPreview" src/features/resume/components/resume-edit-content.tsx` → no matches
- [ ] `grep -rn "console.log" src/features/resume/components/resume-edit-content.tsx` → no matches
- [ ] `grep -rn "console.log" src/features/resume/components/pdf-renderer.tsx` → no matches
- [ ] `grep -n "useDebounce" src/features/resume/components/pdf-renderer.tsx` → matches (debounce is wired in)
- [ ] `grep -n "revokeObjectURL" src/features/resume/components/pdf-renderer.tsx` → matches (blob cleanup present)
- [ ] `git status` shows only `pdf-renderer.tsx` and `resume-edit-content.tsx` modified (no other source files)
- [ ] `plans/README.md` status row for plan 002 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The "Current state" excerpts don't match the live code (drift since `f464c9c`).
- After Step 2, typing still blanks/flashes the preview → the component is still
  remounting; verify there is no other place defining a component inside render
  and that `PdfRenderer` is rendered as an imported component. If it still
  flashes, report — do not start rewriting to the HTML approach (that was
  deliberately not chosen).
- `pnpm exec tsc` errors about `useAsync` value types or `react-pdf` `Document`
  props that you cannot resolve without touching out-of-scope files.
- The download link or the Sync & Save thumbnail breaks → confirm the
  `id="resume-pdf-preview"` div is still present in the rewritten renderer; if it
  is and save still fails, stop and report.

## Maintenance notes

- **Debounce delay** is 400ms — if the preview feels too laggy or too busy,
  adjust the single `useDebounce(serialized, 400)` call; it is the one knob.
- **Double-buffer** relies on `PdfRenderer` staying mounted. If a future change
  re-introduces a component defined inside render (or a changing `key`) around
  the preview, the flash will come back — watch for that in review.
- **Per-page margins**: governed by each template's `<Page>` padding, not this
  renderer. `templateOne` applies padding to inner columns rather than the
  `<Page>`, so its 2nd+ page margins can differ — fixing that is a template task
  tracked separately (see the templates-duplication finding in the audit).
- **Serialized dep**: regeneration keys off `JSON.stringify(formData)`; this is
  cheap next to PDF generation but if `formData` ever grows huge, revisit.
- **Reviewer should scrutinize**: that the exported PDF is byte-identical to
  before (templates untouched), that no blob URL is revoked while still displayed,
  and that only the two in-scope files changed.
