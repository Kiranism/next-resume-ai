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
  return pages
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}
