# Dokumentasi Workflow Sistem KeepNoteAI (KipApp)

> Dokumen ini menjelaskan **seluruh alur penggunaan sistem KeepNoteAI** dari semua sisi:
> instalasi, konfigurasi, multi-user (isolasi data), web app, bot Telegram, hingga integrasi portal e-Kinerja/SKP.
> Ditujukan untuk developer, admin, dan end-user (pegawai).

---

## 1. Ikhtisar Sistem

**KeepNoteAI** adalah aplikasi pencatat laporan harian (e-Kinerja/SKP) berbasis web yang membantu pegawai:
- Mencatat **Laporan Harian** (kegiatan + capaian) dengan bantuan AI.
- Mengelola **Rencana Kinerja** (Program, Tim Kerja) dan memetakan ke portal e-Kinerja.
- Membuat **Notulen Rapat** otomatis dari teks/audio dan menggabungkannya menjadi PDF.
- Merencanakan hari (**Daily Planning**) dengan pengingat.
- Menganalisis produktivitas (**Health/Analytics**) via AI.
- Mengekspor laporan ke **Excel**.
- Mengunggah **bukti dukung** ke **Google Drive pribadi masing-masing user**.
- Mengirim laporan lewat **Bot Telegram/WhatsApp** → otomatis masuk ke akun user sendiri.
- **Menyinkronkan** laporan & rencana ke **portal e-Kinerja/SKP** (kipapp.bps.go.id) via REST API.

Sistem bersifat **multi-user (multi-tenant)**: setiap user hanya bisa melihat dan mengubah data miliknya sendiri.

---

## 2. Arsitektur & Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16.2.2 (App Router, React 19) |
| Bahasa | TypeScript |
| Auth | NextAuth v5 (Credentials: email + password, bcrypt) |
| Database | PostgreSQL (Neon Serverless) via Drizzle ORM |
| AI | OpenRouter API (model default `openai/gpt-oss-120b:free`) |
| File/Storage | Google Drive API v3 (OAuth per-user) |
| Bot | Telegram Bot API (webhook) |
| Portal | REST API e-Kinerja/SKP (Cookie + X-Auth JWT) |
| Export | ExcelJS, PDF-Lib, DOCX, JSPDF |

### Struktur Direktori Inti
```
src/
  app/
    (halaman)  /, /login, /register, /laporan, /rencana, /notulen, /settings
    api/
      laporan/            # CRUD laporan (scope userId)
      rencana/            # CRUD rencana kerja
      tim/                # CRUD tim kerja
      notulen/            # notulen + generate + merge PDF
      planning/           # daily planning
      reports/export/     # export Excel
      ai/                 # generate, review, analyze-image, analyze-health, plans-to-draft
      telegram/           # webhook + link
      drive/              # auth, callback, disconnect (OAuth per-user)
      portal/             # sync, test, rencana-sync
      dev/migrate/        # migrasi DB (HANYA dev, hapus di produksi)
  lib/
    ai.ts                # wrapper OpenRouter
    drive.ts             # Google Drive client per-user
    portal/              # connector, http, crypto, rencanaSync
    pdf-generator.ts
  db/  schema.ts, index.ts
```

---

## 3. Prasyarat & Environment Variables

Buat file `.env` (atau `.env.local`) di root dengan variabel berikut:

| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `DATABASE_URL` | ✅ | Connection string Neon Postgres (`postgresql://user:pass@host/db`) |
| `AUTH_SECRET` | ✅ | Secret acak (mis. `openssl rand -base64 32`). Dipakai untuk session NextAuth **dan** enkripsi AES-256-GCM (portal & token Drive) |
| `OPENROUTER_API_KEY` | ✅ | API key OpenRouter untuk fitur AI |
| `AI_MODEL` | ⚠️ | Opsional. Default `openai/gpt-oss-120b:free`. (Upload bukti pakai `qwen/qwen-plus`, audio notulen pakai `google/gemini-2.0-flash-lite`) |
| `GOOGLE_CLIENT_ID` | ✅* | OAuth client ID Google (untuk Drive per-user) |
| `GOOGLE_CLIENT_SECRET` | ✅* | OAuth client secret Google |
| `GOOGLE_REDIRECT_URI` | ✅* | `https://<domain>/api/drive/callback` (di dev: `http://localhost:3000/api/drive/callback`) |
| `TELEGRAM_BOT_TOKEN` | ✅** | Token bot dari @BotFather |
| `TELEGRAM_BOT_USERNAME` | ⚠️ | Username bot (default `KipappAIbot`) untuk tampilan di Settings |
| `NEXTAUTH_URL` | ⚠️ | URL publik aplikasi (dipakai generate PDF notulen) |
| `NEXT_PUBLIC_SITE_URL` | ⚠️ | URL situs (default `http://localhost:3000`) |

