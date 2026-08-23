import { db } from '@/db';
import { laporan, masterRencana, portalCredentials } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decryptSecret } from './crypto';
import { portalRequest, buildPortalHeaders } from './http';

export type SyncResult = { success: boolean; message: string; duplicate?: boolean };

const DUPLICATE_HINTS = [
  'sudah ada',
  'duplicate',
  'duplikat',
  'ganda',
  'telah ada',
  'already exist',
  'data exist',
  'sudah tersimpan',
];

function looksLikeDuplicate(text: string): boolean {
  const t = (text || '').toLowerCase();
  return DUPLICATE_HINTS.some((h) => t.includes(h));
}

type Creds = {
  portalUrl: string | null;
  cookie: string;
  xAuth: string;
  skpid: string | null;
};

export async function getCredentials(userId: string): Promise<Creds | null> {
  const [row] = await db
    .select()
    .from(portalCredentials)
    .where(eq(portalCredentials.userId, userId))
    .limit(1);
  if (!row) return null;
  return {
    portalUrl: row.portalUrl,
    cookie: decryptSecret(row.cookieEnc),
    xAuth: row.xAuthEnc ? decryptSecret(row.xAuthEnc) : '',
    skpid: row.skpid || null,
  };
}

function headersFor(creds: Creds) {
  return buildPortalHeaders(creds.cookie, creds.xAuth);
}

