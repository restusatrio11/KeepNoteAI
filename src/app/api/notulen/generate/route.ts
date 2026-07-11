import { NextRequest, NextResponse } from 'next/server';
import { generateMeetingNotes, processMeetingAudio } from '@/lib/ai';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { rawNotes, audio, contentType, metadata } = await req.json();

    let result;
    if (audio && contentType) {
      result = await processMeetingAudio(audio, contentType, metadata || {});
    } else if (rawNotes) {
      result = await generateMeetingNotes(rawNotes, metadata || {});
    } else {
      return NextResponse.json({ error: 'Catatan kasar atau rekaman audio diperlukan' }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghasilkan notulen' }, { status: 500 });
  }
}
