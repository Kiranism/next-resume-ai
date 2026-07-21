# Plan 018: Import a profile from an uploaded PDF resume

## Status
- **Priority**: P1 (requested) — **Effort**: M — **Risk**: LOW
- **Depends on**: 014 (the `importProfile` text→profile pipeline, already integrated) — **Category**: feature
- **Planned at**: integration branch `improve/product-upgrades` (post-017)

## Why this matters

Plan 014 shipped **paste-text** import (paste resume text → AI parses it into a
profile). Users would rather **upload their existing resume PDF**. This adds
client-side PDF text extraction (using the already-installed `pdfjs-dist`, which
`react-pdf` re-exports) and feeds the extracted text into the **existing**
`importProfile` flow — so there are **no server changes and no new dependencies**.
The user picks a PDF → its text fills the import box → they review → "Parse &
Import" creates the profile (exactly as the paste path already does).

## Investigation notes (facts this plan relies on)

- `react-pdf` exports `pdfjs` (`import { pdfjs } from 'react-pdf'`), which is the
  `pdfjs-dist` module — it has `getDocument`. Verified in
  `node_modules/react-pdf/dist/esm/index.js`.
- The pdf.js worker source `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`
  is already used and working in `src/features/resume/components/pdf-renderer.tsx:15`.
- The import dialog + hook already exist (plan 014): `useImportProfile(text)` →
  `client.profile.importProfile.$post({ text })` → server parses + inserts.
- DOCX is intentionally **out of scope** (needs a new dep like `mammoth`); this
  plan is PDF-only, matching the request.

## Commands
- `pnpm install` → 0 (build-gate workaround allowed, uncommitted)
- `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN — CREATE: `src/features/profile/utils/extract-pdf-text.ts`.
IN — EDIT: `src/features/profile/components/import-profile-dialog.tsx`.
OUT: the server (`importProfile` is reused unchanged), the AI service, schema,
package.json (no new deps).

## Git workflow
`git checkout -b advisor-018 improve/product-upgrades`, then `pnpm install`.
Commit on `advisor-018`: `feat(profile): import a profile from an uploaded PDF`. Do NOT push.

## Step 1 — create `src/features/profile/utils/extract-pdf-text.ts`

```tsx
import { pdfjs } from 'react-pdf';

// Configure the pdf.js worker (same source the resume preview uses). Setting it
// here makes extraction work on the profile page even if the preview never
// mounted; re-setting the same value is harmless.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Extract the text layer from a PDF file, in the browser. Returns '' for
 * image-only / scanned PDFs that have no selectable text.
 */
export async function extractPdfText(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => {
        const str = (item as { str?: string }).str;
        return typeof str === 'string' ? str : '';
      })
      .join(' ');
    pages.push(text);
  }

  await pdf.destroy();
  return pages.join('\n').replace(/[ \t]+/g, ' ').trim();
}
```

**Verify**: `pnpm exec tsc --noEmit` → 0.

## Step 2 — edit `src/features/profile/components/import-profile-dialog.tsx`

Replace the ENTIRE file with (adds a "Upload PDF" button that extracts text into
the existing box; the paste path is preserved):

```tsx
'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useImportProfile } from '../api';
import { extractPdfText } from '../utils/extract-pdf-text';

export function ImportProfileDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: importProfile, isPending } = useImportProfile();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    setIsReading(true);
    try {
      const extracted = await extractPdfText(file);
      if (extracted.length < 30) {
        toast.error(
          "Couldn't read text from this PDF (is it a scan/image?). Try pasting the text instead."
        );
        return;
      }
      setText(extracted);
      toast.success('Extracted — review below, then Parse & Import');
    } catch {
      toast.error('Could not read this PDF');
    } finally {
      setIsReading(false);
    }
  };

  const handleImport = async () => {
    if (!text.trim()) return;
    try {
      const result = await importProfile(text);
      if (result && !('error' in result)) {
        toast.success('Profile imported — review and edit it below');
        setText('');
        setOpen(false);
      } else {
        toast.error('Could not import profile');
      }
    } catch {
      toast.error('Could not import profile');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline'>Import resume</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Import a profile</DialogTitle>
        </DialogHeader>
        <p className='text-sm text-muted-foreground'>
          Upload your resume PDF (or paste its text). We&apos;ll parse it into a
          profile you can review and edit.
        </p>

        <input
          ref={fileInputRef}
          type='file'
          accept='application/pdf,.pdf'
          className='hidden'
          onChange={handleFile}
        />
        <Button
          type='button'
          variant='outline'
          disabled={isReading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isReading ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <Upload className='mr-2 h-4 w-4' />
          )}
          {isReading ? 'Reading PDF…' : 'Upload PDF'}
        </Button>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='…or paste your resume text here'
          className='min-h-[200px]'
        />
        <DialogFooter>
          <Button onClick={handleImport} disabled={isPending || !text.trim()}>
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isPending ? 'Parsing…' : 'Parse & Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Verify**: `pnpm exec tsc --noEmit` → 0; `pnpm lint` → 0.

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `src/features/profile/utils/extract-pdf-text.ts` exists and exports `extractPdfText`
- [ ] `grep -n "extractPdfText" src/features/profile/components/import-profile-dialog.tsx` → 1
- [ ] `grep -n "Upload PDF" src/features/profile/components/import-profile-dialog.tsx` → 1
- [ ] `git status` shows only the 2 in-scope files (1 new, 1 modified)

## STOP conditions
- `import { pdfjs } from 'react-pdf'` doesn't typecheck / `pdfjs.getDocument` is
  not a function → STOP and report (the react-pdf version differs); do not add a
  direct `pdfjs-dist` dependency without reporting.
- The `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` line fails
  to typecheck/build → STOP; it mirrors `pdf-renderer.tsx:15` exactly, so a failure
  means the environment changed.

## Test plan / verification
- No test runner in this repo. Verify via `tsc` + `lint`, then the maintainer runs
  `pnpm dev`, opens the Profiles page → **Import resume** → **Upload PDF**, picks a
  real resume PDF, confirms the text fills the box, then **Parse & Import** creates
  a profile that appears in the list (editable via the existing edit modal).
- **Author cannot runtime-test** (browser pdf.js + real PDFs) — the maintainer
  confirms extraction quality.

## Maintenance notes
- Extraction is **client-side** (pdf.js text layer). Quality depends on the PDF: a
  well-formed text PDF extracts cleanly; **scanned/image PDFs have no text layer**
  and are rejected with a helpful toast (no OCR).
- **DOCX** is a follow-up: add `mammoth` and an analogous `extractDocxText`, route
  by file type. Or switch to Gemini multimodal (send the file itself) for the best
  parse quality — a larger change to the AI service.
- Reuses `importProfile` unchanged, so any change to the parse prompt/coercion in
  `src/server/services/parse-profile.ts` applies to PDF import automatically.
