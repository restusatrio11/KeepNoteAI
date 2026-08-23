'use client';

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useToast } from '@/providers/ToastProvider';
import { Save, Folder, Loader2, Info, CheckCircle2, Smartphone, Link2, Link2Off, HelpCircle } from 'lucide-react';
import Modal from '@/components/Modal';
import { getSettings, savePortalCredentials, getPortalCredentials, saveRencanaPortalMapping, getPortalRencanaList } from './actions';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState<null | 'drive' | 'telegram' | 'portal'>(null);
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolder, setNewFolder] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);

  async function loadFolders(currentId?: string) {
    try {
      const res = await fetch('/api/drive/folder');
      if (res.ok) {
        const data = await res.json();
        const fl = data.folders || [];
        setFolders(fl);
        const cur = currentId || driveFolderId;
        setSelectedFolder(cur && fl.find((f) => f.id === cur) ? cur : (fl[0]?.id || ''));
      } else {
        showToast('Gagal memuat folder Drive. Putuskan lalu Hubungkan ulang Google Drive (izin berubah).', 'error');
      }
    } catch {
      showToast('Gagal memuat folder Drive. Periksa koneksi Drive Anda.', 'error');
    }
  }

  useEffect(() => {
    async function load() {
      const settings = await getSettings();
      if (settings) {
        setDriveConnected(settings.driveConnected);
        setDriveEmail(settings.driveEmail || null);
        setDriveFolderId(settings.driveFolderId || null);
        if (settings.driveConnected) loadFolders(settings.driveFolderId || undefined);
      }
      setFetching(false);
    }
    load();
  }, []);

  async function handleSaveFolder() {
    setSavingFolder(true);
    try {
      const body = selectedFolder
        ? { folderId: selectedFolder }
        : { folderName: newFolder.trim() };
      const res = await fetch('/api/drive/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setDriveFolderId(data.folderId);
        setNewFolder('');
        showToast('Folder tujuan Drive diperbarui.', 'success');
        loadFolders(data.folderId);
      } else {
        showToast(data.error || 'Gagal menyimpan folder.', 'error');
      }
    } catch {
      showToast('Gagal menyimpan folder.', 'error');
    } finally {
      setSavingFolder(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('drive');
    if (d === 'connected') showToast('Google Drive berhasil dihubungkan ke akun Anda!', 'success');
    if (d === 'error') showToast('Gagal menghubungkan Google Drive. Coba lagi.', 'error');
    if (d === 'config') showToast('Google Drive belum dikonfigurasi. Isi GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET di file .env (lihat panduan).', 'error');
    if (d) window.history.replaceState({}, '', '/settings');
  }, []);

  function handleConnect() {
    window.location.href = '/api/drive/auth';
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await fetch('/api/drive/disconnect', { method: 'POST' });
      setDriveConnected(false);
      setDriveEmail(null);
      showToast('Google Drive diputuskan.', 'success');
    } catch {
      showToast('Gagal memutuskan koneksi.', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (fetching) return <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="spin" /></div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700 }}>Pengaturan</h1>
        <p style={{ color: 'var(--text-muted)' }}>Konfigurasi integrasi Google Drive dan akun Anda.</p>
      </header>

      <div className="card glass" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Folder size={20} color="var(--primary)" />
            Integrasi Google Drive
          </h2>
          <HintButton onClick={() => setHelp('drive')} />
        </div>

        <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
          Hubungkan akun Google Drive <strong>pribadi Anda</strong>. Foto &amp; bukti yang diunggah akan tersimpan di Drive Anda sendiri — tidak tercampur dengan user lain.
        </p>

        {driveConnected ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '1rem', backgroundColor: 'rgba(16,185,129,0.05)', borderRadius: '12px', border: '1px solid var(--success)' }}>
              <CheckCircle2 size={24} color="var(--success)" />
              <div>
                <p style={{ fontWeight: 700, color: 'var(--success)' }}>Terhubung</p>
                <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>{driveEmail}</p>
              </div>
            </div>

            <div style={{ marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 500, display: 'block', marginBottom: '0.5rem' }}>
                Folder Tujuan di Drive Anda
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <FolderSelect
                  folders={folders}
                  value={selectedFolder}
                  onSelect={setSelectedFolder}
                  placeholder="Cari folder di Drive Anda..."
                />
                <button onClick={handleSaveFolder} disabled={savingFolder} className="btn btn-primary" style={{ padding: '0.7rem 1.25rem' }}>
                  {savingFolder ? <Loader2 size={16} className="spin" /> : <Folder size={16} />}
                  <span>{savingFolder ? 'Menyimpan...' : 'Pakai Folder Ini'}</span>
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.75rem 0 0.4rem' }}>
                Atau buat folder baru / tempel link folder Drive:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  placeholder="Nama folder, atau tempel https://drive.google.com/drive/folders/..."
                  className="input-base"
                  style={{ flex: '1 1 220px', minWidth: 0, padding: '0.7rem 0.8rem', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'white' }}
                />
                <button onClick={handleSaveFolder} disabled={savingFolder || !newFolder.trim()} className="btn glass">
                  <span>Buat &amp; Pakai</span>
                </button>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
                Bukti laporan akan disimpan ke folder yang Anda pilih di Drive pribadi Anda.
              </p>
            </div>

            <button onClick={handleDisconnect} disabled={busy} className="btn glass" style={{ color: 'var(--error)', marginTop: '1.25rem' }}>
              {busy ? <Loader2 size={16} className="spin" /> : <Link2Off size={16} />}
              <span>{busy ? 'Memutuskan...' : 'Putuskan Google Drive'}</span>
            </button>
          </div>
        ) : (
          <button onClick={handleConnect} className="btn btn-primary" style={{ height: '48px', padding: '0 1.5rem' }}>
            <Folder size={18} />
            <span>Hubungkan Google Drive</span>
          </button>
        )}
      </div>

      <div className="card glass" style={{ padding: '2.5rem', marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Smartphone size={20} color="var(--primary)" />
            Integrasi Telegram
          </h2>
          <HintButton onClick={() => setHelp('telegram')} />
        </div>
        <TelegramSection />
      </div>

      <div className="card glass" style={{ padding: '2.5rem', marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link2 size={20} color="var(--primary)" />
            Integrasi e-Kinerja / SKP
          </h2>
          <HintButton onClick={() => setHelp('portal')} />
        </div>
        <PortalSection />
      </div>

      <Modal isOpen={help === 'drive'} onClose={() => setHelp(null)} title="Cara: Integrasi Google Drive">
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Menghubungkan akun Google Drive <strong>pribadi Anda</strong> agar semua bukti laporan tersimpan di Drive Anda sendiri (tidak tercampur user lain).
        </p>
        <ol style={stepList}>
          <li>Klik tombol <b>Hubungkan Google Drive</b> di bawah ini.</li>
          <li>Anda diarahkan ke login Google — pilih akun Drive Anda, lalu klik <b>Izinkan</b>.</li>
          <li>Kembali ke halaman ini, status akan berubah menjadi <b>“Terhubung sebagai &lt;email Anda&gt;”</b>.</li>
          <li>Setelah terhubung, pilih <b>Folder Tujuan</b> di Drive Anda (atau buat folder baru, mis. <b>KeepNoteAI</b>). Bukti laporan akan disimpan ke folder tersebut.</li>
        </ol>
        <p style={noteBox}>Ingin berhenti? Klik <b>Putuskan Google Drive</b>. File yang sudah tersimpan tetap ada di Drive Anda.</p>
      </Modal>

      <Modal isOpen={help === 'telegram'} onClose={() => setHelp(null)} title="Cara: Integrasi Telegram">
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Kirim laporan langsung dari HP lewat bot Telegram — otomatis masuk ke akun Anda. Lakukan sekali saja.
        </p>
        <ol style={stepList}>
          <li>Di halaman ini, klik <b>Generate Kode</b>, lalu <b>salin kode 6 huruf</b> yang muncul.</li>
          <li>Buka Telegram, chat bot <b>@KipappAIbot</b>, kirim perintah:<br /><code style={codeStyle}>/link KODE</code></li>
          <li>Bot membalas <b>“Berhasil terhubung”</b>. Chat Telegram Anda kini terikat akun Anda.</li>
          <li>Kirim <b>foto/dokumen</b> (beri caption) atau <b>teks</b> → bot membuat laporan & menyimpannya ke akun Anda.</li>
        </ol>
        <p style={noteBox}>Perintah lain: <code style={codeStyle}>/rk</code> (lihat/pilih Rencana Kinerja), <code style={codeStyle}>/status</code>, <code style={codeStyle}>/unlink</code> (putuskan), <code style={codeStyle}>/help</code>.</p>
      </Modal>

      <Modal isOpen={help === 'portal'} onClose={() => setHelp(null)} title="Cara: Integrasi e-Kinerja / SKP">
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Mengisi kredensial portal agar laporan bisa dikirim ke &amp; rencana diambil dari e-Kinerja BPS. Data dienkripsi per-user.
        </p>
        <ol style={stepList}>
          <li>Buka portal e-Kinerja di browser, lalu buka <b>DevTools (F12) → tab Network</b>.</li>
          <li>Muat/isi halaman, cari request ke <code style={codeStyle}>/api/...</code>, lalu salin dua header:
            <ul style={{ marginTop: '0.5rem' }}>
              <li><b>Cookie</b> — seluruh nilainya.</li>
              <li><b>X-Auth</b> — berbentuk <code style={codeStyle}>Bearer eyJ...</code> (ini JWT).</li>
            </ul>
          </li>
          <li>Isi form di bawah: <b>URL Portal</b>, <b>Cookie Sesi</b>, <b>X-Auth</b>, dan <b>SKP ID</b> (mis. <code style={codeStyle}>1344761</code>).</li>
          <li>Klik <b>Simpan</b> lalu <b>Test Koneksi</b>. Jika muncul “Koneksi portal OK”, siap digunakan.</li>
        </ol>
        <p style={noteBox}>⚠️ <b>X-Auth berlaku ±24 jam.</b> Jika sync gagal, salin ulang Cookie &amp; X-Auth dari DevTools, lalu Simpan &amp; Test lagi.</p>
      </Modal>
    </div>
  );
}

const stepList: CSSProperties = {
  paddingLeft: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  fontSize: '0.88rem',
  color: 'var(--text)',
  lineHeight: 1.5,
};

const noteBox: CSSProperties = {
  marginTop: '1rem',
  padding: '0.85rem 1rem',
  borderRadius: '12px',
  backgroundColor: 'rgba(59,130,246,0.07)',
  border: '1px solid rgba(59,130,246,0.25)',
  fontSize: '0.82rem',
  color: 'var(--text-muted)',
};

const codeStyle: CSSProperties = {
  display: 'inline-block',
  padding: '0.1rem 0.45rem',
  backgroundColor: 'rgba(0,0,0,0.35)',
  borderRadius: '6px',
  fontSize: '0.8rem',
  fontFamily: 'monospace',
  color: 'var(--accent)',
};

function HintButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Cara penggunaan"
      aria-label="Cara penggunaan"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: '50%',
        backgroundColor: 'rgba(59,130,246,0.12)',
        color: 'var(--primary)',
        border: '1px solid rgba(59,130,246,0.3)',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <HelpCircle size={18} />
    </button>
  );
}

