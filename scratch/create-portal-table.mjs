import { readFileSync } from 'fs';
import { Pool } from '@neondatabase/serverless';

const env = readFileSync('.env.local', 'utf8');
const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
const url = line.slice('DATABASE_URL='.length).trim();

const pool = new Pool({ connectionString: url });

const sql = `
CREATE TABLE IF NOT EXISTS portal_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  portal_url text,
  cookie_enc text NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT portal_credentials_user_id_unique UNIQUE (user_id)
);
`;

try {
  await pool.query(sql);
  console.log('portal_credentials table ensured.');
} catch (e) {
  console.error('Failed:', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
