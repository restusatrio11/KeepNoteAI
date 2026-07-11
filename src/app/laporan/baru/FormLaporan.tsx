'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, Target, Activity, CheckCircle, Clock, Plus, X,
  Image as ImageIcon, Loader2, Sparkles, UploadCloud,
  Wand2, BrainCircuit, FileText, Video as VideoIcon, Check
} from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import SearchableSelect from '@/components/SearchableSelect';

interface FormLaporanProps {
  rencanaOptions: any[];
  timOptions: any[];
  userId: string;
}

export default function FormLaporan({ rencanaOptions, timOptions, userId }: FormLaporanProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingPlans, setIsFetchingPlans] = useState(false);
  const [selectedTimId, setSelectedTimId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const filteredPrograms = selectedTimId 
    ? rencanaOptions.filter(r => r.timId === selectedTimId)
    : rencanaOptions;

  const [uraianDasar, setUraianDasar] = useState('');

  const [formData, setFormData] = useState({
    tanggalMulai: new Date().toISOString().split('T')[0],
    tanggalSelesai: new Date().toISOString().split('T')[0],
    jamMulai: '',
    jamSelesai: '',
    rencanaId: '',
    kegiatan: '',
    progress: 100,
    capaian: '',
    buktiUrls: '',
    masukanSkp: '',
  });

  const selectedRencana = rencanaOptions.find(r => r.id === formData.rencanaId);
  const [buktiLinkList, setBuktiLinkList] = useState<string[]>([]);
  const [newBuktiLink, setNewBuktiLink] = useState('');

  useEffect(() => {
    setFormData(prev => ({ ...prev, buktiUrls: JSON.stringify(buktiLinkList) }));
  }, [buktiLinkList]);

  const getFileIcon = (url: string | null) => {
    if (!url) return <UploadCloud size={20} />;
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon size={20} />;
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return <VideoIcon size={20} />;
    if (['pdf'].includes(ext || '')) return <FileText size={20} />;
    return <FileText size={20} />;
  };

  const handleGenerateAI = async () => {
    if (!uraianDasar) {
      showToast('Tuliskan dulu apa yang Anda lakukan hari ini!', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedTim = timOptions.find(t => t.id === selectedTimId)?.nama;
      const selectedRencana = rencanaOptions.find(r => r.id === formData.rencanaId)?.nama;

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deskripsi: uraianDasar,
          timContext: selectedTim,
          rencanaContext: selectedRencana
        }),
      });
      const data = await res.json();
      if (data.kegiatan && data.capaian) {
        setFormData(prev => ({ 
          ...prev, 
          kegiatan: data.kegiatan,
          capaian: data.capaian 
        }));
        showToast('AI telah menyusun laporan profesional!', 'success');
      }
    } catch (error) {
      showToast('AI sedang sibuk, coba lagi nanti.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDraftFromPlans = async () => {
    setIsFetchingPlans(true);
    try {
      const res = await fetch(`/api/ai/plans-to-draft?date=${formData.tanggalMulai}`);
      const data = await res.json();
      if (data.draft) {
        setUraianDasar(data.draft);
        showToast('Berhasil menarik rencana harian!', 'success');
      } else {
        showToast('Belum ada rencana yang selesai (centang) untuk tanggal ini.', 'info');
      }
    } catch (error) {
      showToast('Gagal menarik rencana.', 'error');
    } finally {
      setIsFetchingPlans(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!formData.rencanaId) {
      showToast('Pilih dulu Rencana Kerja agar AI punya konteks.', 'error');
      return;
    }

    if (!selectedFile && buktiLinkList.length === 0) {
      showToast('Pilih file lampiran terlebih dahulu.', 'error');
      return;
    }

    setIsAnalyzing(true);
    try {
      let base64Image = '';
      let contentType = '';

      if (selectedFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
          };
          reader.readAsDataURL(selectedFile);
        });
        base64Image = await base64Promise;
        contentType = selectedFile.type;
      } else if (buktiLinkList.length > 0) {
        const res = await fetch(buktiLinkList[0]);
        const blob = await res.blob();
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
          };
          reader.readAsDataURL(blob);
        });
        base64Image = await base64Promise;
        contentType = blob.type;
      }

      const res = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          base64Image, 
          contentType,
          rencanaId: formData.rencanaId 
        }),
      });
      
      const data = await res.json();
      if (data.kegiatan && data.capaian) {
        setFormData(prev => ({
          ...prev,
          kegiatan: data.kegiatan,
          capaian: data.capaian,
          progress: data.progress || prev.progress
        }));
        showToast('Analisis AI Berhasil!', 'success');
      } else {
        showToast('AI gagal menganalisis lampiran ini.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Gagal memproses analisis AI.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploading(true);

    const body = new FormData();
    body.append('file', file);
    body.append('rencanaId', formData.rencanaId);
    body.append('deskripsi', formData.kegiatan || uraianDasar);

    try {
      const res = await fetch('/api/upload/drive', {
        method: 'POST',
        body,
      });
      const data = await res.json();
      if (data.link) {
        setBuktiLinkList(prev => [...prev, data.link]);
        showToast('File berhasil diunggah ke Drive!', 'success');
      }
    } catch (error) {
      showToast('Gagal mengunggah file.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAddBuktiLink = () => {
    const url = newBuktiLink.trim();
    if (!url) return;
    try { new URL(url); } catch { showToast('URL tidak valid', 'error'); return; }
    setBuktiLinkList(prev => [...prev, url]);
    setNewBuktiLink('');
  };

  const handleRemoveBuktiLink = (index: number) => {
    setBuktiLinkList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      buktiUrls: JSON.stringify(buktiLinkList),
    };

    try {
      const res = await fetch('/api/laporan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Laporan berhasil disimpan!', 'success');
        router.push('/laporan');
        router.refresh();
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menyimpan laporan', 'error');
      }
    } catch (error) {
      showToast('Gagal menyimpan laporan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card glass animate-in" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
            <Calendar size={16} color="var(--primary)" />
            Tanggal Mulai
          </label>
          <input 
            type="date"
            required
            value={formData.tanggalMulai}
            onChange={(e) => setFormData({ ...formData, tanggalMulai: e.target.value })}
            className="input-base"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
            <Calendar size={16} color="var(--primary)" />
            Tanggal Selesai
          </label>
          <input 
            type="date"
            required
            value={formData.tanggalSelesai}
            onChange={(e) => setFormData({ ...formData, tanggalSelesai: e.target.value })}
            className="input-base"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <Clock size={14} color="var(--primary)" />
          <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
            Jam Mulai
          </label>
          <input 
            type="time"
            value={formData.jamMulai}
            onChange={(e) => setFormData({ ...formData, jamMulai: e.target.value })}
            className="input-base"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
            <Clock size={14} color="var(--primary)" />
            Jam Selesai
          </label>
          <input 
            type="time"
            value={formData.jamSelesai}
            onChange={(e) => setFormData({ ...formData, jamSelesai: e.target.value })}
            className="input-base"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <SearchableSelect 
            label="Pilih Tim Kerja"
            options={timOptions}
            value={selectedTimId}
            onChange={(val) => {
              setSelectedTimId(val);
              setFormData({ ...formData, rencanaId: '' });
            }}
            placeholder="Lihat Semua Program"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <SearchableSelect 
            label="Pilih Program Kerja"
            options={filteredPrograms}
            value={formData.rencanaId}
            onChange={(val) => setFormData({ ...formData, rencanaId: val })}
            placeholder="Pilih Program..."
            required
          />
        </div>
      </div>

      {selectedRencana?.iki && (
        <div style={{ 
          padding: '0.75rem 1rem', 
          backgroundColor: 'rgba(139, 92, 246, 0.08)', 
          borderRadius: '12px', 
          border: '1px solid rgba(139, 92, 246, 0.15)',
          fontSize: '0.85rem'
        }}>
          <span style={{ fontWeight: 700, color: '#8b5cf6', display: 'block', marginBottom: '0.25rem' }}>IKI Rencana Kinerja:</span>
          <span style={{ opacity: 0.85 }}>{selectedRencana.iki}</span>
        </div>
      )}

      <div style={{ 
        padding: '1.5rem', 
        backgroundColor: 'rgba(59, 130, 246, 0.05)', 
        borderRadius: '20px', 
        border: '1px solid rgba(59, 130, 246, 0.1)',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <label style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)' }}>
            <Sparkles size={18} className={isGenerating ? 'animate-pulse' : ''} />
            Uraian Tugas Dasar (Ketik Disini)
          </label>
          <button 
            type="button" 
            onClick={handleDraftFromPlans}
            disabled={isFetchingPlans}
            className="btn glass"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', height: 'auto', border: '1px dashed var(--primary)', borderRadius: '10px' }}
          >
            {isFetchingPlans ? <Loader2 size={14} className="spin" /> : <BrainCircuit size={14} />}
            <span>Draft dari Rencana Hari Ini ✨</span>
          </button>
        </div>
        <textarea 
          rows={3}
          placeholder="Tuliskan kasar kegiatan hari ini... AI Magic akan menyusunnya ke bahasa profesional"
          value={uraianDasar}
          onChange={(e) => setUraianDasar(e.target.value)}
          className="input-base"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', marginBottom: '1.25rem', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}
        />
        <button 
          type="button"
          onClick={handleGenerateAI}
          disabled={isGenerating || !uraianDasar}
          className="btn glass"
          style={{ width: '100%', height: '56px', gap: '0.8rem', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 800, fontSize: '1rem' }}
        >
          {isGenerating ? <Loader2 size={24} className="spin" /> : <Wand2 size={24} />}
          {isGenerating ? 'AI Magic Sedang Memproses...' : 'PROSES DENGAN AI MAGIC ✨'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.9 }}>
            <Activity size={18} color="var(--primary)" />
            Uraian Kegiatan (HASIL PROFESIONAL)
          </label>
          <textarea 
            required
            rows={3}
            placeholder="Terisi otomatis..."
            value={formData.kegiatan}
            onChange={(e) => setFormData({ ...formData, kegiatan: e.target.value })}
            className="input-base"
            style={{ fontSize: '1rem', lineHeight: '1.7' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.9 }}>
            <CheckCircle size={18} color="var(--primary)" />
            Capaian (HASIL PROFESIONAL)
          </label>
          <textarea 
            required
            rows={3}
            placeholder="Terisi otomatis..."
            value={formData.capaian}
            onChange={(e) => setFormData({ ...formData, capaian: e.target.value })}
            className="input-base"
            style={{ fontSize: '1rem', lineHeight: '1.7' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.9 }}>
            <Activity size={18} color="var(--primary)" />
            Progres (%)
          </label>
          <input 
            type="number"
            min={0}
            max={100}
            required
            value={formData.progress}
            onChange={(e) => setFormData({ ...formData, progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
            className="input-base"
            style={{ fontSize: '1rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Data Dukung & Link
          </label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input 
              type="url"
              placeholder="Tambah link..."
              value={newBuktiLink}
              onChange={(e) => setNewBuktiLink(e.target.value)}
              className="input-base"
              style={{ flex: 1 }}
            />
            <button type="button" onClick={handleAddBuktiLink} className="btn glass" style={{ padding: '0.5rem' }}>
              <Plus size={16} />
            </button>
          </div>
          {buktiLinkList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.4rem' }}>
              {buktiLinkList.map((url, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.5rem', backgroundColor: 'rgba(16,185,129,0.05)', borderRadius: '8px', fontSize: '0.8rem' }}>
                  {getFileIcon(url)}
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                  <button type="button" onClick={() => handleRemoveBuktiLink(i)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ position: 'relative', marginTop: '0.4rem' }}>
            <button type="button" className="btn glass" style={{ width: '100%', gap: '0.5rem' }}>
              <UploadCloud size={20} /> Upload File
            </button>
            <input 
              type="file" 
              accept="*/*" 
              onChange={handleFileUpload} 
              disabled={uploading}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
            />
          </div>
          <button 
            type="button"
            onClick={handleAnalyzeImage}
            disabled={isAnalyzing || uploading || (!selectedFile && buktiLinkList.length === 0)}
            className="btn glass"
            style={{ 
              width: '100%', 
              marginTop: '0.4rem', 
              gap: '0.6rem', 
              border: '1px solid #8b5cf6', 
              color: '#8b5cf6', 
              fontWeight: 800,
              fontSize: '0.8rem',
              opacity: (!selectedFile && buktiLinkList.length === 0) ? 0.5 : 1,
              cursor: (!selectedFile && buktiLinkList.length === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            {isAnalyzing ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
            {isAnalyzing ? 'Menganalisis...' : 'Analisis AI ✨'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
          <CheckCircle size={16} color="var(--primary)" />
          Masukan ke Capaian SKP
        </label>
        <textarea 
          rows={2}
          placeholder="Catatan untuk capaian SKP..."
          value={formData.masukanSkp}
          onChange={(e) => setFormData({ ...formData, masukanSkp: e.target.value })}
          className="input-base"
          style={{ fontSize: '1rem' }}
        />
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button type="button" onClick={() => router.back()} className="btn glass" style={{ flex: 1, height: '56px' }}>Batal</button>
        <button type="submit" disabled={loading || uploading} className="btn btn-primary" style={{ flex: 2, height: '56px', fontSize: '1.1rem' }}>
          {loading ? <Loader2 size={24} className="spin" /> : 'Simpan Laporan Sekarang 🚀'}
        </button>
      </div>
    </form>
  );
}