\* Wajib jika fitur Google Drive digunakan.
\** Wajib jika fitur Bot Telegram digunakan.

---

## 4. Instalasi & Setup

### 4.1 Local Development
```bash
npm install
cp .env.example .env   # atau buat .env manual (lihat section 3)
npm run dev            # http://localhost:3000
```

### 4.2 Migrasi Database
Ada dua mekanisme:

**A. Drizzle Push (direkomendasikan untuk skema baru)**
```bash
npm run db:push
```

**B. Route migrasi bawaan (menambah kolom & tabel tambahan)**
Route `GET/POST /api/dev/migrate` menjalankan `ALTER TABLE` (menambah kolom Drive per-user, tabel `portal_iki`, dsb).
- Hanya aktif di `NODE_ENV !== 'production'`.
- Cara pakai: buka `http://localhost:3000/api/dev/migrate` di browser → respons `{"ok":true}`.
- **PENTING (Produksi):** Hapus file `src/app/api/dev/migrate/route.ts` setelah migrasi, karena route ini tanpa autentikasi.

### 4.3 Build & Production
```bash
npm run build
npm run start
```
> Catatan: `next.config.ts` mengatur `ignoreDuringBuilds` & `ignoreBuildErrors = true` agar build tidak gagal karena lint/type error.

---

## 5. Konfigurasi Eksternal

### 5.1 Google Cloud (Drive per-user)
1. Buka [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → OAuth consent screen**.
2. Pilih *External*, isi nama app, email, lalu **Publish** atau tambahkan **Test users** (email pegawai yang diizinkan).
3. **Credentials → Create Credentials → OAuth client ID** → tipe **Web application**.
4. Tambahkan **Authorized redirect URI**: `https://<domain-anda>/api/drive/callback`.
5. Salin **Client ID** & **Client Secret** ke `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`).
6. Aktifkan **Google Drive API**.

### 5.2 Bot Telegram
1. Chat `@BotFather` → `/newbot` → dapatkan **token** → masukkan ke `TELEGRAM_BOT_TOKEN`.
2. Set webhook agar pesan mengalir ke aplikasi:
   ```bash
   curl -F "url=https://<domain-anda>/api/telegram/webhook" \
        https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
   ```
   (Cek dengan `.../getWebhookInfo`.)
3. Username bot (mis. `@KipappAIbot`) dicantumkan otomatis di halaman Settings.

### 5.3 Portal e-Kinerja/SKP (BPS)
Tidak perlu konfigurasi server. Setiap **user mengisi kredensialnya sendiri** di halaman Settings (lihat Section 8.3).

---

## 6. Model Multi-Tenant & Keamanan

Sistem menjamin **isolasi data per-user**:

- **Auth**: NextAuth Credentials (email+password, bcrypt). `session.user.id` adalah ID user login.
- **Setiap query data** (`laporan`, `rencana`, `tim`, `notulen`, `planning`, `reports/export`, `ai/generate`) difilter `WHERE userId = session.user.id`.
- **Route `[id]` (update/delete)** menggunakan `WHERE id = ? AND userId = ?` → user tidak bisa mengubah data user lain.
- **Bot Telegram**: mapping 1:1 `chatId ↔ users.telegramChatId` (lewat perintah `/link`). Kiriman bot otomatis menjadi `laporan.userId = pemilik chat`.
- **Google Drive**: setiap user menghubungkan **akun Drive sendiri** via OAuth. Token disimpan terenkripsi (AES-256-GCM) di `user_settings`. File bukti hanya ada di Drive user yang bersangkutan (tidak lagi akun bersama / public link).
- **Portal e-Kinerja**: Cookie + X-Auth JWT disimpan terenkripsi per-user di `portal_credentials`.
- **Enkripsi**: `src/lib/portal/crypto.ts` — AES-256-GCM dengan key turunan `AUTH_SECRET` + pepper.

