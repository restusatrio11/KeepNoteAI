import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { DossierDocumentPayload } from './validations';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: any;
  }
}

function formatDateIndo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

async function resolveImageToBase64(imageUrl: string): Promise<string | null> {
  try {
    if (!imageUrl) return null;

    // Already a Base64 Data URL
    if (imageUrl.startsWith('data:image/')) {
      return imageUrl;
    }

    // Local file path
    if (imageUrl.startsWith('/')) {
      const publicPath = path.join(process.cwd(), 'public', imageUrl);
      if (fs.existsSync(publicPath)) {
        const buffer = fs.readFileSync(publicPath);
        const ext = path.extname(publicPath).toLowerCase().replace('.', '');
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
      }
    }

    // Google Drive URL
    let fetchUrl = imageUrl;
    const driveMatch = imageUrl.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      fetchUrl = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
    }

    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      if (driveMatch) {
        // Fallback to uc download url
        const fbRes = await fetch(`https://drive.google.com/uc?export=download&id=${driveMatch[1]}`, { signal: AbortSignal.timeout(10000) });
        if (fbRes.ok) {
          const contentType = fbRes.headers.get('content-type') || '';
          if (contentType.startsWith('image/')) {
            const arrayBuffer = await fbRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return `data:${contentType};base64,${buffer.toString('base64')}`;
          }
        }
      }
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      console.warn('Resolved URL returned non-image content-type:', contentType);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn('Failed to resolve image to base64 for PDF:', err);
    return null;
  }
}

