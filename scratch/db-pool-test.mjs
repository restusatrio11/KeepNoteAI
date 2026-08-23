import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const map = {};
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.startsWith('#')) map[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}
const pool = new Pool({ connectionString: map.DATABASE_URL });
pool.on('error', (e) => console.log('POOL ERROR EVENT:', e?.code, e?.message, e?.detail));

try {
  const r = await pool.query('select 1 as ok');
  console.log('QUERY OK:', r.rows);
} catch (e) {
  console.log('CATCH code:', e?.code, 'msg:', e?.message);
  console.log('CAUSE:', e?.cause?.code || e?.cause?.message || e?.cause);
  console.log('FULL:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
} finally {
  await pool.end().catch(() => {});
}
