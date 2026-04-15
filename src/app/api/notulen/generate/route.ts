import { NextRequest, NextResponse } from 'next/server';
import { generateNotulenAI } from '@/lib/ai';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { rawNotes, metadata } = await req.json();

    if (!rawNotes) {
      return NextResponse.json({ error: 'Catatan kasar diperlukan' }, { status: 400 });
    }

    const result = await generateNotulenAI(rawNotes, metadata || {});

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghasilkan notulen' }, { status: 500 });
  }
}
