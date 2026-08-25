const $ = (id) => document.getElementById(id);

const state = {
  user: null,
  rows: [],
  status: {}, // id -> { state, message }
};

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setProgress(done, total, label) {
  const wrap = $('progressWrap');
  wrap.classList.remove('hidden');
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  $('progressBar').style.width = pct + '%';
  $('progressText').textContent = (label ? label + ' ' : '') + `${done}/${total}`;
}

function hideProgress() {
  setTimeout(() => $('progressWrap').classList.add('hidden'), 800);
}

function fmtDate(d) {
  if (!d) return '';
  return String(d).slice(0, 10);
}

function log(msg, level = '') {
  const el = $('log');
  const line = document.createElement('div');
  line.className = 'line';
  const t = new Date().toLocaleTimeString();
  line.innerHTML = `<span class="t">[${t}]</span> <span class="${level}">${escapeHtml(msg)}</span>`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function show(view) {
  $('loginView').classList.toggle('hidden', view !== 'login');
  $('dashView').classList.toggle('hidden', view !== 'dash');
}

function setUserInfo() {
  if (state.user) {
    $('userInfo').textContent = `${state.user.name || state.user.email}`;
    $('btnLogout').classList.remove('hidden');
  } else {
    $('userInfo').textContent = '';
    $('btnLogout').classList.add('hidden');
  }
}

async function loadSettingsIntoForm() {
  const cfg = await window.api.getConfig();
  const dbStatus = $('dbStatus');
  if (cfg.dbConfigured) {
    dbStatus.textContent =
      'Terhubung ke server pusat KeepNoteAI (DATABASE_URL dari .env, tidak perlu diisi).';
    dbStatus.classList.remove('err');
  } else {
    dbStatus.textContent = 'DATABASE_URL belum ditemukan di file .env — hubungi admin.';
    dbStatus.classList.add('err');
  }
  $('cfgCookie').value = cfg.cookie || '';
  $('cfgXAuth').value = cfg.xAuth || '';
  $('cfgSkpid').value = cfg.skpid || '';
  $('cfgAutoSync').value = cfg.autoSyncMinutes || 0;
  $('cfgAutoDays').value = cfg.autoSyncDays || 7;
  $('cfgAutoToday').checked = !!cfg.autoSyncToday;
}

function parseCredentials(text) {
  const out = { portalUrl: '', cookie: '', xAuth: '', skpid: '' };
  const isCurl =
    /\bcurl\b/i.test(text) ||
    /\s--url\b/i.test(text) ||
    /\s-(?:b|--cookie)\b/i.test(text) ||
    /\s-H\b/i.test(text);

  if (isCurl) {
    const clean = (s) => (s || '').replace(/\^/g, '').trim();
    let m =
      text.match(/--url\s+\^?["']([^"']+)["']/i) ||
      text.match(/curl\b[^\n]*?\s\^?["'](https?:\/\/[^"'\s]+)["']/i);
    if (m) {
      const u = clean(m[1]);
      try {
        out.portalUrl = new URL(u).origin;
      } catch {
        out.portalUrl = u.split('/').slice(0, 3).join('/');
      }
    }
    m = text.match(/\s-(?:b|--cookie)\s+\^?["']([^"']+)["']/i);
    if (m) out.cookie = clean(m[1]);
    m = text.match(/-H\s+\^?["'][^"']*X-Auth:\s*([^"']+)["']/i);
    if (m) {
      out.xAuth = clean(m[1]);
      if (!/^Bearer\s+/i.test(out.xAuth)) out.xAuth = 'Bearer ' + out.xAuth;
    }
    m = text.match(/skpid[=\/](\d+)/i);
    if (m) out.skpid = m[1];
    return out;
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return out;
  const after = (label) => {
    const i = lines.findIndex((l) => l.toLowerCase().includes(label.toLowerCase()));
    return i >= 0 && i + 1 < lines.length ? lines[i + 1] : '';
  };
  out.portalUrl =
    after('url portal') || lines.find((l) => /^https?:\/\//i.test(l)) || '';
  out.cookie =
    after('cookie') ||
    lines.find((l) => /phpsessid=|laravel_session=|sessionid=|token=/i.test(l)) ||
    lines.find((l) => l.includes('=') && l.includes(';')) ||
    '';
  let xa = after('x-auth') || after('auth');
  if (!xa) {
    xa = lines.find((l) => /^Bearer\s+/i.test(l)) || lines.find((l) => /^eyJ/i.test(l));
  }
  if (xa && !/^Bearer\s+/i.test(xa)) xa = 'Bearer ' + xa;
  out.xAuth = xa || '';
  out.skpid = after('skp') || lines.find((l) => /^\d{4,}$/.test(l)) || '';
  return out;
}

function applyParsedCredentials() {
  const parsed = parseCredentials($('cfgPaste').value || '');
  if (parsed.portalUrl) $('cfgPortalUrl').value = parsed.portalUrl;
  if (parsed.cookie) $('cfgCookie').value = parsed.cookie;
  if (parsed.xAuth) $('cfgXAuth').value = parsed.xAuth;
  if (parsed.skpid) $('cfgSkpid').value = parsed.skpid;
  const found = [parsed.portalUrl, parsed.cookie, parsed.xAuth, parsed.skpid].filter(Boolean).length;
  $('settingsMsg').textContent = found
    ? `Otomatis terisi ${found}/4 field. Edit bila perlu, lalu Simpan.`
    : 'Tidak ada yang terdeteksi. Pastikan teks berisi URL, Cookie, X-Auth, dan SKP ID.';
}

async function saveSettings() {
  const msg = $('settingsMsg');
  msg.textContent = 'Menyimpan...';
  const res = await window.api.saveConfig({
    portalUrl: $('cfgPortalUrl').value.trim() || 'https://kipapp.bps.go.id',
    cookie: $('cfgCookie').value.trim(),
    xAuth: $('cfgXAuth').value.trim(),
    skpid: $('cfgSkpid').value.trim(),
    autoSyncMinutes: parseInt($('cfgAutoSync').value, 10) || 0,
    autoSyncDays: parseInt($('cfgAutoDays').value, 10) || 7,
    autoSyncToday: $('cfgAutoToday').checked,
  });
  if (res.ok) {
    msg.textContent = 'Tersimpan ✓';
    setTimeout(() => ($('settingsModal').classList.add('hidden')), 600);
  } else {
    msg.textContent = 'Gagal: ' + res.error;
  }
}

async function doLogin() {
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  $('loginError').classList.add('hidden');
  if (!email || !password) {
    $('loginError').textContent = 'Email & password wajib diisi';
    $('loginError').classList.remove('hidden');
    return;
  }
  const res = await window.api.login(email, password);
  if (res.ok) {
    state.user = res.user;
    setUserInfo();
    show('dash');
    await window.api.setSession(res.user.id);
    log(`Login sebagai ${res.user.email}`, 'ok');
    await loadLaporan();
  } else {
    $('loginError').textContent = res.error;
    $('loginError').classList.remove('hidden');
    log('Login gagal: ' + res.error, 'err');
  }
}

function doLogout() {
  state.user = null;
  state.rows = [];
  state.status = {};
  setUserInfo();
  show('login');
  $('loginPassword').value = '';
  window.api.clearSession();
  log('Logout', '');
}

async function loadLaporan() {
  if (!state.user) return;
  const args = {
    userId: state.user.id,
    from: $('filterFrom').value || undefined,
    to: $('filterTo').value || undefined,
    search: $('filterSearch').value.trim() || undefined,
    limit: 500,
  };
  const res = await window.api.listLaporan(args);
  if (!res.ok) {
    log('Gagal memuat laporan: ' + res.error, 'err');
    return;
  }
  state.rows = res.rows;
  // inisialisasi badge dari status yang sudah persist di DB
  for (const r of res.rows) {
    if (r.syncStatus === 'ok') state.status[r.id] = { state: 'ok', message: r.syncMessage || '' };
    else if (r.syncStatus === 'dup') state.status[r.id] = { state: 'dup', message: r.syncMessage || '' };
    else if (r.syncStatus === 'err') state.status[r.id] = { state: 'err', message: r.syncMessage || '' };
  }
  renderTable();
  log(`Memuat ${res.rows.length} laporan`, 'ok');
}

function renderTable() {
  const body = $('laporanBody');
  body.innerHTML = '';
  $('emptyHint').classList.toggle('hidden', state.rows.length > 0);
  for (const r of state.rows) {
    const st = state.status[r.id] || { state: 'idle', message: '' };
    const tr = document.createElement('tr');

    const badge =
      st.state === 'run'
        ? '<span class="badge run">Proses…</span>'
        : st.state === 'ok'
        ? '<span class="badge ok">Terkirim</span>'
        : st.state === 'dup'
        ? '<span class="badge dup">Duplikat</span>'
        : st.state === 'err'
        ? '<span class="badge err">Gagal</span>'
        : '<span class="badge idle">Belum</span>';

    const title = st.message ? `title="${escapeHtml(st.message)}"` : '';

    tr.innerHTML = `
      <td>${fmtDate(r.tanggalMulai)}<br/><span class="muted small">${escapeHtml(r.jamMulai || '')}–${escapeHtml(r.jamSelesai || '')}</span></td>
      <td>${escapeHtml(r.rencanaNama || r.rencanaKode || '-')}${r.portalRkid ? '' : '<br/><span class="muted small">⚠ belum map</span>'}</td>
      <td class="keg">
        <div class="act">${escapeHtml(r.kegiatan)}</div>
        <div class="cap">${escapeHtml(r.capaian)}</div>
      </td>
      <td>${r.progress ?? 100}%</td>
      <td ${title}>${badge}</td>
      <td>
        <button class="btn tiny" data-sync="${r.id}">Sync</button>
        <button class="btn tiny ghost" data-reset="${r.id}" title="Hapus tanda terkirim agar bisa dikirim ulang">Reset</button>
      </td>
    `;
    body.appendChild(tr);
  }

  body.querySelectorAll('button[data-sync]').forEach((b) => {
    b.addEventListener('click', () => {
      const row = state.rows.find((x) => x.id === b.getAttribute('data-sync'));
      if (row) syncOne(row);
    });
  });
  body.querySelectorAll('button[data-reset]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-reset');
      resetOne(id);
    });
  });
}

