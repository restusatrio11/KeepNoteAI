# KeepNoteAI Desktop — Agen Sync e-Kinerja

Aplikasi desktop (Electron) untuk **mengirim laporan ke portal e-Kinerja/SKP dari IP komputer pegawai**,
bypass blokir Vercel. Web app tetap tidak diubah; desktop membaca laporan dari **database Neon yang sama**
dan menjalankan request `curl` ke portal dari mesin lokal.

## Mengapa ini dibutuhkan
Sync e-Kinerja dari Vercel di-blokir (IP/header). Request harus berasal dari jaringan kantor.
Desktop menjalankan logika `src/lib/portal/http.ts` (berbasis `curl`) di sisi user.

## Cara kerja
1. **Setup (oleh admin/dev, sekali)**: `DATABASE_URL` sudah disematkan lewat file `.env`
   (sama dengan web) → **end-user TIDAK perlu mengisi Database URL**, cukup login seperti di web.
   User hanya mengisi kredensial e-Kinerja (URL, Cookie, X-Auth, SKP ID) + pengaturan auto-sync.
   Kredensial disimpan lokal di `userData/config.json` (per-user, di komputer masing-masing).
2. **Login**: email+password diverifikasi via bcrypt ke tabel `users` (tanpa captcha).
3. **Muat laporan**: query ke tabel `laporan` + `master_rencana` (nama, kode, `portal_rkid`).
4. **Sync**: per laporan, `rkid` di-resolve (pakai `portal_rkid` dari web, atau cocok nama via API portal),
   lalu `POST /api/v1/kegiatan` dijalankan dari IP lokal.
5. **Auto-sync & Tray**: jendela bisa ditutup → app tetap jalan di system tray. Atur interval
   "Auto-sync tiap (menit)" di Pengaturan; desktop akan otomatis mengirim laporan ke portal secara berkala
   dari IP lokal (aman dijalankan berulang berkat deteksi duplikat). Opsi rentang:
   - "Rentang auto-sync (hari ke belakang)" — default 7 hari.
   - "Batasi auto-sync ke laporan hari ini saja" — hanya sync laporan tanggal hari ini.
   Tiap siklus memunculkan **notifikasi** ringkasan (terkirim/duplikat/gagal).
   Tombol **Sync Semua** di UI mengikuti filter tanggal yang sedang aktif dan melewati laporan yang sudah terkirim.
6. **Status persisten**: hasil sync disimpan di tabel `desktop_sync_status` (terpisah, tidak mengubah web).
   Badge "Terkirim/Duplikat/Gagal" tetap muncul setelah app ditutup & dibuka lagi. Test Koneksi portal
   juga memunculkan notifikasi.

## Keamanan
- `AUTH_SECRET` **tidak** dibutuhkan/di-shipping ke desktop. Kredensial portal cukup diisi lokal (seperti di Settings web).
- `DATABASE_URL` disematkan lewat `.env` oleh admin/dev — tidak diketik ulang oleh end-user.
- File `config.json` hanya berisi kredensial e-Kinerja & sesi portal milik user sendiri → simpan di komputer pribadi.

## Cara pakai (dev)
```bash
cd desktop
cp .env.example .env      # isi DATABASE_URL (sama dengan web)
npm install
npm start
```
Di aplikasi: ⚙ Pengaturan → isi kredensial e-Kinerja + interval & rentang auto-sync → Simpan → Login → tutup jendela (jalan di tray).

**Distribusi ke pegawai**: salin folder `dist/KeepNoteAI-Desktop-win32-x64/` **beserta file `.env`** (berisi `DATABASE_URL`)
ke komputer pegawai. Pegawai cukup login dan mengisi kredensial e-Kinerja sendiri — tanpa sentuh Database URL sama sekali.

## Pengembangan
```bash
cd desktop
npm install
npm start
```

## Build (distribusi)
Gunakan `electron-packager` (hindari `electron-builder` yang gagal mengekstrak
`winCodeSign` di Windows tanpa privilege symlink):
```bash
npm install --save-dev electron-packager
npm run pack
```
Hasil: `dist/KeepNoteAI-Desktop-win32-x64/KeepNoteAI-Desktop.exe` (portable, tinggal salin ke pegawai).
Pastikan `icon.png` ada (sudah disediakan) untuk ikon aplikasi.

## Pemetaan Rencana → Portal
Agar `rkid` otomatis terisi, petakan Rencana Kinerja di **web** (Settings → Integrasi e-Kinerja → pilih Rencana Kinerja portal).
Nilai `portal_rkid` tsb. otomatis terbaca oleh desktop. Jika belum dipetakan, desktop akan cocokkan berdasarkan nama rencana.

## Catatan duplikat
Portal membalas "sudah ada" untuk laporan yang sama → desktop menandai `Duplikat` dan dilewati (aman dijalankan berulang).
