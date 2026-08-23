import Link from 'next/link';
import { Info, Target, Cpu, User, ArrowLeft, Sparkles, Brain, CalendarDays, FileText, MessageSquare, Cloud, Database } from 'lucide-react';
import FeedbackSection from '@/components/FeedbackSection';

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.7 18 5 18 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}

const techStack = [
  { name: 'Next.js', version: '16.2.2', desc: 'Framework React (App Router)' },
  { name: 'React', version: '19.2.4', desc: 'Library UI' },
  { name: 'TypeScript', version: '5', desc: 'Bahasa (type-safe)' },
  { name: 'Tailwind CSS', version: '3.4.17', desc: 'Styling' },
  { name: 'Drizzle ORM', version: '0.45.2', desc: 'ORM database' },
  { name: 'Neon Postgres', version: '@neondatabase/serverless 1.0.2', desc: 'Database serverless' },
  { name: 'NextAuth', version: '5.0.0-beta.30', desc: 'Autentikasi (Auth.js)' },
  { name: 'bcryptjs', version: '3.0.3', desc: 'Hash password' },
  { name: 'OpenRouter API', version: 'gpt-oss-120b:free', desc: 'AI (laporan & mapping)' },
  { name: 'grammy', version: '1.44.0', desc: 'Bot Telegram' },
  { name: 'googleapis', version: '171.4.0', desc: 'Integrasi Google Drive' },
  { name: 'zod', version: '4.3.6', desc: 'Validasi data' },
  { name: 'lucide-react', version: '1.7.0', desc: 'Ikon' },
  { name: 'framer-motion', version: '12.38.0', desc: 'Animasi' },
  { name: 'exceljs / docx / jspdf', version: '4.4.0 / 9.6.1 / 4.2.1', desc: 'Ekspor laporan' },
];

const fitur = [
  { icon: Brain, title: 'Laporan Otomatis berbasis AI', desc: 'Ubah catatan harian kasual menjadi laporan kegiatan formal dan profesional.' },
  { icon: MessageSquare, title: 'Integrasi Telegram', desc: 'Kirim foto, dokumen, atau teks dari chat Telegram langsung jadi laporan.' },
  { icon: Cloud, title: 'Simpan Bukti ke Google Drive', desc: 'Bukti kegiatan otomatis tersimpan rapi di folder KeepNoteAI di Drive Anda.' },
  { icon: Database, title: 'Sinkron e-Kinerja / SKP', desc: 'Peta Rencana Kinerja dipetakan ke portal e-Kinerja/SKP (termasuk AI Mapping).' },
  { icon: CalendarDays, title: 'Kalender Aktivitas', desc: 'Lihat ringkasan kegiatan harian berwarna per tim dalam tampilan kalender.' },
  { icon: FileText, title: 'Notulen & Ekspor', desc: 'Buat notulen rapat dan ekspor laporan ke Excel, Word, maupun PDF.' },
];

export default function TentangPage() {
  return (
    <div className="animate-in">
      <div className="container" style={{ maxWidth: '900px', paddingTop: '2rem', paddingBottom: '4rem' }}>
        <Link href="/" className="btn glass" style={{ display: 'inline-flex', marginBottom: '2rem' }}>
          <ArrowLeft size={18} />
          <span>Kembali ke Dashboard</span>
        </Link>

        {/* Hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <img src="/logo.png" alt="KeepNoteAI" style={{ width: '72px', height: '72px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              KeepNoteAI <Sparkles size={26} color="var(--primary)" />
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
              Asisten laporan kerja berbasis AI untuk pegawai BPS.
            </p>
          </div>
        </div>

        {/* Tujuan */}
        <section className="card glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Target size={22} color="var(--primary)" /> Tujuan & Manfaat
          </h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            KeepNoteAI dibuat untuk mempermudah penyusunan laporan kegiatan harian pegawai,
            khususnya di lingkungan BPS, agar lebih cepat, konsisten, dan terdokumentasi dengan baik.
            Aplikasi ini mengubah catatan kasual menjadi laporan formal, menyimpan bukti ke Drive,
            menghubungkan Telegram, serta memetakan rencana kerja ke portal e-Kinerja/SKP secara otomatis.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {fitur.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} style={{ display: 'flex', gap: '0.85rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <Icon size={22} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{f.title}</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Teknologi */}
        <section className="card glass" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Cpu size={22} color="var(--primary)" /> Teknologi yang Digunakan
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {techStack.map((t) => (
              <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.92rem' }}>{t.name}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.desc}</p>
                </div>
                <code style={{ padding: '0.3rem 0.7rem', backgroundColor: 'rgba(59,130,246,0.12)', color: 'var(--primary)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  v{t.version}
                </code>
              </div>
            ))}
          </div>
        </section>

        {/* Pembuat */}
        <section className="card glass" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <User size={22} color="var(--primary)" /> Pembuat
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={30} color="var(--primary)" />
            </div>
            <div>
              <p style={{ fontSize: '1.2rem', fontWeight: 800 }}>Restu Satrio Pinanggih</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                BPS Provinsi Sumatera Utara
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a href="https://www.linkedin.com/in/restu-satrio-pinanggih-647091163" target="_blank" rel="noopener noreferrer" className="btn glass" style={{ padding: '0.5rem 1rem', display: 'inline-flex' }}>
                  <LinkedInIcon />
                  <span>LinkedIn</span>
                </a>
                <a href="https://github.com/restusatrio11" target="_blank" rel="noopener noreferrer" className="btn glass" style={{ padding: '0.5rem 1rem', display: 'inline-flex' }}>
                  <GitHubIcon />
                  <span>GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <div style={{ marginTop: '2rem' }}>
          <FeedbackSection />
        </div>
      </div>
    </div>
  );
}
