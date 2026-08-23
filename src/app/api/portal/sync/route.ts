import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncOneLaporan } from '@/lib/portal/connector';
import { z } from 'zod';

const bodySchema = z.object({
  laporanId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = bodySchema.parse(await req.json());
    const result = await syncOneLaporan(session.user.id, body.laporanId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'laporanId wajib diisi' }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: error?.message || 'Gagal sinkronisasi' }, { status: 500 });
  }
}
