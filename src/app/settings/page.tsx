'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/providers/ToastProvider';
import { Save, Folder, Loader2, Info, Rocket, CheckCircle2, Smartphone, Link2, Link2Off } from 'lucide-react';
import { saveSettings, getSettings, setupAutoDrive, savePortalCredentials, getPortalCredentials, saveRencanaPortalMapping, getPortalRencanaList } from './actions';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const [fetching, setFetching] = useState(true);
  const [autoLoading, setAutoLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const settings = await getSettings();
      if (settings?.driveFolderId) {
        setDriveLink(settings.driveFolderId);
      }
      setFetching(false);
    }
    load();
  }, []);

  async function handleAutoSetup() {
    if (!confirm('Sistem akan membuat folder privat baru di Master Drive dan mengundang email Anda sebagai Editor. Lanjutkan?')) return;
    
    setAutoLoading(true);
    try {
      const res = await setupAutoDrive();
      if (res.success) {
        setDriveLink(res.folderId);
        showToast('Berhasil! Folder dibuat & Undangan dikirim ke email Anda.', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal menyiapkan Drive otomatis', 'error');
    } finally {
      setAutoLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await saveSettings(formData);
      if (res.success) {
        showToast('Pengaturan berhasil disimpan!', 'success');
        setDriveLink(res.folderId || '');
      }
    } catch (error) {
      showToast('Gagal menyimpan pengaturan.', 'error');
    } finally {
      setLoading(false);
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Folder size={20} color="var(--primary)" />
          Integrasi Google Drive
        </h2>

        <div style={{ 
          backgroundColor: 'rgba(59, 130, 246, 0.05)', 
          border: '1px solid rgba(59, 130, 246, 0.2)', 
          padding: '1.5rem', 
          borderRadius: '16px',
          marginBottom: '2.5rem',
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: 'var(--primary)' }}>
              <Rocket size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Setup Drive Otomatis</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Malas ribet? Biarkan AI yang membuatkan folder dan mengundang email Anda otomatis.
              </p>
              <button 
                onClick={handleAutoSetup}
                disabled={autoLoading}
                className="btn btn-primary" 
                style={{ height: '48px', padding: '0 1.5rem', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
              >
                {autoLoading ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
                <span>{autoLoading ? 'Sedang Memproses...' : 'Mulai Setup Otomatis'}</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', opacity: 0.5 }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Atau Konfigurasi Manual</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
          </div>
          <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <li>Bagikan folder Drive Anda dengan email Service Account sebagai <strong>Editor</strong>.</li>
            <li>Tempelkan Link folder atau ID folder di kolom di bawah ini.</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Link / ID Folder Google Drive</label>
            <input 
              type="text" 
              name="driveLink" 
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..." 
              required
              className="input-base"
              style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'white' }} 
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Setiap foto yang Anda unggah akan disimpan ke folder ini secara otomatis.
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.85rem 2rem' }}>
            {loading ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            <span>{loading ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </form>
      </div>

      <div className="card glass" style={{ padding: '2.5rem', marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Smartphone size={20} color="var(--primary)" />
          Integrasi Telegram
        </h2>
        <TelegramSection />
      </div>

      <div className="card glass" style={{ padding: '2.5rem', marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link2 size={20} color="var(--primary)" />
          Integrasi e-Kinerja / SKP
        </h2>
        <PortalSection />
      </div>
    </div>
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
