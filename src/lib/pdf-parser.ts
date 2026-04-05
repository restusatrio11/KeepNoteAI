import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js for Node environment (No canvas needed for text extraction)
// In some environments, we might need to point to the worker, but for text extraction
// on the server, we can often run it synchronously or without a separate worker process.

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
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error in extractTextFromPDF:', error);
    throw new Error('Gagal mengekstrak teks dari PDF.');
  }
}
