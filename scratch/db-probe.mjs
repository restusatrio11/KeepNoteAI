import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import net from 'net';

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
const url = new URL(map.DATABASE_URL);
console.log('protocol:', url.protocol, 'host:', url.hostname, 'port:', url.port, 'db:', url.pathname);
console.log('search:', url.search);

function dnsLookup(host) {
  return new Promise((resolve) => {
    dns.lookup(host, (err, addr) => resolve(err ? 'ERR ' + err.code : addr));
  });
}
function tcpTest(host, port) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port, timeout: 6000 });
    s.on('connect', () => { s.destroy(); resolve('CONNECT OK'); });
    s.on('timeout', () => { s.destroy(); resolve('TIMEOUT'); });
    s.on('error', (e) => { s.destroy(); resolve('ERR ' + e.code); });
  });
}

const ip = await dnsLookup(url.hostname);
console.log('DNS:', ip);
if (ip && !String(ip).startsWith('ERR')) {
  const port = url.port || (url.protocol === 'postgresql:' ? 5432 : 5432);
  console.log('TCP ' + url.hostname + ':' + port + ' =>', await tcpTest(url.hostname, Number(port)));
}
