import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, 'test-portal-api.mjs'), 'utf8');
const grab = (n) => src.match(new RegExp('const ' + n + ' = `([\\s\\S]*?)`;'))[1];
const xAuth = grab('xAuth');
const cookie = grab('cookie');
const base = 'https://kipapp.bps.go.id';

const res = await fetch(`${base}/api/v1/skp/rk?skpid=1344761&direct=1`, {
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    Cookie: cookie,
    'X-Auth': xAuth,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    Origin: base,
    Referer: `${base}/`,
  },
});
const text = await res.text();
const ctype = res.headers.get('content-type') || '';
console.log(`/api/v1/skp/rk => ${res.status} ctype=${ctype.slice(0, 30)} (${text.length}b)`);
console.log(text.slice(0, 220).replace(/\n/g, ' '));
