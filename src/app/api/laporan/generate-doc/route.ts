import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateDailyDossierDocx } from '@/lib/daily-dossier-docx';
import { generateDailyDossierPdf } from '@/lib/daily-dossier-pdf';
import { DossierDocumentPayload } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'docx').toLowerCase();

    const body: DossierDocumentPayload = await req.json();

    if (!body.tanggal || !body.pelaksana) {
      return NextResponse.json(
        { error: 'Tanggal dan nama pelaksana wajib diisi' },
        { status: 400 }
      );
    }

    const safeTitle = (body.judul || 'Laporan_Harian_BPS')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .slice(0, 50);
    const filenameBase = `${safeTitle}_${body.tanggal}`;

    if (format === 'pdf') {
      const pdfUint8 = await generateDailyDossierPdf(body);
      return new Response(Buffer.from(pdfUint8), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
        },
      });
    }

    // Default to DOCX
    const docxBuffer = await generateDailyDossierDocx(body);
    return new Response(new Uint8Array(docxBuffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filenameBase}.docx"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating daily dossier document:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal menghasilkan dokumen laporan harian' },
      { status: 500 }
    );
  }
}
