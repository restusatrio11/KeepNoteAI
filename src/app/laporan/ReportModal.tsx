'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, Target, Activity, CheckCircle, Clock, Plus, X,
  Image as ImageIcon, Loader2, Sparkles, UploadCloud,
  BrainCircuit, Wand2, FileText, Video as VideoIcon, Check, AlertTriangle
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
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingPlans, setIsFetchingPlans] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTimId, setSelectedTimId] = useState(
    report?.rencanaId ? rencanaOptions.find(r => r.id === report.rencanaId)?.timId || '' : ''
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const filteredPrograms = selectedTimId 
    ? rencanaOptions.filter(r => r.timId === selectedTimId)
    : rencanaOptions;

  const [uraianDasar, setUraianDasar] = useState('');

  const parseBuktiUrls = (val: string | null | undefined): string[] => {
    if (!val) return [];
    try { return JSON.parse(val); } catch { return val ? [val] : []; }
  };

  const [formData, setFormData] = useState({
    tanggalMulai: (report && !isCopy) ? new Date(report.tanggalMulai || report.tanggal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    tanggalSelesai: (report && !isCopy) ? new Date(report.tanggalSelesai || report.tanggal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    jamMulai: (report && !isCopy) ? (report.jamMulai || '') : '',
    jamSelesai: (report && !isCopy) ? (report.jamSelesai || '') : '',
    rencanaId: report?.rencanaId || '',
    kegiatan: report?.kegiatan || '',
    progress: report?.progress ?? 100,
    capaian: report?.capaian || '',
    buktiUrls: isCopy ? '' : (report?.buktiUrls || report?.buktiUrl || ''),
    masukanSkp: (report && !isCopy) ? (report.masukanSkp || '') : '',
  });

  const selectedRencana = rencanaOptions.find(r => r.id === formData.rencanaId);

  const [buktiLinkList, setBuktiLinkList] = useState<string[]>(parseBuktiUrls(formData.buktiUrls));
  const [newBuktiLink, setNewBuktiLink] = useState('');

  useEffect(() => {
    setFormData(prev => ({ ...prev, buktiUrls: JSON.stringify(buktiLinkList) }));
  }, [buktiLinkList]);

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

  const handleAnalyzeImage = async () => {
    if (!selectedFile && buktiLinkList.length === 0) {
      showToast('Unggah foto terlebih dahulu!', 'error');
      return;
    }
    if (!formData.rencanaId) {
      showToast('Pilih Rencana Kerja terlebih dahulu untuk konteks analisis!', 'error');
      return;
    }

    setIsAnalyzing(true);
    try {
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
    setSaving(true);

    const payload = {
      ...formData,
      buktiUrls: JSON.stringify(buktiLinkList),
    };

    try {
      const url = (report && !isCopy) ? `/api/laporan/${report.id}` : '/api/laporan';
      const method = (report && !isCopy) ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(isCopy ? 'Laporan berhasil disalin!' : 'Laporan berhasil disimpan!', 'success');
        onSuccess();
        onClose();
      } else {
        showToast(data.error || 'Gagal menyimpan laporan', 'error');
      }
    } catch (error) {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<{ isAppropriate: boolean; feedback: string; suggestions: string } | null>(null);

  const handleReviewAI = async () => {
    if (!formData.kegiatan || !formData.capaian) {
      showToast('Lengkapi kegiatan dan capaian untuk direview', 'info');
      return;
    }

    setReviewing(true);
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kegiatan: formData.kegiatan,
          progress: String(formData.progress),
          capaian: formData.capaian
        })
      });
      const data = await res.json();
      if (data.isAppropriate !== undefined) {
        setReviewResult(data);
        showToast('Review AI Selesai', 'success');
      } else {
        showToast(data.error || 'Gagal mereview laporan', 'error');
      }
    } catch (error) {
      showToast('Gagal terhubung ke AI Supervisor', 'error');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
            <Calendar size={14} color="var(--primary)" />
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
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
            <Calendar size={14} color="var(--primary)" />
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
            <Clock size={14} color="var(--primary)" />
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
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
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
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
            <Activity size={14} color="var(--primary)" />
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
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
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
            <button type="button" className="btn glass" style={{ width: '100%', gap: '0.5rem', fontSize: '0.8rem' }}>
              <UploadCloud size={14} /> Upload File Bukti
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
        <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
          <CheckCircle size={14} color="var(--primary)" />
          Masukan ke Capaian SKP
        </label>
        <textarea 
          rows={2}
          placeholder="Catatan untuk capaian SKP..."
          value={formData.masukanSkp}
          onChange={(e) => setFormData({ ...formData, masukanSkp: e.target.value })}
          className="input-base"
        />
      </div>

      {reviewResult && (
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1.5rem', 
          borderRadius: '16px', 
          backgroundColor: reviewResult.isAppropriate ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
          border: `1px solid ${reviewResult.isAppropriate ? 'var(--success)' : 'var(--error)'}`,
          animation: 'slideUp 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
             {reviewResult.isAppropriate ? <CheckCircle size={20} color="var(--success)" /> : <AlertTriangle size={20} color="var(--error)" />}
             <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: reviewResult.isAppropriate ? 'var(--success)' : 'var(--error)' }}>
               {reviewResult.isAppropriate ? 'Laporan Sudah Sesuai' : 'Perlu Perbaikan'}
             </h4>
          </div>
          <p style={{ fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1rem', opacity: 0.9 }}>{reviewResult.feedback}</p>
          {reviewResult.suggestions && (
            <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '12px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '0.25rem' }}>Saran AI:</span>
              {reviewResult.suggestions}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button 
          type="button" 
          onClick={handleReviewAI} 
          disabled={reviewing || uploading} 
          className="btn glass" 
          style={{ width: '100%', gap: '0.75rem', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 800 }}
        >
          {reviewing ? <Loader2 size={18} className="spin" /> : <BrainCircuit size={18} />}
          {reviewing ? 'MENGANALISIS KUALITAS...' : 'REVIEW KUALITAS AI ✨'}
        </button>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" onClick={onClose} className="btn glass" style={{ flex: 1 }}>Batal</button>
          <button type="submit" disabled={saving || uploading} className="btn btn-primary" style={{ flex: 2 }}>
            {saving ? <Loader2 size={20} className="spin" /> : ((report && !isCopy) ? 'Update Laporan' : 'Simpan Laporan')}
          </button>
        </div>
      </div>
    </form>
  );
}
