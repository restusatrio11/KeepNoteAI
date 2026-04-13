import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timKerja } from '@/db/schema';
import { auth } from '@/auth';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await db.query.timKerja.findMany({
      where: eq(timKerja.userId, session.user.id),
      orderBy: [desc(timKerja.createdAt)],
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    if (!data.nama) return NextResponse.json({ error: 'Nama Tim is required' }, { status: 400 });

    const result = await db.insert(timKerja).values({
      userId: session.user.id,
      nama: data.nama,
      keterangan: data.keterangan || null,
    }).returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
