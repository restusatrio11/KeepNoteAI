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

function extractCellValue(val) {
  if (val == null) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'object') {
    if (val.result !== undefined && val.result !== null) {
      if (val.result instanceof Date) return val.result;
      return typeof val.result === 'object' ? extractCellValue(val.result) : String(val.result).trim();
    }
    if (Array.isArray(val.richText)) {
      return val.richText.map((t) => t.text || '').join('').trim();
    }
    if (val.text !== undefined && val.text !== null) {
      return String(val.text).trim();
    }
    if (val.formula) {
      return '';
    }
  }
  return typeof val === 'string' ? val.trim() : val;
}

// --- Pencocokan rencana (Kode RK persis, dropdown nama, atau fuzzy) ---

function matchRencana(kode, nama, rencanaRows) {
  const k = String(kode || '').trim().toLowerCase();
  let n = String(nama || '').trim();
  if (!k && !n) return null;

  // 1. Jika nama berisi format "[RK01] ..." atau "Nama RK (RK01)", ekstrak kodenya
  let inferredKode = null;
  const bracketMatch = n.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (bracketMatch) {
    inferredKode = bracketMatch[1].trim().toLowerCase();
    n = bracketMatch[2].trim();
  } else {
    const parenMatch = n.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (parenMatch) {
      inferredKode = parenMatch[2].trim().toLowerCase();
      n = parenMatch[1].trim();
    }
  }

  // 2. Cocokkan berdasarkan Kode RK langsung atau hasil inferensi
  const targetKode = k || inferredKode;
  if (targetKode) {
    const byKode = rencanaRows.find(
      (r) => String(r.kode || '').trim().toLowerCase() === targetKode,
    );
    if (byKode) return byKode;
  }

  // 3. Cocokkan berdasarkan nama
  if (n) {
    const nLower = n.toLowerCase();
    const exact = rencanaRows.find(
      (r) => String(r.nama || '').trim().toLowerCase() === nLower,
    );
    if (exact) return exact;

    let best = null;
    let bestScore = 0;
    for (const r of rencanaRows) {
      const rn = String(r.nama || '').trim().toLowerCase();
      if (!rn) continue;
      const score =
        rn.includes(nLower) || nLower.includes(rn)
          ? Math.min(nLower.length, rn.length) / Math.max(nLower.length, rn.length)
          : 0;
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }
    if (bestScore >= 0.5) return best;
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
    width: [14, 14, 11, 11, 14, 60, 45, 12, 36, 22, 40][i],
  }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

  const validRencana = (rencanaRows || []).filter((r) => r && (r.nama || r.kode));
  const firstRK = validRencana[0];

  // Sheet referensi tanpa spasi: 'Daftar_RK' agar formula dropdown & VLOOKUP 100% kompatibel di semua spreadsheet (Excel, WPS, Sheets, LibreOffice)
  const ref = wb.addWorksheet('Daftar_RK');
  ref.columns = [
    { header: 'Pilihan Rencana Kinerja (Dropdown)', key: 'pilihan', width: 65 },
    { header: 'Kode RK', key: 'kode', width: 14 },
    { header: 'Nama Rencana Kinerja', key: 'nama', width: 60 },
    { header: 'Indikator Kinerja Individu (IKI)', key: 'iki', width: 40 },
  ];
  ref.getRow(1).font = { bold: true };
  ref.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  for (const r of validRencana) {
    const rawNama = String(r.nama || '').trim();
    const kode = String(r.kode || '').trim();
    const iki = String(r.iki || '').trim();
    // Tampilan dropdown: "[Kode] Nama Rencana" jika ada kode, atau nama murni
    const pilihan = kode && rawNama ? `[${kode}] ${rawNama}` : (rawNama || kode);
    ref.addRow({ pilihan, kode, nama: rawNama, iki });
  }
  ref.getColumn('pilihan').alignment = { wrapText: true, vertical: 'top' };
  ref.getColumn('kode').alignment = { horizontal: 'center', vertical: 'top' };
  ref.getColumn('nama').alignment = { wrapText: true, vertical: 'top' };
  ref.getColumn('iki').alignment = { wrapText: true, vertical: 'top' };

  const samplePilihan = firstRK
    ? (firstRK.kode && firstRK.nama ? `[${firstRK.kode}] ${firstRK.nama}` : (firstRK.nama || firstRK.kode))
    : 'Contoh Rencana Kinerja';

  // Baris contoh (baris 2)
  ws.addRow({
    'Tanggal Mulai': '2026-08-25',
    'Tanggal Selesai': '2026-08-25',
    'Jam Mulai': '08:00',
    'Jam Selesai': '16:00',
    'Kode RK': (firstRK && firstRK.kode) || 'RK01',
    'Rencana Kinerja': samplePilihan,
    Kegiatan: 'CONTOH — ganti / hapus baris ini sebelum import',
    'Progress (%)': 100,
    Capaian: 'Terwujudnya pelaksanaan kegiatan sesuai target.',
    'Masukan SKP': '',
    'Bukti Dukung': 'https://contoh.link/bukti.pdf',
  });

  // Data validation & auto-formula dari sheet Daftar_RK
  if (validRencana.length > 0) {
    const last = validRencana.length + 1;
    for (let i = 2; i <= 500; i++) {
      // Dropdown Select Rencana Kinerja pada kolom F
      ws.getCell(`F${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Daftar_RK!$A$2:$A$${last}`],
        showErrorMessage: false,
        showInputMessage: true,
        promptTitle: 'Pilih Rencana Kinerja',
        prompt: 'Klik tanda panah dropdown untuk memilih program kerja.',
      };

      // Auto-lookup Kode RK pada kolom E untuk baris 3 ke atas
      if (i >= 3) {
        ws.getCell(`E${i}`).value = {
          formula: `IFERROR(VLOOKUP(F${i}, Daftar_RK!$A$2:$B$${last}, 2, FALSE), "")`,
        };
      }
    }
  }

  const tips = wb.addWorksheet('Petunjuk');
  tips.getColumn('A').width = 110;
  const lines = [
    'PETUNJUK IMPORT EXCEL KEGIATAN — KeepNoteAI Desktop',
    '',
    '1. Isi data mulai BARIS KE-3 pada sheet "Kegiatan" (baris 2 hanya contoh, hapus/ditimpa).',
    '2. CARA MEMILIH RENCANA KINERJA (DROPDOWN OTOMATIS):',
    '   - Klik sel pada Kolom F (Rencana Kinerja), klik tanda panah dropdown/select, lalu pilih rencana kerja Anda.',
    '   - Kolom E (Kode RK) akan TERISI OTOMATIS oleh rumus Excel sesuai rencana yang dipilih.',
    '3. Kolom WAJIB: Tanggal Mulai, Rencana Kinerja (atau Kode RK), Kegiatan (min. 5 karakter), Capaian.',
    '   Kolom lain opsional (Progress kosong = 100%).',
    '4. Sheet "Daftar_RK" berisi daftar Rencana Kinerja aktif milik akun Anda.',
    '   Jika daftar kosong atau belum update, buka aplikasi desktop lalu jalankan',
    '   "Sync Program & Tim Kerja dari Portal" di menu Pengaturan.',
    '5. Format tanggal: YYYY-MM-DD atau DD/MM/YYYY. Format jam: HH:MM (contoh: 08:00).',
    '6. Bukti Dukung: satu atau beberapa URL link Google Drive/website, pisahkan dengan enter atau koma.',
    '7. Setelah selesai mengisi, simpan file (.xlsx) lalu klik tombol "Import Excel" di aplikasi desktop.',
    '8. Data yang berhasil diimpor akan tersimpan di database dan siap di-sync ke portal e-Kinerja.',
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
    if (!c) return null;
    return extractCellValue(row.getCell(c).value);
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
      const inputVal = get(row, 'Rencana Kinerja') || get(row, 'Kode RK') || '-';
      errors.push(
        `${no}: Rencana Kinerja "${inputVal}" tidak ditemukan. Silakan pilih dari dropdown atau lihat sheet Referensi RK.`,
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
