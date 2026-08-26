/**
 * Import Excel Kegiatan untuk KeepNoteAI Desktop.
 * - buildTemplate(rencanaRows): membuat file template .xlsx (kolom sama dengan web).
 * - parseWorkbook(buffer, rencanaRows): membaca file hasil isi user, validasi,
 *   dan memetakan ke bentuk siap-insert ke tabel laporan.
 *
 * Kolom template (sama dengan kolom laporan di website):
 *   Tanggal Mulai | Tanggal Selesai | Jam Mulai | Jam Selesai |
 *   Kode RK | Rencana Kinerja | Kegiatan | Progress (%) |
 *   Capaian | Masukan SKP | Bukti Dukung
 */
const ExcelJS = require('exceljs');

const HEADERS = [
  'Tanggal Mulai',
  'Tanggal Selesai',
  'Jam Mulai',
  'Jam Selesai',
  'Kode RK',
  'Rencana Kinerja',
  'Kegiatan',
  'Progress (%)',
  'Capaian',
  'Masukan SKP',
  'Bukti Dukung',
];

function normHeader(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// --- Normalisasi nilai sel ---

function normDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // Excel serial date (angka murni)
  if (typeof v === 'number' && isFinite(v) && v > 20000 && v < 60000) {
    const ms = Math.round((v - 25569) * 86400000);
    return normDate(new Date(ms));
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return normDate(d);
  return null;
}

function normJam(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{1,2}):(\d{2})/);
    if (m) {
      const h = String(Math.min(23, parseInt(m[1], 10))).padStart(2, '0');
      return `${h}:${m[2]}`;
    }
    return v.trim() || null;
  }
  if (typeof v === 'number' && isFinite(v)) {
    // fraksi hari (0.5 = 12:00)
    const totalMin = Math.round(v * 24 * 60);
    const h = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
    const mm = String(totalMin % 60).padStart(2, '0');
    return `${h}:${mm}`;
  }
  if (v instanceof Date && !isNaN(v.getTime())) {
    // Sel "jam saja" (epoch ~1899/1900) direkonstruksi ExcelJS dari serial UTC,
    // jadi baca pakai UTC. Datetime penuh dibaca pakai waktu lokal.
    const timeOnly = v.getFullYear() < 1901;
    const h = String((timeOnly ? v.getUTCHours() : v.getHours())).padStart(2, '0');
    const mm = String(timeOnly ? v.getUTCMinutes() : v.getMinutes()).padStart(2, '0');
    return `${h}:${mm}`;
  }
  return String(v).trim() || null;
}

function normProgress(v) {
  if (v == null || v === '') return 100;
  const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
  if (isNaN(n)) return 100;
  return Math.max(0, Math.min(100, n));
}

function normBukti(v) {
  if (v == null || v === '') return null;
  const parts = String(v)
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? JSON.stringify(parts) : null;
}

// --- Pencocokan rencana (Kode RK persis, lalu nama mirip) ---

function matchRencana(kode, nama, rencanaRows) {
  const k = String(kode || '').trim().toLowerCase();
  const n = String(nama || '').trim().toLowerCase();
  if (!k && !n) return null;
  if (k) {
    const byKode = rencanaRows.find(
      (r) => String(r.kode || '').trim().toLowerCase() === k,
    );
    if (byKode) return byKode;
  }
  if (n) {
    let best = null;
    let bestScore = 0;
    for (const r of rencanaRows) {
      const rn = String(r.nama || '').trim().toLowerCase();
      if (!rn) continue;
      if (rn === n) return r;
      const score =
        (rn.includes(n) || n.includes(rn))
          ? Math.min(n.length, rn.length) / Math.max(n.length, rn.length)
          : 0;
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }
    if (bestScore >= 0.6) return best;
  }
  return null;
}

// --- Template ---

