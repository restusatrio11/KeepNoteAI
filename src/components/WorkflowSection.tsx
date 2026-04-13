'use client';

import React from 'react';
import { Settings, StickyNote, Sparkles, FileSpreadsheet, ArrowRight } from 'lucide-react';

const steps = [
  {
    title: 'Setup Drive',
    desc: 'Hubungkan folder Google Drive di menu Setelan.',
    icon: Settings,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  {
    title: 'Catat Rencana',
    desc: 'Tulis kegiatan harian Anda di Sticky Notes.',
    icon: StickyNote,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
  {
    title: 'Otomasi AI',
    desc: 'Tarik rencana ke laporan & biarkan AI menyusunnya.',
    icon: Sparkles,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
  },
  {
    title: 'Ekspor Data',
    desc: 'Simpan & unduh laporan dalam format Excel.',
    icon: FileSpreadsheet,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
];

export default function WorkflowSection() {
  return (
    <section className="animate-in" style={{ marginBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Proses Bisnis KeepNoteAI</h2>
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>Ikuti langkah sederhana ini untuk hasil laporan yang maksimal</p>
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="card glass" style={{ 
              flex: 1, 
              minWidth: '200px', 
              padding: '1.5rem', 
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              cursor: 'default',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background Glow */}
              <div style={{ 
                position: 'absolute', 
                top: '-20px', 
                right: '-20px', 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: step.color, 
                filter: 'blur(40px)', 
                opacity: 0.15 
              }} />

              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '14px', 
                backgroundColor: step.bgColor, 
                color: step.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 8px 16px -4px ${step.color}20`
              }}>
                <step.icon size={28} />
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>{step.title}</h3>
                <p className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>{step.desc}</p>
              </div>

              {/* Step Number Badge */}
              <div style={{ 
                position: 'absolute', 
                top: '0.75rem', 
                left: '0.75rem', 
                fontSize: '0.7rem', 
                fontWeight: 900, 
                opacity: 0.2,
                color: 'var(--text-muted)'
              }}>
                0{index + 1}
              </div>
            </div>

            {index < steps.length - 1 && (
              <div className="hide-on-mobile" style={{ color: 'var(--border)', display: 'flex', alignItems: 'center' }}>
                <ArrowRight size={24} style={{ opacity: 0.3 }} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none !important;
          }
        }
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.2) !important;
          border-color: rgba(255,255,255,0.2) !important;
        }
      `}</style>
    </section>
  );
}
