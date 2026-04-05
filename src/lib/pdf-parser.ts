// Basic polyfills for PDF.js to work in Node environment during build/runtime
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}
if (typeof (global as any).ImageData === 'undefined') {
  (global as any).ImageData = class {};
}
if (typeof (global as any).Path2D === 'undefined') {
  (global as any).Path2D = class {};
}

// Importing the legacy build as recommended for Node.js environments
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Ekstraksi teks dari PDF menggunakan pdfjs-dist
 * Tanpa memerlukan modul canvas (murni ekstraksi teks)
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (item as any).str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error in extractTextFromPDF:', error);
    throw new Error('Gagal mengekstrak teks dari PDF.');
  }
}
