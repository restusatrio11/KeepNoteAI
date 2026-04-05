'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Filter, X, Check } from 'lucide-react';

export default function DashboardFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [from, setFrom] = useState(searchParams.get('from') || '');
  const [to, setTo] = useState(searchParams.get('to') || '');

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set('from', from); else params.delete('from');
    if (to) params.set('to', to); else params.delete('to');
    
    router.push(`/?${params.toString()}`);
  };

  const handleClear = () => {
    setFrom('');
    setTo('');
    router.push('/');
  };

  const hasFilter = from || to;

  return (
    <div className="card glass animate-in" style={{ 
      display: 'flex', 
      gap: '1.25rem', 
      alignItems: 'center', 
      padding: '1rem 1.5rem', 
      marginBottom: '2.5rem',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
        <Filter size={18} />
        <span>Filter Waktu</span>
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        backgroundColor: 'rgba(255,255,255,0.03)', 
        padding: '0 1rem', 
        borderRadius: '12px', 
        border: '1px solid var(--border)' 
      }}>
        <Calendar size={16} color="var(--primary)" />
        <input 
          type="date" 
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem', outline: 'none', padding: '0.75rem 0' }}
        />
        <span style={{ color: 'var(--text-muted)', opacity: 0.2 }}>—</span>
        <input 
          type="date" 
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem', outline: 'none', padding: '0.75rem 0' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={handleApply} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
          <Check size={16} />
          <span>Terapkan</span>
        </button>
        {hasFilter && (
          <button onClick={handleClear} className="btn glass" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
            <X size={16} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
