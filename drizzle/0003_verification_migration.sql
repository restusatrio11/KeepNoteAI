ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_code" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_expiry" timestamp;
