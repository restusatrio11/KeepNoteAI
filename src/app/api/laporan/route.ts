import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { laporan, masterRencana } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and, like, desc, sql, gte, lte } from 'drizzle-orm';
import { LaporanSchema } from '@/lib/validations';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const rencanaId = searchParams.get('rencanaId') || 'all';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;

  try {
    const filters = [eq(laporan.userId, userId)];
    
    if (search) {
      filters.push(like(laporan.kegiatan, `%${search}%`));
    }
    
    if (rencanaId !== 'all') {
      filters.push(eq(laporan.rencanaId, rencanaId));
    }

    if (from) {
      filters.push(gte(laporan.tanggalMulai, from));
    }
    if (to) {
      filters.push(lte(laporan.tanggalSelesai, to));
    }

    const whereClause = and(...filters);

    const data = await db.select({
      id: laporan.id,
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
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(laporan.tanggalMulai));

    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(laporan).where(whereClause);

    return NextResponse.json({ 
      data, 
      total: totalResult.count,
      page,
      limit
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const userId = session.user.id;

    // Validate input
    const validatedData = LaporanSchema.parse(body);

    const [result] = await db.insert(laporan).values({
      userId: userId,
      ...validatedData
    }).returning();

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}
