import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { laporan, masterRencana, userSettings } from '@/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { analyzeReportHealthAI } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 1. Get current report count
    const [reportCountResult] = await db
      .select({ value: count() })
      .from(laporan)
      .where(eq(laporan.userId, userId));
    
    const currentCount = Number(reportCountResult?.value || 0);

    // 2. Check cache in user_settings
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(10);

    // 3. Return cache if count matches and data exists
    if (
      settings && 
      settings.lastReportCount === currentCount && 
      settings.healthScore !== null
    ) {
      console.log(`Using cached AI analysis for user ${userId} (Count: ${currentCount})`);
      return NextResponse.json({
        score: settings.healthScore,
        status: settings.healthStatus,
        message: settings.healthMessage,
        cached: true
      });
    }

    // 4. If count changed or no cache, fetch reports for fresh analysis
    const userReports = await db
      .select({
        tanggal: laporan.tanggal,
        kegiatan: laporan.kegiatan,
        progress: laporan.progress,
        rencana: masterRencana.nama,
      })
      .from(laporan)
      .innerJoin(masterRencana, eq(laporan.rencanaId, masterRencana.id))
      .where(eq(laporan.userId, userId))
      .orderBy(desc(laporan.tanggal))
      .limit(10);

    if (userReports.length === 0) {
      return NextResponse.json({
        score: 0,
        status: 'Kosong',
        message: 'Mulai buat laporan pertama Anda untuk melihat analisis kesehatan pelaporan AI!',
      });
    }

    const reportSummary = userReports
      .map(r => `[${r.tanggal}] ${r.rencana}: ${r.kegiatan} (Progres: ${r.progress})`)
      .join('\n');

    // 5. Call AI
    const analysis = await analyzeReportHealthAI(reportSummary);

    // 6. Update cache in user_settings (Upsert)
    if (settings) {
      await db.update(userSettings)
        .set({
          healthScore: analysis.score,
          healthStatus: analysis.status,
          healthMessage: analysis.message,
          lastReportCount: currentCount,
          updatedAt: new Date()
        })
        .where(eq(userSettings.userId, userId));
    } else {
      await db.insert(userSettings).values({
        userId,
        healthScore: analysis.score,
        healthStatus: analysis.status,
        healthMessage: analysis.message,
        lastReportCount: currentCount
      });
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Health Analysis Error:', error);
    return NextResponse.json({ 
      score: 0, 
      status: 'Error', 
      message: 'Gagal melakukan analisis AI saat ini. Silakan coba lagi nanti.' 
    }, { status: 500 });
  }
}