function PortalSection() {
  const { showToast } = useToast();
  const [portalUrl, setPortalUrl] = useState('');
  const [cookie, setCookie] = useState('');
  const [xAuth, setXAuth] = useState('');
  const [portalSkpid, setPortalSkpid] = useState('1344761');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPortalCredentials();
        if (data) {
          setPortalUrl(data.portalUrl);
          if (data.skpid) setPortalSkpid(data.skpid);
          if (data.hasCookie) setCookie('******');
          if (data.hasXAuth) setXAuth('******');
        }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, []);

  async function handleSave(e?: React.FormEvent<HTMLFormElement>) {
    if (e) e.preventDefault();
    setSaving(true);
    setTestResult(null);
    const fd = new FormData();
    fd.set('portalUrl', portalUrl);
    fd.set('portalSkpid', portalSkpid.trim());
    if (cookie && cookie !== '******') fd.set('portalCookie', cookie);
    if (xAuth && xAuth !== '******') fd.set('portalXAuth', xAuth);
    try {
      const res = await savePortalCredentials(fd);
      if (res.success) showToast('Kredensial portal tersimpan (terenkripsi).', 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan', 'error');
      return false;
    } finally { setSaving(false); }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    // Pastikan tersimpan dulu
    const saved = await handleSave();
    if (!saved) { setTesting(false); return; }
    try {
      const res = await fetch('/api/portal/test', { method: 'POST' });
      const data = await res.json();
      setTestResult({ ok: !!data.success, message: data.message || (data.error || 'Selesai') });
      if (data.success) showToast('Koneksi portal OK', 'success');
      else showToast(data.message || 'Koneksi gagal', 'error');
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Gagal' });
    } finally { setTesting(false); }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '1rem' }}><Loader2 className="spin" /></div>;

  return (
    <div>
      <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
        Otomasi via API langsung portal e-Kinerja/SKP. Dari DevTools (Network saat buka/isi portal), salin <code>Cookie</code> dan header <code>X-Auth: Bearer ...</code> (JWT, berlaku ~24 jam).
      </p>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>URL Portal</label>
          <input
            type="text"
            value={portalUrl}
            onChange={(e) => setPortalUrl(e.target.value)}
            placeholder="https://kipapp.example.go.id/..."
            required
            className="input-base"
            style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'white' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Cookie Sesi</label>
          <input
            type="password"
            value={cookie}
            onChange={(e) => setCookie(e.target.value)}
            placeholder="tempel nilai header Cookie (mis. PHPSESSID=abc; token=xyz)"
            className="input-base"
            style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'white' }}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Disimpan terenkripsi (AES-256-GCM). Kosongkan jika tidak ingin mengubah cookie tersimpan.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>X-Auth (JWT Bearer)</label>
          <textarea
            value={xAuth}
            onChange={(e) => setXAuth(e.target.value)}
            placeholder="Bearer eyJ..."
            rows={3}
            className="input-base"
            style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'white', fontFamily: 'monospace', fontSize: '0.75rem' }}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Ambil dari header <code>X-Auth</code> (kata "Bearer " boleh ada atau tidak, kami tambahkan otomatis). Berlaku ~24 jam — salin ulang bila expired.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>SKP ID <span style={{ opacity: 0.5 }}>(satu nilai, global)</span></label>
          <input
            type="text"
            value={portalSkpid}
            onChange={(e) => setPortalSkpid(e.target.value)}
            placeholder="mis. 1344761"
            className="input-base"
            style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'white' }}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ID SKP periode berjalan (contoh <code>1344761</code> untuk 2026). Dipakai untuk mengambil daftar Rencana Kinerja otomatis.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.85rem 2rem' }}>
            {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
          </button>
          <button type="button" onClick={handleTest} disabled={testing} className="btn glass">
            {testing ? <Loader2 className="spin" size={18} /> : <Link2 size={18} />}
            <span>{testing ? 'Menguji...' : 'Test Koneksi'}</span>
          </button>
        </div>

        {testResult && (
          <div style={{
            padding: '1rem 1.25rem', borderRadius: '12px',
            backgroundColor: testResult.ok ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
            border: `1px solid ${testResult.ok ? 'var(--success)' : 'var(--error)'}`,
            fontSize: '0.85rem', color: testResult.ok ? 'var(--success)' : 'var(--error)',
          }}>
            {testResult.message}
          </div>
        )}
      </form>

      <RencanaMapping />
    </div>
  );
}