async function resetOne(id) {
  delete state.status[id];
  renderTable();
  const res = await window.api.resetStatus(id);
  if (res.ok) {
    log('Status direset — laporan bisa dikirim ulang.', 'ok');
  } else {
    log('Gagal reset: ' + (res.error || ''), 'err');
  }
}

async function syncOne(row) {
  state.status[row.id] = { state: 'run', message: '' };
  renderTable();
  log(`Sync: ${row.rencanaNama || '-'} — ${String(row.kegiatan).slice(0, 40)}…`, '');
  const res = await window.api.sync({
    id: row.id,
    laporan: {
      tanggalMulai: row.tanggalMulai,
      tanggalSelesai: row.tanggalSelesai,
      jamMulai: row.jamMulai,
      jamSelesai: row.jamSelesai,
      kegiatan: row.kegiatan,
      progress: row.progress,
      capaian: row.capaian,
      buktiUrls: row.buktiUrls,
    },
    rencanaNama: row.rencanaNama,
    portalRkid: row.portalRkid,
  });

  if (res.success) {
    state.status[row.id] = { state: 'ok', message: res.message };
    log(`✓ ${row.rencanaNama || ''}: ${res.message}`, 'ok');
  } else if (res.duplicate) {
    state.status[row.id] = { state: 'dup', message: res.message };
    log(`• ${row.rencanaNama || ''}: ${res.message}`, 'warn');
  } else {
    state.status[row.id] = { state: 'err', message: res.message };
    log(`✗ ${row.rencanaNama || ''}: ${res.message}`, 'err');
  }
  renderTable();
}

