'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Sparkles, Save, Calendar, Clock, MapPin, 
  User, Tag, Users, FileText, Loader2, Wand2,
  CheckCircle, Activity, Trash2, Upload, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/providers/ToastProvider';

export default function EditNotulenPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    judul: '',
    tanggal: '',
    waktu: '',
    tempat: '',
    pemimpin: '',
    topik: '',
    notulis: '',
    peserta: '',
    rawNotes: ''
  });

  // Attachments State
  const [undanganUrl, setUndanganUrl] = useState<string | null>(null);
  const [daftarHadirUrl, setDaftarHadirUrl] = useState<string | null>(null);
  const [dokumentasiUrls, setDokumentasiUrls] = useState<string[]>([]);
  const [uploadLoading, setUploadLoading] = useState<Record<string, boolean>>({});

  // AI Result State
  const [aiResult, setAiResult] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/notulen/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        
        setFormData({
          judul: data.judul,
          tanggal: data.tanggal.split('T')[0],
          waktu: data.waktu || '',
          tempat: data.tempat || '',
          pemimpin: data.pemimpin || '',
          topik: data.topik || '',
          notulis: data.notulis || '',
          peserta: data.peserta || '',
          rawNotes: '' // Initial raw notes might be empty for edit if not saved previously
        });
        
        setUndanganUrl(data.undanganUrl);
        setDaftarHadirUrl(data.daftarHadirUrl);
        setDokumentasiUrls(data.dokumentasiUrls ? JSON.parse(data.dokumentasiUrls) : []);
        setAiResult(JSON.parse(data.konten));
        setPreviewMode(true); // Default to preview mode for existing ones
      } catch (err) {
        showToast('Gagal memuat data notulen', 'error');
        router.push('/notulen');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router, showToast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'undangan' | 'daftarHadir' | 'dokumentasi') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(prev => ({ ...prev, [type]: true }));
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('deskripsi', `${type === 'dokumentasi' ? 'Dokumentasi' : type === 'undangan' ? 'Undangan' : 'Daftar Hadir'} - ${formData.judul}`);

    try {
      const res = await fetch('/api/upload/drive', {
        method: 'POST',
        body: uploadFormData
      });
      const data = await res.json();
      
      if (data.success) {
        if (type === 'undangan') setUndanganUrl(data.link);
        else if (type === 'daftarHadir') setDaftarHadirUrl(data.link);
        else if (type === 'dokumentasi') setDokumentasiUrls(prev => [...prev, data.link]);
        showToast('File berhasil terunggah ke Drive!', 'success');
      } else {
        showToast(data.error || 'Gagal mengunggah file.', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat mengunggah.', 'error');
    } finally {
      setUploadLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleGenerateAI = async () => {
    if (!formData.rawNotes.trim()) return alert('Masukkan catatan kasar terlebih dahulu');
    
    setGenerating(true);
    try {
      const res = await fetch('/api/notulen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawNotes: formData.rawNotes,
          metadata: { judul: formData.judul, topik: formData.topik }
        })
      });

      const data = await res.json();
      if (data.result) {
        setAiResult(data.result);
        setPreviewMode(true);
        showToast('AI telah berhasil memperbarui notulen!', 'success');
      } else {
        showToast(data.error || 'Gagal memperbarui notulen via AI.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan koneksi ke server AI.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        konten: JSON.stringify(aiResult),
        undanganUrl,
        daftarHadirUrl,
        dokumentasiUrls: JSON.stringify(dokumentasiUrls)
      };

      const res = await fetch(`/api/notulen/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Notulen berhasil diperbarui!', 'success');
        router.push(`/notulen/${id}`);
      } else {
        showToast('Gagal memperbarui notulen.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat menyimpan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '5rem', padding: '1rem' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <button 
              onClick={() => router.back()} 
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ArrowLeft size={24} />
            </button>
            <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 800 }}>
              Edit Notulen
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Perbarui data notulen atau tambahkan poin baru melalui AI.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => setPreviewMode(!previewMode)} className="btn glass">
            {previewMode ? 'Edit Metadata' : 'Lihat Pratinjau'}
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="btn btn-primary"
            style={{ padding: '0.9rem 2rem' }}
          >
            {saving ? <Loader2 size={20} className="spin" /> : <Save size={20} />}
            Simpan Perubahan
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!previewMode ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card glass animate-in" 
            style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            {/* Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 1' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                  <FileText size={16} color="var(--primary)" />
                  Judul Utama Rapat
                </label>
                <input 
                  name="judul"
                  value={formData.judul}
                  onChange={handleInputChange}
                  placeholder="Judul Rapat"
                  className="input-base"
                  style={{ fontSize: '1.1rem', fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                  <Calendar size={16} color="var(--primary)" />
                  Tanggal
                </label>
                <input 
                  type="date"
                  name="tanggal"
                  value={formData.tanggal}
                  onChange={handleInputChange}
                  className="input-base"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                  <Clock size={16} color="var(--primary)" />
                  Waktu Pelaksanaan
                </label>
                <input 
                  name="waktu"
                  value={formData.waktu}
                  onChange={handleInputChange}
                  placeholder="14:00 - 16:30 WIB"
                  className="input-base"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                  <MapPin size={16} color="var(--primary)" />
                  Tempat / Link
                </label>
                <input 
                  name="tempat"
                  value={formData.tempat}
                  onChange={handleInputChange}
                  placeholder="Ruang Rapat 1"
                  className="input-base"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                  <User size={16} color="var(--primary)" />
                  Pemimpin Rapat
                </label>
                <input 
                  name="pemimpin"
                  value={formData.pemimpin}
                  onChange={handleInputChange}
                  placeholder="Nama Pimpinan"
                  className="input-base"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                  <Users size={16} color="var(--primary)" />
                  Peserta
                </label>
                <input 
                  name="peserta"
                  value={formData.peserta}
                  onChange={handleInputChange}
                  placeholder="Andi, Budi..."
                  className="input-base"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                  <Tag size={16} color="var(--primary)" />
                  Notulis
                </label>
                <input 
                  name="notulis"
                  value={formData.notulis}
                  onChange={handleInputChange}
                  placeholder="Nama Notulis"
                  className="input-base"
                />
              </div>
            </div>

            {/* AI Session Area for updating content */}
            <div style={{ 
              padding: 'clamp(1rem, 3vw, 2rem)', 
              backgroundColor: 'rgba(59, 130, 246, 0.05)', 
              borderRadius: '24px', 
              border: '1px solid rgba(59, 130, 246, 0.1)',
              marginTop: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)' }}>
                  <Sparkles size={20} className={generating ? 'animate-pulse' : ''} />
                  Perbarui Isi Notulen via AI
                </label>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Masukkan poin tambahan/perubahan</span>
              </div>
              
              <textarea 
                name="rawNotes"
                rows={6}
                placeholder="Tuliskan poin-poin tambahan atau revisi di sini. AI akan menggabungkannya ke dalam struktur notulen yang sudah ada."
                value={formData.rawNotes}
                onChange={handleInputChange}
                className="input-base"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', marginBottom: '1.5rem', fontSize: '1rem' }}
              />

              <button 
                type="button"
                onClick={handleGenerateAI}
                disabled={generating || !formData.rawNotes}
                className="btn btn-primary"
                style={{ width: '100%', height: '56px', gap: '1rem', fontWeight: 800 }}
              >
                {generating ? <Loader2 size={24} className="spin" /> : <Wand2 size={24} />}
                {generating ? 'MENYUSUN ULANG...' : 'PERBARUI STRUKTUR VIA AI ✨'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card glass"
            style={{ padding: '0', overflow: 'hidden' }}
          >
            {/* Header Dokument Area */}
            <div style={{ padding: 'clamp(1.5rem, 5vw, 3rem)', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 4vw, 3rem)' }}>
                  <h2 style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px', marginBottom: '0.5rem' }}>
                    {aiResult?.judul || formData.judul}
                  </h2>
                  <p style={{ color: 'var(--primary)', fontWeight: 800, letterSpacing: '4px', fontSize: '0.9rem' }}>NOTULA KEGIATAN</p>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', padding: '1.5rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, marginBottom: '0.4rem' }}>TANGGAL</label>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formData.tanggal ? new Date(formData.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, marginBottom: '0.4rem' }}>WAKTU</label>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formData.waktu || '-'}</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, marginBottom: '0.4rem' }}>TEMPAT</label>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formData.tempat || '-'}</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, marginBottom: '0.4rem' }}>PIMPINAN</label>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formData.pemimpin || '-'}</p>
                  </div>
               </div>
            </div>

            {/* Konten Area */}
            <div style={{ padding: 'clamp(1.5rem, 6vw, 4rem)', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
               <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '8px', height: '24px', backgroundColor: 'var(--primary)', borderRadius: '4px' }} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>I. RINGKASAN EKSEKUTIF</h3>
                  </div>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.8', opacity: 0.9, fontStyle: 'italic', paddingLeft: '1.5rem', borderLeft: '2px solid rgba(255,255,255,0.05)' }}>
                    {aiResult?.kesimpulan}
                  </p>
               </section>

               <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <div style={{ width: '8px', height: '24px', backgroundColor: 'var(--primary)', borderRadius: '4px' }} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>II. HASIL PEMBAHASAN</h3>
                  </div>
                  
                  <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {aiResult?.pembahasan.map((p: any, idx: number) => (
                      <div key={idx}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--primary)', display: 'flex', gap: '0.75rem' }}>
                          <span style={{ opacity: 0.5 }}>{idx + 1}.</span>
                          {p.topik}
                        </h4>
                        <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          {p.items.map((item: any, i: number) => (
                            <div key={i}>
                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '0.6rem', flexShrink: 0 }} />
                                <p style={{ fontSize: '1rem', lineHeight: '1.6', opacity: 0.85 }}>{item.deskripsi}</p>
                              </div>
                              {item.solusi && (
                                <div style={{ 
                                  marginTop: '0.75rem', 
                                  marginLeft: '1.25rem', 
                                  padding: '0.85rem', 
                                  backgroundColor: 'rgba(16, 185, 129, 0.05)', 
                                  borderLeft: '4px solid var(--success)',
                                  borderRadius: '0 12px 12px 0'
                                }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--success)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Solusi:</span>
                                  <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>{item.solusi}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
               </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
