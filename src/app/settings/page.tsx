'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/providers/ToastProvider';
import { Save, Folder, Loader2, Info, Rocket, CheckCircle2 } from 'lucide-react';
import { saveSettings, getSettings, setupAutoDrive } from './actions';

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
    </div>
  );
}