async function syncAll() {
  $('btnSyncAll').disabled = true;
  const targets = state.rows.filter((r) => {
    const cur = state.status[r.id];
    if (cur && (cur.state === 'ok' || cur.state === 'dup')) return false;
    if (r.syncStatus === 'ok' || r.syncStatus === 'dup') return false;
    return true;
  });
  let done = 0;
  let ok = 0,
    dup = 0,
    err = 0;
  log(`Memulai sync semua (${targets.length})…`, '');
  setProgress(0, targets.length, 'Sync');
  for (const row of targets) {
    const res = await window.api.sync({
      id: row.id,
      laporan: {
        tanggalMulai: row.tanggalMulai,
        tanggalSelesai: row.tanggalSelesai,
        jamMulai: row.jamMulai,
        jamSelesai: row.jamSelesai,
        kegiatan: row.kegiatan,
        progress: row.progress,
        capaian: row.capaian,
        buktiUrls: row.buktiUrls,
      },
      rencanaNama: row.rencanaNama,
      portalRkid: row.portalRkid,
    });
    if (res.success) {
      state.status[row.id] = { state: 'ok', message: res.message };
      ok++;
    } else if (res.duplicate) {
      state.status[row.id] = { state: 'dup', message: res.message };
      dup++;
    } else {
      state.status[row.id] = { state: 'err', message: res.message };
      err++;
    }
    done++;
    setProgress(done, targets.length, 'Sync');
    renderTable();
  }
  hideProgress();
  log(`Selesai — terkirim: ${ok}, duplikat: ${dup}, gagal: ${err}`, ok || dup ? 'ok' : 'err');
  window.api.notify({
    title: 'KeepNoteAI Desktop',
    body: `Sync: ${ok} terkirim, ${dup} duplikat, ${err} gagal`,
  });
  $('btnSyncAll').disabled = false;
}

