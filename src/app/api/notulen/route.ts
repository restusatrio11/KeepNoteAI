import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notulen } from '@/db/schema';
import { auth } from '@/auth';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { NotulenSchema } from '@/lib/validations';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;

  try {
    const filters = [eq(notulen.userId, session.user.id)];
    
    if (search) {
      filters.push(sql`(${notulen.judul} ILIKE ${`%${search}%`} OR ${notulen.topik} ILIKE ${`%${search}%`})`);
    }

    if (from) {
      filters.push(gte(notulen.tanggal, from));
    }
    if (to) {
      filters.push(lte(notulen.tanggal, to));
    }

    const whereClause = and(...filters);

    const data = await db.query.notulen.findMany({
      where: whereClause,
      orderBy: [desc(notulen.createdAt)],
      limit: limit,
      offset: offset,
    });

    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(notulen).where(whereClause);

    return NextResponse.json({
      data,
      total: totalResult.count,
      page,
      limit
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch notulen' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validatedData = NotulenSchema.parse(body);
    const { judul, tanggal, waktu, tempat, pemimpin, topik, notulis, peserta, konten, undanganUrl, daftarHadirUrl, dokumentasiUrls } = validatedData;

    const [newNotulen] = await db.insert(notulen).values({
      userId: session.user.id,
      judul,
      tanggal,
      waktu,
      tempat,
      pemimpin,
      topik,
      notulis,
      peserta,
      konten: typeof konten === 'string' ? konten : JSON.stringify(konten),
      undanganUrl,
      daftarHadirUrl,
      dokumentasiUrls: typeof dokumentasiUrls === 'string' ? dokumentasiUrls : JSON.stringify(dokumentasiUrls || []),
    }).returning();

    return NextResponse.json(newNotulen);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Failed to save notulen' }, { status: 500 });
  }
}
