import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import tls from 'tls';
import net from 'net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const map = {};
for (const line of env.split('\n')) {
  const i = line.indexOf('=');
  if (i > 0 && !line.startsWith('#')) map[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}
const url = new URL(map.DATABASE_URL);
const user = decodeURIComponent(url.username);
const pass = decodeURIComponent(url.password);
const db = url.pathname.replace(/^\//, '');

const sock = net.connect(Number(url.port || 5432), url.hostname, () => {
  // SSLRequest
  const ssl = Buffer.alloc(8);
  ssl.writeInt32BE(8, 0);
  ssl.writeInt32BE(80877103, 4);
  sock.write(ssl);
});
sock.on('data', (buf) => {
  const c = buf.toString('latin1', 0, 1);
  if (c === 'S') {
    const tsock = tls.connect({ socket: sock, rejectUnauthorized: false }, () => {
      // StartupMessage
      const param = `user\0${user}\0database\0${db}\0\0`;
      const body = Buffer.from(param, 'latin1');
      const msg = Buffer.alloc(8 + body.length);
      msg.writeInt32BE(8 + body.length, 0);
      msg.writeInt32BE(196608, 4);
      body.copy(msg, 8);
      tsock.write(msg);
    });
    tsock.on('data', (b) => {
      console.log('SERVER SAID:', JSON.stringify(b.toString('latin1').slice(0, 400)));
      tsock.destroy();
      process.exit(0);
    });
    tsock.on('error', (e) => { console.log('TLS ERR:', e.message); process.exit(0); });
  } else {
    console.log('SERVER refused SSL, raw:', JSON.stringify(buf.toString('latin1').slice(0, 200)));
    sock.destroy();
    process.exit(0);
  }
});
sock.on('error', (e) => { console.log('SOCK ERR:', e.message); process.exit(0); });
setTimeout(() => { console.log('TIMEOUT no response'); process.exit(0); }, 15000);
