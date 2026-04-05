'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Loader2, Sparkles } from 'lucide-react';

export default function ReportHealth() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch('/api/ai/analyze-health');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to fetch health data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <section className="card glass animate-pulse" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: '430px', justifyContent: 'center' }}>
        <Loader2 size={40} className="spin" color="var(--primary)" />
        <p style={{ marginTop: '1rem', opacity: 0.5, fontWeight: 600 }}>AI Sedang Menganalisis Laporan Anda...</p>
      </section>
    );
  }

  const score = data?.score || 0;
  const status = data?.status || 'Belum Ada';
  const message = data?.message || 'Mulai buat laporan pertama Anda untuk melihat analisis kesehatan pelaporan AI!';

  const getEncouragement = (score: number) => {
    if (score >= 85) return 'Performa Luar Biasa! ✨';
    if (score >= 70) return 'Performa Sangat Baik! 👍';
    if (score >= 50) return 'Sudah Cukup Bagus! 💪';
    return 'Terus Tingkatkan! 🚀';
  }

  return (
    <section className="card glass" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: '430px' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Sparkles size={18} />
        Kesehatan Laporan
      </h3>
      
      <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto 2rem' }}>
        <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle strokeWidth="12" stroke="rgba(255,255,255,0.05)" fill="transparent" r="80" cx="90" cy="90" />
          <circle 
            strokeWidth="12" 
            strokeDasharray={502} 
            strokeDashoffset={502 * (1 - score / 100)} 
            strokeLinecap="round" 
            stroke="var(--primary)" 
            fill="transparent" 
            r="80" cx="90" cy="90" 
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} 
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{score}%</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.5, letterSpacing: '2px' }}>{status.toUpperCase()}</span>
        </div>
      </div>

      <div style={{ marginTop: '1rem', flex: 1 }}>
         <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            {getEncouragement(score)}
         </p>
         <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', padding: '0 1rem' }}>
           {message}
         </p>
      </div>

      <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem', opacity: 0.8 }}>
         <TrendingUp size={16} />
         <span>Analisis AI Berdasarkan Histori</span>
      </div>
    </section>
  );
}