function normalize(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function resolveRkid(
  creds: Creds,
  rencanaNama: string,
  storedRkid: string | null,
): Promise<{ rkid: string | null; source: 'stored' | 'name' | 'none' }> {
  if (storedRkid) return { rkid: storedRkid, source: 'stored' };

  if (!creds.skpid) return { rkid: null, source: 'none' };

  const base = (creds.portalUrl || 'https://kipapp.bps.go.id').replace(/\/$/, '');
  try {
    const res = await portalRequest({
      method: 'GET',
      url: `${base}/api/v1/skp/rk?skpid=${encodeURIComponent(creds.skpid)}&direct=1`,
      headers: headersFor(creds),
    });
    const ctype = res.ctype || '';
    if (!res.ok || !ctype.includes('json')) return { rkid: null, source: 'none' };
    const list = JSON.parse(res.body);
    if (!Array.isArray(list)) return { rkid: null, source: 'none' };

    const target = normalize(rencanaNama);
    let best: { rkid: string; score: number } | null = null;
    for (const item of list) {
      const name = normalize(item.rencanakinerja || '');
      if (!name) continue;
      let score = 0;
      if (name === target) score = 100;
      else if (name.includes(target) || target.includes(name)) score = 70;
      else {
        const a = target.split(' ');
        const b = name.split(' ');
        const inter = a.filter((w) => b.includes(w)).length;
        if (inter >= 2 && inter / Math.max(a.length, b.length) >= 0.4) score = 50;
      }
      if (score > 0 && (!best || score > best.score)) best = { rkid: String(item.rkid), score };
    }
    if (best) return { rkid: best.rkid, source: 'name' };
  } catch {
    /* ignore */
  }
  return { rkid: null, source: 'none' };
}

export async function syncOneLaporan(userId: string, laporanId: string): Promise<SyncResult> {
  const creds = await getCredentials(userId);
  if (!creds) return { success: false, message: 'Kredensial portal belum diatur di Pengaturan' };
  if (!creds.portalUrl) return { success: false, message: 'URL portal belum diatur di Pengaturan' };
  if (!creds.xAuth) return { success: false, message: 'Token X-Auth belum diatur di Pengaturan' };
  if (!creds.skpid) return { success: false, message: 'SKP ID belum diatur di Pengaturan → Integrasi e-Kinerja' };

  const [row] = await db
    .select({
      id: laporan.id,
      tanggalMulai: laporan.tanggalMulai,
      tanggalSelesai: laporan.tanggalSelesai,
      jamMulai: laporan.jamMulai,
      jamSelesai: laporan.jamSelesai,
      kegiatan: laporan.kegiatan,
      progress: laporan.progress,
      capaian: laporan.capaian,
      buktiUrls: laporan.buktiUrls,
      rencanaNama: masterRencana.nama,
      rkid: masterRencana.portalRkid,
    })
    .from(laporan)
    .leftJoin(masterRencana, eq(laporan.rencanaId, masterRencana.id))
    .where(eq(laporan.id, laporanId))
    .limit(1);

  if (!row) return { success: false, message: 'Laporan tidak ditemukan' };

  const { rkid, source } = await resolveRkid(creds, row.rencanaNama || '', row.rkid || null);
  if (!rkid) {
    return {
      success: false,
      message: `Rencana "${row.rencanaNama || '-'}" belum terpetakan ke portal. Buka Pengaturan → Integrasi e-Kinerja → pilih Rencana Kinerja yang cocok, atau samakan namanya dengan portal.`,
    };
  }

  let bukti = '';
  try {
    const urls = JSON.parse(row.buktiUrls || '[]');
    bukti = Array.isArray(urls) ? urls.join('\n') : row.buktiUrls || '';
  } catch {
    bukti = row.buktiUrls || '';
  }

  const base = creds.portalUrl.replace(/\/$/, '');
  const payload = {
    skpid: creds.skpid,
    rkid,
    kegiatan: row.kegiatan || '',
    tanggal: row.tanggalMulai,
    tanggalselesai: row.tanggalSelesai && row.tanggalSelesai !== row.tanggalMulai ? row.tanggalSelesai : null,
    progres: row.progress ?? 100,
    jammulai: row.jamMulai || null,
    jamselesai: row.jamSelesai || null,
    capaian: row.capaian || '',
    iscapaianskp: 1,
    ...(bukti ? { datadukung: bukti } : {}),
  };

  try {
    const res = await portalRequest({
      method: 'POST',
      url: `${base}/api/v1/kegiatan`,
      headers: { ...headersFor(creds), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const via = source === 'name' ? ' (cocok nama)' : '';
      if (looksLikeDuplicate(res.body)) {
        return { success: false, duplicate: true, message: 'Sudah ada di portal (duplikat, dilewati)' };
      }
      return { success: true, message: `Berhasil dikirim ke portal${via}` };
    }
    if (looksLikeDuplicate(res.body)) {
      return { success: false, duplicate: true, message: 'Sudah ada di portal (duplikat, dilewati)' };
    }
    return { success: false, message: `Portal menolak (${res.status}): ${res.body.slice(0, 300)}` };
  } catch (err: any) {
    return { success: false, message: `Gagal menghubungi portal: ${err?.message || err}` };
  }
}

export async function testPortalConnection(userId: string): Promise<SyncResult> {
  const creds = await getCredentials(userId);
  if (!creds) return { success: false, message: 'Kredensial portal belum diatur di Pengaturan' };
  if (!creds.portalUrl) return { success: false, message: 'URL portal belum diatur di Pengaturan' };
  if (!creds.xAuth) return { success: false, message: 'Token X-Auth belum diatur di Pengaturan' };

  const base = creds.portalUrl.replace(/\/$/, '');
  try {
    const res = await portalRequest({
      method: 'GET',
      url: `${base}/api/v1/skp/rk?skpid=${encodeURIComponent(creds.skpid || '1344761')}&direct=1`,
      headers: headersFor(creds),
    });
    if (res.ok && (res.ctype || '').includes('json')) {
      return { success: true, message: 'Koneksi API portal berhasil (Cookie + X-Auth valid)' };
    }
    return { success: false, message: `API menolak (${res.status}): ${res.body.slice(0, 200)}` };
  } catch (err: any) {
    return { success: false, message: `Gagal menghubungi portal: ${err?.message || err}` };
  }
}
