import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notulen } from '@/db/schema';
import { auth } from '@/auth';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await db.query.notulen.findMany({
      where: eq(notulen.userId, session.user.id as string),
      orderBy: [desc(notulen.createdAt)],
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch notulen' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { judul, tanggal, waktu, tempat, pemimpin, topik, notulis, peserta, konten, undanganUrl, daftarHadirUrl, dokumentasiUrls } = body;

    const [newNotulen] = await db.insert(notulen).values({
      userId: session.user.id as string,
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
    console.error(error);
    return NextResponse.json({ error: 'Failed to save notulen' }, { status: 500 });
  }
}
