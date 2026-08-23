import { readFileSync } from 'fs';
import { Pool } from '@neondatabase/serverless';

const env = readFileSync('.env.local', 'utf8');
const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
const url = line.slice('DATABASE_URL='.length).trim();
const pool = new Pool({ connectionString: url });

try {
  const r = await pool.query('SELECT id, user_id, portal_url, length(cookie_enc) AS cookie_len, updated_at FROM portal_credentials');
  console.log('rows:', JSON.stringify(r.rows, null, 2));
} catch (e) {
  console.error('ERR', e.message);
} finally {
  await pool.end();
}
