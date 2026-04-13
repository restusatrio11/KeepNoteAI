'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CheckCircle, Clock, X, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

const STICKY_COLORS = [
  { name: 'yellow', bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  { name: 'pink', bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  { name: 'blue', bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  { name: 'green', bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  { name: 'purple', bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
];

export default function PlanningBoard({ initialDate, searchTerm = '' }: { initialDate?: string; searchTerm?: string }) {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(STICKY_COLORS[0]);
  const [localDate, setLocalDate] = useState<string | null>(null);

  useEffect(() => {
    // Determine the date to use: either the one passed or the local browser date
    if (initialDate) {
      setLocalDate(initialDate);
    } else {
      // Get YYYY-MM-DD in local timezone
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      setLocalDate(`${year}-${month}-${day}`);
    }
  }, [initialDate]);

  const fetchPlans = useCallback(async () => {
    if (!localDate) return;
    setLoading(true);
    try {
      const url = `/api/planning?date=${localDate}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [localDate]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const res = await fetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newContent, 
          color: selectedColor.name,
          tanggal: localDate 
        }),
      });

      if (res.ok) {
        setNewContent('');
        setIsAdding(false);
        fetchPlans();
        showToast('Rencana ditambahkan!', 'success');
      }
    } catch (error) {
      showToast('Gagal menambah rencana', 'error');
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/planning/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDone: !currentStatus }),
      });

      if (res.ok) {
        setPlans(plans.map(p => p.id === id ? { ...p, isDone: !currentStatus } : p));
      }
    } catch (error) {
      showToast('Gagal mengupdate status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/planning/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPlans(plans.filter(p => p.id !== id));
        showToast('Dihapus', 'success');
      }
    } catch (error) {
      showToast('Gagal menghapus', 'error');
    }
  };

  const filteredPlans = plans.filter(p => 
    !searchTerm || p.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="animate-in" style={{ marginTop: '4rem', marginBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={20} color="var(--primary)" />
            {localDate === new Date().toISOString().split('T')[0] || !initialDate ? 'Rencana Hari Ini' : `Rencana Tanggal ${localDate}`}
          </h2>
          <a href="/rencana" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', padding: '0.3rem 0.6rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
            Lihat Histori
          </a>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn glass" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          <Plus size={16} />
          <span>Tambah Note</span>
        </button>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '1.5rem',
        minHeight: '200px'
      }}>
        {isAdding && (
          <div className="sticky-note-new shadow-xl" style={{ 
            backgroundColor: selectedColor.bg, 
            border: `1px solid ${selectedColor.border}`,
            padding: '1.5rem',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            position: 'relative',
            zIndex: 10
          }}>
            <textarea 
              autoFocus
              placeholder="Tulis rencana..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                resize: 'none', 
                width: '100%', 
                height: '100px',
                color: selectedColor.text,
                fontSize: '1rem',
                fontWeight: 600,
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {STICKY_COLORS.map(c => (
                  <button 
                    key={c.name}
                    onClick={() => setSelectedColor(c)}
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      borderRadius: '50%', 
                      backgroundColor: c.border,
                      border: selectedColor.name === c.name ? '2px solid white' : 'none',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setIsAdding(false)} className="btn-icon-small" style={{ color: 'var(--error)' }}><X size={16} /></button>
                <button onClick={handleAdd} className="btn-icon-small" style={{ color: 'var(--success)' }}><CheckCircle size={16} /></button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 className="spin" size={32} opacity={0.3} />
          </div>
        ) : filteredPlans.length === 0 && !isAdding ? (
          <div style={{ 
            gridColumn: '1/-1', 
            padding: '3rem', 
            textAlign: 'center', 
            backgroundColor: 'rgba(255,255,255,0.02)', 
            borderRadius: '24px', 
            border: '1px dashed var(--border)' 
          }}>
            <p className="text-muted">
              {searchTerm ? `Tidak ditemukan catatan dengan kata kunci "${searchTerm}"` : 'Kosong. Apa rencana hebat Anda hari ini?'}
            </p>
          </div>
        ) : (
          filteredPlans.map((plan, i) => {
            const color = STICKY_COLORS.find(c => c.name === plan.color) || STICKY_COLORS[0];
            return (
              <div key={plan.id} className={`sticky-note shadow-sm ${plan.isDone ? 'done' : ''}`} style={{ 
                backgroundColor: color.bg, 
                borderTop: `6px solid ${color.border}`,
                padding: '1.25rem',
                borderRadius: '4px',
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: `rotate(${i % 2 === 0 ? '-1deg' : '1.5deg'})`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div onClick={() => handleToggle(plan.id, plan.isDone)}>
                  <p style={{ 
                    color: color.text, 
                    fontWeight: 600, 
                    fontSize: '0.95rem', 
                    lineHeight: '1.4',
                    textDecoration: plan.isDone ? 'line-through' : 'none',
                    opacity: plan.isDone ? 0.5 : 1
                  }}>
                    {plan.content}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', opacity: 0.5 }}>
                  <span style={{ fontSize: '0.7rem', color: color.text, fontWeight: 700 }}>{new Date(plan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(plan.id); }} style={{ color: color.text, background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
