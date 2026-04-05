import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { masterRencana } from '@/db/schema';
import { auth } from '@/auth';
import { desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await db.query.masterRencana.findMany({
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
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    if (!data.nama || !data.kode) {
      return NextResponse.json({ error: 'Nama and Kode are required' }, { status: 400 });
    }

    const result = await db.insert(masterRencana).values({
      nama: data.nama,
      kode: data.kode,
    }).returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create work plan' }, { status: 500 });
  }
}