async function testPortal() {
  log('Test koneksi portal…', '');
  const res = await window.api.testPortal();
  if (res.success) log('✓ ' + res.message, 'ok');
  else log('✗ ' + res.message, 'err');
}

async function checkDuplicates() {
  if (!state.rows.length) {
    log('Belum ada laporan dimuat.', 'warn');
    return;
  }
  $('btnCheckDup').disabled = true;
  const targets = state.rows.filter((r) => {
    const cur = state.status[r.id];
    if (cur && (cur.state === 'ok' || cur.state === 'dup')) return false;
    if (r.syncStatus === 'ok' || r.syncStatus === 'dup') return false;
    return true;
  });
  let done = 0,
    dup = 0;
  log('Mengecek duplikat di portal…', '');
  setProgress(0, targets.length, 'Cek');
  for (const row of targets) {
    const res = await window.api.checkDup({
      laporan: { tanggalMulai: row.tanggalMulai, kegiatan: row.kegiatan },
      rencanaNama: row.rencanaNama,
      portalRkid: row.portalRkid,
    });
    if (res.duplicate) {
      state.status[row.id] = { state: 'dup', message: 'Sudah ada di portal (cek duplikat)' };
      dup++;
    }
    done++;
    setProgress(done, targets.length, 'Cek');
  }
  renderTable();
  hideProgress();
  log(`Cek duplikat: ${targets.length} diperiksa, ${dup} terdeteksi sudah ada di portal.`, dup ? 'warn' : 'ok');
  $('btnCheckDup').disabled = false;
}

// wiring
$('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  doLogin();
});
$('btnLogout').addEventListener('click', doLogout);
$('btnLoad').addEventListener('click', loadLaporan);
$('btnTest').addEventListener('click', testPortal);
$('btnSyncAll').addEventListener('click', syncAll);
$('btnClearLog').addEventListener('click', () => ($('log').innerHTML = ''));

$('btnSettings').addEventListener('click', async () => {
  await loadSettingsIntoForm();
  $('settingsMsg').textContent = '';
  $('rkStatus').textContent = '';
  $('mapList').innerHTML = '';
  $('btnSaveMap').classList.add('hidden');
  $('settingsModal').classList.remove('hidden');
});
$('btnCloseSettings').addEventListener('click', () => $('settingsModal').classList.add('hidden'));
$('btnSaveSettings').addEventListener('click', saveSettings);
$('btnParseCred').addEventListener('click', applyParsedCredentials);
$('cfgPaste').addEventListener('input', applyParsedCredentials);

