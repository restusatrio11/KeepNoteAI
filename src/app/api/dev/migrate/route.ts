import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  return POST();
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'disabled in production' }, { status: 403 });
  }
  try {
    await db.execute(sql`ALTER TABLE portal_credentials ADD COLUMN IF NOT EXISTS skpid text;`);
    await db.execute(sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS drive_refresh_token text;`);
    await db.execute(sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS drive_access_token text;`);
    await db.execute(sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS drive_email text;`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_paused boolean NOT NULL DEFAULT false;`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS telegram_updates (
        update_id text PRIMARY KEY,
        chat_id text,
        message_id text,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS portal_iki (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id),
        rkid text NOT NULL,
        rencanakinerja text,
        pki_id text,
        iki text,
        kode text,
        raw text,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
