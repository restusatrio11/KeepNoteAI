'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/providers/ToastProvider';
import { Save, Folder, Loader2, Info } from 'lucide-react';
import { saveSettings, getSettings } from './actions';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const [fetching, setFetching] = useState(true);

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
          borderLeft: '4px solid var(--primary)', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '2rem',
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.8)'
        }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <Info size={16} />
            Instruksi Penting
          </p>
          <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <li>Bagikan folder Drive Anda dengan email Service Account sebagai <strong>Editor</strong>.</li>
            <li>Tempelkan lInk folder atau ID folder di kolom di bawah ini.</li>
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
