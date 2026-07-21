# Plan 015: Eliminate PDF preview flash — ping-pong double-buffer + fixed sizing

## Status
- **Priority**: P1 (user-reported regression) — **Effort**: M — **Risk**: MED (rewrites the renderer)
- **Depends on**: 002 (supersedes its double-buffer) — **Category**: perf/correctness
- **Planned at**: integration branch `improve/product-upgrades` (post-014)

## Why this matters

Plan 002's preview still shows a white flash/flicker while typing (confirmed at
runtime). Root cause: it's the canonical react-pdf double-buffer, but (a) `<Page>`
has **no fixed width/height** and the container has **no min-height**, so during a
swap the box collapses toward zero and the white background flashes through; and
(b) `key={render.value}` **remounts** the `<Document>` every change and the
"previous" layer only mounts *while busy*, so neither layer keeps a painted canvas.

This rewrite makes it a **true ping-pong buffer**: two persistent `<Document>`
slots (never remounted). A new PDF loads into the **hidden** slot while the visible
slot keeps its painted canvas; when the hidden slot finishes rendering, we crossfade
to it. The box is fixed to A4 dimensions so it never collapses. Text/annotation
layers are disabled for the on-screen preview (faster, no layer flicker); the
downloaded PDF is unaffected.

**Note:** this does NOT make the preview instant — it still updates ~0.3–0.4s after
you pause typing (regenerate + parse latency is inherent to react-pdf). It removes
the *flash*. If truly-instant is required, that's the separate HTML-preview route.

## IMPORTANT — base on integration branch
`git checkout -b advisor-015 improve/product-upgrades`, then `pnpm install`
(build-gate workaround allowed). Commit on `advisor-015`.

## Commands
`pnpm install` → 0 · `pnpm exec tsc --noEmit` → 0 · `pnpm lint` → 0 · `pnpm typecheck` → 0

## Scope
IN — REPLACE the entire file `src/features/resume/components/pdf-renderer.tsx`.
OUT — everything else. Do not touch `resume-edit-content.tsx`, the templates, or any
other file. The `id="resume-pdf-preview"` MUST remain (the save-snapshot depends on it).

## Git workflow
Commit on `advisor-015`, e.g. `fix: seamless pdf preview via ping-pong double buffer`. Do NOT push.

## Step 1 — replace the ENTIRE contents of `src/features/resume/components/pdf-renderer.tsx` with:

