'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Sparkles, Save, Calendar, Clock, MapPin, 
  User, Tag, Users, FileText, Loader2, Wand2, BrainCircuit,
  CheckCircle, Activity, Trash2, Upload, Image as ImageIcon, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/providers/ToastProvider';

export default function BaruNotulenPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    judul: '',
    tanggal: new Date().toISOString().split('T')[0],
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
    
    setLoading(true);
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
        showToast('AI telah berhasil menyusun notulen!', 'success');
      } else {
        showToast(data.error || 'AI sedang sibuk atau timeout. Coba klik tombol lagi.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan koneksi ke server AI.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        konten: aiResult,
        undanganUrl,
        daftarHadirUrl,
        dokumentasiUrls: JSON.stringify(dokumentasiUrls)
      };

      const res = await fetch('/api/notulen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Notulen berhasil disimpan!', 'success');
        router.push('/notulen');
      } else {
        showToast('Gagal menyimpan notulen.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat menyimpan.', 'error');
    } finally {
      setSaving(false);
    }
  };

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
              {previewMode ? 'Pratinjau Notulen AI' : 'Generator Notulen AI'}
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            {previewMode 
              ? 'Tinjau hasil susunan AI sebelum disimpan ke arsip.' 
              : 'Gunakan AI untuk merapikan catatan rapat Anda menjadi notulen profesional.'}
          </p>
        </div>
        
        {previewMode && (
          <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '400px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button onClick={() => setPreviewMode(false)} className="btn glass" style={{ flex: 1 }}>
              Edit Catatan
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="btn btn-primary"
              style={{ padding: '0.9rem 2rem', flex: 1.5 }}
            >
              {saving ? <Loader2 size={20} className="spin" /> : <Save size={20} />}
              Simpan Notulen 🚀
            </button>
          </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        {!previewMode ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card glass animate-in" 
            style={{ padding: 'clamp(1.5rem, 5vw, 2.5rem)', display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            {/* Metadata Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
                  <FileText size={16} color="var(--primary)" />
                  Judul Utama Rapat
                </label>
                <input 
                  name="judul"
                  value={formData.judul}
                  onChange={handleInputChange}
                  placeholder="Contoh: Rapat Koordinasi Mingguan - Tim Kreatif"
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
                  placeholder="Ruang Rapat 1 / Zoom Link"
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
                  Peserta (Sebutkan)
                </label>
                <input 
                  name="peserta"
                  value={formData.peserta}
                  onChange={handleInputChange}
                  placeholder="Andi, Budi, Siti..."
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
                  placeholder="Nama Pencatat"
                  className="input-base"
                />
              </div>
            </div>

            {/* Lampiran & Dokumentasi Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)' }}>
                <Activity size={20} />
                Lampiran & Dokumentasi
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {/* Undangan */}
                <div className="card glass" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>Undangan Rapat</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDF atau Gambar</p>
                    </div>
                    {undanganUrl ? (
                      <CheckCircle size={20} color="var(--success)" />
                    ) : (
                      <Upload size={20} style={{ opacity: 0.3 }} />
                    )}
                  </div>
                  
                  {undanganUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                      <FileText size={16} />
                      <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>Sudah Terunggah</span>
                      <button onClick={() => setUndanganUrl(null)} className="btn glass" style={{ padding: '0.4rem', color: 'var(--error)' }}><Trash2 size={14} /></button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="file" 
                        accept=".pdf,image/*" 
                        onChange={(e) => handleFileUpload(e, 'undangan')}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }}
                        disabled={uploadLoading['undangan']}
                      />
                      <button className="btn glass" style={{ width: '100%', fontSize: '0.85rem' }}>
                        {uploadLoading['undangan'] ? <Loader2 className="spin" size={16} /> : 'Pilih File'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Daftar Hadir */}
                <div className="card glass" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>Daftar Hadir</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDF atau Gambar</p>
                    </div>
                    {daftarHadirUrl ? (
                      <CheckCircle size={20} color="var(--success)" />
                    ) : (
                      <Upload size={20} style={{ opacity: 0.3 }} />
                    )}
                  </div>
                  
                  {daftarHadirUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                      <FileText size={16} />
                      <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>Sudah Terunggah</span>
                      <button onClick={() => setDaftarHadirUrl(null)} className="btn glass" style={{ padding: '0.4rem', color: 'var(--error)' }}><Trash2 size={14} /></button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="file" 
                        accept=".pdf,image/*" 
                        onChange={(e) => handleFileUpload(e, 'daftarHadir')}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }}
                        disabled={uploadLoading['daftarHadir']}
                      />
                      <button className="btn glass" style={{ width: '100%', fontSize: '0.85rem' }}>
                        {uploadLoading['daftarHadir'] ? <Loader2 className="spin" size={16} /> : 'Pilih File'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Dokumentasi (Multiple) */}
                <div className="card glass" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden', gridColumn: 'span 1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>Dokumentasi Foto</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bisa banyak foto sekaligus</p>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>{dokumentasiUrls.length} File</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {dokumentasiUrls.map((url, i) => (
                      <div key={i} style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={url} alt="Dokumentasi" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button 
                          onClick={() => setDokumentasiUrls(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(239, 68, 68, 0.4)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1, transition: 'opacity 0.2s', cursor: 'pointer', border: 'none' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '8px', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileUpload(e, 'dokumentasi')}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }}
                        disabled={uploadLoading['dokumentasi']}
                      />
                      {uploadLoading['dokumentasi'] ? <Loader2 className="spin" size={14} /> : <Plus size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Session Area - Matching FormLaporan style */}
            <div style={{ 
              padding: '2rem', 
              backgroundColor: 'rgba(59, 130, 246, 0.05)', 
              borderRadius: '24px', 
              border: '1px solid rgba(59, 130, 246, 0.1)',
              marginTop: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)' }}>
                  <Sparkles size={20} className={loading ? 'animate-pulse' : ''} />
                  Catatan Kasar Rapat (Ketik Disini)
                </label>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tiap baris adalah poin baru</span>
              </div>
              
              <textarea 
                name="rawNotes"
                rows={10}
                placeholder="Tuliskan poin-poin rapat di sini secara kasar. AI Magic akan merapikannya menjadi notulen profesional dengan struktur yang jelas."
                value={formData.rawNotes}
                onChange={handleInputChange}
                className="input-base"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', marginBottom: '1.5rem', fontSize: '1rem', border: '1px solid rgba(255,255,255,0.05)', lineHeight: '1.6' }}
              />

              <button 
                type="button"
                onClick={handleGenerateAI}
                disabled={loading || !formData.rawNotes}
                className="btn btn-primary"
                style={{ width: '100%', height: '64px', gap: '1rem', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 15px 30px rgba(59, 130, 246, 0.3)' }}
              >
                {loading ? <Loader2 size={28} className="spin" /> : <Wand2 size={28} />}
                {loading ? 'AI MAGIC SEDANG MENYUSUN...' : 'SULAP JADI NOTULEN PROFESIONAL ✨'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card glass"
            style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header Dokument Area */}
            <div style={{ padding: '3rem', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px', marginBottom: '0.5rem' }}>
                    {aiResult?.judul || formData.judul}
                  </h2>
                  <p style={{ color: 'var(--primary)', fontWeight: 800, letterSpacing: '4px', fontSize: '0.9rem' }}>NOTULA KEGIATAN</p>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', padding: '2rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, marginBottom: '0.4rem' }}>TANGGAL</label>
                    <p style={{ fontWeight: 700 }}>{new Date(formData.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, marginBottom: '0.4rem' }}>WAKTU</label>
                    <p style={{ fontWeight: 700 }}>{formData.waktu || '-'}</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, marginBottom: '0.4rem' }}>TEMPAT</label>
                    <p style={{ fontWeight: 700 }}>{formData.tempat || '-'}</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, marginBottom: '0.4rem' }}>PIMPINAN</label>
                    <p style={{ fontWeight: 700 }}>{formData.pemimpin || '-'}</p>
                  </div>
               </div>
            </div>

            {/* Konten Area */}
            <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
               {/* Ringkasan */}
               <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '8px', height: '24px', backgroundColor: 'var(--primary)', borderRadius: '4px' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>I. RINGKASAN EKSEKUTIF</h3>
                  </div>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.8', opacity: 0.9, fontStyle: 'italic', paddingLeft: '2rem', borderLeft: '2px solid rgba(255,255,255,0.05)' }}>
                    {aiResult?.kesimpulan}
                  </p>
               </section>

               {/* Pembahasan */}
               <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <div style={{ width: '8px', height: '24px', backgroundColor: 'var(--primary)', borderRadius: '4px' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>II. HASIL PEMBAHASAN</h3>
                  </div>
                  
                  <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {aiResult?.pembahasan.map((p: any, idx: number) => (
                      <div key={idx}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--primary)', display: 'flex', gap: '0.75rem' }}>
                          <span style={{ opacity: 0.5 }}>{idx + 1}.</span>
                          {p.topik}
                        </h4>
                        <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          {p.items.map((item: any, i: number) => (
                            <div key={i}>
                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '0.6rem', flexShrink: 0 }} />
                                <p style={{ fontSize: '1rem', lineHeight: '1.6', opacity: 0.85 }}>{item.deskripsi}</p>
                              </div>
                              {item.solusi && (
                                <div style={{ 
                                  marginTop: '0.75rem', 
                                  marginLeft: '1.5rem', 
                                  padding: '1rem', 
                                  backgroundColor: 'rgba(16, 185, 129, 0.05)', 
                                  borderLeft: '4px solid var(--success)',
                                  borderRadius: '0 12px 12px 0'
                                }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--success)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Solusi / Tindak Lanjut:</span>
                                  <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{item.solusi}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
               </section>

               <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
                  <p style={{ fontSize: '0.7rem', opacity: 0.3, letterSpacing: '2px', fontWeight: 800 }}>KEEPNOTEAI AUTOMATED PROFESSIONAL MINUTES SYSTEM</p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
