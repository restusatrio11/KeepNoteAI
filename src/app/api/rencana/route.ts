import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { masterRencana } from '@/db/schema';
import { auth } from '@/auth';
import { desc, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await db.query.masterRencana.findMany({
      where: eq(masterRencana.userId, session.user.id),
      orderBy: [desc(masterRencana.createdAt)],
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch work plans' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    if (!data.nama) {
      return NextResponse.json({ error: 'Nama is required' }, { status: 400 });
    }

    let kode = data.kode;
    if (!kode) {
      // Generate random 4 character alphanumeric code
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomPart = '';
      for (let i = 0; i < 4; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      kode = `RK-${randomPart}`;
    }

    const result = await db.insert(masterRencana).values({
      userId: session.user.id,
      timId: data.timId || null,
      nama: data.nama,
      kode: kode.toUpperCase(),
    }).returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create work plan' }, { status: 500 });
  }
}
