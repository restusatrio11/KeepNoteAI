import { pgTable, text, timestamp, uuid, date, integer, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const timKerja = pgTable('tim_kerja', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  nama: text('nama').notNull(),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const masterRencana = pgTable('master_rencana', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  timId: uuid('tim_id').references(() => timKerja.id),
  nama: text('nama').notNull(),
  kode: text('kode').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const laporan = pgTable('laporan', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  tanggal: date('tanggal').notNull(),
  rencanaId: uuid('rencana_id').references(() => masterRencana.id).notNull(),
  kegiatan: text('kegiatan').notNull(),
  progress: text('progress').notNull(),
  capaian: text('capaian').notNull(),
  buktiUrl: text('bukti_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).unique().notNull(),
  driveFolderId: text('drive_folder_id'),
  healthScore: integer('health_score'),
  healthStatus: text('health_status'),
  healthMessage: text('health_message'),
  lastReportCount: integer('last_report_count'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dailyPlanning = pgTable('daily_planning', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  tanggal: date('tanggal').defaultNow().notNull(),
  content: text('content').notNull(),
  color: text('color').notNull(), // e.g., 'yellow', 'blue', 'pink'
  reminderTime: timestamp('reminder_time'),
  isDone: boolean('is_done').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notulen = pgTable('notulen', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  judul: text('judul').notNull(),
  tanggal: date('tanggal').notNull(),
  waktu: text('waktu'),
  tempat: text('tempat'),
  pemimpin: text('pemimpin'),
  topik: text('topik'),
  notulis: text('notulis'),
  peserta: text('peserta'), // List of participants
  konten: text('konten').notNull(), // JSON string for discussion points
  undanganUrl: text('undangan_url'),
  daftarHadirUrl: text('daftar_hadir_url'),
  dokumentasiUrls: text('dokumentasi_urls'), // JSON string for multiple image URLs
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
