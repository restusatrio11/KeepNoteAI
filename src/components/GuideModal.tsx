'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, X, ZoomIn } from 'lucide-react';
import Modal from './Modal';

export default function GuideModal() {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('showGuideAfterLogin') === '1') {
        sessionStorage.removeItem('showGuideAfterLogin');
        setOpen(true);
      }
    } catch {}
  }, []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn glass" style={{ flex: 1 }}>
        <BookOpen size={20} />
        <span>Panduan</span>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Panduan Penggunaan" width="720px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Ikuti langkah-langkah berikut untuk memulai menggunakan KeepNoteAI. Klik gambar untuk memperbesar.
          </p>
          <div
            onClick={() => setZoom(true)}
            title="Klik untuk memperbesar"
            style={{
              position: 'relative',
              cursor: 'zoom-in',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}
          >
            <img
              src="/panduan.webp"
              alt="Panduan KeepNoteAI"
              style={{ width: '100%', height: 'auto', display: 'block', backgroundColor: '#0f0f15' }}
            />
            <div style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: 'white',
              borderRadius: 8,
              padding: '0.3rem 0.6rem',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <ZoomIn size={14} /> Perbesar
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
            <span>Mengerti</span>
          </button>
        </div>
      </Modal>

      {zoom && createPortal(
        <div
          onClick={() => setZoom(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            cursor: 'zoom-out',
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoom(false); }}
            aria-label="Tutup"
            style={{ position: 'absolute', top: 20, right: 20, color: 'white', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X size={32} />
          </button>
          <img
            src="/panduan.webp"
            alt="Panduan KeepNoteAI (diperbesar)"
            style={{ maxWidth: '95vw', maxHeight: '95vh', width: 'auto', height: 'auto', borderRadius: 12, objectFit: 'contain' }}
          />
        </div>,
        document.body
      )}
    </>
  );
}
