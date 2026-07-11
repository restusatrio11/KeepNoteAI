import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { db } from '@/db';
import { laporan, masterRencana } from '@/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const filters = [eq(laporan.userId, userId)];
    if (from) filters.push(gte(laporan.tanggalMulai, from));
    if (to) filters.push(lte(laporan.tanggalMulai, to));

    const data = await db
      .select({
        tanggal: laporan.tanggalMulai,
        rencana: masterRencana.nama,
        kegiatan: laporan.kegiatan,
        progress: laporan.progress,
        capaian: laporan.capaian,
        bukti: laporan.buktiUrls,
      })
      .from(laporan)
      .innerJoin(masterRencana, eq(laporan.rencanaId, masterRencana.id))
      .where(and(...filters))
      .orderBy(desc(laporan.tanggalMulai));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Pekerjaan');

    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Tanggal', key: 'tanggal', width: 15 },
      { header: 'Rencana Kinerja', key: 'rencana', width: 25 },
      { header: 'Kegiatan', key: 'kegiatan', width: 40 },
      { header: 'Progress', key: 'progress', width: 10 },
      { header: 'Capaian', key: 'capaian', width: 30 },
      { header: 'Bukti Dukung', key: 'bukti', width: 40 },
    ];

    data.forEach((item, index) => {
      worksheet.addRow({
        no: index + 1,
        ...item,
      });
    });

    // Formatting
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Laporan_Pekerjaan.xlsx"',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to export excel' }, { status: 500 });
  }
}
