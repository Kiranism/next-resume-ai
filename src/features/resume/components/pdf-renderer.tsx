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

  const serialized = JSON.stringify(formData);
  const debouncedSerialized = useDebounce(serialized, 400);

  const render = useAsync(async () => {
    if (!debouncedSerialized || !Template) return null;
    const data = JSON.parse(debouncedSerialized) as TResumeEditFormValues;
    const blob = await pdf(<Template formData={data} />).toBlob();
    return URL.createObjectURL(blob);
  }, [debouncedSerialized, templateId]);

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
      {shouldShowPreviousDocument && previousRenderValue ? (
        <Document
          key={previousRenderValue}
          file={previousRenderValue}
          loading={null}
        >
          <Page key={currentPage} pageNumber={currentPage} />
        </Document>
      ) : null}

      <div id='resume-pdf-preview'>
        <Document
          key={render.value}
          className={
            shouldShowPreviousDocument ? 'absolute inset-0' : undefined
          }
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
