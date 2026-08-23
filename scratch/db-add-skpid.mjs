import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const map = {};
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.startsWith('#')) {
    let k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    map[k] = v;
  }
}
const sql = neon(map.DATABASE_URL);
try {
  await sql`ALTER TABLE portal_credentials ADD COLUMN IF NOT EXISTS skpid text;`;
  const r = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'portal_credentials' ORDER BY ordinal_position`;
  console.log('portal_credentials columns:', r.map((x) => x.column_name).join(', '));
} catch (e) {
  console.error('ERR FULL:', e?.message || e);
  console.error('PROTOCOL:', String(map.DATABASE_URL).split('://')[0]);
  if (e?.cause) console.error('CAUSE:', e.cause?.message || e.cause);
}
