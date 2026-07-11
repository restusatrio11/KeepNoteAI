-- Add telegram_chat_id to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_chat_id" text;

-- Create unique index for telegram_chat_id lookups
CREATE INDEX IF NOT EXISTS "idx_users_telegram_chat_id" ON "users" ("telegram_chat_id");