### Celah yang sudah ditutup
- `notulen/merge` & `ai/analyze-image` sebelumnya membaca data by `id` tanpa cek `userId` (IDOR). Sekarang sudah ditambahkan filter `userId`.

### Catatan Produksi
- Hapus `src/app/api/dev/migrate/route.ts`.
- Pastikan `AUTH_SECRET` kuat & tidak tersebar.
- Bukti lama yang sempat terunggah ke akun Drive bersama (sebelum fitur per-user) tetap ber-link di laporan historis; upload baru masuk ke Drive masing-masing user.

---

## 7. Alur Pengguna — Web App

### 7.1 Registrasi & Login
- `/register`: buat akun (nama, email, password).
- `/login`: masuk dengan email + password.
- Semua halaman di bawah memerlukan sesi aktif.

### 7.2 Rencana Kinerja (`/rencana`)
1. **Buat Tim Kerja** (Tim): nama + keterangan.
2. **Buat Program/Rencana Kinerja**: kode, nama, pilihan Tim, dan IKI.
3. **Sync dari Portal** (tombol di halaman): menarik data dari e-Kinerja:
   - Tim (`namatim`) → tabel `tim_kerja`
   - Program (`rencanakinerja`) → tabel `master_rencana` (terikat tim)
   - IKI (`/api/v1/skp/iki?rencanakinerjaid=<rkid>`) → tabel `portal_iki`
4. **Peta Rencana → Portal** (di Settings): pilih `rkid` portal untuk tiap rencana agar saat sinkron laporan, `rkid` otomatis terisi.

### 7.3 Laporan Harian (`/laporan`)
Form laporan berisi:
- Tanggal mulai & selesai, jam mulai & selesai
- Rencana Kinerja (dropdown, milik user sendiri)
- Kegiatan, Progress (%), Capaian
- Bukti Dukung (upload ke Google Drive user)
- Masukan SKP

Fitur:
- **AI Generate**: ketik deskripsi kasual → AI merapikan jadi bahasa formal (memakai "memory" 3 laporan terakhir user).
- **Upload Bukti**: file diupload ke Drive pribadi user, link disimpan di `buktiUrls`.
- **Sync ke Portal** (modal): memilih laporan → dikirim ke e-Kinerja (`POST /api/v1/kegiatan`) dengan `rkid` yang diresolve otomatis, `iscapaianskp = 1`. Duplikat terdeteksi & dilewati (status `dup`).

### 7.4 Notulen Rapat (`/notulen`)
- **Buat/Edit**: judul, tanggal, waktu, tempat, pemimpin, topik, notulis, peserta, konten, URL undangan, daftar hadir, dokumentasi.
- **Generate AI**: dari teks/transkrip atau audio → struktur `judul, kesimpulan, pembahasan[], insights[]`.
- **Merge PDF**: menggabungkan Undangan + Notulen + Daftar Hadir menjadi 1 PDF (file diambil dari Drive user sendiri).

### 7.5 Daily Planning (`/planning`)
- Catatan harian dengan warna, waktu pengingat (`reminderTime`), dan status `isDone`.
- CRUD terikat `userId`.

### 7.6 Analytics / Health (`/`)
- Ringkasan laporan + skor kesehatan kerja dari AI (`analyzeHealth`).
- AI Review laporan (`/api/ai/review`) untuk menilai kualitas laporan.

### 7.7 Export Laporan (`/api/reports/export`)
- Unduh Excel berisi seluruh laporan user (filter tanggal/rencana/search) → hanya data `userId` yang login.

### 7.8 Pengaturan (`/settings`)
Tiga bagian integrasi:
1. **Google Drive** — tombol *Hubungkan Google Drive* (OAuth) / *Putuskan*.
2. **Telegram** — generate kode `/link` & status koneksi.
3. **e-Kinerja/SKP** — input URL portal, Cookie, X-Auth, SKP ID, Test Koneksi, dan Peta Rencana.

---

## 8. Alur Pengguna — Bot Telegram

