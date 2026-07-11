import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { db } from '@/db';
import { laporan, masterRencana } from '@/db/schema';
import { eq, desc, and, gte, lte, like, or, sql } from 'drizzle-orm';
import { auth } from '@/auth';

function getTriwulan(tanggal: string) {
  const month = new Date(tanggal).getMonth() + 1;
  if (month <= 3) return 'TW I (Jan-Mar)';
  if (month <= 6) return 'TW II (Apr-Jun)';
  if (month <= 9) return 'TW III (Jul-Sep)';
  return 'TW IV (Oct-Dec)';
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const rencanaId = searchParams.get('rencanaId');
    const search = searchParams.get('search');

    const filters = [eq(laporan.userId, userId)];
    if (from) filters.push(gte(laporan.tanggalMulai, from));
    if (to) filters.push(lte(laporan.tanggalMulai, to));
    if (rencanaId && rencanaId !== 'all') filters.push(eq(laporan.rencanaId, rencanaId));
    if (search) {
      filters.push(or(
        like(laporan.kegiatan, `%${search}%`),
        like(laporan.capaian, `%${search}%`)
      ));
    }

    const data = await db
      .select({
        tanggalMulai: laporan.tanggalMulai,
        tanggalSelesai: laporan.tanggalSelesai,
        jamMulai: laporan.jamMulai,
        jamSelesai: laporan.jamSelesai,
        rencana: masterRencana.nama,
        kodeRk: masterRencana.kode,
        iki: masterRencana.iki,
        kegiatan: laporan.kegiatan,
        progress: laporan.progress,
        capaian: laporan.capaian,
        masukanSkp: laporan.masukanSkp,
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
      { header: 'Triwulan', key: 'triwulan', width: 18 },
      { header: 'Tanggal', key: 'tanggal', width: 22 },
      { header: 'Jam', key: 'jam', width: 15 },
      { header: 'Kode RK', key: 'kodeRk', width: 12 },
      { header: 'Rencana Kinerja', key: 'rencana', width: 25 },
      { header: 'IKI', key: 'iki', width: 20 },
      { header: 'Kegiatan', key: 'kegiatan', width: 40 },
      { header: 'Progress (%)', key: 'progress', width: 12 },
      { header: 'Capaian', key: 'capaian', width: 35 },
      { header: 'Masukan SKP', key: 'masukanSkp', width: 25 },
      { header: 'Bukti Dukung', key: 'bukti', width: 40 },
    ];

    data.forEach((item, index) => {
      let tanggal = item.tanggalMulai;
      if (item.tanggalSelesai && item.tanggalSelesai !== item.tanggalMulai) {
        tanggal = `${item.tanggalMulai} - ${item.tanggalSelesai}`;
      }
      const jam = [item.jamMulai, item.jamSelesai].filter(Boolean).join(' - ');

      let buktiStr = '';
      try {
        const urls = JSON.parse(item.bukti || '[]');
        if (Array.isArray(urls)) buktiStr = urls.join('\n');
        else buktiStr = item.bukti || '';
      } catch { buktiStr = item.bukti || ''; }

      worksheet.addRow({
        no: index + 1,
        triwulan: getTriwulan(item.tanggalMulai),
        tanggal,
        jam: jam || '-',
        kodeRk: item.kodeRk,
        rencana: item.rencana,
        iki: item.iki || '-',
        kegiatan: item.kegiatan,
        progress: item.progress ?? 100,
        capaian: item.capaian || '-',
        masukanSkp: item.masukanSkp || '-',
        bukti: buktiStr,
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Laporan_Pekerjaan.xlsx"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to export excel' }, { status: 500 });
  }
}
