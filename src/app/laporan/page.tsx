'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Edit2, Trash2, ExternalLink, Calendar, Loader2, AlertCircle, FileText, ImageIcon, Video as VideoIcon, Copy } from 'lucide-react';
import Modal from '@/components/Modal';
import ReportModal from './ReportModal';
import { useToast } from '@/providers/ToastProvider';
import SearchableSelect from '@/components/SearchableSelect';

export default function LaporanPage() {
  const { showToast } = useToast();
  
  const [reports, setReports] = useState<any[]>([]);
  const [rencanaOptions, setRencanaOptions] = useState<any[]>([]);
  const [timOptions, setTimOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [filterRencana, setFilterRencana] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        rencanaId: filterRencana,
        from: fromDate,
        to: toDate,
        page: page.toString(),
        limit: limit.toString()
      });
      const res = await fetch(`/api/laporan?${query}`);
      const data = await res.json();
      if (data.data) {
        setReports(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      showToast('Gagal memuat laporan', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filterRencana, fromDate, toDate, page, limit, showToast]);

  useEffect(() => {
    async function loadOptions() {
      const [resRencana, resTim] = await Promise.all([
        fetch('/api/rencana'),
        fetch('/api/tim')
      ]);
      
      if (resRencana.ok) {
        const data = await resRencana.json();
        setRencanaOptions(data);
      }
      if (resTim.ok) {
        const data = await resTim.json();
        setTimOptions(data);
      }
    }
    loadOptions();
  }, []);

  const filterOptions = [
    { id: 'all', nama: 'Semua Program' },
    ...rencanaOptions
  ];

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDelete = async () => {
    if (!selectedReport) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/laporan/${selectedReport.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Laporan berhasil dihapus', 'success');
        fetchReports();
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      showToast('Gagal menghapus laporan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (url: string | null) => {
    if (!url) return null;
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon size={16} />;
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return <VideoIcon size={16} />;
    return <FileText size={16} />;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Histori Pelaporan</h1>
          <p className="text-muted">Kelola dan saring histori laporan kegiatan harian Anda.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary" style={{ width: 'auto' }}>
          <Plus size={20} />
          <span>Tambah Laporan</span>
        </button>
      </header>

      <div className="card glass" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '1.25rem' }}>
        <div style={{ flex: '2 1 300px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
          <input 
            type="text" 
            placeholder="Cari kegiatan..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-base"
            style={{ paddingLeft: '2.75rem', width: '100%' }} 
          />
        </div>
        
        <div style={{ flex: '1 1 250px', display: 'flex', gap: '0.4rem', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0 1rem', borderRadius: '14px', border: '1px solid var(--border)', justifyContent: 'center' }}>
          <Calendar size={16} color="var(--primary)" />
          <input 
            type="date" 
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.8rem', outline: 'none', width: '105px' }} 
          />
          <span style={{ opacity: 0.2 }}>-</span>
          <input 
            type="date" 
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.8rem', outline: 'none', width: '105px' }} 
          />
        </div>

        <div style={{ flex: '1 1 200px' }}>
          <SearchableSelect 
            options={filterOptions}
            value={filterRencana}
            onChange={(val) => { setFilterRencana(val); setPage(1); }}
            placeholder="Filter Program..."
          />
        </div>
      </div>

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
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>ID</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Deskripsi Pekerjaan</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Progres</th>
                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Opsi</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada data laporan ditemukan.</td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem' }}>{new Date(report.tanggal).toLocaleDateString('id-ID')}</td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.35rem 0.6rem', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                        {report.rencanaKode}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{report.kegiatan}</p>
                      <p style={{ fontSize: '0.8rem', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {getFileIcon(report.buktiUrl)}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{report.capaian}</span>
                      </p>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', minWidth: '60px' }}>
                          <div style={{ width: report.progress, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '10px' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>{report.progress}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                        {report.buktiUrl && (
                          <a href={report.buktiUrl} target="_blank" rel="noopener noreferrer" className="btn glass" style={{ padding: '0.5rem', borderRadius: '10px' }}>
                            <ExternalLink size={16} />
                          </a>
                        )}
                        <button onClick={() => { setSelectedReport(report); setIsCopyModalOpen(true); }} className="btn glass" title="Salin Laporan" style={{ padding: '0.5rem', borderRadius: '10px', color: 'var(--primary)' }}>
                          <Copy size={16} />
                        </button>
                        <button onClick={() => { setSelectedReport(report); setIsEditModalOpen(true); }} className="btn glass" style={{ padding: '0.5rem', borderRadius: '10px', color: '#f59e0b' }}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => { setSelectedReport(report); setIsDeleteModalOpen(true); }} className="btn glass" style={{ padding: '0.5rem', borderRadius: '10px', color: 'var(--error)' }}>
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

        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn glass" style={{ padding: '0.6rem', borderRadius: '10px' }}><ChevronLeft size={20} /></button>
          <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Halaman {page} dari {totalPages || 1}</span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="btn glass" style={{ padding: '0.6rem', borderRadius: '10px' }}><ChevronRight size={20} /></button>
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tambah Laporan Baru" width="800px">
        <ReportModal rencanaOptions={rencanaOptions} timOptions={timOptions} onClose={() => setIsAddModalOpen(false)} onSuccess={fetchReports} />
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setSelectedReport(null); }} title="Edit Data Laporan" width="800px">
        <ReportModal report={selectedReport} rencanaOptions={rencanaOptions} timOptions={timOptions} onClose={() => { setIsEditModalOpen(false); setSelectedReport(null); }} onSuccess={fetchReports} />
      </Modal>

      <Modal isOpen={isCopyModalOpen} onClose={() => { setIsCopyModalOpen(false); setSelectedReport(null); }} title="Salin Laporan (Baru)" width="800px">
        <ReportModal isCopy report={selectedReport} rencanaOptions={rencanaOptions} timOptions={timOptions} onClose={() => { setIsCopyModalOpen(false); setSelectedReport(null); }} onSuccess={fetchReports} />
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Konfirmasi Hapus">
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
          <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>Hapus data ini?</h4>
          <p className="text-muted" style={{ marginBottom: '2.5rem', fontSize: '0.95rem' }}>Tindakan ini permanen dan data tidak dapat dipulihkan kembali.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setIsDeleteModalOpen(false)} className="btn glass" style={{ flex: 1 }}>Batal</button>
            <button onClick={handleDelete} className="btn" style={{ flex: 1, backgroundColor: 'var(--error)', color: 'white' }}>Ya, Hapus Saja</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
