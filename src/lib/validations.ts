import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export const LaporanSchema = z.object({
  tanggalMulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  tanggalSelesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  jamMulai: z.string().optional().nullable(),
  jamSelesai: z.string().optional().nullable(),
  rencanaId: z.string().uuid('ID Rencana tidak valid'),
  kegiatan: z.string().min(5, 'Kegiatan minimal 5 karakter'),
  progress: z.number().int().min(0).max(100).default(100),
  capaian: z.string().min(1, 'Capaian wajib diisi'),
  buktiUrls: z.string().optional().nullable(),
  masukanSkp: z.string().optional().nullable(),
});

export const NotulenSchema = z.object({
  judul: z.string().min(5, 'Judul minimal 5 karakter'),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  waktu: z.string().optional().nullable(),
  tempat: z.string().optional().nullable(),
  pemimpin: z.string().optional().nullable(),
  topik: z.string().optional().nullable(),
  notulis: z.string().optional().nullable(),
  peserta: z.string().optional().nullable(),
  konten: z.string().min(1, 'Konten tidak boleh kosong'),
  undanganUrl: z.string().url().optional().nullable(),
  daftarHadirUrl: z.string().url().optional().nullable(),
  dokumentasiUrls: z.string().optional().nullable(),
});

// AI Schemas
export const AIResponseSchema = z.object({
  kegiatan: z.string(),
  capaian: z.string(),
  progress: z.union([z.string(), z.number()]).optional(),
});

export const AIHealthSchema = z.object({
  status: z.string(),
  message: z.string(),
  score: z.number(),
});

export const AINotulenSchema = z.object({
  judul: z.string(),
  kesimpulan: z.string(),
  pembahasan: z.array(z.object({
    topik: z.string(),
    items: z.array(z.object({
      deskripsi: z.string(),
      solusi: z.string().optional(),
    })),
  })),
  insights: z.array(z.string()),
});

export const AIReviewSchema = z.object({
  isAppropriate: z.boolean(),
  feedback: z.string(),
  suggestions: z.string(),
});
