import { execFile } from 'child_process';
import { promises as fsp } from 'fs';
import os from 'os';
import path from 'path';

const execFileP = (cmd: string, args: string[], env: NodeJS.ProcessEnv) =>
  new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 32 * 1024 * 1024, env }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout, stderr });
    });
  });

export type PortalResponse = {
  status: number;
  ok: boolean;
  ctype: string;
  url: string;
  body: string;
};

/**
 * Build headers that exactly mirror a working browser/DevTools `curl` to the portal.
 * NOTE: deliberately omit Accept-Encoding, X-Requested-With, Origin, Priority — the
 * portal's Apache (mod_negotiation) serves the SPA (index.html.gz) instead of the API
 * when those are present. This header set is the one confirmed to return JSON.
 */
export function buildPortalHeaders(cookie: string, xAuth: string): Record<string, string> {
  const token = xAuth.replace(/^Bearer\s+/i, '').trim();
  return {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Connection: 'keep-alive',
    Cookie: cookie,
    Referer: 'https://kipapp.bps.go.id/',
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

/** Strip proxy variables so curl connects directly (dev-server envs often set HTTPS_PROXY). */
function cleanEnv(): NodeJS.ProcessEnv {
  const e: NodeJS.ProcessEnv = { ...process.env };
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

/**
 * Make an HTTP request to the portal using `curl` (present on Win10+/macOS/Linux).
 * Uses execFile with an argument array so header values (Cookie/X-Auth) are passed
 * directly to curl — no shell, no quoting/injection risk.
 * curl replicates the browser's request fingerprint far better than Node's undici,
 * which in some corporate/Cloudflare/F5 environments gets redirected to the SPA.
 *
 * We try two strategies and return whichever reaches the real API (JSON):
 *   1. inherited env (so any corporate proxy set in the dev-server's environment is used)
 *   2. direct, proxy stripped (--noproxy '*')
 * This covers both "proxy required" and "proxy must be bypassed" networks.
 */
export async function portalRequest(opts: {
  method: 'GET' | 'POST';
  url: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<PortalResponse> {
  const tmp = path.join(os.tmpdir(), `portal_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);

  const runWith = async (
    extra: string[],
    envName: string,
  ): Promise<{ resp: PortalResponse; cmd: string; respHeaders: string } | null> => {
    const args: string[] = ['-sS', '-L', '-v', ...extra, '-X', opts.method];
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
      const status = Number(stdout.match(/PORTAL_STATUS:(\d+)/)?.[1] || '0');
      const ctype = (stdout.match(/PORTAL_CT:([^\n]*)/)?.[1] || '').trim();
      const url = (stdout.match(/PORTAL_URL:([^\n]*)/)?.[1] || opts.url).trim();
      const respHeaders = stderr
        .split('\n')
        .filter((l) => l.startsWith('< '))
        .join('\n');
      return {
        resp: { status, ok: status >= 200 && status < 300, ctype, url, body },
        cmd: `curl ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`,
        respHeaders,
      };
    } catch (e: any) {
      return null;
    }
  };

  const attempts: Array<{ name: string; extra: string[] }> = [
    { name: 'proxy', extra: [] },
    { name: 'direct', extra: ['--noproxy', '*'] },
  ];

  let last: { resp: PortalResponse; cmd: string; respHeaders: string } | null = null;
  for (const a of attempts) {
    const r = await runWith(a.extra, a.name);
    if (r && r.resp.ok && (r.resp.ctype || '').includes('json')) {
      return r.resp;
    }
    if (r) last = r;
  }

  const base = last?.resp ?? { status: 0, ok: false, ctype: '', url: opts.url, body: '' };
  const cmd = last?.cmd || '(tidak ada percobaan)';
  const rh = last?.respHeaders || '(tidak ada header respons)';
  return {
    ...base,
    body:
      base.body +
      `\n[debug] semua strategi gagal.\n[cmd-server] ${cmd}\n[resp-headers]\n${rh}`,
  };
}
