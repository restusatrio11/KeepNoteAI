import { db } from '../db';
import { users, laporan, masterRencana, timKerja } from '../db/schema';
import { eq } from 'drizzle-orm';

export function cleanAndFormatText(text: string): string {
  let res = text;
  const acronyms: Record<string, string> = {
    'bps': 'BPS',
    'it': 'IT',
    'ti': 'TI',
    'bmn': 'BMN',
    'wbk': 'WBK',
    'wbbm': 'WBBM',
    'rb': 'RB',
    'zi': 'ZI',
    'se2026': 'SE2026',
    'potik': 'Pojok Statistik',
    'umsu': 'UMSU',
    'usu': 'USU',
    'uisu': 'UISU',
    'amor': 'AMOR',
    'wego': 'WEGO',
    'cemana': 'Cemana',
    'dpr': 'DPR',
    'ri': 'RI',
    'sop': 'SOP',
    'sdm': 'SDM',
    'cawi': 'CAWI',
    'lan': 'LAN',
    'kemenpanrb': 'KemenPAN-RB',
    'hsn': 'Hari Statistik Nasional (HSN)',
  };

  for (const [lower, upper] of Object.entries(acronyms)) {
    const reg = new RegExp(`\\b${lower}\\b`, 'gi');
    res = res.replace(reg, upper);
  }
  return res;
}