async function buildTemplate(rencanaRows) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'KeepNoteAI Desktop';

  const ws = wb.addWorksheet('Kegiatan');
  ws.columns = HEADERS.map((h, i) => ({
    header: h,
    key: h,
    width: [14, 14, 10, 10, 10, 28, 42, 12, 36, 22, 40][i],
  }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

  ws.addRow({
    'Tanggal Mulai': '2026-08-25',
    'Tanggal Selesai': '2026-08-25',
    'Jam Mulai': '08:00',
    'Jam Selesai': '16:00',
    'Kode RK': (rencanaRows[0] && rencanaRows[0].kode) || 'RK01',
    'Rencana Kinerja': (rencanaRows[0] && rencanaRows[0].nama) || 'Contoh Rencana Kinerja',
    Kegiatan: 'CONTOH — hapus baris ini sebelum import',
    'Progress (%)': 100,
    Capaian: 'Contoh capaian kegiatan (wajib diisi)',
    'Masukan SKP': '',
    'Bukti Dukung': 'https://contoh.link/bukti.pdf',
  });

  // Sheet referensi: daftar Rencana Kinerja milik user (kode + nama)
  const ref = wb.addWorksheet('Referensi RK');
  ref.columns = [
    { header: 'Kode RK', key: 'kode', width: 12 },
    { header: 'Rencana Kinerja', key: 'nama', width: 60 },
  ];
  ref.getRow(1).font = { bold: true };
  for (const r of rencanaRows || []) ref.addRow({ kode: r.kode, nama: r.nama });
  ref.getColumn('nama').alignment = { wrapText: true, vertical: 'top' };

  // Data validation kolom Kode RK dari sheet Referensi
  if ((rencanaRows || []).length) {
    const last = Math.min(200, rencanaRows.length + 1);
    for (let i = 2; i <= 500; i++) {
      ws.getCell(`E${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`='Referensi RK'!$A$2:$A$${last}`],
        showErrorMessage: true,
        errorTitle: 'Kode RK tidak dikenal',
        error: 'Pilih Kode RK sesuai sheet Referensi RK.',
      };
    }
  }

  const tips = wb.addWorksheet('Petunjuk');
  tips.getColumn('A').width = 110;
  const lines = [
    'PETUNJUK IMPORT EXCEL KEGIATAN — KeepNoteAI Desktop',
    '',
    '1. Isi data mulai BARIS KE-3 pada sheet "Kegiatan" (baris 2 hanya contoh, hapus/ditimpa).',
    '2. Kolom WAJIB: Tanggal Mulai, Kode RK, Kegiatan (min. 5 karakter), Capaian.',
    '   Kolom lain boleh kosong (Progress kosong = 100%).',
    '3. Format tanggal: YYYY-MM-DD atau DD/MM/YYYY. Format jam: HH:MM (contoh 08:00).',
    '4. Kode RK harus sesuai sheet "Referensi RK" (Rencana Kinerja milik Anda di website).',
    '   Jika belum ada, jalankan "Sync Program & Tim Kerja dari Portal" di Pengaturan.',
    '5. Bukti Dukung: satu atau beberapa URL, pisahkan dengan enter/koma.',
    '6. Setelah selesai, simpan file (.xlsx) lalu klik "Import Excel" di aplikasi desktop.',
    '7. Data yang valid akan masuk ke database (muncul juga di website), lalu bisa di-sync ke portal e-Kinerja.',
  ];
  lines.forEach((t, i) => {
    tips.getCell(`A${i + 1}`).value = t;
    if (i === 0) tips.getCell(`A${i + 1}`).font = { bold: true, size: 13 };
  });

  return wb.xlsx.writeBuffer();
}

// --- Parser ---

/**
 * @returns {{ rows: Array<Object>, errors: Array<string>, total: number }}
 */
async function parseWorkbook(buffer, rencanaRows) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  let ws = wb.getWorksheet('Kegiatan') || wb.worksheets[0];
  if (!ws) throw new Error('Sheet tidak ditemukan dalam file Excel');

  // Cari baris header (maksimal 5 baris pertama)
  let headerRowIdx = 1;
  let cols = {};
  for (let r = 1; r <= Math.min(5, ws.rowCount); r++) {
    const map = {};
    ws.getRow(r).eachCell((cell, col) => {
      map[normHeader(cell.value)] = col;
    });
    if (map[normHeader('Kegiatan')] && (map[normHeader('Tanggal Mulai')] || map[normHeader('Tanggal')])) {
      headerRowIdx = r;
      cols = map;
      break;
    }
  }
  if (!cols[normHeader('Kegiatan')]) {
    throw new Error(
      'Format tidak dikenali. Gunakan template yang didapat dari tombol "Download Template".',
    );
  }

  const get = (row, name) => {
    const c = cols[normHeader(name)];
    return c ? row.getCell(c).value : null;
  };

  const rows = [];
  const errors = [];
  let total = 0;

  for (let i = headerRowIdx + 1; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);

    let tMulai = normDate(get(row, 'Tanggal Mulai'));
    let tSelesai = normDate(get(row, 'Tanggal Selesai'));
    if (!tMulai) {
      // fallback: kolom gabungan "Tanggal" ("2026-08-25" / "2026-08-25 - 2026-08-26")
      const gab = String(get(row, 'Tanggal') || '').trim();
      if (gab) {
        const parts = gab.split(/\s*[-–]\s*/);
        tMulai = normDate(parts[0]);
        if (!tSelesai && parts[1]) tSelesai = normDate(parts[1]);
      }
    }

    const kegiatan = String(get(row, 'Kegiatan') || '').trim();
    if (!tMulai && !kegiatan) continue; // baris benar-benar kosong
    total++;

    const no = `baris ${i}`;
    if (/^CONTOH/i.test(kegiatan)) continue; // baris contoh diabaikan
    if (!tMulai) {
      errors.push(`${no}: Tanggal Mulai kosong/format salah`);
      continue;
    }
    if (kegiatan.length < 5) {
      errors.push(`${no}: Kegiatan terlalu pendek (min. 5 karakter)`);
      continue;
    }
    const capaian = String(get(row, 'Capaian') || '').trim() || kegiatan;
    const rk = matchRencana(get(row, 'Kode RK'), get(row, 'Rencana Kinerja'), rencanaRows || []);
    if (!rk) {
      errors.push(
        `${no}: Rencana Kinerja tidak cocok (Kode RK "${get(row, 'Kode RK') || '-'}"). Lihat sheet Referensi RK.`,
      );
      continue;
    }

    rows.push({
      tanggalMulai: tMulai,
      tanggalSelesai: tSelesai && tSelesai >= tMulai ? tSelesai : tMulai,
      jamMulai: normJam(get(row, 'Jam Mulai')),
      jamSelesai: normJam(get(row, 'Jam Selesai')),
      rencanaId: rk.id,
      rencanaNama: rk.nama,
      kegiatan,
      progress: normProgress(get(row, 'Progress (%)')),
      capaian,
      masukanSkp: String(get(row, 'Masukan SKP') || '').trim() || null,
      buktiUrls: normBukti(get(row, 'Bukti Dukung')),
    });
  }

  return { rows, errors, total };
}

module.exports = { buildTemplate, parseWorkbook, HEADERS };
