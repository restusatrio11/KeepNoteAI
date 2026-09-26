import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { polishDailyDossier } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { deskripsi, meta } = body;

    if (!deskripsi || typeof deskripsi !== 'string' || deskripsi.trim().length === 0) {
      return NextResponse.json({ error: 'Deskripsi kegiatan tidak boleh kosong' }, { status: 400 });
    }

    const polished = await polishDailyDossier(deskripsi.trim(), {
      tim: meta?.tim,
      rencana: meta?.rencana,
      pelaksana: meta?.pelaksana || session.user.name || 'Pegawai BPS',
      judul: meta?.judul,
      lokasi: meta?.lokasi,
    });

    return NextResponse.json({ success: true, data: polished });
  } catch (error: any) {
    console.error('Error in /api/ai/polish-dossier:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal merapikan laporan dengan AI' },
      { status: 500 }
    );
  }
}