Bot bekerja **1 Telegram = 1 akun KeepNoteAI** (mapping via `/link`). Semua kiriman otomatis menjadi laporan milik user yang mem-link.

### 8.1 Menghubungkan (sekali saja per user)
1. User login web → **Settings → Telegram → Generate Kode**.
   - Server membuat kode acak 6 huruf (berlaku 5 menit) terikat ke akun user.
2. Buka Telegram, chat bot `@KipappAIbot`, kirim:
   ```
   /link KODE
   ```
3. Bot memverifikasi kode → menyimpan `telegramChatId` ke user tersebut. **Selesai.** Chat ini sekarang "milik" akun user itu.

### 8.2 Daftar Perintah
| Perintah | Fungsi |
|----------|--------|
| `/start` | Cek apakah sudah terhubung; beri instruksi jika belum |
| `/link KODE` | Menautkan chat ke akun (dari kode di Settings) |
| `/rk` | Lihat daftar Rencana Kinerja milik user |
| `/rk KODE` | Pilih RK aktif (laporan selanjutnya otomatis ke RK ini) |
| `/status` | Cek koneksi & RK aktif |
| `/unlink` | Putuskan koneksi Telegram |
| `/help` | Bantuan perintah |

### 8.3 Mengirim Laporan
- **Foto/Dokumen** → bot unduh, upload ke **Drive user**, lalu AI buat `kegiatan` + `capaian` (dari caption atau isi gambar), cocokkan ke RK (pakai `/rk` aktif atau AI match), lalu simpan `laporan` ke akun user.
- **Teks** → AI rapikan jadi laporan formal, cocokkan RK, simpan.
- Balasan bot berisi ringkasan laporan & link web.

> User yang **belum** `/link` diabaikan (tidak membuat data). Antar user tidak saling melihat karena semua route `laporan` difilter `userId`.

---

## 9. Alur Pengguna — Integrasi Portal e-Kinerja/SKP

### 9.1 Mengisi Kredensial (per-user, di Settings)
1. Buka portal e-Kinerja di browser, buka **DevTools → Network** saat halaman/isi form dimuat.
2. Salin header:
   - **Cookie** (nilai lengkap, mis. `PHPSESSID=...; ...`)
   - **X-Auth** (`Bearer eyJ...` — JWT, berlaku ~24 jam)
3. Di Settings → e-Kinerja/SKP:
   - **URL Portal** (mis. `https://kipapp.bps.go.id`)
   - **Cookie Sesi**, **X-Auth (JWT)**, **SKP ID** (mis. `1344761`)
4. Klik **Simpan** (terenkripsi) lalu **Test Koneksi**.

> JWT kedaluwarsa ~24 jam → jika sync gagal, salin ulang X-Auth.

### 9.2 Memetakan Rencana ke Portal
- Klik **Muat Daftar dari Portal** → menarik daftar rencana (`/api/v1/skp/rk`) ke dropdown.
- Untuk tiap Rencana Kinerja di aplikasi, pilih Rencana Kinerja portal yang cocok → `portalRkid` tersimpan.

### 9.3 Sync Laporan ke Portal
- Di `/laporan` → **Sync ke Portal** → pilih laporan → dikirim `POST /api/v1/kegiatan`.
- `rkid` diresolve dari `portalRkid` atau nama; `iscapaianskp = 1`.
- Duplikat (respon portal mengandung kata *sudah ada/duplicate/duplikat*) ditandai `dup` & dilewati.

### 9.4 Sync Rencana dari Portal
- Di `/rencana` → **Sync dari Portal** → mengisi Tim, Program, dan IKI dari portal ke database user.

---

## 10. Ringkasan Endpoint API

