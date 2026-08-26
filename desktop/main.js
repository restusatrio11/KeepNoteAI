const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDb, login, listLaporan, setSyncStatus, clearSyncStatus, clearAllSyncStatus, listRencana, updateRencanaRkid, insertLaporan } = require('./db');
const { buildTemplate, parseWorkbook } = require('./importExcel');
const { syncOneLaporan, testPortal, resolveRkid } = require('./sync');
const { syncMasterData } = require('./masterSync');
const { buildPortalHeaders, portalRequest } = require('./portalHttp');

app.setAppUserModelId('com.keepnoteai.desktop');

// DATABASE_URL diambil dari env / file .env (next to exe atau folder app),
// sehingga end-user TIDAK perlu mengisi apa-apa — cukup login seperti di web.
function parseEnv(text) {
  const out = {};
  for (const line of String(text).split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function resolveDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const candidates = [
    path.join(path.dirname(process.execPath), '.env'),
    path.join(app.getAppPath(), '.env'),
  ];
  for (const f of candidates) {
    try {
      if (fs.existsSync(f)) {
        const v = parseEnv(fs.readFileSync(f, 'utf8')).DATABASE_URL;
        if (v) return v;
      }
    } catch {
      /* ignore */
    }
  }
  return config.databaseUrl || '';
}

function resolveSiteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const candidates = [
    path.join(path.dirname(process.execPath), '.env'),
    path.join(app.getAppPath(), '.env'),
  ];
  for (const f of candidates) {
    try {
      if (fs.existsSync(f)) {
        const v = parseEnv(fs.readFileSync(f, 'utf8')).SITE_URL;
        if (v) return v.replace(/\/$/, '');
      }
    } catch {
      /* ignore */
    }
  }
  return 'http://localhost:3000';
}

function notify(title, body) {
  try {
    new Notification({ title, body }).show();
  } catch {
    /* notification mungkin tidak didukung */
  }
}


const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const ICON_PATH = path.join(__dirname, 'icon.png');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

let config = loadConfig();
let mainWindow = null;
let tray = null;
let quitting = false;
let currentUserId = config.userId || null;
const autoHandled = new Set();
let lastAutoRun = 0;
let effectiveDbUrl = resolveDbUrl();
const dbConfigured = !!effectiveDbUrl;
const siteUrl = resolveSiteUrl();

if (effectiveDbUrl) {
  try {
    initDb(effectiveDbUrl);
  } catch (e) {
    console.error('Gagal init DB:', e.message);
  }
}

function laporanPayload(row) {
  return {
    tanggalMulai: row.tanggalMulai,
    tanggalSelesai: row.tanggalSelesai,
    jamMulai: row.jamMulai,
    jamSelesai: row.jamSelesai,
    kegiatan: row.kegiatan,
    progress: row.progress,
    capaian: row.capaian,
    buktiUrls: row.buktiUrls,
  };
}

/**
 * Satu fungsi sync yang dipakai baik oleh manual (IPC portal:sync) maupun
 * auto-sync. Hasil langsung dipersist ke tabel desktop_sync_status (badge awet).
 */
async function doSync(laporan, rencanaNama, portalRkid, id) {
  const creds = {
    portalUrl: config.portalUrl,
    cookie: config.cookie,
    xAuth: config.xAuth,
    skpid: config.skpid,
  };
  const res = await syncOneLaporan(creds, laporan, rencanaNama, portalRkid);
  const status = res.success ? 'ok' : res.duplicate ? 'dup' : 'err';
  if (id) {
    try {
      await setSyncStatus(id, status, res.message || '');
    } catch (e) {
      console.error('setSyncStatus gagal:', e.message);
    }
  }
  return res;
}

function pushLog(msg, level = '') {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('auto:log', { msg, level });
  }
}