$('btnSyncMaster').addEventListener('click', async () => {
  const btn = $('btnSyncMaster');
  btn.disabled = true;
  btn.textContent = 'Menyinkronkan…';
  const res = await window.api.syncMaster();
  btn.disabled = false;
  btn.textContent = '⇩ Sync Program & Tim Kerja dari Portal';
  if (res.ok) {
    log('Master: ' + res.message, 'ok');
    $('settingsMsg').textContent = res.message;
  } else {
    log('Master gagal: ' + (res.error || ''), 'err');
    $('settingsMsg').textContent = 'Gagal: ' + (res.error || '');
  }
});

$('btnOpenWeb').addEventListener('click', () => window.api.webOpen(''));
$('lnkRegister').addEventListener('click', (e) => {
  e.preventDefault();
  window.api.webOpen('/register');
});

$('btnCheckDup').addEventListener('click', checkDuplicates);
$('btnResetAll').addEventListener('click', async () => {
  if (!confirm('Reset semua status kirim? Laporan yang sudah terkirim akan bisa dikirim ulang.')) return;
  const res = await window.api.resetAllStatus();
  if (res.ok) {
    state.status = {};
    renderTable();
    log('Semua status direset — seluruh laporan bisa dikirim ulang.', 'ok');
  } else {
    log('Gagal reset semua: ' + (res.error || ''), 'err');
  }
});

// --- Pemetaan Rencana -> Portal ---
let portalRkItems = [];

async function loadRkMapping() {
  $('rkStatus').textContent = 'Memuat daftar dari portal…';
  $('mapList').innerHTML = '';
  $('btnSaveMap').classList.add('hidden');
  const res = await window.api.portalListRk();
  if (!res.ok) {
    $('rkStatus').textContent = 'Gagal: ' + res.error;
    return;
  }
  portalRkItems = res.items;
  const ren = await window.api.listRencana();
  if (!ren.ok) {
    $('rkStatus').textContent = 'Gagal muat rencana lokal: ' + ren.error;
    return;
  }
  if (!ren.rows.length) {
    $('rkStatus').textContent = 'Tidak ada rencana lokal. Buat rencana di web dulu.';
    return;
  }
  const list = $('mapList');
  for (const r of ren.rows) {
    const row = document.createElement('div');
    row.className = 'map-row';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = r.nama + (r.kode ? ` (${r.kode})` : '');
    name.title = name.textContent;
    const sel = document.createElement('select');
    sel.dataset.id = r.id;
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = '— belum dipetakan —';
    sel.appendChild(opt0);
    for (const it of portalRkItems) {
      const o = document.createElement('option');
      o.value = it.rkid;
      o.textContent = it.name;
      if (r.portalRkid && String(r.portalRkid) === String(it.rkid)) o.selected = true;
      sel.appendChild(o);
    }
    row.appendChild(name);
    row.appendChild(sel);
    list.appendChild(row);
  }
  $('rkStatus').textContent = `${ren.rows.length} rencana lokal, ${portalRkItems.length} rencana portal.`;
  $('btnSaveMap').classList.remove('hidden');
}

async function saveRkMapping() {
  $('rkStatus').textContent = 'Menyimpan…';
  const sels = $('mapList').querySelectorAll('select');
  let n = 0;
  for (const sel of sels) {
    const r = await window.api.mapRencana(sel.dataset.id, sel.value);
    if (r.ok) n++;
  }
  $('rkStatus').textContent = `Tersimpan ${n} pemetaan. Laporan akan otomatis pakai rkid ini.`;
  log(`Pemetaan rencana: ${n} disimpan ke DB`, 'ok');
}

$('btnLoadRk').addEventListener('click', loadRkMapping);
$('btnSaveMap').addEventListener('click', saveRkMapping);

window.api.onAutoLog((msg, level) => log(msg, level));
window.api.onAutoProgress((done, total, label) => {
  if (total > 0) setProgress(done, total, label || 'Auto');
  else hideProgress();
});

(async () => {
  setUserInfo();
  show(state.user ? 'dash' : 'login');
  log('KeepNoteAI Desktop siap. Atur Database URL & kredensial e-Kinerja di ⚙ Pengaturan.', '');
  log('Tip: tutup jendela → app tetap jalan di tray untuk auto-sync.', '');
})();
