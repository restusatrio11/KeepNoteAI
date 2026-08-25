/**
 * Port dari src/lib/portal/http.ts — membuat request ke portal e-Kinerja memakai
 * `curl` (ada di Windows 10+, macOS, Linux). Menggunakan execFile (tanpa shell)
 * agar nilai header Cookie/X-Auth aman dari injection.
 *
 * Dua strategi dijalankan bergantian:
 *   1. inherited env (pakai proxy korporat bila ada)
 *   2. direct, proxy di-strip (--noproxy '*')
 * Dipilih respons pertama yang benar-benar mengembalikan JSON dari API.
 */
const { execFile } = require('child_process');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');

function execFileP(cmd, args, env) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 32 * 1024 * 1024, env }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout, stderr });
    });
  });
}

/**
 * Header persis meniru browser/DevTools curl yang berhasil. Beberapa header
 * (Accept-Encoding, X-Requested-With, Origin, Priority) sengaja dihilangkan
 * karena memicu Apache mod_negotiation mengembalikan SPA bukan API.
 */
function buildPortalHeaders(cookie, xAuth, portalUrl) {
  const token = (xAuth || '').replace(/^Bearer\s+/i, '').trim();
  const referer = (portalUrl || 'https://kipapp.bps.go.id').replace(/\/$/, '') + '/';
  return {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Connection: 'keep-alive',
    Cookie: cookie,
    Referer: referer,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    'X-Auth': `Bearer ${token}`,
    'sec-ch-ua': '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  };
}

function cleanEnv() {
  const e = { ...process.env };
  for (const k of [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'http_proxy',
    'https_proxy',
    'ALL_PROXY',
    'all_proxy',
    'NO_PROXY',
    'no_proxy',
  ]) {
    delete e[k];
  }
  return e;
}

async function portalRequest(opts) {
  const tmp = path.join(os.tmpdir(), `portal_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);

  const runWith = async (extra, envName) => {
    const args = ['-sS', '-L', '-v', ...extra, '-X', opts.method];
    for (const [k, v] of Object.entries(opts.headers || {})) {
      args.push('-H', `${k}: ${v}`);
    }
    if (opts.body) args.push('--data', opts.body);
    args.push('-o', tmp);
    args.push(
      '-w',
      '\nPORTAL_STATUS:%{http_code}\nPORTAL_CT:%{content_type}\nPORTAL_URL:%{url_effective}\n',
    );
    args.push(opts.url);
    try {
      const chosenEnv = envName === 'direct' ? cleanEnv() : process.env;
      const { stdout, stderr } = await execFileP('curl', args, chosenEnv);
      const body = await fsp.readFile(tmp, 'utf8').catch(() => '');
      const status = Number((stdout.match(/PORTAL_STATUS:(\d+)/) || [])[1] || '0');
      const ctype = ((stdout.match(/PORTAL_CT:([^\n]*)/) || [])[1] || '').trim();
      const url = ((stdout.match(/PORTAL_URL:([^\n]*)/) || [])[1] || opts.url).trim();
      const respHeaders = stderr
        .split('\n')
        .filter((l) => l.startsWith('< '))
        .join('\n');
      return {
        resp: { status, ok: status >= 200 && status < 300, ctype, url, body },
        cmd: `curl ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`,
        respHeaders,
      };
    } catch (e) {
      return null;
    }
  };

  const attempts = [
    { name: 'proxy', extra: [] },
    { name: 'direct', extra: ['--noproxy', '*'] },
  ];

  let last = null;
  for (const a of attempts) {
    const r = await runWith(a.extra, a.name);
    if (r && r.resp.ok && (r.resp.ctype || '').includes('json')) return r.resp;
    if (r) last = r;
  }

  const base = last?.resp ?? { status: 0, ok: false, ctype: '', url: opts.url, body: '' };
  return {
    ...base,
    body: base.body + '\n[debug] semua strategi gagal.',
  };
}

module.exports = { buildPortalHeaders, portalRequest };
