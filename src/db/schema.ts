import { pgTable, text, timestamp, uuid, date, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const masterRencana = pgTable('master_rencana', {
  id: uuid('id').primaryKey().defaultRandom(),
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
