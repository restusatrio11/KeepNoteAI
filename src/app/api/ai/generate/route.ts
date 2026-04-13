import { NextRequest, NextResponse } from 'next/server';
import { generateLaporanAI } from '@/lib/ai';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { deskripsi, rencanaContext, timContext } = await req.json();
    const result = await generateLaporanAI(deskripsi, rencanaContext, timContext);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate AI content' }, { status: 500 });
  }
}
