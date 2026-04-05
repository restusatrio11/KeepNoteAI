import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { laporan } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and } from 'drizzle-orm';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const userId = session.user?.id;
    if (!userId) return NextResponse.json({ error: 'User ID missing' }, { status: 400 });

    if (!reportId) return NextResponse.json({ error: 'Report ID missing' }, { status: 400 });

    await db.update(laporan)
      .set({
        tanggal: data.tanggal,
        rencanaId: data.rencanaId,
        kegiatan: data.kegiatan,
        progress: data.progress,
        capaian: data.capaian,
        buktiUrl: data.buktiUrl,
      })
      .where(and(eq(laporan.id, reportId), eq(laporan.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userId = session.user?.id;
    if (!userId) return NextResponse.json({ error: 'User ID missing' }, { status: 400 });

    if (!reportId) return NextResponse.json({ error: 'Report ID missing' }, { status: 400 });

    await db.delete(laporan).where(and(eq(laporan.id, reportId), eq(laporan.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}
