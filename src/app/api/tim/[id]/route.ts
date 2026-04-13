import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timKerja, masterRencana } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and, count } from 'drizzle-orm';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const result = await db.update(timKerja)
      .set({ 
        nama: data.nama, 
        keterangan: data.keterangan || null 
      })
      .where(and(eq(timKerja.id, id), eq(timKerja.userId, session.user.id)))
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Check if team is used in master_rencana
    const [usage] = await db.select({ val: count() }).from(masterRencana).where(eq(masterRencana.timId, id));
    if (usage && usage.val > 0) {
      return NextResponse.json({ error: 'Tim tidak bisa dihapus karena masih digunakan dalam Program Kerja' }, { status: 400 });
    }

    await db.delete(timKerja)
      .where(and(eq(timKerja.id, id), eq(timKerja.userId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
