-- Add IKI column to master_rencana
ALTER TABLE "master_rencana" ADD COLUMN IF NOT EXISTS "iki" text;

-- Add new columns to laporan
ALTER TABLE "laporan" ADD COLUMN IF NOT EXISTS "tanggal_mulai" date;
ALTER TABLE "laporan" ADD COLUMN IF NOT EXISTS "tanggal_selesai" date;
ALTER TABLE "laporan" ADD COLUMN IF NOT EXISTS "jam_mulai" text;
ALTER TABLE "laporan" ADD COLUMN IF NOT EXISTS "jam_selesai" text;
ALTER TABLE "laporan" ADD COLUMN IF NOT EXISTS "bukti_urls" text;
ALTER TABLE "laporan" ADD COLUMN IF NOT EXISTS "masukan_skp" text;

-- Migrate data: copy tanggal to tanggal_mulai and tanggal_selesai
UPDATE "laporan" SET "tanggal_mulai" = "tanggal", "tanggal_selesai" = "tanggal" WHERE "tanggal_mulai" IS NULL;

-- Make new columns NOT NULL after data migration
ALTER TABLE "laporan" ALTER COLUMN "tanggal_mulai" SET NOT NULL;
ALTER TABLE "laporan" ALTER COLUMN "tanggal_selesai" SET NOT NULL;

-- Rename progress: add new integer column, migrate, drop old
ALTER TABLE "laporan" ADD COLUMN IF NOT EXISTS "progress_int" integer DEFAULT 100;
UPDATE "laporan" SET "progress_int" = CAST(REPLACE("progress", '%', '') AS integer) WHERE "progress" IS NOT NULL;
ALTER TABLE "laporan" DROP COLUMN IF EXISTS "progress";
ALTER TABLE "laporan" RENAME COLUMN "progress_int" TO "progress";
ALTER TABLE "laporan" ALTER COLUMN "progress" SET DEFAULT 100;
ALTER TABLE "laporan" ALTER COLUMN "progress" SET NOT NULL;

-- Migrate bukti_url to bukti_urls (wrap in JSON array)
UPDATE "laporan" SET "bukti_urls" = CASE WHEN "bukti_url" IS NOT NULL THEN '["' || "bukti_url" || '"]' ELSE NULL END;
ALTER TABLE "laporan" DROP COLUMN IF EXISTS "bukti_url";

-- Drop old tanggal column
ALTER TABLE "laporan" DROP COLUMN IF EXISTS "tanggal";
