import { NextRequest, NextResponse } from 'next/server';
import { reviewReport } from '@/lib/ai';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { kegiatan, progress, capaian } = await req.json();

    if (!kegiatan || !progress || !capaian) {
      return NextResponse.json({ error: 'Missing report data for review' }, { status: 400 });
    }

    const result = await reviewReport(kegiatan, progress, capaian);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to review report' }, { status: 500 });
  }
}
