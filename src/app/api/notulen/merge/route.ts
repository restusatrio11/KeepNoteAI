import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { notulen } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import { extractFileIdFromUrl, getFileBuffer } from '@/lib/drive';
import { generateNotulenPdf } from '@/lib/pdf-generator';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { notulenId } = await req.json();
    if (!notulenId) return NextResponse.json({ error: 'Notulen ID is required' }, { status: 400 });

    // 1. Fetch Notulen Data with retry/safety
    let data;
    try {
      const results = await db.select().from(notulen).where(eq(notulen.id, notulenId)).limit(1);
      data = results[0];
    } catch (dbError) {
      console.error('Database connection error in merge:', dbError);
      // Optional: Wait and retry once
      await new Promise(r => setTimeout(r, 1000));
      const results = await db.select().from(notulen).where(eq(notulen.id, notulenId)).limit(1);
      data = results[0];
    }
    
    if (!data) return NextResponse.json({ error: 'Notulen not found' }, { status: 404 });

    // 2. Start PDF Merging
    const mergedPdf = await PDFDocument.create();

    // -- Part 1: Undangan --
    if (data.undanganUrl) {
      console.log('Merging Undangan from:', data.undanganUrl);
      const fileId = extractFileIdFromUrl(data.undanganUrl);
      if (fileId) {
        try {
          const buffer = await getFileBuffer(fileId);
          const donorPdf = await PDFDocument.load(buffer);
          const pages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
          pages.forEach(page => mergedPdf.addPage(page));
          console.log('Undangan merged successfully');
        } catch (e) {
          console.error('Error merging Undangan:', e);
        }
      }
    }

    // -- Part 2: Notulen (The generated one) --
    try {
      console.log('Generating and merging Notulen PDF...');
      const notulenBuffer = await generateNotulenPdf(data as any);
      const notulenPdf = await PDFDocument.load(notulenBuffer);
      const pages = await mergedPdf.copyPages(notulenPdf, notulenPdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
      console.log('Notulen PDF merged successfully');
    } catch (e) {
      console.error('Error adding Notulen PDF:', e);
    }

    // -- Part 3: Daftar Hadir --
    if (data.daftarHadirUrl) {
      console.log('Merging Daftar Hadir from:', data.daftarHadirUrl);
      const fileId = extractFileIdFromUrl(data.daftarHadirUrl);
      if (fileId) {
        try {
          const buffer = await getFileBuffer(fileId);
          const donorPdf = await PDFDocument.load(buffer);
          const pages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
          pages.forEach(page => mergedPdf.addPage(page));
          console.log('Daftar Hadir merged successfully');
        } catch (e) {
          console.error('Error merging Daftar Hadir:', e);
        }
      }
    }

    const finalPdfBytes = await mergedPdf.save();
    console.log('PDF Merging complete. Total bytes:', finalPdfBytes.length);

    return new Response(Buffer.from(finalPdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Paket_Notulen_${data.judul.replace(/\s+/g, '_')}.pdf"`
      }
    });

  } catch (error: any) {
    console.error('Critical Merge Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to merge PDF' }, { status: 500 });
  }
}
