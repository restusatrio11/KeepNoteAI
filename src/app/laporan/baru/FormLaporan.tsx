'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, Target, Activity, CheckCircle, 
  Image as ImageIcon, Loader2, Sparkles, UploadCloud, X,
  Wand2, BrainCircuit, FileText, Video as VideoIcon, Check
} from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

interface FormLaporanProps {
  rencanaOptions: any[];
  userId: string;
}

export default function FormLaporan({ rencanaOptions, userId }: FormLaporanProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [uraianDasar, setUraianDasar] = useState('');

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    rencanaId: '',
    kegiatan: '',
    progress: '0%',
    capaian: '',
    buktiUrl: '',
  });

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
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deskripsi: uraianDasar }),
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

  const handleAnalyzeImage = async () => {
    if (!formData.rencanaId) {
      showToast('Pilih dulu Rencana Kerja agar AI punya konteks.', 'error');
      return;
    }

    if (!selectedFile && !formData.buktiUrl) {
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
      } else if (formData.buktiUrl) {
        // Fallback if only URL is available
        const res = await fetch(formData.buktiUrl);
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
    setUploadedFileName(file.name);

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
        setFormData(prev => ({ ...prev, buktiUrl: data.link }));
        showToast('File berhasil diunggah ke Drive!', 'success');
      }
    } catch (error) {
      showToast('Gagal mengunggah file.', 'error');
      setUploadedFileName(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/laporan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast('Laporan berhasil disimpan!', 'success');
        router.push('/laporan');
        router.refresh();
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
            Tanggal Laporan
          </label>
          <input 
            type="date"
            required
            value={formData.tanggal}
            onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
            className="input-base"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
            <Target size={16} color="var(--primary)" />
            Rencana Kerja
          </label>
          <select 
            required
            value={formData.rencanaId}
            onChange={(e) => setFormData({ ...formData, rencanaId: e.target.value })}
            className="input-base"
          >
            <option value="">Pilih Program...</option>
            {rencanaOptions.map(r => (
              <option key={r.id} value={r.id}>{r.nama}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ 
        padding: '1.5rem', 
        backgroundColor: 'rgba(59, 130, 246, 0.05)', 
        borderRadius: '20px', 
        border: '1px solid rgba(59, 130, 246, 0.1)',
        marginBottom: '1rem'
      }}>
        <label style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)' }}>
          <Sparkles size={18} className={isGenerating ? 'animate-pulse' : ''} />
          Uraian Tugas Dasar (Ketik Disini)
        </label>
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
           <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Progress Kerja
          </label>
          <select 
            required
            value={formData.progress}
            onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
            className="input-base"
          >
            {['0%', '25%', '50%', '75%', '100%'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Lampiran Bukti (Semua Jenis File)
          </label>
          <div style={{ position: 'relative' }}>
             {uploading ? (
                <div className="btn glass" style={{ width: '100%', gap: '0.5rem', opacity: 0.6 }}>
                  <Loader2 size={16} className="spin" /> Sinkronisasi...
                </div>
             ) : formData.buktiUrl ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  padding: '0.9rem 1.25rem', 
                  backgroundColor: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid var(--success)',
                  borderRadius: '14px',
                  color: 'var(--success)',
                  fontSize: '0.95rem',
                  fontWeight: 600
                }}>
                  {getFileIcon(formData.buktiUrl)}
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {uploadedFileName || 'File Terunggah'}
                  </span>
                  <Check size={18} />
                  <button type="button" onClick={() => { setFormData({ ...formData, buktiUrl: '' }); setUploadedFileName(null); }} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
             ) : (
                <div style={{ position: 'relative' }}>
                  <button type="button" className="btn glass" style={{ width: '100%', gap: '0.5rem' }}>
                    <UploadCloud size={20} /> Pilih File (Foto/Video/PDF)
                  </button>
                  <input 
                    type="file" 
                    accept="*/*" 
                    onChange={handleFileUpload} 
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                  />
                </div>
             )}
          </div>

          <button 
            type="button"
            onClick={handleAnalyzeImage}
            disabled={isAnalyzing || uploading || (!selectedFile && !formData.buktiUrl)}
            className="btn glass"
            style={{ 
              width: '100%', 
              marginTop: '0.75rem', 
              gap: '0.6rem', 
              border: '1px solid #8b5cf6', 
              color: '#8b5cf6', 
              fontWeight: 800,
              fontSize: '0.8rem',
              opacity: (!selectedFile && !formData.buktiUrl) ? 0.5 : 1,
              cursor: (!selectedFile && !formData.buktiUrl) ? 'not-allowed' : 'pointer'
            }}
          >
            {isAnalyzing ? (
              <Loader2 size={14} className="spin" />
            ) : (
              (selectedFile?.type?.includes('image') || (formData.buktiUrl && ['jpg','jpeg','png','webp'].some(ext => formData.buktiUrl.toLowerCase().endsWith(ext)))) ? <ImageIcon size={14} /> : <FileText size={14} />
            )}
            {isAnalyzing ? 'Menganalisis...' : (
              (selectedFile?.type?.includes('image') || (formData.buktiUrl && ['jpg','jpeg','png','webp'].some(ext => formData.buktiUrl.toLowerCase().endsWith(ext)))) ? 'Analisis Foto AI ✨' : 'Analisis Dokumen AI ✨'
            )}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button type="button" onClick={() => router.back()} className="btn glass" style={{ flex: 1, height: '56px' }}>Batal</button>
        <button type="submit" disabled={loading || uploading} className="btn btn-primary" style={{ flex: 2, height: '56px', fontSize: '1.1rem' }}>
           Simpan Laporan Sekarang 🚀
        </button>
      </div>
    </form>
  );
}
