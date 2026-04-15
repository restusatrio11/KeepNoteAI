import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notulen } from '@/db/schema';
import { auth } from '@/auth';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const data = await db.query.notulen.findFirst({
      where: eq(notulen.id, id),
    });

    if (!data) {
      return NextResponse.json({ error: 'Notulen not found' }, { status: 404 });
    }

    if (data.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch notulen' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    // Check ownership first
    const existing = await db.query.notulen.findFirst({
      where: eq(notulen.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notulen not found' }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log(`[DELETE] Deleting notulen ${id}`);
    await db.delete(notulen).where(eq(notulen.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE ERROR]:', error);
    return NextResponse.json({ error: 'Failed to delete notulen' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const json = await req.json();
    
    // Check ownership first
    const existing = await db.query.notulen.findFirst({
      where: eq(notulen.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notulen not found' }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Filter allowed fields to update
    const { 
      judul, tanggal, waktu, tempat, pemimpin, topik, 
      notulis, peserta, konten, undanganUrl, 
      daftarHadirUrl, dokumentasiUrls 
    } = json;

    const updateData: any = {};
    if (judul !== undefined) updateData.judul = judul;
    if (tanggal !== undefined) updateData.tanggal = tanggal;
    if (waktu !== undefined) updateData.waktu = waktu;
    if (tempat !== undefined) updateData.tempat = tempat;
    if (pemimpin !== undefined) updateData.pemimpin = pemimpin;
    if (topik !== undefined) updateData.topik = topik;
    if (notulis !== undefined) updateData.notulis = notulis;
    if (peserta !== undefined) updateData.peserta = peserta;
    if (konten !== undefined) updateData.konten = konten;
    if (undanganUrl !== undefined) updateData.undanganUrl = undanganUrl;
    if (daftarHadirUrl !== undefined) updateData.daftarHadirUrl = daftarHadirUrl;
    if (dokumentasiUrls !== undefined) updateData.dokumentasiUrls = dokumentasiUrls;

    console.log(`[PATCH] Updating notulen ${id}:`, updateData);

    await db.update(notulen).set(updateData).where(eq(notulen.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PATCH ERROR]:', error);
    return NextResponse.json({ error: 'Failed to update notulen' }, { status: 500 });
  }
}