async function runAutoSync(manual) {
  if (!currentUserId) {
    if (manual) pushLog('Auto-sync: belum login', 'err');
    return;
  }
  const creds = {
    portalUrl: config.portalUrl,
    cookie: config.cookie,
    xAuth: config.xAuth,
    skpid: config.skpid,
  };
  if (!creds.portalUrl || !creds.xAuth || !creds.skpid) {
    if (manual) pushLog('Auto-sync: kredensial portal belum lengkap', 'err');
    return;
  }
  try {
    let from;
    if (config.autoSyncToday) {
      from = new Date().toISOString().slice(0, 10);
    } else {
      const days = Number(config.autoSyncDays) || 7;
      from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    }
    const { rows } = await listLaporan(currentUserId, { from, limit: 500 });
    const targets = rows.filter(
      (r) => !autoHandled.has(r.id) && r.syncStatus !== 'ok' && r.syncStatus !== 'dup',
    );
    let ok = 0,
      dup = 0,
      err = 0,
      done = 0;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auto:progress', { done: 0, total: targets.length, label: 'Auto' });
    }
    for (const row of targets) {
      const res = await doSync(laporanPayload(row), row.rencanaNama, row.portalRkid, row.id);
      if (res.success) {
        autoHandled.add(row.id);
        ok++;
      } else if (res.duplicate) {
        autoHandled.add(row.id);
        dup++;
      } else {
        err++;
        if (err > 5) break;
      }
      done++;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auto:progress', { done, total: targets.length, label: 'Auto' });
      }
    }
    lastAutoRun = Date.now();
    const rangeLabel = config.autoSyncToday ? 'hari ini' : `${config.autoSyncDays || 7} hr terakhir`;
    const summary = `Auto-sync: ${ok} terkirim, ${dup} duplikat, ${err} gagal (${rangeLabel})`;
    pushLog(summary, ok || dup ? 'ok' : 'err');
    notify('KeepNoteAI Desktop', summary);
  } catch (e) {
    pushLog('Auto-sync error: ' + e.message, 'err');
    notify('KeepNoteAI Desktop', 'Auto-sync error: ' + e.message);
  }
}

function startAutoScheduler() {
  setInterval(async () => {
    const mins = Number(config.autoSyncMinutes) || 0;
    if (mins <= 0 || !currentUserId || !effectiveDbUrl) return;
    const now = Date.now();
    if (now - lastAutoRun < mins * 60000) return;
    lastAutoRun = now;
    await runAutoSync(false);
  }, 30000);
}

