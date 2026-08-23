const base = 'https://kipapp.bps.go.id';

async function probe(path, headers = {}) {
  try {
    const res = await fetch(base + path, { headers });
    const text = await res.text();
    const ctype = res.headers.get('content-type') || '';
    console.log(`\n=== ${path} (auth:${Object.keys(headers).length ? 'yes' : 'no'}) => ${res.status} ctype=${ctype.slice(0, 30)} (${text.length}b) ===`);
    console.log(text.slice(0, 220).replace(/\n/g, ' '));
  } catch (e) {
    console.log(`ERR ${path}:`, e.message);
  }
}

await probe('/api/v1/tahun?jenis=2');
await probe('/api/v1/skp/rk?skpid=1344761&direct=1');