export function synthesizeTerwujudnyaCapaian(report: {
  id: string;
  kegiatan: string;
  capaian: string;
  rencanaNama: string | null;
  rencanaKode: string | null;
  rencanaIki: string | null;
  timNama: string | null;
}): string {
  let keg = report.kegiatan.trim();
  const renc = (report.rencanaNama || '').trim();
  const iki = (report.rencanaIki || '').trim();

  // Strip leading dates, timestamps, date ranges
  keg = keg.replace(/^(pada\s+(tanggal\s+|hari\s+)?\d+(\s+hingga\s+\d+)?\s+[a-zA-Z]+\s*(\d{4})?,?\s*|\d+\s+[a-zA-Z]+\s+\d{4},?\s*|tanggal\s+\d+\s+[a-zA-Z]+\s+\d{4},?\s*|pada\s+hari\s+ini\s+|hari\s+ini\s+)/i, '');
  keg = keg.replace(/^(saya\s+telah\s+|saya\s+melakukan\s+|saya\s+menghadiri\s+|telah\s+menghadiri\s+|telah\s+dilaksanakan\s+|telah\s+dilakukan\s+|telah\s+tercapai\s+|direalisasikan\s+|telah\s+berhasil\s+|dilakukan\s+|disusun\s+|dibuat\s+|diimplementasikan\s+|kegiatan\s+dilakukan\s+untuk\s+mendukung\s+|kegiatan\s+)/i, '');
  keg = keg.replace(/^dalam\s+mendukung\s+kegiatan\s+rb\s+dengan\s+/i, '');
  keg = keg.replace(/^terwujudnya\s+(dukungan\s+pembangunan\s+zona\s+integritas\s+dalam\s+)?/i, '');

  // Strip trailing passive / future phrases
  keg = keg.replace(/\s+(telah\s+dibuat|telah\s+selesai|telah\s+dilaksanakan|berhasil\s+diselesaikan|akan\s+dilakukan|akan\s+diwujudkan)\.?$/i, '');
  keg = keg.trim();

  let phrase = keg;
  
  // Specific phrases
  if (/^mengikuti\s+pelaksanaan\s+kegiatan\s+mengikuti\s+/i.test(phrase)) {
    phrase = phrase.replace(/^mengikuti\s+pelaksanaan\s+kegiatan\s+mengikuti\s+/i, 'keikutsertaan dalam ');
  } else if (/^membantu\s+mengimplementasikan\s+/i.test(phrase)) {
    phrase = phrase.replace(/^membantu\s+mengimplementasikan\s+/i, 'implementasi ');
  } else if (/^membantu\s+/i.test(phrase)) {
    phrase = phrase.replace(/^membantu\s+/i, 'dukungan teknis dalam ');
  } else if (/^mengikuti\s+rapat\s+/i.test(phrase)) {
    phrase = phrase.replace(/^mengikuti\s+rapat\s+/i, 'keikutsertaan dalam rapat ');
  } else if (/^mengikuti\s+kegiatan\s+/i.test(phrase)) {
    phrase = phrase.replace(/^mengikuti\s+kegiatan\s+/i, 'keikutsertaan aktif dalam kegiatan ');
  } else if (/^mengikuti\s+rilis\s+/i.test(phrase)) {
    phrase = phrase.replace(/^mengikuti\s+rilis\s+/i, 'keikutsertaan dalam rilis ');
  } else if (/^mengikuti\s+apel\s+/i.test(phrase)) {
    phrase = phrase.replace(/^mengikuti\s+apel\s+/i, 'keikutsertaan dalam apel ');
  } else if (/^mengikuti\s+/i.test(phrase)) {
    phrase = phrase.replace(/^mengikuti\s+/i, 'keikutsertaan aktif dalam ');
  } else if (/^membuat\s+/i.test(phrase)) {
    phrase = phrase.replace(/^membuat\s+/i, 'pembuatan ');
  } else if (/^mengedit\s+/i.test(phrase)) {
    phrase = phrase.replace(/^mengedit\s+/i, 'pengeditan dan penyesuaian ');
  } else if (/^menyusun\s+/i.test(phrase)) {
    phrase = phrase.replace(/^menyusun\s+/i, 'penyusunan ');
  } else if (/^melakukan\s+pengawasan\s+/i.test(phrase)) {
    phrase = phrase.replace(/^melakukan\s+pengawasan\s+/i, 'pengawasan ');
  } else if (/^melakukan\s+persiapan\s+/i.test(phrase)) {
    phrase = phrase.replace(/^melakukan\s+persiapan\s+/i, 'persiapan ');
  } else if (/^melakukan\s+pendataan\s+/i.test(phrase)) {
    phrase = phrase.replace(/^melakukan\s+pendataan\s+/i, 'pendataan ');
  } else if (/^melakukan\s+entri\s+/i.test(phrase)) {
    phrase = phrase.replace(/^melakukan\s+entri\s+/i, 'entri data ');
  } else if (/^melakukan\s+apel\s+/i.test(phrase)) {
    phrase = phrase.replace(/^melakukan\s+apel\s+/i, 'pelaksanaan apel ');
  } else if (/^melakukan\s+evaluasi\s+/i.test(phrase)) {
    phrase = phrase.replace(/^melakukan\s+evaluasi\s+/i, 'pelaksanaan evaluasi ');
  } else if (/^melakukan\s+sensus\s+/i.test(phrase)) {
    phrase = phrase.replace(/^melakukan\s+sensus\s+/i, 'pelaksanaan sensus ');
  } else if (/^melakukan\s+/i.test(phrase)) {
    phrase = phrase.replace(/^melakukan\s+/i, 'pelaksanaan ');
  } else if (/^melaksanakan\s+rapat\s+/i.test(phrase)) {
    phrase = phrase.replace(/^melaksanakan\s+rapat\s+/i, 'pelaksanaan rapat ');
  } else if (/^melaksanakan\s+sensus\s+/i.test(phrase)) {
    phrase = phrase.replace(/^melaksanakan\s+sensus\s+/i, 'pelaksanaan sensus ');
  } else if (/^melaksanakan\s+wawancara\s+/i.test(phrase)) {
    phrase = phrase.replace(/^melaksanakan\s+wawancara\s+/i, 'pelaksanaan wawancara ');
  } else if (/^melaksanakan\s+/i.test(phrase)) {
    phrase = phrase.replace(/^melaksanakan\s+/i, 'pelaksanaan ');
  } else if (/^mendesain\s+/i.test(phrase)) {
    phrase = phrase.replace(/^mendesain\s+/i, 'desain dan perancangan ');
  } else if (/^mengerjakan\s+/i.test(phrase)) {
    phrase = phrase.replace(/^mengerjakan\s+/i, 'penyelesaian ');
  } else if (/^menghadiri\s+rapat\s+/i.test(phrase)) {
    phrase = phrase.replace(/^menghadiri\s+rapat\s+/i, 'kehadiran dan keikutsertaan dalam rapat ');
  } else if (/^menghadiri\s+/i.test(phrase)) {
    phrase = phrase.replace(/^menghadiri\s+/i, 'kehadiran dalam ');
  } else if (/^menyiapkan\s+/i.test(phrase)) {
    phrase = phrase.replace(/^menyiapkan\s+/i, 'penyiapan ');
  } else if (/^mengembangkan\s+/i.test(phrase)) {
    phrase = phrase.replace(/^mengembangkan\s+/i, 'pengembangan ');
  } else if (/^mengimplementasikan\s+/i.test(phrase)) {
    phrase = phrase.replace(/^mengimplementasikan\s+/i, 'implementasi ');
  } else if (/^mendukung\s+/i.test(phrase)) {
    phrase = phrase.replace(/^mendukung\s+/i, 'dukungan pelaksanaan ');
  } else if (/^panduan\s+/i.test(phrase)) {
    phrase = 'penyusunan ' + phrase;
  }

  phrase = phrase.charAt(0).toLowerCase() + phrase.slice(1);
  phrase = phrase.replace(/\.+$/, '').trim();

  // Extract goal/rencana context
  let goalContext = '';
  if (iki) {
    goalContext = ` dalam rangka pemenuhan target IKI "${iki}"`;
  } else if (renc) {
    let cleanRenc = renc
      .replace(/^(Terwujudnya|Terlaksananya|Tersedianya|Terselenggaranya|Mendukung|Persentase)\s+/i, '')
      .trim();
    cleanRenc = cleanRenc.charAt(0).toLowerCase() + cleanRenc.slice(1);
    cleanRenc = cleanRenc.replace(/\.+$/, '');
    cleanRenc = cleanRenc.replace(/^dukungan\s+/i, '');

    const wordsInPhrase = phrase.toLowerCase().split(/\s+/);
    const commonKeywords = wordsInPhrase.filter(w => w.length > 4 && cleanRenc.toLowerCase().includes(w));
    
    if (commonKeywords.length >= 3) {
      goalContext = ` secara optimal dan sesuai target`;
    } else {
      goalContext = ` guna mendukung ${cleanRenc}`;
    }
  }

  let finalCapaian = `Terwujudnya ${phrase}${goalContext}.`;
  finalCapaian = cleanAndFormatText(finalCapaian);
  finalCapaian = finalCapaian.replace(/\s{2,}/g, ' ').replace(/\.{2,}/g, '.').trim();
  
  return finalCapaian;
}

