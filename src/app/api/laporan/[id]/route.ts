import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { laporan, masterRencana } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and } from 'drizzle-orm';
import { LaporanSchema } from '@/lib/validations';
import { z } from 'zod';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [data] = await db
      .select({
        id: laporan.id,
        userId: laporan.userId,
        tanggalMulai: laporan.tanggalMulai,
        tanggalSelesai: laporan.tanggalSelesai,
        jamMulai: laporan.jamMulai,
        jamSelesai: laporan.jamSelesai,
        rencanaId: laporan.rencanaId,
        kegiatan: laporan.kegiatan,
        progress: laporan.progress,
        capaian: laporan.capaian,
        buktiUrls: laporan.buktiUrls,
        masukanSkp: laporan.masukanSkp,
        createdAt: laporan.createdAt,
        rencanaNama: masterRencana.nama,
        rencanaKode: masterRencana.kode,
        rencanaIki: masterRencana.iki,
      })
      .from(laporan)
      .leftJoin(masterRencana, eq(laporan.rencanaId, masterRencana.id))
      .where(and(eq(laporan.id, reportId), eq(laporan.userId, session.user.id)))
      .limit(1);

    if (!data) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const userId = session.user.id;

    const validatedData = LaporanSchema.partial().parse(body);

    const result = await db.update(laporan)
      .set(validatedData)
      .where(and(eq(laporan.id, reportId), eq(laporan.userId, userId)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Report not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userId = session.user.id;

    const result = await db.delete(laporan)
      .where(and(eq(laporan.id, reportId), eq(laporan.userId, userId)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Report not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}
