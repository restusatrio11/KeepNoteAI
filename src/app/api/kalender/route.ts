import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { laporan, masterRencana, timKerja } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and, gte, lte } from 'drizzle-orm';

const TEAM_PALETTE = [
  { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.5)', text: '#93c5fd', dot: '#3b82f6' },
  { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.5)', text: '#6ee7b7', dot: '#10b981' },
  { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.5)', text: '#fca5a5', dot: '#ef4444' },
  { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.5)', text: '#fcd34d', dot: '#f59e0b' },
  { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.5)', text: '#c4b5fd', dot: '#8b5cf6' },
  { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.5)', text: '#f9a8d4', dot: '#ec4899' },
  { bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.5)', text: '#7dd3fc', dot: '#0ea5e9' },
  { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.5)', text: '#d8b4fe', dot: '#a855f7' },
];

interface TeamColor {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

function colorForIndex(index: number): TeamColor {
  return TEAM_PALETTE[index % TEAM_PALETTE.length];
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  const [year, mon] = month.split('-').map(Number);
  const firstDay = `${month}-01`;
  const lastDay = new Date(year, mon, 0).toISOString().slice(0, 10);

  try {
    const events = await db
      .select({
        id: laporan.id,
        tanggalMulai: laporan.tanggalMulai,
        tanggalSelesai: laporan.tanggalSelesai,
        jamMulai: laporan.jamMulai,
        jamSelesai: laporan.jamSelesai,
        kegiatan: laporan.kegiatan,
        progress: laporan.progress,
        rencanaId: laporan.rencanaId,
        rencanaNama: masterRencana.nama,
        rencanaKode: masterRencana.kode,
        timId: masterRencana.timId,
        timNama: timKerja.nama,
      })
      .from(laporan)
      .leftJoin(masterRencana, eq(laporan.rencanaId, masterRencana.id))
      .leftJoin(timKerja, eq(masterRencana.timId, timKerja.id))
      .where(
        and(
          eq(laporan.userId, session.user.id),
          gte(laporan.tanggalSelesai, firstDay),
          lte(laporan.tanggalMulai, lastDay)
        )
      );

    const teamsMap = new Map<string, { id: string; nama: string; color: TeamColor }>();
    let idx = 0;
    for (const e of events) {
      if (e.timId && e.timNama && !teamsMap.has(e.timId)) {
        teamsMap.set(e.timId, { id: e.timId, nama: e.timNama, color: colorForIndex(idx++) });
      }
    }

    const teams = Array.from(teamsMap.values()).sort((a, b) => a.nama.localeCompare(b.nama));

    const normalized = events.map((e) => ({
      id: e.id,
      tanggalMulai: e.tanggalMulai,
      tanggalSelesai: e.tanggalSelesai,
      jamMulai: e.jamMulai,
      jamSelesai: e.jamSelesai,
      kegiatan: e.kegiatan,
      progress: e.progress,
      rencanaNama: e.rencanaNama,
      rencanaKode: e.rencanaKode,
      timId: e.timId,
      timNama: e.timNama,
    }));

    return NextResponse.json({ teams, events: normalized });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 });
  }
}
