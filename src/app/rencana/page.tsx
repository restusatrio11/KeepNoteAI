'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Briefcase, Trash2, Edit2, Loader2, AlertCircle, Check, Calendar, StickyNote, Settings2, UsersRound, Search } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import Modal from '@/components/Modal';
import PlanningBoard from '@/components/PlanningBoard';

import SearchableSelect from '@/components/SearchableSelect';

export default function RencanaPage() {
  const { showToast } = useToast();
  const [rencanaList, setRencanaList] = useState<any[]>([]);
  const [timList, setTimList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'master' | 'tim'>('history');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [formData, setFormData] = useState({
    nama: '',
    kode: '',
    timId: ''
  });

  const [timFormData, setTimFormData] = useState({
    nama: '',
    keterangan: ''
  });

  const fetchRencana = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rencana');
      if (res.ok) {
        const data = await res.json();
        setRencanaList(data);
      }
    } catch (error) {
      showToast('Gagal memuat rencana kerja', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchTim = useCallback(async () => {
    try {
      const res = await fetch('/api/tim');
      if (res.ok) {
        const data = await res.json();
        setTimList(data);
      }
    } catch (error) {
      console.error('Failed to fetch teams');
    }
  }, []);

  useEffect(() => {
    fetchRencana();
    fetchTim();
    setIsMounted(true);
  }, [fetchRencana, fetchTim]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingItem ? `/api/rencana/${editingItem.id}` : '/api/rencana';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(editingItem ? 'Berhasil diperbarui!' : 'Berhasil disimpan!', 'success');
        setFormData({ nama: '', kode: '', timId: '' });
        setTimFormData({ nama: '', keterangan: '' });
        setEditingItem(null);
        fetchRencana();
        fetchTim();
      } else {
        const err = await res.json();
        showToast(err.error || 'Terjadi kesalahan', 'error');
      }
    } catch (error) {
      showToast('Gagal memproses permintaan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingItem ? `/api/tim/${editingItem.id}` : '/api/tim';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timFormData),
      });

      if (res.ok) {
        showToast(editingItem ? 'Tim diperbarui!' : 'Tim baru disimpan!', 'success');
        setTimFormData({ nama: '', keterangan: '' });
        setEditingItem(null);
        fetchTim();
      } else {
        const err = await res.json();
        showToast(err.error || 'Terjadi kesalahan', 'error');
      }
    } catch (error) {
      showToast('Gagal memproses tim', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTim = async () => {
    if (!deletingItem) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tim/${deletingItem.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Tim berhasil dihapus', 'success');
        setDeletingItem(null);
        fetchTim();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menghapus', 'error');
      }
    } catch (error) {
      showToast('Gagal menghapus tim', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rencana/${deletingItem.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Rencana berhasil dihapus', 'success');
        setDeletingItem(null);
        fetchRencana();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menghapus', 'error');
      }
    } catch (error) {
      showToast('Gagal menghapus rencana', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'tim') {
      setTimFormData({ nama: item.nama, keterangan: item.keterangan || '' });
    } else {
      setFormData({ nama: item.nama, kode: item.kode, timId: item.timId || '' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setFormData({ nama: '', kode: '', timId: '' });
    setTimFormData({ nama: '', keterangan: '' });
  };

  const filteredPrograms = rencanaList.filter(item => 
    item.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeams = timList.filter(item => 
    item.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.keterangan && item.keterangan.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Manajemen Rencana</h1>
        <p className="text-muted">Kelola catatan harian (Sticky Notes) dan master data program kerja Anda.</p>
      </header>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('history')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.25rem', borderRadius: '12px',
            backgroundColor: activeTab === 'history' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)',
            border: 'none', fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s'
          }}
        >
          <StickyNote size={18} />
          Histori Sticky Notes
        </button>
        <button 
          onClick={() => setActiveTab('master')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.25rem', borderRadius: '12px',
            backgroundColor: activeTab === 'master' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: activeTab === 'master' ? 'var(--primary)' : 'var(--text-muted)',
            border: 'none', fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s'
          }}
        >
          <Settings2 size={18} />
          Master Program Kerja
        </button>
        <button 
          onClick={() => setActiveTab('tim')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.25rem', borderRadius: '12px',
            backgroundColor: activeTab === 'tim' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: activeTab === 'tim' ? 'var(--primary)' : 'var(--text-muted)',
            border: 'none', fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s'
          }}
        >
          <UsersRound size={18} />
          Master Tim Kerja
        </button>
      </div>

      {/* Global Search Bar */}
      <div className="card glass" style={{ marginBottom: '2rem', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={20} className="text-muted" />
        <input 
          type="text" 
          placeholder={
            activeTab === 'history' ? 'Cari di catatan sticky notes...' :
            activeTab === 'master' ? 'Cari nama atau kode program...' :
            'Cari nama atau keterangan tim...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'white', 
            fontSize: '1rem', 
            width: '100%', 
            outline: 'none' 
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {activeTab === 'history' ? (
        <section>
          {/* ... existing history section ... */}
          <div className="card glass" style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 2rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Calendar size={20} color="var(--primary)" />
                <div>
                   <p style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Filter Berdasarkan Tanggal</p>
                   <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.1rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                   />
                </div>
             </div>
             <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '300px', textAlign: 'right' }}>
               Menampilkan semua rencana yang dibuat pada tanggal yang dipilih.
             </p>
          </div>
          
          <PlanningBoard initialDate={filterDate} searchTerm={searchQuery} />
        </section>
      ) : activeTab === 'master' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '3rem', alignItems: 'start' }}>
          <section className="card glass">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {editingItem ? <Edit2 size={18} color="#f59e0b" /> : <Plus size={18} color="var(--primary)" />}
              {editingItem ? 'Edit Program' : 'Tambah Program'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <SearchableSelect 
                  label="Pilih Tim Kerja"
                  options={timList}
                  value={formData.timId}
                  onChange={(val) => setFormData({ ...formData, timId: val })}
                  placeholder="-- Tanpa Tim --"
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="nama" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>Nama Program Kerja</label>
                <input 
                  type="text" 
                  name="nama" 
                  required 
                  placeholder="Pemeliharaan Server" 
                  className="input-base" 
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {editingItem && (
                  <button type="button" onClick={cancelEdit} className="btn glass" style={{ flex: 1 }}>Batal</button>
                )}
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                  {submitting ? <Loader2 size={18} className="spin" /> : (editingItem ? 'Perbarui' : 'Simpan')}
                </button>
              </div>
            </form>
          </section>

          <section>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                  <Loader2 className="spin" size={32} color="var(--primary)" />
                </div>
              ) : filteredPrograms.length === 0 ? (
                <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                  {searchQuery ? `Tidak ditemukan program dengan kata kunci "${searchQuery}"` : 'Belum ada data program kerja.'}
                </p>
              ) : (
                filteredPrograms.map((item) => {
                  const team = timList.find(t => t.id === item.timId);
                  return (
                    <div key={item.id} className="card glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderLeft: editingItem?.id === item.id ? '4px solid #f59e0b' : '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                          {item.kode}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{item.nama}</h4>
                            {team && (
                              <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '20px', fontWeight: 700 }}>
                                {team.nama}
                              </span>
                            )}
                          </div>
                          {isMounted && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Dibuat {new Date(item.createdAt).toLocaleDateString('id-ID')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleEditClick(item)} className="btn glass" style={{ padding: '0.5rem', color: '#f59e0b' }}><Edit2 size={16} /></button>
                        <button onClick={() => setDeletingItem(item)} className="btn glass" style={{ padding: '0.5rem', color: 'var(--error)' }}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '3rem', alignItems: 'start' }}>
          <section className="card glass">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {editingItem ? <Edit2 size={18} color="#f59e0b" /> : <Plus size={18} color="var(--primary)" />}
              {editingItem ? 'Edit Tim' : 'Tambah Tim Kerja'}
            </h2>
            <form onSubmit={handleTimSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="tim_nama" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>Nama Tim</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Infrastruktur IT" 
                  className="input-base" 
                  value={timFormData.nama}
                  onChange={(e) => setTimFormData({ ...timFormData, nama: e.target.value })}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="tim_ket" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>Keterangan</label>
                <textarea 
                  placeholder="Keterangan singkat tim..." 
                  className="input-base" 
                  rows={3}
                  value={timFormData.keterangan}
                  onChange={(e) => setTimFormData({ ...timFormData, keterangan: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {editingItem && (
                  <button type="button" onClick={cancelEdit} className="btn glass" style={{ flex: 1 }}>Batal</button>
                )}
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                  {submitting ? <Loader2 size={18} className="spin" /> : (editingItem ? 'Perbarui' : 'Simpan')}
                </button>
              </div>
            </form>
          </section>

          <section>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                  <Loader2 className="spin" size={32} color="var(--primary)" />
                </div>
              ) : filteredTeams.length === 0 ? (
                <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>
                  {searchQuery ? `Tidak ditemukan tim dengan kata kunci "${searchQuery}"` : 'Belum ada data tim kerja.'}
                </p>
              ) : (
                filteredTeams.map((item) => (
                  <div key={item.id} className="card glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderLeft: editingItem?.id === item.id ? '4px solid #f59e0b' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UsersRound size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{item.nama}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.keterangan || 'Tanpa keterangan'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEditClick(item)} className="btn glass" style={{ padding: '0.5rem', color: '#f59e0b' }}><Edit2 size={16} /></button>
                      <button onClick={() => setDeletingItem(item)} className="btn glass" style={{ padding: '0.5rem', color: 'var(--error)' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      <Modal isOpen={!!deletingItem} onClose={() => setDeletingItem(null)} title="Konfirmasi Hapus">
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
          <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>Hapus {deletingItem?.nama}?</h4>
          <p className="text-muted" style={{ marginBottom: '2.5rem', fontSize: '0.95rem' }}>
            {activeTab === 'tim' ? 'Tim akan dihapus secara permanen jika tidak lagi digunakan dalam Program Kerja.' : 'Tindakan ini tidak dapat dipulihkan. Rencana yang sedang digunakan dalam laporan tidak dapat dihapus.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setDeletingItem(null)} className="btn glass" style={{ flex: 1 }}>Batal</button>
            <button onClick={activeTab === 'tim' ? handleDeleteTim : handleDelete} className="btn" disabled={submitting} style={{ flex: 1, backgroundColor: 'var(--error)', color: 'white' }}>
              {submitting ? <Loader2 size={18} className="spin" /> : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
