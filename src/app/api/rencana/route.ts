import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { masterRencana, portalIki } from '@/db/schema';
import { auth } from '@/auth';
import { desc, eq, and, inArray } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await db.query.masterRencana.findMany({
      where: eq(masterRencana.userId, session.user.id),
      orderBy: [desc(masterRencana.createdAt)],
    });

    const rkids = data.map((d) => d.portalRkid).filter((v): v is string => !!v);
    const ikiMap: Record<string, string[]> = {};
    if (rkids.length > 0) {
      const ikis = await db
        .select()
        .from(portalIki)
        .where(and(eq(portalIki.userId, session.user.id), inArray(portalIki.rkid, rkids)));
      for (const i of ikis) {
        if (!ikiMap[i.rkid]) ikiMap[i.rkid] = [];
        if (i.iki) ikiMap[i.rkid].push(i.iki);
      }
    }

    const enriched = data.map((d) => ({
      ...d,
      ikiList: d.portalRkid && ikiMap[d.portalRkid] ? ikiMap[d.portalRkid] : [],
    }));
    return NextResponse.json(enriched);
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
      iki: data.iki || null,
    }).returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create work plan' }, { status: 500 });
  }
}
