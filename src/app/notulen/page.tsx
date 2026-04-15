'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Calendar, Loader2, FileText, 
  ChevronLeft, ChevronRight, Edit2, Trash2, 
  ExternalLink, Sparkles, AlertCircle, FileCheck, Package, Download, PlusCircle
} from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import Modal from '@/components/Modal';

interface Notulen {
  id: string;
  judul: string;
  tanggal: string;
  topik: string;
  tempat: string;
  waktu: string;
  undanganUrl?: string | null;
  daftarHadirUrl?: string | null;
  dokumentasiUrls?: string | null;
  createdAt: string;
}

export default function NotulenListPage() {
  const { showToast } = useToast();
  const [notulenList, setNotulenList] = useState<Notulen[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLengkapiModalOpen, setIsLengkapiModalOpen] = useState(false);
  const [mergingId, setMergingId] = useState<string | null>(null);
  const [selectedNotulen, setSelectedNotulen] = useState<Notulen | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchNotulen = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notulen');
      const data = await res.json();
      setNotulenList(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Gagal memuat arsip notulen', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchNotulen();
  }, [fetchNotulen]);

  const handleDelete = async () => {
    if (!selectedNotulen) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notulen/${selectedNotulen.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Notulen berhasil dihapus', 'success');
        fetchNotulen();
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      showToast('Gagal menghapus notulen', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMergeDownload = async (item: Notulen) => {
    setMergingId(item.id);
    try {
      const res = await fetch('/api/notulen/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notulenId: item.id })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Paket_Notulen_${item.judul.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showToast('Paket PDF berhasil digabung!', 'success');
      } else {
        showToast('Gagal menggabungkan PDF. Pastikan file lampiran ada.', 'error');
      }
    } catch (error) {
      showToast('Terjadi kesalahan saat memproses PDF.', 'error');
    } finally {
      setMergingId(null);
    }
  };

  const handleLengkapiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'undangan' | 'daftarHadir') => {
    const file = e.target.files?.[0];
    if (!file || !selectedNotulen) return;

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('deskripsi', `${type === 'undangan' ? 'Undangan' : 'Daftar Hadir'} - ${selectedNotulen.judul}`);

    try {
      const res = await fetch('/api/upload/drive', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success) {
        // Optimistically update or just show success
        await handleUpdateNotulen(selectedNotulen.id, { [type === 'undangan' ? 'undanganUrl' : 'daftarHadirUrl']: data.link });
        showToast('File berhasil terunggah!', 'success');
      }
    } catch (err) {
      showToast('Gagal mengunggah file', 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleUpdateNotulen = async (id: string, updates: Partial<Notulen>) => {
    try {
      const res = await fetch(`/api/notulen/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) fetchNotulen();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredList = notulenList.filter(n => {
    const matchesSearch = n.judul.toLowerCase().includes(search.toLowerCase()) || 
                         (n.topik && n.topik.toLowerCase().includes(search.toLowerCase()));
    
    const date = new Date(n.tanggal);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    
    const matchesDate = (!from || date >= from) && (!to || date <= to);
    
    return matchesSearch && matchesDate;
  });

  return (
    <div className="animate-in" style={{ padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h1 style={{ fontWeight: 800, marginBottom: '0.4rem', fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>Arsip Notulen Rapat</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Kelola dokumentasi hasil rapat yang disusun secara profesional oleh AI.</p>
        </div>
        <Link href="/notulen/baru" style={{ width: '100%', maxWidth: '250px' }}>
          <button className="btn btn-primary" style={{ width: '100%' }}>
            <Plus size={20} />
            <span>Buat Notulen Baru</span>
          </button>
        </Link>
      </header>

      {/* Filter Section - Matching Laporan Style */}
      <div className="card glass" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '1.25rem' }}>
        <div style={{ flex: '2 1 300px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
          <input 
            type="text" 
            placeholder="Cari judul atau topik rapat..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base"
            style={{ paddingLeft: '2.75rem', width: '100%' }} 
          />
        </div>
        
        <div style={{ flex: '1 1 250px', display: 'flex', gap: '0.4rem', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0 1rem', borderRadius: '14px', border: '1px solid var(--border)', justifyContent: 'center' }}>
          <Calendar size={16} color="var(--primary)" />
          <input 
            type="date" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.8rem', outline: 'none', width: '105px' }} 
          />
          <span style={{ opacity: 0.2 }}>-</span>
          <input 
            type="date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.8rem', outline: 'none', width: '105px' }} 
          />
        </div>
      </div>

      {/* Table Section - Matching Laporan Style */}
      <div className="card glass" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <Loader2 className="spin" size={32} color="var(--primary)" />
          </div>
        )}
        
        <div className="responsive-table">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Waktu</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Status AI</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Judul & Topik Rapat</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Lokasi</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Opsi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada arsip notulen rapat.</td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem' }}>
                      {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '0.35rem 0.6rem', borderRadius: '8px', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem', width: 'fit-content' }}>
                        <Sparkles size={10} />
                        BY AI Magic
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.25rem' }}>{item.judul}</p>
                      <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>{item.topik || 'Diskusi Umum'}</p>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', opacity: 0.7 }}>
                      {item.tempat || '-'}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            setSelectedNotulen(item);
                            setIsLengkapiModalOpen(true);
                          }}
                          className="btn glass"
                          style={{ padding: '0.5rem', borderRadius: '10px', color: '#818cf8' }}
                          title="Lengkapi File Lampiran"
                        >
                          <PlusCircle size={16} />
                        </button>

                        <button
                          onClick={() => handleMergeDownload(item)}
                          disabled={mergingId === item.id}
                          className="btn glass"
                          style={{ padding: '0.5rem', borderRadius: '10px', color: '#10b981' }}
                          title="Download Paket PDF (Merge)"
                        >
                          {mergingId === item.id ? (
                            <Loader2 size={16} className="spin" />
                          ) : (
                            <Package size={16} />
                          )}
                        </button>
                        
                        <Link href={`/api/notulen/download/${item.id}`} className="btn glass" style={{ padding: '0.5rem', borderRadius: '10px', color: 'var(--primary)' }} title="Download Notulen Saja">
                          <Download size={16} />
                        </Link>

                        <Link href={`/notulen/edit/${item.id}`} className="btn glass" style={{ padding: '0.5rem', borderRadius: '10px', color: '#60a5fa' }} title="Edit">
                          <Edit2 size={16} />
                        </Link>

                        <button onClick={() => { setSelectedNotulen(item); setIsDeleteModalOpen(true); }} className="btn glass" style={{ padding: '0.5rem', borderRadius: '10px', color: 'var(--error)' }} title="Hapus">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Konfirmasi Hapus Notulen">
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            color: 'var(--error)'
          }}>
            <AlertCircle size={40} />
          </div>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>Hapus notulen ini?</h4>
          <p className="text-muted" style={{ marginBottom: '2.5rem', fontSize: '0.95rem' }}>Tindakan ini tidak dapat dibatalkan.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setIsDeleteModalOpen(false)} className="btn glass" style={{ flex: 1 }}>Batal</button>
            <button onClick={handleDelete} className="btn" style={{ flex: 1, backgroundColor: 'var(--error)', color: 'white' }}>Ya, Hapus</button>
          </div>
        </div>
      </Modal>

      {/* Lengkapi Modal */}
      <Modal
        isOpen={isLengkapiModalOpen}
        onClose={() => setIsLengkapiModalOpen(false)}
        title="Lengkapi Berkas Notulen"
      >
        <div style={{ padding: '0.5rem 0' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(79, 70, 229, 0.05)', border: '1px solid rgba(79, 70, 229, 0.1)', borderRadius: '1.25rem', marginBottom: '1.5rem' }}>
            <h4 style={{ fontWeight: 800, marginBottom: '0.25rem', fontSize: '1rem' }}>{selectedNotulen?.judul}</h4>
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Unggah lampiran pendukung untuk melengkapi paket PDF.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Undangan */}
            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} color="#f59e0b" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Undangan</p>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>PDF Undangan Acara</p>
                  </div>
                </div>
                {selectedNotulen?.undanganUrl ? (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <FileCheck size={14} /> Terunggah
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', opacity: 0.4, fontStyle: 'italic' }}>Belum ada</span>
                )}
              </div>
              <input 
                type="file" 
                accept=".pdf" 
                onChange={(e) => handleLengkapiFileUpload(e, 'undangan')}
                disabled={uploadLoading}
                style={{ fontSize: '0.8rem', opacity: uploadLoading ? 0.5 : 1 }}
              />
            </div>

            {/* Daftar Hadir */}
            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} color="#10b981" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Daftar Hadir</p>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>PDF Daftar Hadir Peserta</p>
                  </div>
                </div>
                {selectedNotulen?.daftarHadirUrl ? (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <FileCheck size={14} /> Terunggah
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', opacity: 0.4, fontStyle: 'italic' }}>Belum ada</span>
                )}
              </div>
              <input 
                type="file" 
                accept=".pdf" 
                onChange={(e) => handleLengkapiFileUpload(e, 'daftarHadir')}
                disabled={uploadLoading}
                style={{ fontSize: '0.8rem', opacity: uploadLoading ? 0.5 : 1 }}
              />
            </div>
          </div>

          {uploadLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem', marginTop: '1rem', justifyContent: 'center' }}>
              <Loader2 size={16} className="spin" />
              <span>Sedang mengunggah...</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button
              onClick={() => setIsLengkapiModalOpen(false)}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem' }}
            >
              Selesai
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
