import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, 'test-portal-api.mjs'), 'utf8');
const grab = (n) => src.match(new RegExp('const ' + n + ' = `([\\s\\S]*?)`;'))[1];
const xAuth = grab('xAuth');

const cookie = `f5avraaaaaaaaaaaaaaaa_session_=NIBBJKBEDOPDAJJAAJLIHEAIIJNIILKDEENMCPIMEHIDBGIEALGIOCGLLDKKJCENBHHDBMAFLFJMNDIODAEADEAOCEDFMBOIDHEENDAMCJCDBDHMLILEPLHIPNKMGLGL; f5avraaaaaaaaaaaaaaaa_session_=KNCNAFEHIGMBPJCEHCIGBLKMDHNCKLCKAEJNIPIKGEPCFOOHMAJKEEHJIAIKMGIFGGADILDMHAPDOFLFCFHADONNIEPDNIFGOIFLILIFPDGNHAMHFHJEODEABOEDPPGB; cf_clearance=wiW7Yqq0hfDLMEBx5zzKA9z.vhhuiYt3gLSWLIfUwCc-1784618065-1.2.1.1-Dblv2oRKZGvyXaa2k_hfk_MInNcp_Y0GBaImsWnz7Mf9QsSqnciExW_nrTUvwoAuoznhnYqqqI3U0ZW5NIzkHRz7tvx15r1M5O2NSKIWarkJGHqNnQe_wRTBb.CUDxJ3mdWTzUJMzcfPGVxiz6.2Gt6Iy65C33u1Inilr4EcPR4urolELonTjNOEo_iAsvKbMQ1US40WNflaC5PXeuz7xhuu80xmopSIx8CvQEEp1ZqWkY_xqrgdk6btVDvx.D6AT_MKZxY90r_5lZz2jCrdRoO3xiBk8Fzz76j_udhC2SGOGSnjo8ooflkUWp22uOVzswEVJvWirJjMgV8.VexwgQ; _ga_XXTTVXWHDB=GS2.3.s1784618063$o1$g0$t1784618063$j60$l0$h0; _ga=GA1.1.470900734.1784618063; _ga_BQWDJS3EJW=GS2.1.s1786264416$o2$g0$t1786264416$j60$l0$h0; bps-secret=!eaz9CTwLWDCE2DsxztsE2m6BI6xKkSS6x0Wy8waU4/o5GMes6rDHYvLFMJxsVMoG84q/LW3VzTXMs4o=; twk_idm_key=asHOp_ZwmpJ-knapi0uEh; f5avraaaaaaaaaaaaaaaa_session_=DEKGMEDNDGPOAPCJGKGDJKHMKNGKLPGAGFKFJPONHIFACGHFIABJNILNCDCOIHHNLPEDBGNCNOMFCHHGENFADDOLLDIPGMEDJLNLEABDEHIFMDCLAIDBBMCLBHMEFHOH; TawkConnectionTime=0; TS0151fc2b=0167a1c8619dfe666965b6de3698c1148f51fcdaee713eb53c019a264398eeb4d3c22525dc731763c076c29ba60aef08eb04cef948`;

const base = 'https://kipapp.bps.go.id';
const auth = { Cookie: cookie, 'X-Auth': xAuth, Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' };

const candidates = [
  '/api/v1/skp/iki',
  '/api/v1/skp/iki?skpid=1344761',
  '/api/v1/skp/iki?rencanakinerjaid=14310430',
  '/api/v1/skp/iki?rencanakinerjaid=14310431',
  '/api/v1/skp?tahun=8',
  '/api/v1/skp?jenis=2',
  '/api/v1/skp/list?unit=42',
  '/api/v1/skp/list?unitkerja=42&tahun=8',
];

for (const p of candidates) {
  try {
    const res = await fetch(base + p, { headers: auth });
    const text = await res.text();
    console.log(`\n=== ${p} => ${res.status} (${text.length}b) ===`);
    console.log(text.slice(0, 400).replace(/\n/g, ' '));
  } catch (e) {
    console.log(`\n=== ${p} => ERR ${e.message}`);
  }
}