```tsx
'use client';

import { pdf } from '@react-pdf/renderer';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
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

const PAGE_WIDTH = 640;
const PAGE_HEIGHT = Math.round(PAGE_WIDTH * (297 / 210)); // A4 aspect ratio

type TPdfRendererProps = {
  formData: TResumeEditFormValues;
  templateId: string;
};

type PdfBufferProps = {
  url: string | null;
  pageNumber: number;
  onLoadSuccess?: (d: { numPages: number }) => void;
  onRenderSuccess?: () => void;
};

// One persistent PDF buffer. Memoised so pdf.js only re-rasters when its `url` or
// `pageNumber` actually change — not on every parent keystroke re-render. Text and
// annotation layers are off: a preview needs neither, and skipping them removes a
// class of flicker and speeds rendering. The downloaded blob is unaffected.
const PdfBuffer = memo(function PdfBuffer({
  url,
  pageNumber,
  onLoadSuccess,
  onRenderSuccess
}: PdfBufferProps) {
  if (!url) return null;
  return (
    <Document
      file={url}
      loading={null}
      noData={null}
      error={null}
      onLoadSuccess={onLoadSuccess}
    >
      <Page
        pageNumber={pageNumber}
        width={PAGE_WIDTH}
        loading={null}
        noData={null}
        error={null}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onRenderSuccess={onRenderSuccess}
      />
    </Document>
  );
});

type Slot = 'a' | 'b';

const PdfRenderer = ({ formData, templateId }: TPdfRendererProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Ping-pong double buffer: two persistent slots. A new PDF is loaded into the
  // HIDDEN slot; the visible slot keeps its painted canvas, so nothing ever blanks.
  // When the hidden slot finishes rendering we crossfade to it. No <Document> is
  // ever remounted mid-edit.
  const [urls, setUrls] = useState<{ a: string | null; b: string | null }>({
    a: null,
    b: null
  });
  const [front, setFront] = useState<Slot>('a');
  const pendingRef = useRef<Slot | null>(null);
  const [hasRendered, setHasRendered] = useState(false);

  const template = getTemplate(templateId);
  const Template = template?.component;

  const serialized = JSON.stringify(formData);
  const debouncedSerialized = useDebounce(serialized, 400);

  const render = useAsync(async () => {
    if (!debouncedSerialized || !Template) return null;
    const data = JSON.parse(debouncedSerialized) as TResumeEditFormValues;
    const blob = await pdf(<Template formData={data} />).toBlob();
    return URL.createObjectURL(blob);
  }, [debouncedSerialized, templateId]);

  // Route each freshly-produced blob URL into the hidden (back) slot.
  const loadedRef = useRef<string | null>(null);
  useEffect(() => {
    const url = render.value;
    if (!url || url === loadedRef.current) return;
    loadedRef.current = url;
    const back: Slot = front === 'a' ? 'b' : 'a';
    pendingRef.current = back;
    setUrls((prev) => {
      const replaced = prev[back];
      const next = { ...prev, [back]: url };
      if (replaced && replaced !== next[front]) {
        URL.revokeObjectURL(replaced);
      }
      return next;
    });
  }, [render.value, front]);

  useEffect(() => {
    const snapshot = urls;
    return () => {
      [snapshot.a, snapshot.b].forEach((u) => u && URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const promote = useCallback((slot: Slot) => {
    if (pendingRef.current === slot) {
      pendingRef.current = null;
      setHasRendered(true);
      setFront(slot);
    }
  }, []);

  const onRenderA = useCallback(() => promote('a'), [promote]);
  const onRenderB = useCallback(() => promote('b'), [promote]);

  const onLoad = useCallback((d: { numPages: number }) => {
    setNumPages(d.numPages);
    setCurrentPage((p) => Math.min(p, d.numPages));
  }, []);

  const goToPage = (page: number) => {
    if (!numPages) return;
    setCurrentPage(Math.min(Math.max(1, page), numPages));
  };

  const showLoader = !hasRendered;

  return (
    <div className='relative flex flex-col items-center'>
      <div
        id='resume-pdf-preview'
        className='relative overflow-hidden bg-white shadow'
        style={{ width: PAGE_WIDTH, minHeight: PAGE_HEIGHT }}
      >
        <div
          className='absolute inset-0 transition-opacity duration-150'
          style={{ opacity: front === 'a' ? 1 : 0 }}
        >
          <PdfBuffer
            url={urls.a}
            pageNumber={currentPage}
            onLoadSuccess={onLoad}
            onRenderSuccess={onRenderA}
          />
        </div>
        <div
          className='absolute inset-0 transition-opacity duration-150'
          style={{ opacity: front === 'b' ? 1 : 0 }}
        >
          <PdfBuffer
            url={urls.b}
            pageNumber={currentPage}
            onLoadSuccess={onLoad}
            onRenderSuccess={onRenderB}
          />
        </div>

        {showLoader && (
          <div className='absolute inset-0 flex items-center justify-center text-sm text-muted-foreground'>
            Rendering preview…
          </div>
        )}
      </div>

      <div className='my-4' style={{ width: PAGE_WIDTH }}>
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

            {urls[front] && (
              <Button asChild>
                <a
                  href={urls[front] ?? undefined}
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

## Done criteria (ALL)
- [ ] `pnpm exec tsc --noEmit` → 0
- [ ] `pnpm lint` → 0
- [ ] `pnpm typecheck` → 0
- [ ] `grep -c "id='resume-pdf-preview'\|id=\"resume-pdf-preview\"" src/features/resume/components/pdf-renderer.tsx` → 1 (snapshot id preserved)
- [ ] `grep -c "renderTextLayer={false}" src/features/resume/components/pdf-renderer.tsx` → 1
- [ ] `grep -c "PdfBuffer" src/features/resume/components/pdf-renderer.tsx` → ≥3 (definition + 2 slots)
- [ ] `git status` shows only `pdf-renderer.tsx` modified

## STOP conditions
- The `react-pdf` `Page` component rejects the `renderTextLayer` / `renderAnnotationLayer`
  / `error` / `noData` props at typecheck (version mismatch) → STOP and report the exact
  prop type error (do not delete the prop silently — report so the reviewer decides).
- `memo`/`useCallback` import from `react` fails typecheck → STOP and report.

## Maintenance notes
- **Not runtime-tested by the author** — the reviewer/maintainer must run `pnpm dev`
  and confirm typing no longer flashes. If a flash remains, the fallback is the HTML
  live-preview architecture (instant, zero-flash, but the editor preview is not
  page-accurate).
- `PAGE_WIDTH` (640) is the only sizing knob; the container height follows A4.
- Debounce is 400ms; lower it toward 250ms for a more live feel at higher CPU cost.
- **Known limitation**: page-navigation clicks (page 1↔2) change `currentPage` on the
  visible buffer and may briefly flash on that click (a deliberate user action, not
  typing). Buffering page changes too is a follow-up if it bothers.
- Text/annotation layers are off for the preview only; the Download blob still
  contains selectable text.
