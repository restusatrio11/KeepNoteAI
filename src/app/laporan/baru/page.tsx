import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { masterRencana, laporan } from '@/db/schema';
import FormLaporan from './FormLaporan';

export default async function BaruLaporanPage() {
  const session = await auth();

  const userId = session?.user?.id;
  if (!userId) {
    redirect('/api/auth/signin');
  }

  const rencanaOptions = await db.select().from(masterRencana);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '5rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Buat Laporan Baru</h1>
        <p style={{ color: 'var(--text-muted)' }}>Isi detail pekerjaan Anda dan biarkan AI menyusun deskripsi profesional.</p>
      </header>

      <FormLaporan rencanaOptions={rencanaOptions} userId={userId as string} />
    </div>
  );
}