function createTray() {
  const icon = fs.existsSync(ICON_PATH)
    ? nativeImage.createFromPath(ICON_PATH)
    : nativeImage.createEmpty();
  tray = new Tray(icon);
  const updateTooltip = () => {
    const mins = Number(config.autoSyncMinutes) || 0;
    tray.setToolTip(
      `KeepNoteAI Desktop${currentUserId ? ' (login)' : ''}${mins > 0 ? ` · auto ${mins}m` : ''}`,
    );
  };
  updateTooltip();
  const ctx = Menu.buildFromTemplate([
    { label: 'Buka Jendela', click: () => showWindow() },
    {
      label: 'Sync Sekarang',
      click: () => runAutoSync(true),
    },
    {
      label: 'Keluar',
      click: () => {
        quitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(ctx);
  tray.on('click', () => showWindow());
  return updateTooltip;
}

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(() => {
  const updateTooltip = createTray();

  ipcMain.handle('cfg:get', () => ({ ...config, dbConfigured, siteUrl }));

  ipcMain.handle('cfg:save', (_e, cfg) => {
    config = { ...config, ...cfg };
    saveConfig(config);
    effectiveDbUrl = resolveDbUrl();
    if (effectiveDbUrl) {
      try {
        initDb(effectiveDbUrl);
      } catch (e) {
        return { ok: false, error: 'Gagal konek DB: ' + e.message };
      }
    }
    if (updateTooltip) updateTooltip();
    return { ok: true };
  });

  ipcMain.handle('session:set', (_e, { userId }) => {
    currentUserId = userId;
    config.userId = userId;
    saveConfig(config);
    if (updateTooltip) updateTooltip();
    return { ok: true };
  });

  ipcMain.handle('session:clear', () => {
    currentUserId = null;
    delete config.userId;
    saveConfig(config);
    autoHandled.clear();
    if (updateTooltip) updateTooltip();
    return { ok: true };
  });

  ipcMain.handle('auth:login', async (_e, { email, password }) => {
    if (!effectiveDbUrl) {
      return {
        ok: false,
        error: dbConfigured ? 'Database belum tersedia' : 'Database belum diatur (hubungi admin)',
      };
    }
    try {
      const user = await login(email, password);
      if (!user) return { ok: false, error: 'Email atau password salah' };
      return { ok: true, user };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('laporan:list', async (_e, args) => {
    try {
      const rows = await listLaporan(args.userId, args);
      return { ok: true, rows };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('portal:test', async () => {
    const creds = {
      portalUrl: config.portalUrl,
      cookie: config.cookie,
      xAuth: config.xAuth,
      skpid: config.skpid,
    };
    try {
      const res = await testPortal(creds);
      notify('KeepNoteAI — Test Portal', (res.success ? '✓ ' : '✗ ') + res.message);
      return res;
    } catch (e) {
      const m = e.message;
      notify('KeepNoteAI — Test Portal', '✗ ' + m);
      return { success: false, message: m };
    }
  });

  ipcMain.handle('portal:sync', async (_e, { laporan, rencanaNama, portalRkid, id }) => {
    try {
      const res = await doSync(laporan, rencanaNama, portalRkid, id);
      return res;
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('sync:reset', async (_e, { id }) => {
    if (!currentUserId) return { ok: false, error: 'Belum login' };
    try {
      await clearSyncStatus(id);
      autoHandled.delete(id);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('sync:resetAll', async () => {
    if (!currentUserId) return { ok: false, error: 'Belum login' };
    try {
      await clearAllSyncStatus(currentUserId);
      autoHandled.clear();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('master:sync', async () => {
    if (!currentUserId) return { ok: false, error: 'Belum login' };
    const creds = {
      portalUrl: config.portalUrl,
      cookie: config.cookie,
      xAuth: config.xAuth,
      skpid: config.skpid,
    };
    if (!creds.portalUrl || !creds.xAuth) {
      return { ok: false, error: 'Isi Cookie & X-Auth di Pengaturan dulu' };
    }
    try {
      const res = await syncMasterData(creds, currentUserId);
      pushLog('Sync master: ' + res.message, 'ok');
      notify('KeepNoteAI Desktop', res.message);
      return { ok: true, message: res.message };
    } catch (e) {
      pushLog('Sync master gagal: ' + e.message, 'err');
      notify('KeepNoteAI Desktop', 'Sync master gagal: ' + e.message);
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('dialog:selectFile', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openFile'] });
    if (res.canceled) return null;
    return res.filePaths[0];
  });

  // --- Import Excel Kegiatan ---

  let pendingImport = null;

  ipcMain.handle('import:template', async () => {
    if (!currentUserId) return { ok: false, error: 'Belum login' };
    try {
      const res = await dialog.showSaveDialog(mainWindow, {
        title: 'Simpan Template Import Kegiatan',
        defaultPath: 'Template_Import_Kegiatan.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });
      if (res.canceled || !res.filePath) return { ok: false, canceled: true };
      let rencana = [];
      try {
        rencana = await listRencana(currentUserId);
      } catch {
        /* template tetap dibuat tanpa referensi */
      }
      const buffer = await buildTemplate(rencana);
      fs.writeFileSync(res.filePath, Buffer.from(buffer));
      return { ok: true, path: res.filePath, rencanaCount: rencana.length };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('import:preview', async () => {
    if (!currentUserId) return { ok: false, error: 'Belum login' };
    try {
      const res = await dialog.showOpenDialog(mainWindow, {
        title: 'Pilih File Excel Kegiatan',
        properties: ['openFile'],
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });
      if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
      const file = res.filePaths[0];
      let rencana = [];
      try {
        rencana = await listRencana(currentUserId);
      } catch (e) {
        return { ok: false, error: 'Gagal memuat daftar rencana: ' + e.message };
      }
      const parsed = await parseWorkbook(fs.readFileSync(file), rencana);
      pendingImport = { userId: currentUserId, rows: parsed.rows };
      return {
        ok: true,
        file,
        total: parsed.total,
        valid: parsed.rows.length,
        errors: parsed.errors.slice(0, 20),
        errorCount: parsed.errors.length,
      };
    } catch (e) {
      pendingImport = null;
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('import:commit', async () => {
    if (!currentUserId) return { ok: false, error: 'Belum login' };
    if (!pendingImport || pendingImport.userId !== currentUserId) {
      return { ok: false, error: 'Tidak ada import yang menunggu. Ulangi pilih file.' };
    }
    try {
      const n = await insertLaporan(currentUserId, pendingImport.rows);
      pendingImport = null;
      return { ok: true, inserted: n };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('notify', (_e, { title, body }) => {
    notify(title || 'KeepNoteAI Desktop', body || '');
    return { ok: true };
  });

  // Ambil daftar rencana dari portal e-Kinerja (butuh cookie + x-auth).
  ipcMain.handle('portal:listRk', async () => {
    const creds = {
      portalUrl: config.portalUrl,
      cookie: config.cookie,
      xAuth: config.xAuth,
      skpid: config.skpid,
    };
    if (!creds.portalUrl || !creds.xAuth) return { ok: false, error: 'Isi Cookie & X-Auth di Pengaturan dulu' };
    const base = (creds.portalUrl || 'https://kipapp.bps.go.id').replace(/\/$/, '');
    try {
      const res = await portalRequest({
        method: 'GET',
        url: `${base}/api/v1/skp/rk?skpid=${encodeURIComponent(creds.skpid || '1344761')}&direct=1`,
        headers: buildPortalHeaders(creds.cookie, creds.xAuth, creds.portalUrl),
      });
      if (!res.ok || !(res.ctype || '').includes('json')) {
        return { ok: false, error: `Portal menolak (${res.status}): ${res.body.slice(0, 200)}` };
      }
      const list = JSON.parse(res.body);
      if (!Array.isArray(list)) return { ok: false, error: 'Format respons portal tidak dikenali' };
      const items = list.map((i) => ({ rkid: String(i.rkid), name: i.rencanakinerja || '' })).filter((i) => i.name);
      return { ok: true, items };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('rencana:list', async () => {
    if (!currentUserId) return { ok: false, error: 'Belum login' };
    try {
      const rows = await listRencana(currentUserId);
      return { ok: true, rows };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('rencana:map', async (_e, { rencanaId, rkid }) => {
    if (!currentUserId) return { ok: false, error: 'Belum login' };
    try {
      await updateRencanaRkid(currentUserId, rencanaId, rkid);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('web:open', async (_e, { path: p }) => {
    const url = siteUrl + (p || '');
    try {
      await shell.openExternal(url);
      return { ok: true, url };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // Cek duplikat di portal sebelum sync (best-effort, tanpa side effect penulisan).
  // Mencoba GET daftar kegiatan portal; bila endpoint tak tersedia, fallback aman (duplicate:false).
  ipcMain.handle('portal:checkDup', async (_e, { laporan, rencanaNama, portalRkid }) => {
    const creds = {
      portalUrl: config.portalUrl,
      cookie: config.cookie,
      xAuth: config.xAuth,
      skpid: config.skpid,
    };
    let rkid = portalRkid || '';
    if (!rkid) {
      const r = await resolveRkid(creds, rencanaNama || '', null);
      rkid = r.rkid || '';
    }
    if (!rkid) return { duplicate: false, reason: 'rkid tidak diketahui' };
    const base = (creds.portalUrl || 'https://kipapp.bps.go.id').replace(/\/$/, '');
    try {
      const res = await portalRequest({
        method: 'GET',
        url: `${base}/api/v1/kegiatan?skpid=${encodeURIComponent(creds.skpid || '')}&rkid=${encodeURIComponent(rkid)}&tanggal=${encodeURIComponent(laporan.tanggalMulai || '')}`,
        headers: buildPortalHeaders(creds.cookie, creds.xAuth, creds.portalUrl),
      });
      if (!res.ok || !(res.ctype || '').includes('json')) {
        return { duplicate: false, reason: 'endpoint daftar tidak tersedia' };
      }
      const list = JSON.parse(res.body);
      if (!Array.isArray(list)) return { duplicate: false };
      const hay = (laporan.kegiatan || '').toLowerCase().trim();
      const found = list.some((it) => {
        const k = (it.kegiatan || it.nama || '').toLowerCase().trim();
        return k && (k === hay || k.includes(hay) || hay.includes(k));
      });
      return { duplicate: found };
    } catch {
      return { duplicate: false, reason: 'gagal cek' };
    }
  });

  createWindow();
  startAutoScheduler();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // biarkan app tetap jalan di tray (Windows)
});
