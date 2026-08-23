import { db } from '@/db';
import { timKerja, masterRencana, portalIki } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCredentials } from './connector';
import { portalRequest, buildPortalHeaders } from './http';

export type RencanaSyncResult = {
  success: boolean;
  message: string;
  counts?: { teams: number; programs: number; iki: number };
};

function extractIkiText(it: any): string {
  return (
    it?.iki ||
    it?.nama ||
    it?.uraian ||
    it?.indikator ||
    it?.pkin ||
    it?.kegiatan ||
    ''
  );
}

function extractPkiId(it: any): string | null {
  if (it?.id) return String(it.id);
  if (it?.pkiId) return String(it.pkiId);
  if (it?.pkiid) return String(it.pkiid);
  return null;
}

export async function syncPortalRencana(userId: string): Promise<RencanaSyncResult> {
  const creds = await getCredentials(userId);
  if (!creds) return { success: false, message: 'Kredensial portal belum diatur di Pengaturan' };
  if (!creds.portalUrl) return { success: false, message: 'URL portal belum diatur di Pengaturan' };
  if (!creds.xAuth) return { success: false, message: 'Token X-Auth belum diatur di Pengaturan' };

  const skpid = creds.skpid || '1344761';
  const base = creds.portalUrl.replace(/\/$/, '');
  const headers = buildPortalHeaders(creds.cookie, creds.xAuth);

  let rkRes;
  try {
    rkRes = await portalRequest({
      method: 'GET',
      url: `${base}/api/v1/skp/rk?skpid=${encodeURIComponent(skpid)}&direct=1`,
      headers,
    });
  } catch (err: any) {
    return { success: false, message: `Gagal menghubungi portal: ${err?.message || err}` };
  }

  if (!rkRes.ok || !(rkRes.ctype || '').includes('json')) {
    return {
      success: false,
      message: `Portal menolak daftar rencana (${rkRes.status}). Cek Cookie/X-Auth & SKP ID. Respons: ${rkRes.body.slice(0, 200)}`,
    };
  }

  let rkList: any[];
  try {
    rkList = JSON.parse(rkRes.body);
  } catch {
    return { success: false, message: 'Respons daftar rencana bukan JSON' };
  }
  if (!Array.isArray(rkList)) return { success: false, message: 'Respons daftar rencana bukan array' };

  let teams = 0;
  let programs = 0;
  let iki = 0;

  // 1) Tim Kerja dari namatim
  const teamNames = Array.from(
    new Set(rkList.map((x) => x?.namatim).filter((v): v is string => typeof v === 'string' && v.length > 0)),
  );
  for (const name of teamNames) {
    const existing = await db
      .select()
      .from(timKerja)
      .where(and(eq(timKerja.userId, userId), eq(timKerja.nama, name)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(timKerja).values({ userId, nama: name, keterangan: 'Disinkron dari portal e-Kinerja' });
      teams++;
    }
  }

  // map namatim -> timId (termasuk yang mungkin sudah ada sebelumnya)
  const allTeams = await db.select().from(timKerja).where(eq(timKerja.userId, userId));
  const teamMap = new Map<string, string>();
  for (const t of allTeams) teamMap.set(t.nama, t.id);

  // 2) Program Kerja dari rencanakinerja
  for (const x of rkList) {
    const rkid = x?.rkid != null ? String(x.rkid) : '';
    const nama = x?.rencanakinerja || '';
    if (!rkid || !nama) continue;

    const timId = x?.namatim ? teamMap.get(x.namatim) || null : null;
    const existing = await db
      .select()
      .from(masterRencana)
      .where(and(eq(masterRencana.userId, userId), eq(masterRencana.portalRkid, rkid)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(masterRencana).values({
        userId,
        timId,
        nama,
        kode: rkid,
        portalRkid: rkid,
        portalSkpid: skpid,
      });
      programs++;
    } else {
      await db
        .update(masterRencana)
        .set({ timId: timId ?? existing[0].timId, portalRkid: rkid, portalSkpid: skpid })
        .where(eq(masterRencana.id, existing[0].id));
    }

    // 3) IKI dari /api/v1/skp/iki?rencanakinerjaid=<rkid>
    try {
      const ikiRes = await portalRequest({
        method: 'GET',
        url: `${base}/api/v1/skp/iki?rencanakinerjaid=${encodeURIComponent(rkid)}`,
        headers,
      });
      if (ikiRes.ok && (ikiRes.ctype || '').includes('json')) {
        const ikiList = JSON.parse(ikiRes.body);
        if (Array.isArray(ikiList)) {
          for (const it of ikiList) {
            const ikiText = extractIkiText(it);
            if (!ikiText) continue;
            const pkiId = extractPkiId(it);
            const dup = await db
              .select()
              .from(portalIki)
              .where(
                and(
                  eq(portalIki.userId, userId),
                  eq(portalIki.rkid, rkid),
                  pkiId ? eq(portalIki.pkiId, pkiId) : eq(portalIki.iki, ikiText),
                ),
              )
              .limit(1);
            if (dup.length === 0) {
              await db.insert(portalIki).values({
                userId,
                rkid,
                rencanakinerja: nama,
                pkiId,
                iki: ikiText,
                kode: it?.kode || null,
                raw: JSON.stringify(it),
              });
              iki++;
            }
          }
        }
      }
    } catch {
      // abaikan kegagalan satu IKI, lanjut program berikutnya
    }
  }

  return {
    success: true,
    message: `Sinkron selesai — ${teams} tim baru, ${programs} program baru, ${iki} IKI baru.`,
    counts: { teams, programs, iki },
  };
}
