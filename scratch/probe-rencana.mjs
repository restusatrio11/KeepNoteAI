import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, 'test-portal-api.mjs'), 'utf8');
function grab(name) {
  const m = src.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`;'));
  if (!m) throw new Error('cannot find ' + name);
  return m[1];
}
const cookie = grab('cookie');
const xAuth = grab('xAuth');

const base = 'https://kipapp.bps.go.id';
const auth = { Cookie: cookie, 'X-Auth': xAuth, Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' };

const candidates = [
  '/api/v1/skp',
  '/api/v1/skps',
  '/api/v1/skp/list',
  '/api/v1/rencanakinerja',
  '/api/v1/rencana',
  '/api/v1/kegiatan',
  '/api/v1/rencana?skpid=1344761',
  '/api/v1/rencanakinerja?skpid=1344761',
  '/api/v1/rencana/search?q=a',
  '/api/v1/skp/1344761/rencana',
];

for (const p of candidates) {
  try {
    const res = await fetch(base + p, { headers: auth });
    const text = await res.text();
    console.log(`\n=== ${p} => ${res.status} (${text.length} bytes) ===`);
    console.log(text.slice(0, 250).replace(/\n/g, ' '));
  } catch (e) {
    console.log(`\n=== ${p} => ERR ${e.message}`);
  }
}
