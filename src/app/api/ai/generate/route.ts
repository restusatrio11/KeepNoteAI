import { NextRequest, NextResponse } from 'next/server';
import { generateReport } from '@/lib/ai';
import { auth } from '@/auth';
import { db } from '@/db';
import { laporan } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { deskripsi, rencanaContext, timContext } = await req.json();
    const userId = session.user.id;

    // AI Memory: Get last 3 reports for style and context
    const recentReports = await db
      .select({ kegiatan: laporan.kegiatan, capaian: laporan.capaian })
      .from(laporan)
      .where(eq(laporan.userId, userId))
      .orderBy(desc(laporan.createdAt))
      .limit(3);

    const history = recentReports
      .map(r => `- Kegiatan: ${r.kegiatan}\n  Capaian: ${r.capaian}`)
      .join('\n\n');

    const result = await generateReport(deskripsi, timContext, rencanaContext, history);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate AI content' }, { status: 500 });
  }
}
