import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { masterRencana, laporan } from '@/db/schema';
import { auth } from '@/auth';
import { eq } from 'drizzle-orm';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();

    if (!data.nama || !data.kode) {
      return NextResponse.json({ error: 'Nama and Kode are required' }, { status: 400 });
    }

    const result = await db.update(masterRencana)
      .set({
        nama: data.nama,
        kode: data.kode.toUpperCase(),
      })
      .where(eq(masterRencana.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Rencana not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update work plan' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Check if there are any reports linked to this rencana
    const existingLaporan = await db.query.laporan.findFirst({
      where: eq(laporan.rencanaId, id),
    });

    if (existingLaporan) {
      return NextResponse.json({ 
        error: 'Tidak dapat menghapus. Rencana ini memiliki laporan yang terkait.' 
      }, { status: 400 });
    }

    const result = await db.delete(masterRencana)
      .where(eq(masterRencana.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Rencana not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Rencana deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete work plan' }, { status: 500 });
  }
}
