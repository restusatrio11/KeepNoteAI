import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, 'test-portal-api.mjs'), 'utf8');
const grab = (n) => src.match(new RegExp('const ' + n + ' = `([\\s\\S]*?)`;'))[1];
const xAuth = grab('xAuth');
const cookie = `f5avraaaaaaaaaaaaaaaa_session_=NIBBJKBEDOPDAJJAAJLIHEAIIJNIILKDEENMCPIMEHIDBGIEALGIOCGLLDKKJCENBHHDBMAFLFJMNDIODAEADEAOCEDFMBOIDHEENDAMCJCDBDHMLILEPLHIPNKMGLGL; f5avraaaaaaaaaaaaaaaa_session_=KNCNAFEHIGMBPJCEHCIGBLKMDHNCKLCKAEJNIPIKGEPCFOOHMAJKEEHJIAIKMGIFGGADILDMHAPDOFLFCFHADONNIEPDNIFGOIFLILIFPDGNHAMHFHJEODEABOEDPPGB; cf_clearance=wiW7Yqq0hfDLMEBx5zzKA9z.vhhuiYt3gLSWLIfUwCc-1784618065-1.2.1.1-Dblv2oRKZGvyXaa2k_hfk_MInNcp_Y0GBaImsWnz7Mf9QsSqnciExW_nrTUvwoAuoznhnYqqqI3U0ZW5NIzkHRz7tvx15r1M5O2NSKIWarkJGHqNnQe_wRTBb.CUDxJ3mdWTzUJMzcfPGVxiz6.2Gt6Iy65C33u1Inilr4EcPR4urolELonTjNOEo_iAsvKbMQ1US40WNflaC5PXeuz7xhuu80xmopSIx8CvQEEp1ZqWkY_xqrgdk6btVDvx.D6AT_MKZxY90r_5lZz2jCrdRoO3xiBk8Fzz76j_udhC2SGOGSnjo8ooflkUWp22uOVzswEVJvWirJjMgV8.VexwgQ; _ga_XXTTVXWHDB=GS2.3.s1784618063$o1$g0$t1784618063$j60$l0$h0; _ga=GA1.1.470900734.1784618063; _ga_BQWDJS3EJW=GS2.1.s1786264416$o2$g0$t1786264416$j60$l0$h0; bps-secret=!eaz9CTwLWDCE2DsxztsE2m6BI6xKkSS6x0Wy8waU4/o5GMes6rDHYvLFMJxsVMoG84q/LW3VzTXMs4o=; twk_idm_key=asHOp_ZwmpJ-knapi0uEh; f5avraaaaaaaaaaaaaaaa_session_=DEKGMEDNDGPOAPCJGKGDJKHMKNGKLPGAGFKFJPONHIFACGHFIABJNILNCDCOIHHNLPEDBGNCNOMFCHHGENFADDOLLDIPGMEDJLNLEABDEHIFMDCLAIDBBMCLBHMEFHOH; TawkConnectionTime=0; TS0151fc2b=0167a1c8610e0ec40b2bf31d8ed446b1df20f3d57339c371941a3a2849572c38c38b8a0bbd214513c3fb19dc39a84a57f82aaee941`;

const base = 'https://kipapp.bps.go.id';
const auth = { Cookie: cookie, 'X-Auth': xAuth, Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' };

const p = '/api/v1/skp/rk?skpid=1344761&direct=1';
try {
  const res = await fetch(base + p, { headers: auth });
  const text = await res.text();
  console.log(`=== ${p} => ${res.status} (${text.length}b) ===`);
  console.log(text.slice(0, 600).replace(/\n/g, ' '));
} catch (e) {
  console.log('ERR', e.message);
}