| Method & Path | Fungsi | Scope |
|---------------|--------|-------|
| `GET/POST /api/laporan` | list/buat laporan | `userId` |
| `GET/PATCH/DELETE /api/laporan/[id]` | detail/edit/hapus | `userId` |
| `GET/POST /api/rencana` | list/buat rencana (+ `ikiList`) | `userId` |
| `PUT/DELETE /api/rencana/[id]` | edit/hapus rencana | `userId` |
| `GET/POST /api/tim` | tim kerja | `userId` |
| `PUT/DELETE /api/tim/[id]` | edit/hapus tim | `userId` |
| `GET/POST /api/notulen` | notulen | `userId` |
| `GET/PATCH/DELETE /api/notulen/[id]` | detail/edit/hapus | `userId` |
| `POST /api/notulen/generate` | AI buat notulen | auth |
| `POST /api/notulen/merge` | gabung PDF (Drive user) | `userId` |
| `GET/POST /api/planning` | planning | `userId` |
| `PATCH/DELETE /api/planning/[id]` | edit/hapus planning | `userId` |
| `GET /api/reports/export` | export Excel | `userId` |
| `POST /api/ai/generate` | AI generate laporan | `userId` |
| `POST /api/ai/review` | AI review laporan | auth |
| `POST /api/ai/analyze-image` | AI analisis gambar/doc | `userId` (rencana milik sendiri) |
| `POST /api/ai/analyze-health` | AI health score | auth |
| `POST /api/ai/plans-to-draft` | AI planning→draft | auth |
| `POST /api/upload/drive` | upload bukti ke Drive user | `userId` |
| `GET /api/drive/auth` | OAuth Drive consent | `userId` |
| `GET /api/drive/callback` | OAuth callback (simpan token) | `userId` |
| `POST /api/drive/disconnect` | putus Drive | `userId` |
| `GET /api/telegram/link` | generate kode `/link` | `userId` |
| `DELETE /api/telegram/link` | unlink | `userId` |
| `POST /api/telegram/webhook` | terima pesan bot | `chatId→user` |
| `POST /api/portal/sync` | kirim laporan ke portal | `userId` |
| `POST /api/portal/test` | test koneksi portal | `userId` |
| `POST /api/portal/rencana-sync` | tarik tim/program/IKI | `userId` |
| `GET/POST /api/dev/migrate` | migrasi DB (dev only) | ⚠️ tanpa auth |

---

## 11. Troubleshooting

| Gejala | Penyebab & Solusi |
|--------|-------------------|
| Build gagal / DB error | Cek `DATABASE_URL` aktif (Neon sering suspend → resume di dashboard). |
| AI tidak jalan | Cek `OPENROUTER_API_KEY` valid & kuota. Cek log `OpenRouter API Error`. |
| Sync portal gagal | X-Auth JWT expired (~24j) → salin ulang dari DevTools. Pastikan SKP ID & Cookie benar. |
| Portal balas halaman HTML bukan JSON | Header salah (terlalu banyak header memicu Apache mod_negotiation). Pastikan hanya header yang diperlukan (sudah ditangani di `buildPortalHeaders`). |
| Drive "belum dihubungkan" | User belum OAuth: klik *Hubungkan Google Drive* di Settings. Pastikan `GOOGLE_REDIRECT_URI` & OAuth consent sudah benar. |
| Bot tidak merespons | Webhook belum diset atau `TELEGRAM_BOT_TOKEN` salah. Set ulang via `setWebhook`. |
| Kiriman bot masuk ke user salah | Pastikan tiap orang `/link` dari akun KeepNoteAI masing-masing (1 Telegram = 1 akun). |
| Laporan user A bisa dilihat user B | Tidak seharusnya terjadi (sudah diisolasi). Pastikan route `dev/migrate` sudah dihapus & build terbaru sudah di-deploy. |

---

## 12. Checklist Deployment Produksi

- [ ] `DATABASE_URL`, `AUTH_SECRET`, `OPENROUTER_API_KEY` terisi.
- [ ] `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` & OAuth consent sudah dikonfigurasi (jika pakai Drive).
- [ ] `TELEGRAM_BOT_TOKEN` & webhook sudah diset (jika pakai bot).
- [ ] `NEXTAUTH_URL` = domain produksi.
- [ ] Jalankan migrasi DB (`db:push` / `/api/dev/migrate`).
- [ ] **Hapus** `src/app/api/dev/migrate/route.ts`.
- [ ] `npm run build && npm run start`.
- [ ] Uji: registrasi 2 user, masing-masing link Drive & Telegram, buat laporan, pastikan tidak saling terlihat.

---

*Dokumen ini mencakup seluruh sisi sistem: developer (setup/arsitektur), admin (konfigurasi eksternal), dan end-user (web, bot, portal).*
