import { readFileSync } from 'fs';
import { Pool } from '@neondatabase/serverless';
import crypto from 'crypto';

const env = readFileSync('.env.local', 'utf8');
const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
const url = line.slice('DATABASE_URL='.length).trim();
const pool = new Pool({ connectionString: url });

const secret = env.split('\n').find((l) => l.startsWith('AUTH_SECRET=')).slice('AUTH_SECRET='.length).trim();
const key = crypto.scryptSync(secret, 'keepnoteai-portal-v1', 32);
function enc(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const e = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  const t = c.getAuthTag();
  return Buffer.concat([iv, t, e]).toString('base64');
}

try {
  const u = await pool.query('SELECT id, email FROM users ORDER BY created_at LIMIT 1');
  if (u.rows.length === 0) { console.log('No users'); process.exit(0); }
  const userId = u.rows[0].id;
  console.log('User id:', userId, 'email:', u.rows[0].email);

  const cookieEnc = enc('TEST_COOKIE_VALUE');
  await pool.query(
    'INSERT INTO portal_credentials (id, user_id, portal_url, cookie_enc, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, now()) ON CONFLICT (user_id) DO UPDATE SET portal_url=$2, cookie_enc=$3, updated_at=now()',
    [userId, 'https://kipapp.bps.go.id/', cookieEnc]
  );
  console.log('INSERT OK');

  const r = await pool.query('SELECT portal_url, length(cookie_enc) len FROM portal_credentials WHERE user_id=$1', [userId]);
  console.log('Read back:', JSON.stringify(r.rows));

  await pool.query('DELETE FROM portal_credentials WHERE user_id=$1', [userId]);
  console.log('Cleaned up (row deleted)');
} catch (e) {
  console.error('ERR', e.message);
} finally {
  await pool.end();
}
