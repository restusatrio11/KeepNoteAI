'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Edit2, Trash2, ExternalLink, Calendar, Loader2, AlertCircle, Info, FileText, ImageIcon, Video as VideoIcon, Copy, Clock, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import Modal from '@/components/Modal';
import ReportModal from './ReportModal';
import { useToast } from '@/providers/ToastProvider';
import SearchableSelect from '@/components/SearchableSelect';

const DESKTOP_APP_URL = process.env.NEXT_PUBLIC_DESKTOP_APP_URL || 'https://drive.google.com/uc?export=download&id=1KUv8R-h0HXMKu9T0Y9AeW90D066AbUuA';

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
  const [triwulan, setTriwulan] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
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

  const triwulanOptions = [
    { id: '', nama: 'Semua Triwulan' },
    { id: 'TW1', nama: 'TW I (Jan-Mar)' },
    { id: 'TW2', nama: 'TW II (Apr-Jun)' },
    { id: 'TW3', nama: 'TW III (Jul-Sep)' },
    { id: 'TW4', nama: 'TW IV (Oct-Dec)' },
  ];

  const handleTriwulanChange = (val: string) => {
    setTriwulan(val);
    setPage(1);
    const year = new Date().getFullYear();
    switch (val) {
      case 'TW1': setFromDate(`${year}-01-01`); setToDate(`${year}-03-31`); break;
      case 'TW2': setFromDate(`${year}-04-01`); setToDate(`${year}-06-30`); break;
      case 'TW3': setFromDate(`${year}-07-01`); setToDate(`${year}-09-30`); break;
      case 'TW4': setFromDate(`${year}-10-01`); setToDate(`${year}-12-31`); break;
      default: setFromDate(''); setToDate('');
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
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => {
            const params = new URLSearchParams();
            if (fromDate) params.set('from', fromDate);
            if (toDate) params.set('to', toDate);
            if (filterRencana !== 'all') params.set('rencanaId', filterRencana);
            if (search) params.set('search', search);
            window.open(`/api/reports/export?${params.toString()}`, '_blank');
          }} className="btn glass" style={{ width: 'auto' }}>
            <Download size={20} />
            <span>Export Excel</span>
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary" style={{ width: 'auto' }}>
            <Plus size={20} />
            <span>Tambah Laporan</span>
          </button>
          <button onClick={() => setIsSyncModalOpen(true)} className="btn glass" style={{ width: 'auto' }}>
            <RefreshCw size={20} />
            <span>Sync ke e-Kinerja</span>
          </button>
        </div>
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

        <div style={{ flex: '1 1 160px' }}>
          <select 
            value={triwulan}
            onChange={(e) => handleTriwulanChange(e.target.value)}
            className="input-base"
            style={{ width: '100%', fontSize: '0.8rem' }}
          >
            {triwulanOptions.map(o => (
              <option key={o.id} value={o.id}>{o.nama}</option>
            ))}
          </select>
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
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.9rem' }}>
                      {new Date(report.tanggalMulai).toLocaleDateString('id-ID')}
                      {report.tanggalSelesai !== report.tanggalMulai && (
                        <> - {new Date(report.tanggalSelesai).toLocaleDateString('id-ID')}</>
                      )}
                      {(report.jamMulai || report.jamSelesai) && (
                        <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.2rem' }}>
                          {report.jamMulai || '...'} - {report.jamSelesai || '...'}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.35rem 0.6rem', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                        {report.rencanaKode}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{report.kegiatan}</p>
                      <p style={{ fontSize: '0.8rem', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {(() => {
                          try {
                            const urls = JSON.parse(report.buktiUrls || '[]');
                            return Array.isArray(urls) && urls.length > 0 ? urls.map((u: string, i: number) => (
                              <span key={i}>{getFileIcon(u)}</span>
                            )) : getFileIcon(report.buktiUrls);
                          } catch { return getFileIcon(report.buktiUrls); }
                        })()}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{report.capaian}</span>
                      </p>
                      {report.rencanaIki && (
                        <p style={{ fontSize: '0.7rem', marginTop: '0.3rem', color: '#8b5cf6', opacity: 0.7 }}>
                          IKI: {report.rencanaIki}
                        </p>
                      )}
                      {report.masukanSkp && (
                        <p style={{ fontSize: '0.7rem', marginTop: '0.1rem', opacity: 0.4 }}>
                          SKP: {report.masukanSkp}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', minWidth: '60px' }}>
                          <div style={{ width: `${report.progress}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '10px' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>{report.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                        {(() => {
                          try {
                            const urls = JSON.parse(report.buktiUrls || '[]');
                            return Array.isArray(urls) ? urls.slice(0, 1) : [];
                          } catch { return report.buktiUrls ? [report.buktiUrls] : []; }
                        })().map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="btn glass" style={{ padding: '0.5rem', borderRadius: '10px' }}>
                            <ExternalLink size={16} />
                          </a>
                        ))}
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

      <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Sync ke e-Kinerja / SKP" width="720px">
        <PortalSyncModal
          fromDate={fromDate}
          toDate={toDate}
          filterRencana={filterRencana}
          onClose={() => setIsSyncModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

type SyncLog = { id: string; label: string; status: 'ok' | 'fail' | 'pending' | 'dup'; message?: string };

function PortalSyncModal({ fromDate, toDate, filterRencana, onClose }: { fromDate: string; toDate: string; filterRencana: string; onClose: () => void }) {
  const { showToast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [log, setLog] = useState<SyncLog[]>([]);

  async function start() {
    setSyncing(true);
    setLog([]);
    setProgress({ done: 0, total: 0 });
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate, limit: '1000', rencanaId: filterRencana });
      const res = await fetch(`/api/laporan?${params}`);
      const json = await res.json();
      const items: any[] = json.data || [];
      if (items.length === 0) {
        showToast('Tidak ada laporan pada rentang terpilih.', 'error');
        setSyncing(false);
        return;
      }
      setProgress({ done: 0, total: items.length });
      const logs: SyncLog[] = items.map((it) => ({ id: it.id, label: it.kegiatan || it.id, status: 'pending' }));
      setLog(logs);

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const r = await fetch('/api/portal/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ laporanId: it.id }),
        });
        const data = await r.json();
        const status: SyncLog['status'] = data.duplicate ? 'dup' : data.success ? 'ok' : 'fail';
        logs[i] = { id: it.id, label: it.kegiatan || it.id, status, message: data.message || data.error };
        setLog([...logs]);
        setProgress({ done: i + 1, total: items.length });
      }
      const failed = logs.filter((l) => l.status === 'fail').length;
      const dup = logs.filter((l) => l.status === 'dup').length;
      const ok = logs.filter((l) => l.status === 'ok').length;
      const parts = [`${ok} berhasil`];
      if (dup) parts.push(`${dup} duplikat (dilewati)`);
      if (failed) parts.push(`${failed} gagal`);
      showToast(`Selesai: ${parts.join(', ')}.`, failed ? 'error' : 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memulai sinkronisasi', 'error');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Laporan pada rentang terpilih akan dikirim satu per satu ke portal e-Kinerja. Pastikan sesi cookie masih aktif (cek di Pengaturan).
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.85rem 1rem', backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
        <Download size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: '200px' }}>
          Lebih praktis? Unduh <b>Aplikasi Desktop KeepNoteAI</b> untuk auto-sync langsung dari komputer kantor (tanpa harus buka web &amp; copy-paste kredensial tiap hari).
        </span>
        <a href={DESKTOP_APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: 'auto', whiteSpace: 'nowrap' }}>
          <Download size={16} />
          <span>Unduh Desktop</span>
        </a>
      </div>

      {progress.total > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
            <span>Progres</span>
            <span>{progress.done}/{progress.total}</span>
          </div>
          <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
        {log.length === 0 && <p style={{ fontSize: '0.85rem', opacity: 0.5 }}>Belum ada aktivitas.</p>}
        {log.map((l) => (
          <div key={l.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.82rem', padding: '0.6rem 0.8rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
            {l.status === 'pending' && <Loader2 size={16} className="spin" style={{ flexShrink: 0, marginTop: '2px' }} />}
            {l.status === 'ok' && <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />}
            {l.status === 'dup' && <Info size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />}
            {l.status === 'fail' && <AlertCircle size={16} color="var(--error)" style={{ flexShrink: 0, marginTop: '2px' }} />}
            <div>
              <p style={{ fontWeight: 600 }}>{l.label}</p>
              {l.message && <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>{l.message}</p>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button onClick={onClose} className="btn glass">Tutup</button>
        <button onClick={start} disabled={syncing} className="btn btn-primary">
          {syncing ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
          <span>{syncing ? 'Menyinkronkan...' : 'Mulai Sync'}</span>
        </button>
      </div>
    </div>
  );
}
