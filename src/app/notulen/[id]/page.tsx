'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Download, Printer, Calendar, Clock, MapPin, 
  User, Users, FileText, Loader2, Sparkles, Trash2, 
  AlertCircle, Edit2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/providers/ToastProvider';
import Modal from '@/components/Modal';

interface NotulenData {
  id: string;
  judul: string;
  tanggal: string;
  waktu: string;
  tempat: string;
  pemimpin: string;
  topik: string;
  notulis: string;
  peserta: string;
  konten: string; // JSON string
  createdAt: string;
}

export default function NotulenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { id } = use(params);
  const [data, setData] = useState<NotulenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/notulen/${id}`);
        if (!res.ok) throw new Error('Not found');
        const item = await res.json();
        setData(item);
      } catch (err) {
        showToast('Notulen tidak ditemukan', 'error');
        router.push('/notulen');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router, showToast]);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notulen/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Notulen berhasil dihapus', 'success');
        router.push('/notulen');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Gagal menghapus notulen', 'error');
      }
    } catch (error) {
      showToast('Gagal menghapus notulen', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (type: 'pdf' | 'docx') => {
    window.open(`/api/notulen/download/${id}?type=${type}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  if (!data) return null;

  const konten = JSON.parse(data.konten);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '5rem', padding: '1rem' }} className="animate-in">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button 
            onClick={() => router.push('/notulen')} 
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 800 }}
          >
            <ArrowLeft size={20} />
            KEMBALI KE ARSIP
          </button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Detail Notulen Rapat</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => window.print()} className="btn glass" style={{ width: '48px', padding: '0' }} title="Cetak Cepat (Browser)">
            <Printer size={20} />
          </button>
          <button onClick={() => setIsDeleteModalOpen(true)} className="btn glass" style={{ width: '48px', padding: '0', color: 'var(--error)' }} title="Hapus Notulen">
            <Trash2 size={20} />
          </button>
          <button onClick={() => router.push(`/notulen/edit/${id}`)} className="btn glass" style={{ width: '48px', padding: '0', color: 'var(--primary)' }} title="Edit Notulen">
            <Edit2 size={20} />
          </button>
          <button 
            onClick={() => handleDownload('pdf')} 
            className="btn glass"
            style={{ padding: '0 1.25rem', height: '48px', color: 'var(--primary)' }}
          >
            <Download size={18} />
            <span>PDF</span>
          </button>
          <button 
            onClick={() => handleDownload('docx')} 
            className="btn btn-primary"
            style={{ padding: '0 1.5rem', height: '48px' }}
          >
            <Download size={18} />
            <span>WORD (BPS)</span>
          </button>
        </div>
      </header>

      <div className="card glass" style={{ padding: 'clamp(1.5rem, 6vw, 4rem)', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* Document Header */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '-1px' }}>
            {data.judul}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'center', gap: '1rem', width: 'fit-content', margin: '0 auto' }}>
            <div style={{ height: '1px', width: '40px', backgroundColor: 'var(--border)' }} />
            <p style={{ color: 'var(--primary)', fontWeight: 800, letterSpacing: '4px', fontSize: '0.8rem' }}>NOTULA KEGIATAN</p>
            <div style={{ height: '1px', width: '40px', backgroundColor: 'var(--border)' }} />
          </div>
        </div>

        {/* Info Table */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '1.5rem', 
          padding: 'clamp(1rem, 3vw, 2rem)', 
          backgroundColor: 'rgba(255,255,255,0.02)', 
          borderRadius: '24px', 
          border: '1px solid var(--border)' 
        }}>
          {[
            { label: 'TANGGAL', value: data.tanggal ? new Date(data.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-', icon: <Calendar size={14} /> },
            { label: 'WAKTU', value: data.waktu || '-', icon: <Clock size={14} /> },
            { label: 'TEMPAT', value: data.tempat || '-', icon: <MapPin size={14} /> },
            { label: 'PIMPINAN', value: data.pemimpin || '-', icon: <User size={14} /> },
            { label: 'TOPIK', value: data.topik || '-', icon: <Sparkles size={14} /> },
            { label: 'NOTULIS', value: data.notulis || '-', icon: <FileText size={14} /> },
          ].map((item, i) => (
            <div key={i}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 900, opacity: 0.4, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                {item.icon} {item.label}
              </label>
              <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.value}</p>
            </div>
          ))}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 900, opacity: 0.4, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              <Users size={14} /> PESERTA RAPAT
            </label>
            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{data.peserta || '-'}</p>
          </div>
        </div>

        {/* Section: Summary */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '8px', height: '24px', backgroundColor: 'var(--primary)', borderRadius: '4px' }} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>I. RINGKASAN EKSEKUTIF</h3>
          </div>
          <p style={{ fontSize: '1.15rem', lineHeight: '1.8', opacity: 0.9, fontStyle: 'italic', paddingLeft: '2rem', borderLeft: '4px solid rgba(59, 130, 246, 0.1)' }}>
            "{konten.kesimpulan}"
          </p>
        </section>

        {/* Section: Discussion */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
            <div style={{ width: '8px', height: '24px', backgroundColor: 'var(--primary)', borderRadius: '4px' }} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>II. HASIL PEMBAHASAN</h3>
          </div>
          
          <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
            {konten.pembahasan.map((p: any, idx: number) => (
              <div key={idx}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--primary)', display: 'flex', gap: '1rem' }}>
                  <span style={{ opacity: 0.3, fontWeight: 900 }}>0{idx + 1}</span>
                  {p.topik}
                </h4>
                <div style={{ paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {p.items.map((item: any, i: number) => (
                    <div key={i}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '0.65rem', flexShrink: 0 }} />
                        <p style={{ fontSize: '1.05rem', lineHeight: '1.7', opacity: 0.8 }}>{item.deskripsi}</p>
                      </div>
                      {item.solusi && (
                        <div style={{ 
                          marginTop: '1rem', 
                          marginLeft: '1.5rem', 
                          padding: '1.25rem', 
                          backgroundColor: 'rgba(59, 130, 246, 0.05)', 
                          borderLeft: '4px solid var(--primary)',
                          borderRadius: '0 16px 16px 0'
                        }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--primary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Keputusan / Solusi:</span>
                          <p style={{ fontWeight: 700, fontSize: '1rem' }}>{item.solusi}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Signature Area */}
        <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'flex-end', paddingTop: '4rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center', minWidth: '250px' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '5rem', fontWeight: 600 }}>Dicatat Oleh,</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, borderBottom: '2px solid white', display: 'inline-block', padding: '0 1rem 0.4rem' }}>
              {data.notulis || '________________'}
            </p>
            <p style={{ fontSize: '0.7rem', opacity: 0.3, marginTop: '0.5rem', fontWeight: 800, letterSpacing: '1px' }}>KEEPNOTEAI VERIFIED DOCUMENT</p>
          </div>
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
    </div>
  );
}
