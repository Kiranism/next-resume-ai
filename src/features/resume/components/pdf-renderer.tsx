'use client';

import { pdf } from '@react-pdf/renderer';
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { IconDownload, IconExternalLink } from '@tabler/icons-react';
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
const FIT_PADDING = 24; // breathing room around the fitted page

type TPdfRendererProps = {
  formData: TResumeEditFormValues;
  templateId: string;
  // Optional page-level actions rendered on the right of the toolbar.
  actions?: ReactNode;
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

const PdfRenderer = ({ formData, templateId, actions }: TPdfRendererProps) => {
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

  // Fit the fixed-size page into the available area so a full page is visible
  // without scrolling (capped at 1× to stay crisp).
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

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

  // Track the available preview area and recompute the fit scale.
  useEffect(() => {
    const el = previewAreaRef.current;
    if (!el) return;
    const update = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (cw > 0 && ch > 0) {
        setFitScale(
          Math.min(
            (cw - FIT_PADDING) / PAGE_WIDTH,
            (ch - FIT_PADDING) / PAGE_HEIGHT,
            1
          )
        );
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
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
    <div className='flex h-full w-full flex-col'>
      {/* Toolbar: page controls on the left, actions + download on the right */}
      <div className='flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2'>
        <div className='flex items-center gap-1'>
          {numPages && numPages > 0 ? (
            <>
              <Button
                size='xs'
                variant='outline'
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <Icons.chevronLeft className='h-4 w-4' />
              </Button>
              <span className='text-muted-foreground min-w-16 text-center text-xs tabular-nums'>
                Page {currentPage} / {numPages}
              </span>
              <Button
                size='xs'
                variant='outline'
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= numPages}
              >
                <Icons.chevronRight className='h-4 w-4' />
              </Button>
            </>
          ) : (
            <span className='text-muted-foreground text-xs'>Preview</span>
          )}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {actions}
          {urls[front] && (
            <Button
              size='sm'
              variant='outline'
              nativeButton={false}
              render={
                <a
                  href={urls[front] ?? undefined}
                  target='_blank'
                  rel='noopener noreferrer'
                />
              }
            >
              <IconExternalLink className='mr-1 h-4 w-4' /> Open
            </Button>
          )}
          {urls[front] && (
            <Button
              size='sm'
              variant='outline'
              nativeButton={false}
              render={
                <a
                  href={urls[front] ?? undefined}
                  download={`next-resume-${Date.now()}.pdf`}
                />
              }
            >
              <IconDownload className='mr-1 h-4 w-4' /> Download PDF
            </Button>
          )}
        </div>
      </div>

      {/* Preview area: a full page, scaled to fit without scrolling */}
      <div
        ref={previewAreaRef}
        className='bg-muted relative min-h-0 flex-1 overflow-hidden'
      >
        <div className='absolute inset-0 flex items-center justify-center'>
          <div
            style={{
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              transform: `scale(${fitScale})`,
              transformOrigin: 'center center'
            }}
          >
            <div
              id='resume-pdf-preview'
              className='relative overflow-hidden bg-white shadow'
              style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
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
                <div className='text-muted-foreground absolute inset-0 flex items-center justify-center text-sm'>
                  Rendering preview…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfRenderer;
