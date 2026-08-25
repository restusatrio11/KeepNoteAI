/**
 * Akses DB Neon yang SAMA dengan web (read-only untuk keperluan desktop).
 * - login: verifikasi email/password via bcrypt terhadap tabel users (tanpa captcha).
 * - listLaporan: ambil laporan milik user + nama/kode/portalRkid rencana terkait.
 *
 * Tidak memerlukan AUTH_SECRET — kredensial portal disimpan LOKAL di desktop.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool = null;

// Konversi nilai tanggal dari Postgres (bisa berupa Date akibat TIMESTAMP/TIMESTAMPTZ)
// menjadi string YYYY-MM-DD sesuai zona LOKAL, agar tidak bergeser saat di-JSON-kan ke UTC.
function toDateStr(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v).slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function initDb(url) {
  if (pool) {
    pool.end().catch(() => {});
  }
  pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
  // Tabel status sync milik desktop (terpisah dari web; aman, web tidak membacanya).
  pool
    .query(
      `CREATE TABLE IF NOT EXISTS desktop_sync_status (
        laporan_id UUID PRIMARY KEY,
        status TEXT,
        message TEXT,
        synced_at TIMESTAMPTZ DEFAULT now()
      )`,
    )
    .catch((e) => console.error('Gagal buat tabel status:', e.message));
}

async function login(email, password) {
  if (!pool) throw new Error('Database belum dikonfigurasi');
  const { rows } = await pool.query(
    'SELECT id, name, email, password FROM users WHERE email = $1 LIMIT 1',
    [email],
  );
  if (!rows.length) return null;
  const ok = await bcrypt.compare(password, rows[0].password);
  if (!ok) return null;
  return { id: rows[0].id, name: rows[0].name, email: rows[0].email };
}

async function listLaporan(userId, { from, to, search, limit = 100, offset = 0 } = {}) {
  if (!pool) throw new Error('Database belum dikonfigurasi');
  const where = ['l.user_id = $1'];
  const params = [userId];
  let i = 2;
  if (from) {
    where.push(`l.tanggal_mulai >= $${i++}`);
    params.push(from);
  }
  if (to) {
    where.push(`l.tanggal_selesai <= $${i++}`);
    params.push(to);
  }
  if (search) {
    where.push(`l.kegiatan ILIKE $${i++}`);
    params.push(`%${search}%`);
  }
  const lim = i++;
  const off = i++;
  params.push(limit, offset);

  const q = `
    SELECT
      l.id,
      l.tanggal_mulai AS "tanggalMulai",
      l.tanggal_selesai AS "tanggalSelesai",
      l.jam_mulai AS "jamMulai",
      l.jam_selesai AS "jamSelesai",
      l.rencana_id AS "rencanaId",
      l.kegiatan,
      l.progress,
      l.capaian,
      l.bukti_urls AS "buktiUrls",
      m.nama AS "rencanaNama",
      m.kode AS "rencanaKode",
      m.portal_rkid AS "portalRkid",
      s.status AS "syncStatus",
      s.message AS "syncMessage"
    FROM laporan l
    LEFT JOIN master_rencana m ON l.rencana_id = m.id
    LEFT JOIN desktop_sync_status s ON l.id = s.laporan_id
    WHERE ${where.join(' AND ')}
    ORDER BY l.tanggal_mulai DESC
    LIMIT $${lim} OFFSET $${off}
  `;
  const { rows } = await pool.query(q, params);
  return rows.map((r) => ({
    ...r,
    tanggalMulai: toDateStr(r.tanggalMulai),
    tanggalSelesai: toDateStr(r.tanggalSelesai),
  }));
}

async function setSyncStatus(laporanId, status, message) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO desktop_sync_status(laporan_id, status, message)
     VALUES ($1, $2, $3)
     ON CONFLICT (laporan_id) DO UPDATE SET status = $2, message = $3, synced_at = now()`,
    [laporanId, status, message || ''],
  );
}

async function clearSyncStatus(laporanId) {
  if (!pool) return;
  await pool.query('DELETE FROM desktop_sync_status WHERE laporan_id = $1', [laporanId]);
}

async function clearAllSyncStatus(userId) {
  if (!pool) return;
  await pool.query(
    `DELETE FROM desktop_sync_status s
     USING laporan l
     WHERE s.laporan_id = l.id AND l.user_id = $1`,
    [userId],
  );
}

async function listRencana(userId) {
  if (!pool) throw new Error('Database belum dikonfigurasi');
  const { rows } = await pool.query(
    `SELECT id, nama, kode, portal_rkid AS "portalRkid" FROM master_rencana WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows;
}

async function updateRencanaRkid(userId, rencanaId, rkid) {
  if (!pool) throw new Error('Database belum dikonfigurasi');
  await pool.query(
    `UPDATE master_rencana SET portal_rkid = $1 WHERE id = $2 AND user_id = $3`,
    [rkid || null, rencanaId, userId],
  );
}

module.exports = { initDb, login, listLaporan, setSyncStatus, clearSyncStatus, clearAllSyncStatus, listRencana, updateRencanaRkid };
