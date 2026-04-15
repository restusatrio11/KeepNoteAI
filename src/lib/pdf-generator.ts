import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

// Force build refresh: 1776189999

// Extending jsPDF with autotable types
declare module 'jspdf' {
  interface jsPDF {
    autoTable: any;
  }
}

// Inline utility - no external import needed
function formatDateIndo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

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
  konten: string; // JSON string
  dokumentasiUrls?: string; // JSON array string
}

export async function generateNotulenPdf(data: NotulenData): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  // 1. Header with Logo
  try {
    const logoPath = '/Logo BPS Prov (3).png';
    const imgData = await getBase64Image(logoPath);
    if (imgData) {
      doc.addImage(imgData, 'PNG', margin, currentY, 35, 25);
    }
  } catch (e) {
    console.error('Logo Error:', e);
  }

  // Redundant text removed as per user request to use larger logo instead
  
  currentY += 28;
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // 2. Title Table
  autoTable(doc, {
    startY: currentY,
    head: [[{ content: data.judul.toUpperCase(), colSpan: 2, styles: { halign: 'center', fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.5 } }]],
    body: [
      ['Hari/Tanggal', formatDateIndo(data.tanggal)],
      ['Waktu', data.waktu || '-'],
      ['Tempat', data.tempat || '-'],
      ['Pemimpin Rapat', data.pemimpin || '-'],
      ['Topik Pembahasan', data.topik || '-'],
      ['Peserta Rapat', data.peserta || '-'],
      ['Notulis', data.notulis || '-'],
    ],
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 3. Discussion Points
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTULA KEGIATAN', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  try {
    const konten = JSON.parse(data.konten || '{}');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Discussion (Formatted as Paragraphs for professional look)
    if (konten.pembahasan && Array.isArray(konten.pembahasan)) {
      konten.pembahasan.forEach((p: any, idx: number) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text(`${idx + 1}. ${p.topik.toUpperCase()}`, margin, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        // Merge items into a paragraph for better flow
        const paragraphText = p.items.map((item: any) => {
          return `${item.deskripsi}${item.solusi ? ` Solusi yang disepakati adalah ${item.solusi}.` : ''}`;
        }).join(' ');

        const splitText = doc.splitTextToSize(paragraphText, pageWidth - margin * 2.5);
        doc.text(splitText, margin + 5, currentY);
        currentY += (splitText.length * 5) + 5;
      });
    }

    // 4. Kesimpulan (Formatted as Point-to-Point)
    if (konten.kesimpulan) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      currentY += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('KESIMPULAN DAN TINDAK LANJUT', margin, currentY);
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      
      // If kesimpulan is a string with multiple lines or points, handle it.
      // Or if it's a long string, split it into bullet points if it looks like it has multiple parts.
      const conclusionPoints = konten.kesimpulan.split('\n').filter((l: string) => l.trim().length > 0);
      
      conclusionPoints.forEach((point: string) => {
        const text = `\u2022 ${point.trim()}`;
        const splitKesimpulan = doc.splitTextToSize(text, pageWidth - margin * 2.5);
        doc.text(splitKesimpulan, margin + 5, currentY);
        currentY += (splitKesimpulan.length * 5);
        
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
      });
      currentY += 5;
    }

    // 5. Insights
    if (konten.insights && Array.isArray(konten.insights) && konten.insights.length > 0) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 102, 204); // Professional blue for insights
      doc.text('REKOMENDASI & INSIGHT STRATEGIS', margin, currentY);
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      konten.insights.forEach((insight: string) => {
        const text = `\u27A4 ${insight}`;
        const splitInsight = doc.splitTextToSize(text, pageWidth - margin * 2.5);
        doc.text(splitInsight, margin + 2, currentY);
        currentY += (splitInsight.length * 5);
        
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
      });
    }

  } catch (parseError) {
    console.error('JSON Parse Error in PDF Gen:', parseError);
    doc.setFont('helvetica', 'italic');
    doc.text('Konten notulensi sedang diproses atau format tidak terbaca.', margin, currentY);
  }

  // 4. Documentation Section (if any)
  if (data.dokumentasiUrls) {
    const images = JSON.parse(data.dokumentasiUrls);
    if (Array.isArray(images) && images.length > 0) {
      doc.addPage();
      currentY = 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('DOKUMENTASI KEGIATAN', pageWidth / 2, currentY, { align: 'center' });
      currentY += 6;
      doc.setFontSize(10);
      doc.text(formatDateIndo(data.tanggal), pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      for (const url of images) {
        if (currentY > 230) {
          doc.addPage();
          currentY = 20;
        }
        try {
          const imgBase64 = await getBase64Image(url);
          if (imgBase64) {
            // Validate image type to avoid "UNKNOWN" error
            const match = imgBase64.match(/^data:image\/([a-zA-Z+]+);base64,/);
            const type = match ? match[1].toUpperCase() : 'JPEG';
            
            try {
              const imgProps = doc.getImageProperties(imgBase64);
              const imgWidth = 120;
              const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
              
              const format = (type === 'PNG' || type === 'JPEG' || type === 'WEBP') ? type : 'JPEG';
              doc.addImage(imgBase64, format as any, (pageWidth - imgWidth) / 2, currentY, imgWidth, imgHeight);
              currentY += imgHeight + 10;
            } catch (propsError) {
              console.error('Failed to get image properties, skipping:', propsError);
            }
          }
        } catch (e) {
          console.error('Doc Image Error:', e);
        }
      }
    }
  }

  return new Uint8Array(doc.output('arraybuffer'));
}

async function getBase64Image(imageUrl: string): Promise<string | null> {
  try {
    // Handle local images (starting with /) using fs for reliability on server-side
    if (imageUrl.startsWith('/') && typeof window === 'undefined') {
      try {
        const publicPath = path.join(process.cwd(), 'public', imageUrl);
        if (fs.existsSync(publicPath)) {
          const buffer = fs.readFileSync(publicPath);
          const ext = path.extname(publicPath).toLowerCase().replace('.', '');
          const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
          return `data:${mimeType};base64,${buffer.toString('base64')}`;
        }
      } catch (fsError) {
        console.error('Local FS Read Error:', fsError);
      }
    }

    // Handle Google Drive URLs
    let fetchUrl = imageUrl;
    const driveMatch = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      fetchUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }

    // Fallback to fetch for remote images or if on client
    const absoluteUrl = fetchUrl.startsWith('/') 
      ? `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${fetchUrl}` 
      : fetchUrl;
      
    const response = await fetch(absoluteUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    
    if (typeof window === 'undefined') {
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } else {
      const blob = new Blob([arrayBuffer]);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.error('Base64 Image Conversion Error:', e);
    return null;
  }
}
