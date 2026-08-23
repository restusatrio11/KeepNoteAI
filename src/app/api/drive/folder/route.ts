import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getDriveClientForUser } from '@/lib/drive';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const drive = await getDriveClientForUser(session.user.id);
    const res = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name)',
      pageSize: 200,
      orderBy: 'name',
    });
    return NextResponse.json({ folders: res.data.files || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal memuat folder' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { folderId, folderName } = await req.json();
    const drive = await getDriveClientForUser(session.user.id);

    let finalId: string | null = folderId || null;

    if (!finalId && folderName && folderName.trim()) {
      const raw = folderName.trim();
      const linkMatch = raw.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      const pastedId = linkMatch ? linkMatch[1] : (raw.match(/^[a-zA-Z0-9-_]{20,}$/) ? raw : null);

      if (pastedId) {
        finalId = pastedId;
      } else {
        const name = raw.replace(/'/g, "\\'");
        const list = await drive.files.list({
          q: `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: 'files(id)',
          pageSize: 1,
        });
        if (list.data.files && list.data.files.length > 0) {
          finalId = list.data.files[0].id as string;
        } else {
          const created = await drive.files.create({
            requestBody: { name: raw, mimeType: 'application/vnd.google-apps.folder' },
            fields: 'id',
          });
          finalId = created.data.id as string;
        }
      }
    }

    if (!finalId) {
      return NextResponse.json({ error: 'Pilih folder atau isi nama folder baru' }, { status: 400 });
    }

    await db.update(userSettings)
      .set({ driveFolderId: finalId, updatedAt: new Date() })
      .where(eq(userSettings.userId, session.user.id));

    return NextResponse.json({ success: true, folderId: finalId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal menyimpan folder' }, { status: 400 });
  }
}