function RencanaMapping() {
  const { showToast } = useToast();
  const [rencanaList, setRencanaList] = useState<any[]>([]);
  const [portalOptions, setPortalOptions] = useState<{ rkid: string; rencanakinerja: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadRencana() {
    setLoading(true);
    try {
      const res = await fetch('/api/rencana');
      if (res.ok) {
        const data = await res.json();
        setRencanaList(Array.isArray(data) ? data : []);
      }
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { loadRencana(); }, []);

  async function loadPortalOptions() {
    setLoadingPortal(true);
    try {
      const opts = await getPortalRencanaList();
      setPortalOptions(opts);
      if (opts.length === 0) showToast('Daftar rencana kosong — cek SKP ID & kredensial.', 'error');
      else showToast(`Daftar rencana portal dimuat (${opts.length}).`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat daftar rencana portal', 'error');
    } finally { setLoadingPortal(false); }
  }

  async function saveRow(item: any, rkid: string) {
    setSavingId(item.id);
    const fd = new FormData();
    fd.set('rencanaId', item.id);
    fd.set('rkid', rkid);
    try {
      await saveRencanaPortalMapping(fd);
      showToast(`"${item.nama}" → Rencana Kinerja tersimpan.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan mapping', 'error');
    } finally { setSavingId(null); }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '1rem', marginTop: '1.5rem' }}><Loader2 className="spin" /></div>;

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Peta Rencana Kinerja → Portal</h3>
        <button type="button" onClick={loadPortalOptions} disabled={loadingPortal} className="btn glass" style={{ padding: '0.5rem 1rem' }}>
          {loadingPortal ? <Loader2 className="spin" size={14} /> : <Link2 size={14} />}
          <span>{loadingPortal ? 'Memuat...' : 'Muat Daftar dari Portal'}</span>
        </button>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 1rem' }}>
        Klik <strong>Muat Daftar dari Portal</strong>, lalu pilih Rencana Kinerja yang cocok untuk setiap rencana di sini. App akan otomatis mengisi <code>rkid</code>; tidak perlu tahu ID-nya.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rencanaList.length === 0 && <p style={{ fontSize: '0.82rem', opacity: 0.5 }}>Belum ada rencana kinerja di sini.</p>}
        {rencanaList.map((item) => (
          <RencanaRow
            key={item.id}
            item={item}
            options={portalOptions}
            saving={savingId === item.id}
            onSave={(rkid) => saveRow(item, rkid)}
          />
        ))}
      </div>
    </div>
  );
}

function RencanaRow({ item, options, saving, onSave }: { item: any; options: { rkid: string; rencanakinerja: string }[]; saving: boolean; onSave: (rkid: string) => void }) {
  const [rkid, setRkid] = useState(item.portalRkid || '');
  const selected = options.find((o) => o.rkid === rkid);

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.nama}</p>
        <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>{item.kode}</p>
      </div>
      <SearchableSelect
        options={options}
        value={rkid}
        disabled={options.length === 0}
        placeholder="— cari & pilih Rencana Kinerja portal —"
        onSelect={(v) => { setRkid(v); onSave(v); }}
      />
      {saving && <Loader2 className="spin" size={14} />}
    </div>
  );
}

function FolderSelect({ folders, value, onSelect, placeholder }: {
  folders: { id: string; name: string }[];
  value: string;
  onSelect: (id: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = folders.find((f) => f.id === value);
    setText(s ? s.name : '');
  }, [value, folders]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = text.trim().toLowerCase();
  const filtered = q ? folders.filter((f) => f.name.toLowerCase().includes(q)) : folders;

  return (
    <div ref={ref} style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
      <input
        value={text}
        placeholder={placeholder}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="input-base"
        style={{ width: '100%', padding: '0.7rem 0.8rem', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'white' }}
      />
      {open && filtered.length > 0 && (
        <ul style={{ position: 'absolute', zIndex: 50, top: 'calc(100% + 4px)', left: 0, right: 0, maxHeight: 240, overflowY: 'auto', backgroundColor: '#15151c', border: '1px solid var(--border)', borderRadius: 8, margin: 0, padding: 0, listStyle: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {filtered.map((f) => (
            <li
              key={f.id}
              onMouseDown={() => { setText(f.name); onSelect(f.id); setOpen(false); }}
              style={{ padding: '0.5rem 0.7rem', fontSize: '0.85rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', color: f.id === value ? 'var(--accent)' : 'white', backgroundColor: f.id === value ? 'rgba(255,255,255,0.06)' : 'transparent' }}
            >
              {f.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchableSelect({ options, value, onSelect, placeholder, disabled }: {
  options: { rkid: string; rencanakinerja: string }[];
  value: string;
  onSelect: (rkid: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = options.find((o) => o.rkid === value);
    setText(s ? s.rencanakinerja : '');
  }, [value, options]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = text.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.rencanakinerja.toLowerCase().includes(q))
    : options;

  return (
    <div ref={ref} style={{ position: 'relative', flex: '2 1 280px' }}>
      <input
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="input-base"
        style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'white', fontSize: '0.8rem' }}
      />
      {open && !disabled && filtered.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            zIndex: 50,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 240,
            overflowY: 'auto',
            backgroundColor: '#15151c',
            border: '1px solid var(--border)',
            borderRadius: 8,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {filtered.map((o) => (
            <li
              key={o.rkid}
              onMouseDown={() => { setText(o.rencanakinerja); onSelect(o.rkid); setOpen(false); }}
              style={{
                padding: '0.5rem 0.7rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                color: o.rkid === value ? 'var(--accent)' : 'white',
                backgroundColor: o.rkid === value ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}
            >
              {o.rencanakinerja}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TelegramSection() {
  const { showToast } = useToast();
  const [data, setData] = useState<{ code: string; isLinked: boolean; chatId: string | null; botUsername: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCode, setShowCode] = useState(false);

  async function fetchCode() {
    setLoading(true);
    setShowCode(true);
    try {
      const res = await fetch('/api/telegram/link');
      if (res.ok) setData(await res.json());
    } catch {} finally { setLoading(false); }
  }

  async function handleUnlink() {
    if (!confirm('Putuskan koneksi Telegram?')) return;
    try {
      await fetch('/api/telegram/link', { method: 'DELETE' });
      setData(prev => prev ? { ...prev, isLinked: false, chatId: null } : null);
      setShowCode(false);
      showToast('Koneksi Telegram diputuskan.', 'success');
    } catch { showToast('Gagal memutuskan koneksi.', 'error'); }
  }

  useEffect(() => { fetchCode(); }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '1rem' }}><Loader2 className="spin" /></div>;

  return (
    <div>
      {data?.isLinked ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '1rem', backgroundColor: 'rgba(16,185,129,0.05)', borderRadius: '12px', border: '1px solid var(--success)' }}>
            <CheckCircle2 size={24} color="var(--success)" />
            <div>
              <p style={{ fontWeight: 700, color: 'var(--success)' }}>Terhubung</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Telegram Chat ID: {data.chatId}</p>
            </div>
          </div>
          <button onClick={handleUnlink} className="btn glass" style={{ color: 'var(--error)' }}>
            <Link2Off size={16} /> Putuskan Koneksi
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            Hubungkan akun Telegram untuk membuat laporan langsung dari chat — kirim foto, dokumen, atau teks kegiatan.
          </p>
          <div style={{ 
            padding: '1.25rem', 
            backgroundColor: 'rgba(59, 130, 246, 0.05)', 
            borderRadius: '12px', 
            border: '1px solid rgba(59, 130, 246, 0.15)',
            marginBottom: '1rem'
          }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Langkah-langkah:</p>
            <ol style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.25rem' }}>
              <li>Klik <strong>"Generate Kode"</strong> di bawah</li>
              <li>Buka Telegram, chat ke <strong>@{data?.botUsername || 'KipappAIbot'}</strong></li>
              <li>Ketik <code>/link KODE</code> (ganti KODE dengan kode yang muncul)</li>
            </ol>
          </div>
          <button onClick={fetchCode} disabled={loading} className="btn btn-primary">
            <Link2 size={16} /> Generate Kode
          </button>
          {showCode && data?.code && (
            <div style={{ marginTop: '1rem', padding: '1.25rem', backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: '12px', border: '2px dashed var(--primary)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>Kirim kode ini ke bot Telegram:</p>
              <p style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '8px', color: 'var(--primary)', fontFamily: 'monospace' }}>{data.code}</p>
              <p style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '0.5rem' }}>Berlaku 5 menit</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.75rem' }}>
                📱 Buka <a href={`https://t.me/${data.botUsername}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>t.me/{data.botUsername}</a> lalu ketik:
              </p>
              <code style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '1rem', marginTop: '0.5rem' }}>
                /link {data.code}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

