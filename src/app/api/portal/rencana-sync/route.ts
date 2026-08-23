import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncPortalRencana } from '@/lib/portal/rencanaSync';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await syncPortalRencana(session.user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message || 'Gagal sinkronisasi rencana' }, { status: 500 });
  }
}
