import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { mapRencanaToPortal } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rencana, portal } = await req.json();
    if (!Array.isArray(rencana) || !Array.isArray(portal)) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }
    const mappings = await mapRencanaToPortal(rencana, portal);
    return NextResponse.json({ success: true, mappings });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Gagal memetakan dengan AI';
    console.error('Portal map error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
