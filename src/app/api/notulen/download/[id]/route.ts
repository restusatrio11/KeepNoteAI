import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { notulen } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateNotulenPdf } from '@/lib/pdf-generator';
import { generateNotulenDocx } from '@/lib/docx-generator';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'docx';

    const data = await db.query.notulen.findFirst({
      where: eq(notulen.id, id),
    });

    if (!data) {
      return NextResponse.json({ error: 'Notulen not found' }, { status: 404 });
    }

    if (data.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notulenData = {
      id: data.id,
      judul: data.judul,
      tanggal: data.tanggal,
      waktu: data.waktu || '',
      tempat: data.tempat || '',
      pemimpin: data.pemimpin || '',
      topik: data.topik || '',
      notulis: data.notulis || '',
      peserta: data.peserta || '',
      konten: data.konten,
      dokumentasiUrls: data.dokumentasiUrls ?? undefined,
    };

    if (type === 'pdf') {
      const pdfBuffer = await generateNotulenPdf(notulenData);
      return new Response(Buffer.from(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Notulen_${data.judul.replace(/\s+/g, '_')}.pdf"`,
        },
      });
    }

    // Default to DOCX
    const docxBuffer = await generateNotulenDocx(notulenData);
    return new Response(docxBuffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Notulen_${data.judul.replace(/\s+/g, '_')}.docx"`,
      },
    });
  } catch (error) {
    console.error('Download Error:', error);
    return NextResponse.json({ error: 'Failed to generate file' }, { status: 500 });
  }
}
