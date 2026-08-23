'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, Inbox, Clock, Users } from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import Modal from '@/components/Modal';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const NEUTRAL_COLOR = {
  bg: 'rgba(148, 163, 184, 0.15)',
  border: 'rgba(148, 163, 184, 0.5)',
  text: '#cbd5e1',
  dot: '#94a3b8',
};

interface Team {
  id: string;
  nama: string;
  color: { bg: string; border: string; text: string; dot: string };
}

interface CalendarEvent {
  id: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  jamMulai: string | null;
  jamSelesai: string | null;
  kegiatan: string;
  progress: number;
  rencanaNama: string | null;
  rencanaKode: string | null;
  timId: string | null;
  timNama: string | null;
}

export default function KalenderPage() {
  const { showToast } = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [teamMap, setTeamMap] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);
  const [modalDate, setModalDate] = useState<string | null>(null);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kalender?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        const map: Record<string, Team> = {};
        (data.teams || []).forEach((t: Team) => { map[t.id] = t; });
        setTeamMap(map);
      } else {
        showToast('Gagal memuat kalender', 'error');
      }
  } catch {
    showToast('Gagal memuat kalender', 'error');
  } finally {
      setLoading(false);
    }
  }, [monthStr, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const grid = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [firstWeekday, daysInMonth]);

  const toLocalKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const formatTanggal = (str: string) => {
    const [y, m, d] = str.split('-').map(Number);
    return `${HARI[new Date(y, m - 1, d).getDay()]}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
  };

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const start = new Date(ev.tanggalMulai + 'T00:00:00');
      const end = new Date(ev.tanggalSelesai + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toLocalKey(d);
        if (!map[key]) map[key] = [];
        map[key].push(ev);
      }
    }
    return map;
  }, [events]);

  const goPrev = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const goNext = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const colorFor = (ev: CalendarEvent) => {
    if (ev.timId && teamMap[ev.timId]) return teamMap[ev.timId].color;
    return NEUTRAL_COLOR;
  };

  const todayStr = toLocalKey(today);

  return (
    <div className="animate-in" style={{ paddingBottom: '3rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CalendarIcon size={28} color="var(--primary)" />
          Kalender Kegiatan
        </h1>
        <p className="text-muted">Lihat seluruh kegiatan harian Anda, diberi warna berdasarkan tim kerjanya.</p>
      </header>

      {/* Legend Tim */}
      <div className="card glass" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        {Object.keys(teamMap).length === 0 && !loading && (
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>Belum ada tim dengan kegiatan pada bulan ini.</span>
        )}
        {Object.values(teamMap).map((t) => (
          <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: t.color.dot }} />
            {t.nama}
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, opacity: 0.7 }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: NEUTRAL_COLOR.dot }} />
          Tanpa Tim
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={goPrev} className="btn glass" style={{ padding: '0.5rem', borderRadius: '10px' }}><ChevronLeft size={20} /></button>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: '220px', textAlign: 'center' }}>
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button onClick={goNext} className="btn glass" style={{ padding: '0.5rem', borderRadius: '10px' }}><ChevronRight size={20} /></button>
        </div>
        <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }} className="btn glass" style={{ fontSize: '0.85rem' }}>
          Bulan Ini
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center' }}><Loader2 className="spin" size={32} color="var(--primary)" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.5rem' }}>
          {grid.map((day, i) => {
            if (day === null) return <div key={i} style={{ minHeight: '110px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }} />;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === modalDate;
            const dayEvents = eventsByDay[dateStr] || [];
            return (
              <div
                key={i}
                onClick={() => setModalDate(dateStr)}
                style={{
                  minHeight: '110px',
                  borderRadius: '12px',
                  padding: '0.5rem',
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface, rgba(255,255,255,0.03))',
                  border: `1px solid ${isToday ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                  minWidth: 0,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isToday ? 'var(--primary)' : 'var(--text-muted)', alignSelf: 'flex-end' }}>
                  {day}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden', minWidth: 0 }}>
                  {dayEvents.slice(0, 3).map((ev) => {
                    const c = colorFor(ev);
                    return (
                      <Link
                        key={ev.id}
                        href="/laporan"
                        onClick={(e) => e.stopPropagation()}
                        title={`${ev.jamMulai ? ev.jamMulai + ' - ' : ''}${ev.kegiatan}`}
                        style={{
                          display: 'block',
                          fontSize: '0.7rem',
                          lineHeight: 1.2,
                          padding: '0.2rem 0.35rem',
                          borderRadius: '6px',
                          backgroundColor: c.bg,
                          borderLeft: `3px solid ${c.dot}`,
                          color: c.text,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                          minWidth: 0,
                          fontWeight: 600,
                        }}
                      >
                        {ev.jamMulai ? `${ev.jamMulai} ` : ''}{ev.kegiatan}
                      </Link>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', paddingLeft: '0.35rem' }}>
                      +{dayEvents.length - 3} lainnya
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="card glass" style={{ marginTop: '1.5rem', padding: '3rem 2rem', textAlign: 'center' }}>
          <Inbox size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <p className="text-muted">Belum ada kegiatan pada bulan {MONTH_NAMES[month - 1]} {year}.</p>
          <Link href="/laporan/baru" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>Buat Laporan</Link>
        </div>
      )}

      <Modal
        isOpen={!!modalDate}
        onClose={() => setModalDate(null)}
        title={modalDate ? formatTanggal(modalDate) : ''}
      >
        {modalDate && (eventsByDay[modalDate] || []).length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            Tidak ada kegiatan pada tanggal ini.
          </p>
        ) : modalDate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {eventsByDay[modalDate].map((ev) => {
              const c = colorFor(ev);
              const teamName = ev.timNama || 'Tanpa Tim';
              return (
                <div key={ev.id} className="card glass" style={{ padding: '1rem 1.25rem', borderLeft: `4px solid ${c.dot}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: c.dot }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: c.text }}>{teamName}</span>
                    {ev.rencanaKode && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({ev.rencanaKode})</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.4 }}>{ev.kegiatan}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {ev.jamMulai && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={14} /> {ev.jamMulai}{ev.jamSelesai ? ` - ${ev.jamSelesai}` : ''}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Users size={14} /> {teamName}
                    </span>
                    <span>Progress: {ev.progress}%</span>
                  </div>
                  {ev.rencanaNama && (
                    <p style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '0.5rem' }}>
                      Program: {ev.rencanaNama}
                    </p>
                  )}
                </div>
              );
            })}
            <Link href="/laporan" className="btn glass" style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
              Lihat semua laporan
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
