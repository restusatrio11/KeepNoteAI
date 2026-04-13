/**
 * SCRIPT BANTU UNTUK MENDAPATKAN GOOGLE REFRESH TOKEN
 * 
 * Cara Penggunaan:
 * 1. Pastikan GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET sudah ada di file .env
 * 2. Jalankan perintah: node src/scripts/get-refresh-token.js
 * 3. Buka link yang muncul di browser, login, dan ikuti instruksi terminal.
 */

const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Fungsi pembantu untuk membaca .env secara manual jika tidak ada dotenv
function getEnv(key) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith(`${key}=`)) {
        return line.split('=')[1].trim().replace(/['"]/g, '');
      }
    }
  } catch (e) {
    return null;
  }
}

async function start() {
  const CLIENT_ID = getEnv('GOOGLE_CLIENT_ID');
  const CLIENT_SECRET = getEnv('GOOGLE_CLIENT_SECRET');
  const REDIRECT_URI = 'http://localhost:3000'; // Harus sama dengan yang di Google Console

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Error: GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET tidak ditemukan di file .env');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent' // Sangat penting untuk memaksa pengeluaran refresh_token
  });

  console.log('\n🚀 LANGKAH 1: Buka link di bawah ini di browser Anda:');
  console.log('----------------------------------------------------');
  console.log(authUrl);
  console.log('----------------------------------------------------\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('🚀 LANGKAH 2: Masukkan kode yang muncul di URL browser setelah Anda login (biasanya setelah ?code=...): ', async (code) => {
    rl.close();
    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log('\n✅ BERHASIL MENDAPATKAN TOKEN!');
      console.log('\n--- SALIN TANDA DI BAWAH INI KE .env ---');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('----------------------------------------\n');
      console.log('PENTING: Masukkan token tersebut ke file .env Anda.');
    } catch (error) {
      console.error('❌ Gagal mendapatkan token:', error.message);
    }
  });
}

start();
