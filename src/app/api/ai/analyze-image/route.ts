import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageReport } from '@/lib/ai';
import { auth } from '@/auth';
import { db } from '@/db';
import { masterRencana } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { extractTextFromPDF } from '@/lib/pdf-parser';
const mammoth = require('mammoth');

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { base64Image, contentType, rencanaId } = await req.json();

    if (!base64Image || !rencanaId) {
      return NextResponse.json({ error: 'Data and Rencana context are required' }, { status: 400 });
    }

    // Fetch rencana details for context
    const [rencana] = await db
      .select()
      .from(masterRencana)
      .where(eq(masterRencana.id, rencanaId))
      .limit(1);

    if (!rencana) {
      return NextResponse.json({ error: 'Rencana not found' }, { status: 404 });
    }

    const context = `Kode: ${rencana.kode}, Nama: ${rencana.nama}`;
    const buffer = Buffer.from(base64Image, 'base64');
    let result;

    if (contentType === 'application/pdf') {
      const text = await extractTextFromPDF(buffer);
      // For text documents, we can still use analyzeImageReport by passing the text in context
      result = await analyzeImageReport('', 'text/plain', `${context}\n\nDocument Text Content: ${text.substring(0, 5000)}`);
    } else if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || contentType === 'application/msword') {
      const data = await mammoth.extractRawText({ buffer });
      result = await analyzeImageReport('', 'text/plain', `${context}\n\nDocument Text Content: ${data.value.substring(0, 5000)}`);
    } else {
      // Assume it's an image
      result = await analyzeImageReport(base64Image, contentType, context);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to analyze content' }, { status: 500 });
  }
}
