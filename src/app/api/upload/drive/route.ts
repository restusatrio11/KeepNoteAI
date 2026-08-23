import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { userSettings, masterRencana, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { uploadToDrive, getDriveClientForUser, getDriveClientFromServiceAccount, buildEvidenceFileName } from '@/lib/drive';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's drive settings & name
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const userName = userRow?.name || 'user';

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !settings?.driveRefreshToken) {
      return NextResponse.json({ error: 'Google Drive belum dihubungkan. Buka Pengaturan untuk menghubungkan akun Drive Anda.' }, { status: 400 });
    }

    let drive;
    try {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        drive = getDriveClientFromServiceAccount();
      } else {
        drive = await getDriveClientForUser(userId);
      }
    } catch {
      return NextResponse.json({ error: 'Google Drive belum dikonfigurasi. Hubungkan akun Drive di Pengaturan atau set GOOGLE_SERVICE_ACCOUNT_JSON.' }, { status: 400 });
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

    // 2. Format Tanggal YYYY-MM-DD
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 3. Nama file: nama_tgl_kode_kegiatan
    const extension = file.name.split('.').pop();
    const finalBase = buildEvidenceFileName(userName, dateStr, prefix, deskripsi || 'kegiatan');
    const finalFileName = `${finalBase}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const result = await uploadToDrive(
      buffer,
      finalFileName,
      file.type,
      settings.driveFolderId || '',
      drive
    );

    return NextResponse.json({ 
      success: true, 
      fileId: result.id, 
      link: result.link,
      fallback: result.fallback || false,
      message: result.fallback
        ? 'Folder tujuan tidak bisa ditulis, file disimpan di folder KeepNoteAI milik Anda.'
        : undefined,
    });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Gagal mengunggah file ke Google Drive.' 
    }, { status: 500 });
  }
}
