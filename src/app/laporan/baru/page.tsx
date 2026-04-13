import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { masterRencana, timKerja } from '@/db/schema';
import FormLaporan from './FormLaporan';
import { eq } from 'drizzle-orm';

export default async function BaruLaporanPage() {
  const session = await auth();

  const userId = session?.user?.id;
  if (!userId) {
    redirect('/api/auth/signin');
  }

  const [rencanaOptions, timOptions] = await Promise.all([
    db.select().from(masterRencana).where(eq(masterRencana.userId, userId as string)),
    db.select().from(timKerja).where(eq(timKerja.userId, userId as string))
  ]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '5rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Buat Laporan Baru</h1>
        <p style={{ color: 'var(--text-muted)' }}>Isi detail pekerjaan Anda dan biarkan AI menyusun deskripsi profesional.</p>
      </header>

      <FormLaporan rencanaOptions={rencanaOptions} timOptions={timOptions} userId={userId as string} />
    </div>
  );
}
