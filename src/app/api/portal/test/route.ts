import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { testPortalConnection } from '@/lib/portal/connector';

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await testPortalConnection(session.user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error?.message || 'Gagal mengetes koneksi' }, { status: 500 });
  }
}
