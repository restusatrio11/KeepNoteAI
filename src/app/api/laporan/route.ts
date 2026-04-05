import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { laporan, masterRencana } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and, like, desc, sql, gte, lte } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user?.id;
  if (!userId) return NextResponse.json({ error: 'User ID missing' }, { status: 400 });

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
      filters.push(gte(laporan.tanggal, from));
    }
    if (to) {
      filters.push(lte(laporan.tanggal, to));
    }

    const whereClause = and(...filters);

    const data = await db.select({
      id: laporan.id,
      tanggal: laporan.tanggal,
      rencanaId: laporan.rencanaId,
      kegiatan: laporan.kegiatan,
      progress: laporan.progress,
      capaian: laporan.capaian,
      buktiUrl: laporan.buktiUrl,
      createdAt: laporan.createdAt,
      rencanaNama: masterRencana.nama,
      rencanaKode: masterRencana.kode,
    })
    .from(laporan)
    .leftJoin(masterRencana, eq(laporan.rencanaId, masterRencana.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(laporan.tanggal));

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
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const userId = session.user?.id;
    if (!userId) return NextResponse.json({ error: 'User ID missing' }, { status: 400 });

    const result = await db.insert(laporan).values({
      userId: userId as string,
      tanggal: data.tanggal,
      rencanaId: data.rencanaId,
      kegiatan: data.kegiatan,
      progress: data.progress,
      capaian: data.capaian,
      buktiUrl: data.buktiUrl,
    });

    return NextResponse.json({ success: true, id: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}