async function runUpdate() {
  console.log('Fetching user restuilham212@gmail.com...');
  const user = await db.query.users.findFirst({
    where: eq(users.email, 'restuilham212@gmail.com'),
  });

  if (!user) {
    console.error('User not found');
    return;
  }

  const userReports = await db
    .select({
      id: laporan.id,
      kegiatan: laporan.kegiatan,
      capaian: laporan.capaian,
      progress: laporan.progress,
      rencanaNama: masterRencana.nama,
      rencanaKode: masterRencana.kode,
      rencanaIki: masterRencana.iki,
      timNama: timKerja.nama,
    })
    .from(laporan)
    .leftJoin(masterRencana, eq(laporan.rencanaId, masterRencana.id))
    .leftJoin(timKerja, eq(masterRencana.timId, timKerja.id))
    .where(eq(laporan.userId, user.id));

  // Filter reports that have "tercapai sesuai target"
  const targetReports = userReports.filter(r => 
    r.capaian.trim().toLowerCase().includes('tercapai sesuai target')
  );

  console.log(`Found ${targetReports.length} reports with 'Tercapai sesuai target.' to update.`);

  let updatedCount = 0;
  for (const rep of targetReports) {
    const newCapaian = synthesizeTerwujudnyaCapaian(rep);
    await db.update(laporan)
      .set({ capaian: newCapaian })
      .where(eq(laporan.id, rep.id));
    
    updatedCount++;
    console.log(`[${updatedCount}/${targetReports.length}] Updated ID: ${rep.id}`);
    console.log(`  Kegiatan : ${rep.kegiatan}`);
    console.log(`  Capaian  : ${newCapaian}\n`);
  }

  console.log(`\nSuccessfully updated ${updatedCount} reports for restuilham212@gmail.com!`);
}

runUpdate().catch(console.error).finally(() => process.exit(0));
