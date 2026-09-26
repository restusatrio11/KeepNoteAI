import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { laporan, userSettings, users, masterRencana } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateDailyDossierDocx } from '@/lib/daily-dossier-docx';
import {
  uploadToDrive,
  getDriveClientForUser,
  getDriveClientFromServiceAccount,
  buildEvidenceFileName,
} from '@/lib/drive';
import { DossierDocumentPayload } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const dossier: DossierDocumentPayload = body.dossier;
    const rencanaId: string = body.rencanaId;
    const waktu: string = body.waktu || '08.00 - 16.00 WIB';

    if (!dossier || !dossier.tanggal || !dossier.pelaksana) {
      return NextResponse.json(
        { error: 'Data dossier (tanggal dan nama pelaksana) wajib diisi' },
        { status: 400 }
      );
    }

    if (!rencanaId) {
      return NextResponse.json(
        { error: 'Pilih Rencana Kinerja (SKP) terlebih dahulu' },
        { status: 400 }
      );
    }

    // Verify rencana exists
    const [rencana] = await db
      .select()
      .from(masterRencana)
      .where(eq(masterRencana.id, rencanaId))
      .limit(1);

    if (!rencana) {
      return NextResponse.json(
        { error: 'Rencana Kinerja tidak ditemukan' },
        { status: 404 }
      );
    }

    // 1. Generate DOCX Buffer
    const docxBuffer = await generateDailyDossierDocx(dossier);

    // 2. Upload to Google Drive if configured
    let docxDriveLink: string | null = null;
    let driveUploaded = false;
    let driveMessage = '';

    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userName = userRow?.name || session.user.name || 'Pegawai_BPS';

    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || settings?.driveRefreshToken) {
      try {
        const drive = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
          ? getDriveClientFromServiceAccount()
          : await getDriveClientForUser(userId);

        const fileNameBase = buildEvidenceFileName(
          userName,
          dossier.tanggal,
          rencana.kode,
          dossier.judul || 'Jurnal_Harian'
        );
        const fileName = `${fileNameBase}.docx`;
        const mimeType =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        const uploadResult = await uploadToDrive(
          docxBuffer,
          fileName,
          mimeType,
          settings?.driveFolderId || '',
          drive
        );

        if (uploadResult?.link) {
          docxDriveLink = uploadResult.link;
          driveUploaded = true;
        }
      } catch (driveErr: any) {
        console.warn('Drive upload error during save-jurnal:', driveErr);
        driveMessage = driveErr?.message || 'Gagal mengunggah ke Google Drive';
      }
    }

    // 3. Compile bukti URLs (Word Drive link + any photo web URLs)
    const buktiLinks: string[] = [];
    if (docxDriveLink) {
      buktiLinks.push(docxDriveLink);
    }
    if (Array.isArray(dossier.photos)) {
      for (const p of dossier.photos) {
        if (p.dataUrl && p.dataUrl.startsWith('http') && !buktiLinks.includes(p.dataUrl)) {
          buktiLinks.push(p.dataUrl);
        }
      }
    }

    // 4. Save into laporan table
    const jamMulai = waktu.split('-')[0]?.trim() || '08:00';
    const jamSelesai = waktu.split('-')[1]?.trim() || '16:00';

    const [newLaporan] = await db
      .insert(laporan)
      .values({
        userId: userId,
        tanggalMulai: dossier.tanggal,
        tanggalSelesai: dossier.tanggal,
        jamMulai,
        jamSelesai,
        rencanaId: rencana.id,
        kegiatan: dossier.judul || (dossier.uraianKegiatan?.[0] ?? 'Laporan Jurnal Kegiatan Harian'),
        progress: 100,
        capaian:
          dossier.capaianOutput?.join('; ') ||
          dossier.ringkasan ||
          'Kegiatan jurnal harian terlaksana 100%',
        buktiUrls: buktiLinks.length > 0 ? JSON.stringify(buktiLinks) : null,
        masukanSkp: dossier.ringkasan || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      laporanId: newLaporan.id,
      docxDriveLink,
      driveUploaded,
      message: driveUploaded
        ? 'Dokumen Word berhasil dibuat, diunggah ke Google Drive, dan dicatat ke daftar Laporan!'
        : 'Laporan berhasil dicatat ke database. Hubungkan Google Drive di Pengaturan agar file Word otomatis terunggah ke Drive Anda.',
    });
  } catch (error: any) {
    console.error('Error saving jurnal to laporan:', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal menyimpan jurnal ke laporan' },
      { status: 500 }
    );
  }
}
