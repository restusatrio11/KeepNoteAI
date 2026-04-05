import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { userSettings, masterRencana } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { uploadToDrive } from '@/lib/drive';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's drive folder ID
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);

    if (!settings?.driveFolderId) {
      return NextResponse.json({ error: 'Google Drive folder belum dikonfigurasi di Pengaturan.' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const rencanaId = formData.get('rencanaId') as string;
    const deskripsi = formData.get('deskripsi') as string;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah.' }, { status: 400 });
    }

    // 1. Get Kode Rencana
    let prefix = 'FILE';
    if (rencanaId) {
      const [rencana] = await db.select().from(masterRencana).where(eq(masterRencana.id, rencanaId)).limit(1);
      if (rencana) prefix = rencana.kode.toUpperCase();
    }

    // 2. Format Date DDMMYYYY
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '');

    // 3. Generate AI Summary (3 words)
    let aiSummary = 'kegiatan';
    if (deskripsi) {
      try {
        const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL || 'qwen/qwen-plus',
            messages: [
              { role: 'system', content: 'Berikan ringkasan tepat 3 kata dari teks berikut untuk nama file. Gabungkan dengan tanda hubung. Hanya berikan 3 kata saja, tanpa penjelasan.' },
              { role: 'content', content: deskripsi }
            ]
          })
        });
        const aiData = await aiRes.json();
        const summary = aiData.choices?.[0]?.message?.content?.trim();
        if (summary) {
          aiSummary = summary.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
        }
      } catch (e) {
        console.error('AI Naming Error:', e);
      }
    }

    // 4. Final Filename
    const extension = file.name.split('.').pop();
    const finalFileName = `${prefix}_${dateStr}_${aiSummary}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const result = await uploadToDrive(
      buffer,
      finalFileName,
      file.type,
      settings.driveFolderId
    );

    return NextResponse.json({ 
      success: true, 
      fileId: result.id, 
      link: result.link 
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Gagal mengunggah file ke Google Drive.' 
    }, { status: 500 });
  }
}
