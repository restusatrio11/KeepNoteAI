import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { laporan, masterRencana } from '@/db/schema';
import { count, eq, desc, and, gte, lte } from 'drizzle-orm';
import { FileText, CheckCircle, Clock, Plus, Download, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import DashboardFilter from '@/components/DashboardFilter';
import ReportHealth from '@/components/ReportHealth';
import PlanningBoard from '@/components/PlanningBoard';
import WorkflowSection from '@/components/WorkflowSection';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  const { from, to } = await searchParams;
  const userId = session.user.id as string;
  const todayStr = new Date().toISOString().split('T')[0];

  const filters = [eq(laporan.userId, userId)];
  if (from) filters.push(gte(laporan.tanggal, from));
  if (to) filters.push(lte(laporan.tanggal, to));
  const whereClause = and(...filters);

  let totalLaporanCount = 0;
  let totalRencanaCount = 0;
  let activities: any[] = [];

  try {
    const [totalLaporan] = await db.select({ value: count() }).from(laporan).where(whereClause);
    const [totalRencana] = await db.select({ value: count() }).from(masterRencana);
    
    totalLaporanCount = totalLaporan?.value || 0;
    totalRencanaCount = totalRencana?.value || 0;

    activities = await db
      .select({
        id: laporan.id,
        tanggal: laporan.tanggal,
        rencana: masterRencana.nama,
        progress: laporan.progress,
      })
      .from(laporan)
      .innerJoin(masterRencana, eq(laporan.rencanaId, masterRencana.id))
      .where(whereClause)
      .orderBy(desc(laporan.tanggal))
      .limit(5);
  } catch (error) {
    console.error('Dashboard Data Fetch Error:', error);
    // Silent fail - stats will show 0 and activities will be empty
  }

  const stats = [
    { label: 'Total Laporan', value: totalLaporanCount, icon: FileText, color: '#3b82f6' },
    { label: 'Rencana Aktif', value: totalRencanaCount, icon: Clock, color: '#f59e0b' },
    { label: 'Tercapai', value: totalLaporanCount, icon: CheckCircle, color: '#10b981' },
  ];

  const recentActivities = activities;

  return (
    <div className="animate-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h1 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Selamat Datang, {session.user?.name?.split(' ')[0]}!</h1>
          <p className="text-muted">Pantau dan kelola laporan kegiatan Anda di sini.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/laporan/baru" className="btn btn-primary" style={{ flex: 1 }}>
            <Plus size={20} />
            <span>Buat Laporan</span>
          </Link>
          <a href="/api/reports/export" className="btn glass" style={{ flex: 1 }}>
            <Download size={20} />
            <span>Ekspor Excel</span>
          </a>
        </div>
      </header>

      <DashboardFilter />

      <WorkflowSection />

      <div className="grid-stats" style={{ marginBottom: '4rem' }}>
        {stats.map((stat, i) => (
          <div key={i} className="card glass" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '16px', 
              backgroundColor: `${stat.color}15`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: stat.color
            }}>
              <stat.icon size={30} />
            </div>
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
      
      <PlanningBoard initialDate={todayStr} />

      <div className="grid-dashboard" style={{ marginBottom: '4rem' }}>
        {/* Main List Section */}
        <section className="card glass">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>Aktivitas Terbaru</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentActivities.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Belum ada aktivitas dalam periode ini.</p>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1.25rem 1.5rem', 
                  borderRadius: '12px', 
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <p style={{ fontWeight: 600 }}>{activity.rencana}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(activity.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ padding: '0.4rem 1rem', borderRadius: '20px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700 }}>
                    {activity.progress}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* AI Driven Health Section */}
        <ReportHealth />
      </div>
    </div>
  );
}
