import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { parsePortalCurl } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { text } = await req.json();
    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: 'Teks curl kosong' }, { status: 400 });
    }

    const parsed = await parsePortalCurl(String(text));
    return NextResponse.json({
      success: true,
      portalUrl: parsed.portalUrl || '',
      cookie: parsed.cookie || '',
      xAuth: parsed.xAuth || '',
      skpid: parsed.skpid || '',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Gagal mem-parse curl dengan AI';
    console.error('Parse portal curl error:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