export async function generateDailyDossierPdf(data: DossierDocumentPayload): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let currentY = 12;

  // 1. KOP HEADER RESMI
  try {
    const logoBase64 = await resolveImageToBase64('/Logo BPS Prov (3).png');
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, currentY, 50, 18);
    }
  } catch (e) {
    console.warn('Logo BPS PDF error:', e);
  }

  // Header Title & Subtitle next to logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 51, 102); // BPS Navy
  doc.text('BADAN PUSAT STATISTIK', margin + 55, currentY + 6);

  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text('LAPORAN PELAKSANAAN KEGIATAN HARIAN', margin + 55, currentY + 11);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Gray
  doc.text('Dokumen Jurnal & Akuntabilitas Kinerja Pegawai', margin + 55, currentY + 15.5);

  currentY += 21;

  // Double horizontal rule divider
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY + 0.8, pageWidth - margin, currentY + 0.8);

  currentY += 7;

  // 2. JUDUL KEGIATAN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const judulUpper = (data.judul || 'JURNAL KEGIATAN KERJA HARIAN').toUpperCase();
  const splitJudul = doc.splitTextToSize(judulUpper, contentWidth);
  doc.text(splitJudul, pageWidth / 2, currentY, { align: 'center' });
  currentY += splitJudul.length * 5 + 3;

  // 3. TABEL METADATA
  autoTable(doc, {
    startY: currentY,
    body: [
      ['Hari / Tanggal', formatDateIndo(data.tanggal)],
      ['Waktu Pelaksanaan', data.waktu || 'Hari Kerja Kedinasan'],
      ['Tempat / Lokasi', data.tempat || 'Kantor / Wilayah Tugas BPS'],
      ['Tim Kerja', data.timKerja || 'BPS Kabupaten / Provinsi'],
      ['Rencana Kinerja (SKP)', data.rencanaKinerja || 'Pelaksanaan Tugas Kedinasan BPS'],
      [
        'Pelaksana Kegiatan',
        data.nipPelaksana ? `${data.pelaksana} (NIP. ${data.nipPelaksana})` : data.pelaksana,
      ],
    ],
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: {
        cellWidth: 48,
        fontStyle: 'bold',
        fillColor: [248, 250, 252],
        textColor: [15, 23, 42],
      },
      1: {
        cellWidth: 'auto',
      },
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 4. RINGKASAN EKSEKUTIF (Callout Box)
  if (data.ringkasan) {
    const summaryLines = doc.splitTextToSize(data.ringkasan, contentWidth - 8);
    const boxHeight = summaryLines.length * 4.2 + 10;

    // Check page break
    if (currentY + boxHeight > pageHeight - 25) {
      doc.addPage();
      currentY = 20;
    }

    // Callout box background & border
    doc.setFillColor(240, 247, 255); // Soft blue-50
    doc.setDrawColor(186, 215, 248); // Blue-200
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, 'FD');

    // Left thick accent bar
    doc.setFillColor(2, 132, 199); // Blue-600
    doc.roundedRect(margin, currentY, 2.5, boxHeight, 1, 1, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(3, 105, 161); // Blue-700
    doc.text('RINGKASAN EKSEKUTIF', margin + 6, currentY + 5);

    // Content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(summaryLines, margin + 6, currentY + 9.5);

    currentY += boxHeight + 6;
  }

  // Helper function to check page limit before rendering a block
  const ensureSpace = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - 25) {
      doc.addPage();
      currentY = 20;
    }
  };

  // 5. LATAR BELAKANG & TUJUAN
  if (data.latarBelakang) {
    ensureSpace(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 51, 102);
    doc.text('I. LATAR BELAKANG & TUJUAN', margin, currentY);
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(data.latarBelakang, contentWidth);
    doc.text(lines, margin, currentY);
    currentY += lines.length * 4.2 + 5;
  }

  // 6. URAIAN PELAKSANAAN KEGIATAN
  ensureSpace(18);
  const secUraianTitle = data.latarBelakang ? 'II. URAIAN PELAKSANAAN KEGIATAN' : 'I. URAIAN PELAKSANAAN KEGIATAN';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 51, 102);
  doc.text(secUraianTitle, margin, currentY);
  currentY += 5;

  if (Array.isArray(data.uraianKegiatan) && data.uraianKegiatan.length > 0) {
    data.uraianKegiatan.forEach((uraian, idx) => {
      const prefix = `${idx + 1}.  `;
      const fullText = `${prefix}${uraian}`;
      const lines = doc.splitTextToSize(fullText, contentWidth - 4);
      ensureSpace(lines.length * 4.2 + 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(lines, margin + 2, currentY);
      currentY += lines.length * 4.2 + 2;
    });
    currentY += 3;
  }

  // 7. HASIL & CAPAIAN OUTPUT
  ensureSpace(18);
  const secCapTitle = data.latarBelakang ? 'III. HASIL & CAPAIAN OUTPUT' : 'II. HASIL & CAPAIAN OUTPUT';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 51, 102);
  doc.text(secCapTitle, margin, currentY);
  currentY += 5;

  if (Array.isArray(data.capaianOutput) && data.capaianOutput.length > 0) {
    data.capaianOutput.forEach((capaian) => {
      const bulletText = `\u2022  ${capaian}`;
      const lines = doc.splitTextToSize(bulletText, contentWidth - 4);
      ensureSpace(lines.length * 4.2 + 2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(lines, margin + 2, currentY);
      currentY += lines.length * 4.2 + 2;
    });
    currentY += 3;
  }

  // 8. KENDALA & TINDAK LANJUT
  if (data.kendalaTindakLanjut) {
    ensureSpace(18);
    const secKendalaTitle = data.latarBelakang
      ? 'IV. KENDALA & RENCANA TINDAK LANJUT'
      : 'III. KENDALA & RENCANA TINDAK LANJUT';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 51, 102);
    doc.text(secKendalaTitle, margin, currentY);
    currentY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(data.kendalaTindakLanjut, contentWidth);
    doc.text(lines, margin, currentY);
    currentY += lines.length * 4.2 + 5;
  }

  // 9. DOKUMENTASI FOTO (2-COLUMN JOURNAL GRID)
  if (Array.isArray(data.photos) && data.photos.length > 0) {
    ensureSpace(24);
    const secPhotoTitle = data.latarBelakang
      ? data.kendalaTindakLanjut
        ? 'V. DOKUMENTASI KEGIATAN'
        : 'IV. DOKUMENTASI KEGIATAN'
      : data.kendalaTindakLanjut
      ? 'IV. DOKUMENTASI KEGIATAN'
      : 'III. DOKUMENTASI KEGIATAN';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 51, 102);
    doc.text(secPhotoTitle, margin, currentY);
    currentY += 4.5;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Dokumentasi visual pelaksanaan kegiatan kedinasan:', margin, currentY);
    currentY += 6;

    // Resolve all photos to base64
    const resolvedPhotos = await Promise.all(
      data.photos.map(async (p) => {
        const b64 = await resolveImageToBase64(p.dataUrl);
        return { base64: b64, caption: p.caption };
      })
    );

    const validPhotos = resolvedPhotos.filter((p) => p.base64 !== null) as {
      base64: string;
      caption: string;
    }[];

    const colWidth = (contentWidth - 6) / 2; // 2 columns with 6mm gap
    const imgWidth = colWidth;
    const maxImgHeight = 52; // mm

    for (let i = 0; i < validPhotos.length; i += 2) {
      const p1 = validPhotos[i];
      const p2 = validPhotos[i + 1];

      // Calculate heights
      let h1 = 45;
      try {
        const props = doc.getImageProperties(p1.base64);
        h1 = Math.min((props.height * imgWidth) / props.width, maxImgHeight);
      } catch {}

      let h2 = 45;
      if (p2) {
        try {
          const props = doc.getImageProperties(p2.base64);
          h2 = Math.min((props.height * imgWidth) / props.width, maxImgHeight);
        } catch {}
      }

      const rowHeight = Math.max(h1, p2 ? h2 : 0) + 14;
      ensureSpace(rowHeight + 4);

      // Render Photo 1 (Left Column)
      const x1 = margin;
      try {
        const match = p1.base64.match(/^data:image\/([a-zA-Z+]+);base64,/);
        const format = match ? match[1].toUpperCase() : 'JPEG';
        const imgFmt = ['PNG', 'JPEG', 'WEBP'].includes(format) ? format : 'JPEG';

        // Photo card background
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.roundedRect(x1, currentY, colWidth, h1 + 12, 1.5, 1.5, 'FD');

        doc.addImage(p1.base64, imgFmt as any, x1 + 1, currentY + 1, colWidth - 2, h1);

        // Caption
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        const cap1 = `Gambar ${i + 1}: ${p1.caption || 'Dokumentasi Kegiatan'}`;
        const cap1Lines = doc.splitTextToSize(cap1, colWidth - 4);
        doc.text(cap1Lines, x1 + colWidth / 2, currentY + h1 + 5, { align: 'center' });
      } catch (err) {
        console.warn('PDF Photo 1 render error:', err);
      }

      // Render Photo 2 (Right Column) if available
      if (p2) {
        const x2 = margin + colWidth + 6;
        try {
          const match = p2.base64.match(/^data:image\/([a-zA-Z+]+);base64,/);
          const format = match ? match[1].toUpperCase() : 'JPEG';
          const imgFmt = ['PNG', 'JPEG', 'WEBP'].includes(format) ? format : 'JPEG';

          // Photo card background
          doc.setFillColor(250, 250, 250);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.roundedRect(x2, currentY, colWidth, h2 + 12, 1.5, 1.5, 'FD');

          doc.addImage(p2.base64, imgFmt as any, x2 + 1, currentY + 1, colWidth - 2, h2);

          // Caption
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          const cap2 = `Gambar ${i + 2}: ${p2.caption || 'Dokumentasi Kegiatan'}`;
          const cap2Lines = doc.splitTextToSize(cap2, colWidth - 4);
          doc.text(cap2Lines, x2 + colWidth / 2, currentY + h2 + 5, { align: 'center' });
        } catch (err) {
          console.warn('PDF Photo 2 render error:', err);
        }
      }

      currentY += rowHeight + 4;
    }
  }

  // 10. TANDA TANGAN / PENGESAHAN (Hanya Pelaksana Kegiatan)
  ensureSpace(40);
  currentY += 4;

  const tempatTgl = `${data.tempat?.split('/')[0]?.trim() || 'Tempat Tugas'}, ${formatDateIndo(data.tanggal)}`;
  const rightX = margin + contentWidth * 0.75; // Right-aligned signature column center

  // Check optional signature image for pelaksana
  let ttdBase64: string | null = null;
  if (data.tandaTanganUrl) {
    ttdBase64 = await resolveImageToBase64(data.tandaTanganUrl);
  }

  // Pelaksana Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(tempatTgl, rightX, currentY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Pelaksana Kegiatan,', rightX, currentY + 4.5, { align: 'center' });

  let sigY = currentY + 22;

  if (ttdBase64) {
    try {
      const match = ttdBase64.match(/^data:image\/([a-zA-Z+]+);base64,/);
      const format = match ? match[1].toUpperCase() : 'PNG';
      const imgFmt = ['PNG', 'JPEG', 'WEBP'].includes(format) ? format : 'PNG';
      const ttdWidth = 36;
      const ttdHeight = 15;
      doc.addImage(ttdBase64, imgFmt as any, rightX - ttdWidth / 2, currentY + 6.5, ttdWidth, ttdHeight);
      sigY = currentY + 23.5;
    } catch (e) {
      console.warn('PDF signature render error:', e);
    }
  } else {
    // Tanpa upload tanda tangan: sediakan ruang untuk ttd basah bila dicetak
    sigY = currentY + 20;
  }

  // Pelaksana Name & NIP
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`( ${data.pelaksana} )`, rightX, sigY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    data.nipPelaksana ? `NIP. ${data.nipPelaksana}` : 'NIP. ........................................',
    rightX,
    sigY + 4,
    { align: 'center' }
  );

  // 12. FOOTER NUMBERING PADA SETIAP HALAMAN
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text('KeepNoteAI - Badan Pusat Statistik RI', margin, pageHeight - 7);
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  const mainPdfBytes = new Uint8Array(doc.output('arraybuffer'));

  // Merge any attached PDF files into the final PDF bundle
  const pdfAttachments = (data.lampiran || []).filter((l) => {
    if (!l?.dataUrl) return false;
    const type = (l.tipe || '').toLowerCase();
    const name = (l.nama || '').toLowerCase();
    const dataUrl = (l.dataUrl || '').toLowerCase();
    return (
      type.includes('pdf') ||
      name.endsWith('.pdf') ||
      dataUrl.startsWith('data:application/pdf') ||
      dataUrl.startsWith('data:application/octet-stream') ||
      dataUrl.includes('application/pdf')
    );
  });

  if (pdfAttachments.length === 0) {
    return mainPdfBytes;
  }

  try {
    const mergedPdf = await PDFDocument.create();
    const mainPdfDoc = await PDFDocument.load(mainPdfBytes, { ignoreEncryption: true });
    const mainPages = await mergedPdf.copyPages(mainPdfDoc, mainPdfDoc.getPageIndices());
    mainPages.forEach((page) => mergedPdf.addPage(page));

    for (let idx = 0; idx < pdfAttachments.length; idx++) {
      const att = pdfAttachments[idx];
      try {
        let donorBytes: Uint8Array | null = null;
        if (att.dataUrl?.startsWith('data:')) {
          const commaIndex = att.dataUrl.indexOf(',');
          if (commaIndex !== -1) {
            const b64 = att.dataUrl.slice(commaIndex + 1);
            donorBytes = Uint8Array.from(Buffer.from(b64, 'base64'));
          }
        } else if (att.dataUrl?.startsWith('http')) {
          let fetchUrl = att.dataUrl;
          const driveMatch = att.dataUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (driveMatch) {
            fetchUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
          }
          const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(30000) });
          if (res.ok) {
            donorBytes = new Uint8Array(await res.arrayBuffer());
          }
        }

        if (donorBytes && donorBytes.length > 0) {
          const donorPdf = await PDFDocument.load(donorBytes, {
            ignoreEncryption: true,
            updateMetadata: false,
          });
          const donorPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
          donorPages.forEach((page) => mergedPdf.addPage(page));
        }
      } catch (attErr) {
        console.warn(`Gagal menggabungkan lampiran PDF "${att.nama}":`, attErr);
      }
    }

    const mergedBytes = await mergedPdf.save();
    return new Uint8Array(mergedBytes);
  } catch (mergeErr) {
    console.error('Error merging PDF attachments with main dossier:', mergeErr);
    return mainPdfBytes;
  }
}
