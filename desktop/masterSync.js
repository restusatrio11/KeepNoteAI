/**
 * Sinkronisasi master data (Tim Kerja & Program Kerja + IKI) dari portal e-Kinerja
 * ke database pusat (Neon) — parity dengan src/lib/portal/rencanaSync.ts di web.
 *
 * Bedanya dengan web: kredensial portal (cookie, xAuth, skpid, portalUrl) diberikan
 * langsung dari config desktop (tersimpan lokal), bukan dari tabel portal_credentials.
 */
const { buildPortalHeaders, portalRequest } = require('./portalHttp');
const db = require('./db');

function extractIkiText(it) {
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

function extractPkiId(it) {
  if (it?.id) return String(it.id);
  if (it?.pkiId) return String(it.pkiId);
  if (it?.pkiid) return String(it.pkiid);
  return null;
}

async function fetchRkList(creds) {
  const base = (creds.portalUrl || 'https://kipapp.bps.go.id').replace(/\/$/, '');
  const skpid = creds.skpid || '1344761';
  const res = await portalRequest({
    method: 'GET',
    url: `${base}/api/v1/skp/rk?skpid=${encodeURIComponent(skpid)}&direct=1`,
    headers: buildPortalHeaders(creds.cookie, creds.xAuth, creds.portalUrl),
  });
  if (!res.ok || !(res.ctype || '').includes('json')) {
    throw new Error(`Portal menolak (${res.status}): ${res.body.slice(0, 200)}`);
  }
  const list = JSON.parse(res.body);
  if (!Array.isArray(list)) throw new Error('Respons daftar rencana bukan array');
  return list;
}

async function syncMasterData(creds, userId) {
  if (!creds.portalUrl || !creds.xAuth) {
    throw new Error('URL portal / X-Auth belum diatur di Pengaturan');
  }
  const skpid = creds.skpid || '1344761';
  const base = creds.portalUrl.replace(/\/$/, '');
  const headers = buildPortalHeaders(creds.cookie, creds.xAuth, creds.portalUrl);

  const rkList = await fetchRkList(creds);

  let teams = 0;
  let programs = 0;
  let iki = 0;

  // 1) Tim Kerja dari namatim
  const teamNames = Array.from(
    new Set(rkList.map((x) => x?.namatim).filter((v) => typeof v === 'string' && v.length > 0)),
  );
  for (const name of teamNames) {
    if (await db.upsertTimKerja(userId, name)) teams++;
  }

  // map namatim -> timId
  const allTeams = await db.listTimKerja(userId);
  const teamMap = new Map();
  for (const t of allTeams) teamMap.set(t.nama, t.id);

  // 2) Program Kerja + 3) IKI
  for (const x of rkList) {
    const rkid = x?.rkid != null ? String(x.rkid) : '';
    const nama = x?.rencanakinerja || '';
    if (!rkid || !nama) continue;

    const timId = x?.namatim ? teamMap.get(x.namatim) || null : null;
    if (await db.upsertRencana(userId, { rkid, nama, timId, skpid })) programs++;

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
            if (
              await db.upsertIki(userId, {
                rkid,
                nama,
                pkiId,
                iki: ikiText,
                kode: it?.kode || null,
                raw: JSON.stringify(it),
              })
            ) {
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

module.exports = { syncMasterData, fetchRkList };
