'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, Target, Activity, CheckCircle, 
  Image as ImageIcon, Loader2, Sparkles, UploadCloud, X,
  BrainCircuit, Wand2, FileText, Video as VideoIcon, Check, Users
} from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import SearchableSelect from '@/components/SearchableSelect';

interface ReportModalProps {
  report?: any;
  isCopy?: boolean;
  rencanaOptions: any[];
  timOptions: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportModal({ report, isCopy, rencanaOptions, timOptions, onClose, onSuccess }: ReportModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingPlans, setIsFetchingPlans] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTimId, setSelectedTimId] = useState(
    report?.rencanaId ? rencanaOptions.find(r => r.id === report.rencanaId)?.timId || '' : ''
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(report?.buktiUrl ? 'File Terlampir' : null);

  const filteredPrograms = selectedTimId 
    ? rencanaOptions.filter(r => r.timId === selectedTimId)
    : rencanaOptions;

  const [uraianDasar, setUraianDasar] = useState('');

  const [formData, setFormData] = useState({
    tanggal: (report && !isCopy) ? new Date(report.tanggal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    rencanaId: report?.rencanaId || '',
    kegiatan: report?.kegiatan || '',
    progress: report?.progress || '0%',
    capaian: report?.capaian || '',
    buktiUrl: isCopy ? '' : (report?.buktiUrl || ''),
  });

  const getFileIcon = (url: string | null) => {
    if (!url) return <UploadCloud size={16} />;
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon size={18} />;
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return <VideoIcon size={18} />;
    if (['pdf'].includes(ext || '')) return <FileText size={18} />;
    return <FileText size={18} />;
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
      const res = await fetch(`/api/ai/plans-to-draft?date=${formData.tanggal}`);
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
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedFile && !formData.buktiUrl) {
      showToast('Unggah foto terlebih dahulu!', 'error');
      return;
    }
    if (!formData.rencanaId) {
      showToast('Pilih Rencana Kerja terlebih dahulu untuk konteks analisis!', 'error');
      return;
    }

    setIsAnalyzing(true);
    try {
      // If we have the raw file, use it. Otherwise we'd need to fetch from URL which is harder.
      // We assume the user just uploaded it.
      let base64 = '';
      let contentType = '';

      if (selectedFile) {
        contentType = selectedFile.type;
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(selectedFile);
        });
      } else {
        showToast('Mohon unggah ulang foto untuk analisis AI (Data sinkronisasi dibutuhkan)', 'info');
        setIsAnalyzing(false);
        return;
      }

      const res = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          base64Image: base64, 
          contentType, 
          rencanaId: formData.rencanaId 
        }),
      });

      const data = await res.json();
      if (data.kegiatan && data.capaian) {
        setFormData(prev => ({ 
          ...prev, 
          kegiatan: data.kegiatan,
          capaian: data.capaian 
        }));
        showToast(contentType.includes('image') ? 'AI telah menganalisis foto Anda!' : 'AI telah menganalisis isi dokumen Anda!', 'success');
      }
    } catch (error) {
      showToast('Gagal menganalisis foto.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = (report && !isCopy) ? `/api/laporan/${report.id}` : '/api/laporan';
      const method = (report && !isCopy) ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast((report && !isCopy) ? 'Laporan diperbarui!' : 'Laporan disimpan!', 'success');
        onSuccess();
        onClose();
      }
    } catch (error) {
      showToast('Gagal menyimpan laporan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
            <Calendar size={14} color="var(--primary)" />
            Tanggal
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
          <SearchableSelect 
            label="Tim Kerja"
            options={timOptions}
            value={selectedTimId}
            onChange={(val) => {
              setSelectedTimId(val);
              setFormData({ ...formData, rencanaId: '' });
            }}
            placeholder="-- Semua Program --"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', gridColumn: 'span 2' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
            <Target size={14} color="var(--primary)" />
            Program Kerja
          </label>
          <SearchableSelect 
            required
            options={filteredPrograms}
            value={formData.rencanaId}
            onChange={(val) => setFormData({ ...formData, rencanaId: val })}
            placeholder="Pilih Program..."
          />
        </div>
      </div>

      <div style={{ 
        padding: '1.25rem', 
        backgroundColor: 'rgba(59, 130, 246, 0.05)', 
        borderRadius: '16px', 
        border: '1px solid rgba(59, 130, 246, 0.1)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
            <Sparkles size={16} className={isGenerating ? 'animate-pulse' : ''} />
            Uraian Tugas Dasar
          </label>
          <button 
            type="button" 
            onClick={handleDraftFromPlans}
            disabled={isFetchingPlans}
            className="btn glass"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', height: 'auto', border: '1px dashed var(--primary)', borderRadius: '8px' }}
          >
            {isFetchingPlans ? <Loader2 size={12} className="spin" /> : <BrainCircuit size={12} />}
            <span>Draft dari Rencana</span>
          </button>
        </div>
        <textarea 
          rows={2}
          placeholder="Tuliskan kasar apa yang anda kerjakan... AI Magic akan memprosesnya"
          value={uraianDasar}
          onChange={(e) => setUraianDasar(e.target.value)}
          className="input-base"
          style={{ backgroundColor: 'rgba(0,0,0,0.2)', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}
        />
        <button 
          type="button"
          onClick={handleGenerateAI}
          disabled={isGenerating || !uraianDasar}
          className="btn glass"
          style={{ width: '100%', gap: '0.6rem', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 800 }}
        >
          {isGenerating ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}
          {isGenerating ? 'AI Sedang Menyusun...' : 'Optimasi AI Magic ✨'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
            <Activity size={14} color="var(--primary)" />
            Uraian Kegiatan (Profesional)
          </label>
          <textarea 
            required
            rows={2}
            placeholder="Hasil optimasi AI akan muncul di sini..."
            value={formData.kegiatan}
            onChange={(e) => setFormData({ ...formData, kegiatan: e.target.value })}
            className="input-base"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
             <CheckCircle size={14} color="var(--primary)" />
             Capaian (Profesional)
          </label>
          <textarea 
            required
            rows={2}
            placeholder="Target/hasil profesional akan muncul di sini..."
            value={formData.capaian}
            onChange={(e) => setFormData({ ...formData, capaian: e.target.value })}
            className="input-base"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <SearchableSelect 
            label="Progres"
            options={['0%', '25%', '50%', '75%', '100%'].map(p => ({ id: p, nama: p }))}
            value={formData.progress}
            onChange={(val) => setFormData({ ...formData, progress: val })}
            required
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
             Bukti (Foto/Video/PDF)
          </label>
          <div style={{ position: 'relative' }}>
             {uploading ? (
                <div className="btn glass" style={{ width: '100%', gap: '0.5rem', opacity: 0.6 }}>
                  <Loader2 size={16} className="spin" /> Mengunggah...
                </div>
             ) : formData.buktiUrl ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  padding: '0.75rem 1rem', 
                  backgroundColor: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid var(--success)',
                  borderRadius: '12px',
                  color: 'var(--success)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}>
                  {getFileIcon(formData.buktiUrl)}
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {uploadedFileName || 'File Terlampir'}
                  </span>
                  <Check size={16} />
                  <button type="button" onClick={() => { setFormData({ ...formData, buktiUrl: '' }); setUploadedFileName(null); }} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
             ) : (
                <div style={{ position: 'relative' }}>
                  <button type="button" className="btn glass" style={{ width: '100%', gap: '0.5rem' }}>
                    <UploadCloud size={16} /> Pilih File Bukti
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

      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
        <button type="button" onClick={onClose} className="btn glass" style={{ flex: 1 }}>Batal</button>
        <button type="submit" disabled={loading || uploading} className="btn btn-primary" style={{ flex: 2 }}>
          {loading ? <Loader2 size={20} className="spin" /> : ((report && !isCopy) ? 'Update Laporan' : 'Simpan Laporan')}
        </button>
      </div>
    </form>
  );
}
