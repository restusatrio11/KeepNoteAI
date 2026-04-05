'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Loader2, Mail, Lock, User } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Gagal mendaftar.');
        showToast(data.error || 'Gagal mendaftar.', 'error');
      } else {
        showToast('Akun berhasil dibuat! Silakan masuk.', 'success');
        router.push('/login?registered=true');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat mendaftar.');
      showToast('Terjadi kesalahan koneksi.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 150px)' }}>
      <div className="card glass" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '20px', 
            backgroundColor: 'rgba(59, 130, 246, 0.05)', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            padding: '10px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Daftar Akun</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Buat akun baru KeepNoteAI</p>
        </div>

        {error && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            color: 'var(--error)', 
            borderRadius: '12px', 
            fontSize: '0.85rem', 
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nama Lengkap</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" name="name" required placeholder="Nama Anda" style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'white' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="email" name="email" required placeholder="email@anda.com" style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'white' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="password" name="password" required placeholder="••••••••" style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'white' }} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.9rem', marginTop: '0.5rem' }}>
            {loading ? <Loader2 className="spin" size={20} /> : null}
            <span>{loading ? 'Mendaftar...' : 'Daftar Sekarang'}</span>
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Sudah punya akun? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Masuk</Link>
        </p>
      </div>
      
      <style jsx>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
