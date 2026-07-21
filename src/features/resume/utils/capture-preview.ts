import { generatePreviewImage } from './preview-generator';

// Snapshot the live PDF preview (#resume-pdf-preview) as a base64 data URL for
// the dashboard thumbnail. Returns null when the preview isn't mounted
// (e.g. chat/edit mode on mobile), so callers can skip rather than fail.
export async function capturePreviewBase64(): Promise<string | null> {
  const pdfElement = document.getElementById('resume-pdf-preview');
  if (!pdfElement) return null;

  const imageBlob = await generatePreviewImage(pdfElement);
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(imageBlob);
  });
}
