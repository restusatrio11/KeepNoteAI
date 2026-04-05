'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Briefcase, Trash2, Edit2, Loader2, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import Modal from '@/components/Modal';

export default function RencanaPage() {
  const { showToast } = useToast();
  const [rencanaList, setRencanaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [formData, setFormData] = useState({
    nama: '',
    kode: ''
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

  useEffect(() => {
    fetchRencana();
    setIsMounted(true);
  }, [fetchRencana]);

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
        showToast(editingItem ? 'Rencana diperbarui!' : 'Rencana baru disimpan!', 'success');
        setFormData({ nama: '', kode: '' });
        setEditingItem(null);
        fetchRencana();
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
    setFormData({ nama: item.nama, kode: item.kode });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setFormData({ nama: '', kode: '' });
  };

  return (
    <div className="animate-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Rencana Kerja</h1>
        <p className="text-muted">Master data rencana kegiatan utama sebagai referensi laporan.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '3rem', alignItems: 'start' }}>
        <section className="card glass">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             {editingItem ? <Edit2 size={18} color="#f59e0b" /> : <Plus size={18} color="var(--primary)" />}
             {editingItem ? 'Edit Rencana' : 'Baru'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="kode" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>Kode (ID)</label>
              <input 
                type="text" 
                name="kode" 
                required 
                placeholder="ADM" 
                className="input-base" 
                style={{ textTransform: 'uppercase' }} 
                value={formData.kode}
                onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="nama" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>Nama Rencana</label>
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
            ) : rencanaList.length === 0 ? (
              <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>Belum ada data.</p>
            ) : (
              rencanaList.map((item) => (
                <div key={item.id} className="card glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderLeft: editingItem?.id === item.id ? '4px solid #f59e0b' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                      {item.kode}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{item.nama}</h4>
                      {isMounted && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Created {new Date(item.createdAt).toLocaleDateString('id-ID')}
                        </p>
                      )}
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
          <p className="text-muted" style={{ marginBottom: '2.5rem', fontSize: '0.95rem' }}>Tindakan ini tidak dapat dipulihkan. Rencana yang sedang digunakan dalam laporan tidak dapat dihapus.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setDeletingItem(null)} className="btn glass" style={{ flex: 1 }}>Batal</button>
            <button onClick={handleDelete} className="btn" disabled={submitting} style={{ flex: 1, backgroundColor: 'var(--error)', color: 'white' }}>
              {submitting ? <Loader2 size={18} className="spin" /> : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
