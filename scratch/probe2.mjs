import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, 'test-portal-api.mjs'), 'utf8');
const grab = (n) => src.match(new RegExp('const ' + n + ' = `([\\s\\S]*?)`;'))[1];
const cookie = grab('cookie'), xAuth = grab('xAuth');
const base = 'https://kipapp.bps.go.id';
const auth = { Cookie: cookie, 'X-Auth': xAuth, Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' };

const candidates = [
  '/api/v1/skp/list?tahun=8',
  '/api/v1/skp/list?tahun_id=8',
  '/api/v1/rencanakinerja?skpid=1344761',
  '/api/v1/rencana?skpid=1344761',
  '/api/v1/skp/1344761',
  '/api/v1/kegiatan?skpid=1344761',
  '/api/v1/rencana/list?skpid=1344761',
  '/api/v1/rencanakinerja/list?skpid=1344761',
  '/api/v1/rencanakinerja?skp=1344761',
  '/api/v1/rencana?skp=1344761&tahun=8',
];

for (const p of candidates) {
  try {
    const res = await fetch(base + p, { headers: auth });
    const text = await res.text();
    console.log(`\n=== ${p} => ${res.status} (${text.length}b) ===`);
    console.log(text.slice(0, 220).replace(/\n/g, ' '));
  } catch (e) {
    console.log(`\n=== ${p} => ERR ${e.message}`);
  }
}
