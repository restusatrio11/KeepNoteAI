import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ImageRun, ShadingType, HeightRule,
} from 'docx';
import fs from 'fs';
import path from 'path';

interface NotulenData {
  id: string;
  judul: string;
  tanggal: string;
  waktu: string;
  tempat: string;
  pemimpin: string;
  topik: string;
  notulis: string;
  peserta: string;
  konten: string;
  dokumentasiUrls?: string;
}

function formatDateIndo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    // Handle Google Drive URLs
    let fetchUrl = url;
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      fetchUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
}

function createInfoRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold: true, size: 20, font: 'Calibri' })]
        })],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: value || '-', size: 20, font: 'Calibri' })]
        })],
      }),
    ],
  });
}

export async function generateNotulenDocx(data: NotulenData): Promise<Buffer> {
  // Load BPS logo
  let logoBuffer: Buffer | null = null;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'Logo BPS Prov (3).png');
    if (fs.existsSync(logoPath)) {
      logoBuffer = fs.readFileSync(logoPath);
    }
  } catch {
    console.error('Logo not found');
  }

  const children: any[] = [];

  // ─── HEADER: Logo Only (Enlarged and Centered) ─────────────────────────────
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder(), insideHorizontal: noBorder(), insideVertical: noBorder() },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            children: [
              logoBuffer
                ? new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new ImageRun({ data: logoBuffer, transformation: { width: 450, height: 100 } } as any)],
                  })
                : new Paragraph({ children: [] }),
            ],
          }),
        ],
      }),
    ],
  });

  children.push(headerTable);

  // ─── Horizontal divider ────────────────────────────────────────────────────
  children.push(new Paragraph({
    border: { bottom: { color: '000000', style: BorderStyle.SINGLE, size: 8, space: 1 } },
    children: [],
    spacing: { before: 200, after: 200 },
  }));

  // ─── TITLE TABLE (Judul + Info Rows) ──────────────────────────────────────
  const titleTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    },
    rows: [
      // Title row spanning 2 cols
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            shading: { type: ShadingType.CLEAR, fill: 'FFFFFF' },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: data.judul.toUpperCase(), bold: true, size: 24, font: 'Calibri' })],
              spacing: { before: 120, after: 120 },
            })],
          }),
        ],
      }),
      createInfoRow('Hari/Tanggal', formatDateIndo(data.tanggal)),
      createInfoRow('Waktu', data.waktu || '-'),
      createInfoRow('Tempat', data.tempat || '-'),
      createInfoRow('Pemimpin Rapat', data.pemimpin || '-'),
      createInfoRow('Topik Pembahasan', data.topik || '-'),
      createInfoRow('Peserta Rapat', data.peserta || '-'),
      createInfoRow('Notulis', data.notulis || '-'),
    ],
  });

  children.push(titleTable);
  children.push(new Paragraph({ spacing: { before: 400, after: 200 } }));

  // ─── NOTULA KEGIATAN TITLE ─────────────────────────────────────────────────
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'NOTULA KEGIATAN', bold: true, size: 24, font: 'Calibri' })],
    spacing: { before: 300, after: 200 },
  }));

  // ─── MAIN CONTENT TABLE (The "One Big Box") ────────────────────────────────
  const contentInTable: Paragraph[] = [];
  
  try {
    const konten = JSON.parse(data.konten || '{}');

    // Pembahasan Text
    if (konten.pembahasan && Array.isArray(konten.pembahasan)) {
      konten.pembahasan.forEach((p: any, idx: number) => {
        contentInTable.push(new Paragraph({
          children: [new TextRun({ text: `${idx + 1}.  ${p.topik}`, bold: true, size: 22, font: 'Calibri' })],
          spacing: { before: 200, after: 100 },
        }));

        if (p.items && Array.isArray(p.items)) {
          p.items.forEach((item: any) => {
            contentInTable.push(new Paragraph({
              children: [new TextRun({ text: `\u2022 ${item.deskripsi}`, size: 20, font: 'Calibri' })],
              spacing: { after: 100 },
              indent: { left: 360 },
            }));

            if (item.solusi) {
              contentInTable.push(new Paragraph({
                children: [
                  new TextRun({ text: 'Solusi: ', bold: true, size: 20, font: 'Calibri' }),
                  new TextRun({ text: item.solusi, size: 20, font: 'Calibri' }),
                ],
                indent: { left: 720 },
                spacing: { after: 120 },
              }));
            }
          });
        }
      });
    }

    // Kesimpulan Text
    if (konten.kesimpulan) {
      contentInTable.push(new Paragraph({
        children: [new TextRun({ text: 'KESIMPULAN DAN TINDAK LANJUT:', bold: true, size: 22, font: 'Calibri' })],
        spacing: { before: 300, after: 150 },
      }));

      const lines = konten.kesimpulan.split('\n').filter((l: string) => l.trim().length > 0);
      lines.forEach((line: string) => {
        contentInTable.push(new Paragraph({
          children: [new TextRun({ text: `\u2022 ${line.trim()}`, size: 20, font: 'Calibri' })],
          spacing: { after: 100 },
          indent: { left: 360 },
        }));
      });
    }
  } catch (e) {
    console.error('Error parsing notulen content:', e);
  }

  // Create the "one big box" table
  const mainContentTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: contentInTable.length > 0 ? contentInTable : [new Paragraph({ children: [new TextRun({ text: 'No content available.', size: 20 })] })],
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
          }),
        ],
      }),
    ],
  });

  children.push(mainContentTable);

  // ─── DOKUMENTASI SECTION ───────────────────────────────────────────────────
  let dokumentasiImages: string[] = [];
  try {
    if (data.dokumentasiUrls) {
      dokumentasiImages = JSON.parse(data.dokumentasiUrls);
    }
  } catch {}

  if (dokumentasiImages.length > 0) {
    children.push(new Paragraph({ spacing: { before: 600 } }));
    children.push(new Paragraph({
      border: { top: { color: '000000', style: BorderStyle.SINGLE, size: 6, space: 1 } },
      children: [],
      spacing: { before: 200, after: 200 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: 'DOKUMENTASI KEGIATAN', bold: true, size: 24, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 300 },
    }));

    // Fetch images and embed them centered
    const imgBuffers: (Buffer | null)[] = await Promise.all(
      dokumentasiImages.map((url) => fetchImageBuffer(url))
    );

    const validImgs = imgBuffers.filter(Boolean) as Buffer[];
    
    for (const img of validImgs) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ 
          data: img, 
          transformation: { width: 450, height: 320 } 
        } as any)],
        spacing: { after: 300 },
      }));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1800, right: 1440 },
        },
      },
      children,
    }],
  });

  return await Packer.toBuffer(doc);
}
