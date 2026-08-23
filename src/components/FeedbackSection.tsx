'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Star, MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';

type FeedbackItem = {
  id: string;
  name: string;
  comment: string;
  rating: number;
  createdAt: string;
};

function Stars({ value, onSelect, size = 20 }: { value: number; onSelect?: (v: number) => void; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: '0.2rem' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          onClick={onSelect ? () => onSelect(n) : undefined}
          style={{
            cursor: onSelect ? 'pointer' : 'default',
            color: n <= value ? '#fbbf24' : 'rgba(255,255,255,0.2)',
            fill: n <= value ? '#fbbf24' : 'transparent',
            transition: 'color 0.15s',
          }}
        />
      ))}
    </div>
  );
}

export default function FeedbackSection() {
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [list, setList] = useState<FeedbackItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadFeedback() {
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      setList(data.feedback || []);
    } catch {
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => { loadFeedback(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) {
      showToast('Tulis komentar terlebih dahulu.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim(), rating }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal mengirim feedback.', 'error');
      } else {
        showToast('Terima kasih atas feedback Anda!', 'success');
        setComment('');
        setRating(5);
        loadFeedback();
      }
    } catch {
      showToast('Gagal mengirim feedback.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card glass" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <MessageSquare size={22} color="var(--primary)" /> Feedback Pengguna
      </h2>

      {session?.user ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Penilaian:</span>
            <Stars value={rating} onSelect={setRating} />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tulis pengalaman atau saran Anda menggunakan KeepNoteAI..."
            rows={3}
            className="input-base"
            style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'white', fontFamily: 'inherit', fontSize: '0.9rem', minWidth: 0, resize: 'vertical' }}
          />
          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.6rem 1.4rem' }}>
            {submitting ? <Send size={16} className="spin" /> : <Send size={16} />}
            <span>{submitting ? 'Mengirim...' : 'Kirim Feedback'}</span>
          </button>
        </form>
      ) : (
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <a href="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Login</a> untuk memberikan feedback.
        </p>
      )}

      {loadingList ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Memuat feedback...</p>
      ) : list.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Belum ada feedback. Jadilah yang pertama!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {list.map((item) => (
            <div key={item.id} style={{ padding: '1rem 1.25rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.name}</p>
                <Stars value={item.rating} size={16} />
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.comment}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.7, marginTop: '0.4rem' }}>
                {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
