import { readFileSync } from 'fs';
import { Pool } from '@neondatabase/serverless';

const env = readFileSync('.env.local', 'utf8');
const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
const url = line.slice('DATABASE_URL='.length).trim();
const pool = new Pool({ connectionString: url });

const sqls = [
  `ALTER TABLE portal_credentials ADD COLUMN IF NOT EXISTS x_auth_enc text;`,
  `ALTER TABLE master_rencana ADD COLUMN IF NOT EXISTS portal_rkid text;`,
  `ALTER TABLE master_rencana ADD COLUMN IF NOT EXISTS portal_skpid text;`,
];

try {
  for (const s of sqls) {
    await pool.query(s);
    console.log('OK:', s);
  }
  console.log('DONE');
} catch (e) {
  console.error('ERR', e.message);
} finally {
  await pool.end();
}
