/**
 * Port dari src/lib/portal/connector.ts — logika resolve rkid + kirim kegiatan.
 * Berbeda dengan versi web yang membaca DB & dekripsi, di sini kredensial portal
 * (cookie, xAuth, skpid, portalUrl) diberikan langsung (disimpan lokal di desktop),
 * dan data laporan diberikan oleh pemanggil. Semua request keluar dari IP desktop.
 */
const { buildPortalHeaders, portalRequest } = require('./portalHttp');

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

function looksLikeDuplicate(text) {
  const t = (text || '').toLowerCase();
  return DUPLICATE_HINTS.some((h) => t.includes(h));
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Tentukan rkid portal untuk sebuah rencana.
 * Prioritas: portalRkid tersimpan (dari web) → cocok nama via API portal.
 */
async function resolveRkid(creds, rencanaNama, storedRkid) {
  if (storedRkid) return { rkid: storedRkid, source: 'stored' };
  if (!creds.skpid) return { rkid: null, source: 'none' };

  const base = (creds.portalUrl || 'https://kipapp.bps.go.id').replace(/\/$/, '');
  try {
    const res = await portalRequest({
      method: 'GET',
      url: `${base}/api/v1/skp/rk?skpid=${encodeURIComponent(creds.skpid)}&direct=1`,
      headers: buildPortalHeaders(creds.cookie, creds.xAuth, creds.portalUrl),
    });
    const ctype = res.ctype || '';
    if (!res.ok || !ctype.includes('json')) return { rkid: null, source: 'none' };
    const list = JSON.parse(res.body);
    if (!Array.isArray(list)) return { rkid: null, source: 'none' };

    const target = normalize(rencanaNama);
    let best = null;
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

async function syncOneLaporan(creds, laporan, rencanaNama, storedRkid) {
  if (!creds.portalUrl) return { success: false, message: 'URL portal belum diatur' };
  if (!creds.xAuth) return { success: false, message: 'Token X-Auth belum diatur' };
  if (!creds.skpid) return { success: false, message: 'SKP ID belum diatur' };

  const { rkid, source } = await resolveRkid(creds, rencanaNama || '', storedRkid || null);
  if (!rkid) {
    return {
      success: false,
      message: `Rencana "${rencanaNama || '-'}" belum terpetakan ke portal. Isi portalRkid di web (Settings → Integrasi e-Kinerja) atau samakan namanya.`,
    };
  }

  let bukti = '';
  try {
    const urls = JSON.parse(laporan.buktiUrls || '[]');
    bukti = Array.isArray(urls) ? urls.join('\n') : laporan.buktiUrls || '';
  } catch {
    bukti = laporan.buktiUrls || '';
  }

  const base = creds.portalUrl.replace(/\/$/, '');
  const payload = {
    skpid: creds.skpid,
    rkid,
    kegiatan: laporan.kegiatan || '',
    tanggal: laporan.tanggalMulai,
    tanggalselesai:
      laporan.tanggalSelesai && laporan.tanggalSelesai !== laporan.tanggalMulai
        ? laporan.tanggalSelesai
        : null,
    progres: laporan.progress ?? 100,
    jammulai: laporan.jamMulai || null,
    jamselesai: laporan.jamSelesai || null,
    capaian: laporan.capaian || '',
    iscapaianskp: 1,
    ...(bukti ? { datadukung: bukti } : {}),
  };

  try {
    const res = await portalRequest({
      method: 'POST',
      url: `${base}/api/v1/kegiatan`,
      headers: {
        ...buildPortalHeaders(creds.cookie, creds.xAuth, creds.portalUrl),
        'Content-Type': 'application/json',
      },
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
  } catch (err) {
    return { success: false, message: `Gagal menghubungi portal: ${err?.message || err}` };
  }
}

async function testPortal(creds) {
  if (!creds.portalUrl) return { success: false, message: 'URL portal belum diatur' };
  if (!creds.xAuth) return { success: false, message: 'Token X-Auth belum diatur' };

  const base = creds.portalUrl.replace(/\/$/, '');
  try {
    const res = await portalRequest({
      method: 'GET',
      url: `${base}/api/v1/skp/rk?skpid=${encodeURIComponent(creds.skpid || '1344761')}&direct=1`,
      headers: buildPortalHeaders(creds.cookie, creds.xAuth, creds.portalUrl),
    });
    if (res.ok && (res.ctype || '').includes('json')) {
      return { success: true, message: 'Koneksi API portal berhasil (Cookie + X-Auth valid)' };
    }
    return { success: false, message: `API menolak (${res.status}): ${res.body.slice(0, 200)}` };
  } catch (err) {
    return { success: false, message: `Gagal menghubungi portal: ${err?.message || err}` };
  }
}

module.exports = { syncOneLaporan, testPortal, resolveRkid };
