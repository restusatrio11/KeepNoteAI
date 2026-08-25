<div align="center">

# 📝 KeepNoteAI

**Sistem Pelaporan Pekerjaan Berbasis AI dengan Sinkronisasi Otomatis ke Portal e-Kinerja/SKP BPS**

Ubah input sederhana (foto + deskripsi singkat) menjadi laporan profesional terstruktur — lalu kirim langsung ke portal e-Kinerja dari web maupun aplikasi desktop.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)](https://www.electronjs.org)

</div>

---

## 📑 Daftar Isi

- [Tentang Proyek](#1--tentang-proyek)
- [Screenshot & Demo](#2-️-screenshot--demo)
- [Fitur](#3--fitur)
- [Tech Stack](#4-️-tech-stack)
- [Getting Started](#5--getting-started)
- [Cara Menggunakan](#6--cara-menggunakan)
- [Struktur Repository](#7--struktur-repository)
- [API Documentation](#8--api-documentation)
- [Aplikasi Desktop](#9-️-aplikasi-desktop)
- [Contributing](#10--contributing)
- [Roadmap](#11-️-roadmap)
- [License](#12--license)
- [Contact](#13--contact)
- [Acknowledgments](#14--acknowledgments)

---

## 1. 🚀 Tentang Proyek

**KeepNoteAI** adalah sistem pelaporan pekerjaan harian untuk pegawai BPS yang menyelesaikan tiga masalah utama pelaporan manual:

| ❌ Masalah | ✅ Solusi KeepNoteAI |
|---|---|
| Deskripsi laporan tidak konsisten & tidak profesional | AI menyusun draft laporan profesional dari foto + poin singkat |
| Input ganda: tulis di catatan pribadi → ketik ulang di portal e-Kinerja | **Sinkronisasi otomatis** ke portal e-Kinerja/SKP (`kipapp.bps.go.id`) via API |
| Portal e-Kinerja memblokir IP cloud (Vercel) | **Aplikasi Desktop (Electron)** yang mengirim laporan dari IP kantor masing-masing pegawai |

Aplikasi tersedia dalam dua bentuk:

1. **🌐 Web App** — manajemen laporan, rencana kerja, notulen rapat, kalender, integrasi Google Drive & Telegram.
2. **🖥️ Desktop App** — agen auto-sync ringan yang berjalan di tray Windows, mengirim laporan ke e-Kinerja otomatis dari jaringan kantor.

---

## 2. 🖼️ Screenshot & Demo

> 📸 *Tempatkan screenshot di folder `docs/screenshots/` lalu daftarkan di tabel ini.*

| Halaman | Screenshot |
|---|---|
| Login (animasi pixel-walking background) | ![Login](docs/screenshots/login.png) |
| Dashboard Laporan + Modal Sync | ![Laporan](docs/screenshots/laporan.png) |
| Pengaturan — Integrasi e-Kinerja (paste curl otomatis) | ![Settings](docs/screenshots/settings.png) |
| Aplikasi Desktop (tray + auto-sync) | ![Desktop](docs/screenshots/desktop.png) |

🌍 **Live demo:** https://keep-note-ai.vercel.app

---

## 3. ✨ Fitur

### 🔐 Autentikasi & Keamanan
- Register & login dengan captcha internal.
- Session NextAuth v5 (JWT), password di-hash bcrypt.
- Kredensial portal e-Kinerja dienkripsi per-user (AES-256-GCM).

### 📋 Manajemen Laporan
- Input laporan harian: tanggal, jam, rencana kerja, progress, capaian, bukti (foto/video/dokumen).
- Upload bukti langsung ke **Google Drive pribadi** tiap user.
- Filter tanggal/triwulan/program, pencarian, paginasi, export **Excel**, salin laporan, edit & hapus.

### 🤖 AI (OpenRouter)
- Generate deskripsi laporan profesional dari gambar + teks.
- Analisis kesehatan pekerjaan (*work health score*).
- Review & penyusunan draft dari rencana kerja.

### 🔄 Integrasi e-Kinerja / SKP
- Tempel **curl dari DevTools** → URL Portal, Cookie, X-Auth (JWT), SKP ID **terisi otomatis secara instan** (parser lokal, tanpa AI) + fallback parsing via AI.
- Test koneksi portal langsung dari pengaturan.
- **Peta Rencana Kinerja → Portal** (pencocokan nama mirip atau AI Mapping).
- **Sync master data**: Tim Kerja, Program Kerja & IKI ditarik dari portal ke database.
- Kirim laporan satu-per-satu dengan progress bar, deteksi duplikat, dan log per item.

### 🗓️ Fitur Pendukung
- Kalender laporan harian.
- Notulen rapat (undangan & daftar hadir PDF, merge notulen).
- Daily planning dengan reminder.
- **Bot Telegram**: kirim foto/dokumen/teks → otomatis jadi laporan.

### 🖥️ Aplikasi Desktop (Electron)
- Auto-sync berjalan di tray (interval menit + rentang hari / hari ini saja).
- Bypass blokir IP Vercel — request keluar dari IP kantor pegawai.
- Paste curl → auto-parse kredensial (identik dengan web).
- Sync Program Kerja & Tim Kerja dari portal ke database pusat.
- Deteksi duplikat sebelum kirim + tombol Reset status untuk kirim ulang.
- Progress bar, notifikasi Windows, status persisten di database.

---

## 4. 🛠️ Tech Stack

### Web App
| Kategori | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript 5 |
| Styling | Tailwind CSS 3 · Framer Motion · lucide-react |
| Database | PostgreSQL ([Neon](https://neon.tech)) · Drizzle ORM |
| Auth | NextAuth v5 (Credentials + JWT) · bcryptjs · captcha internal |
| AI | OpenRouter API (vision + text) |
| Storage | Google Drive API (`googleapis`) |
| Bot | Telegram Bot API (`grammy`) |
| Dokumen | exceljs · jspdf (+autotable) · docx · pdf-lib |

### Desktop App
| Kategori | Teknologi |
|---|---|
| Runtime | Electron 33 (vanilla JS, tanpa bundler) |
| Build | electron-packager (Windows x64) |
| DB | `pg` (node-postgres) — koneksi langsung ke Neon |
| Portal | cURL via `child_process` (header identik browser asli) |

### Infrastruktur
- **Hosting web:** Vercel · **Database:** Neon PostgreSQL (serverless)

---

## 5. 🚀 Getting Started

### Prerequisites

| Tool | Versi | Keterangan |
|---|---|---|
| Node.js | ≥ 20 LTS | runtime web & build desktop |
| npm | ≥ 10 | package manager |
| Akun Neon | — | database Postgres gratis |
| Git | — | version control |

### Installation

```bash
# 1. Clone repository
git clone https://github.com/<username>/KeepNoteAI.git
cd KeepNoteAI

# 2. Install dependency web
npm install

# 3. Install dependency desktop (opsional)
cd desktop && npm install && cd ..
```

### Environment Variables

Buat file `.env.local` di root (lihat daftar variabel di bawah):

```bash
cp .env.example .env.local   # jika belum ada, buat manual sesuai tabel
```

| Variabel | Wajib | Deskripsi |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL Neon |
| `AUTH_SECRET` | ✅ | Secret NextAuth (`openssl rand -base64 32`) |
| `CAPTCHA_SECRET` | ✅ | Secret verifikasi captcha login |
| `OPENROUTER_API_KEY` | ✅ | API key OpenRouter untuk fitur AI |
| `NEXTAUTH_URL` | ⚠️ | URL publik situs — di produksi **sebaiknya dikosongkan** (kode memakai `trustHost`) |
| `AI_MODEL` | ➖ | Model default, mis. `google/gemini-flash-1.5` |
| `TELEGRAM_BOT_TOKEN` | ➖ | Token bot dari @BotFather |
| `TELEGRAM_BOT_USERNAME` | ➖ | Username bot tanpa @ (default `KipappAIbot`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ➖ | OAuth Google Drive |
| `GOOGLE_REDIRECT_URI` | ➖ | Default `<site>/api/drive/callback` |
| `NEXT_PUBLIC_SITE_URL` | ➖ | URL publik untuk referer AI |
| `NEXT_PUBLIC_DESKTOP_APP_URL` | ➖ | Link unduh aplikasi desktop (default Google Drive) |

> 🔑 File service-account Google (`*kipappai*.json`) & `.env*` **tidak boleh di-commit** — sudah masuk `.gitignore`.

Untuk desktop, buat `.env` di folder `desktop/` (atau di samping exe hasil build):

```env
DATABASE_URL=postgresql://user:pass@host.neon.tech/neondb?sslmode=require
SITE_URL=https://keep-note-ai.vercel.app
```

### Setup Database

```bash
npm run db:push       # push schema Drizzle ke Neon
npm run db:studio     # (opsional) Drizzle Studio
```

### Run

```bash
# Web app (development)
npm run dev           # http://localhost:3000

# Production build
npm run build && npm start

# Desktop app (development)
cd desktop && npm start

# Desktop app (build exe Windows)
cd desktop && npm run pack    # output: desktop/dist/
```

---

## 6. 📖 Cara Menggunakan

### Alur harian pegawai

```
Foto kegiatan → Web: Tambah Laporan → AI generate deskripsi
→ Laporan tersimpan (+ bukti di Drive) → Sync ke e-Kinerja → Portal kipapp.bps.go.id
```

1. **Daftar & login** di web.
2. **Isi Rencana Kerja** (atau sinkronkan otomatis dari portal).
3. **Tambah Laporan** — unggah foto bukti, isi poin singkat, klik generate AI.
4. **Sync ke e-Kinerja** — tombol di halaman Laporan; laporan dikirim satu per satu dengan log status (✅ terkirim / ℹ️ duplikat / ❌ gagal).
5. *(Rekomendasi)* Pasang **aplikasi desktop** agar sync berjalan otomatis setiap hari dari komputer kantor.

### Menyiapkan kredensial portal (tanpa ribet)

1. Buka portal e-Kinerja → `F12` → tab **Network**.
2. Klik kanan request → **Copy → Copy as cURL**.
3. Di web: **Pengaturan → Integrasi e-Kinerja** → tempel curl → field **langsung terisi otomatis** → **Simpan** → **Test Koneksi**.
4. Di desktop: **⚙ Pengaturan → tempel di sini → Ambil dari Teks** (identik).

> ⚠️ Token `X-Auth` berlaku ±24 jam. Jika sync gagal, tempel ulang curl terbaru.

### Contoh endpoint

```http
POST /api/portal/sync        # kirim satu laporan ke portal
{ "laporanId": "uuid" }

→ 200 { "success": true, "message": "Berhasil dikirim ke portal" }
```

---

## 7. 📂 Struktur Repository

```text
KeepNoteAI/
├── src/
│   ├── app/
│   │   ├── api/              # Route handlers (REST)
│   │   ├── laporan/          # Histori laporan + modal sync e-Kinerja
│   │   ├── rencana/          # Master program/rencana kerja
│   │   ├── settings/         # Integrasi Drive, Telegram, e-Kinerja
│   │   ├── kalender/         # Kalender laporan
│   │   ├── notulen/          # Notulen rapat
│   │   └── login/ register/  # Auth pages
│   ├── components/           # UI components
│   ├── db/                   # Schema Drizzle + koneksi Neon
│   ├── lib/
│   │   ├── ai.ts             # Integrasi OpenRouter
│   │   ├── drive.ts          # Google Drive helper
│   │   ├── desktopApp.ts     # Konstanta link unduh desktop
│   │   └── portal/
│   │       ├── http.ts       # portalRequest (via cURL)
│   │       ├── connector.ts  # Kirim laporan ke portal
│   │       └── rencanaSync.ts# Sync tim/program/IKI dari portal
│   └── providers/            # ToastProvider, SessionProvider
├── desktop/                  # 🖥️ Aplikasi Electron
│   ├── main.js               # Tray, auto-sync scheduler, IPC
│   ├── preload.js            # Bridge renderer ↔ main
│   ├── db.js                 # Query langsung ke Neon (pg)
│   ├── sync.js               # Kirim laporan ke portal
│   ├── masterSync.js         # Sync tim kerja & program kerja
│   ├── portalHttp.js         # Header + request portal (cURL)
│   ├── icon.ico              # Ikon exe (dari logo aplikasi)
│   └── renderer/             # UI (HTML/CSS/JS + animasi pixel walking)
├── drizzle/                  # Migrasi Drizzle
├── public/                   # Logo & aset statis
└── README.md
```

## 8. 🌐 API Documentation

> Semua endpoint (kecuali auth publik) memerlukan session cookie NextAuth.

### Autentikasi
| Method | Endpoint | Deskripsi |
|---|---|---|
| `*` | `/api/auth/[...nextauth]` | NextAuth (login, logout, session) |
| `POST` | `/api/register` | Registrasi user baru |
| `GET` | `/api/captcha` | Ambil soal captcha login |

### Laporan & Rencana
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` / `POST` | `/api/laporan` | List (filter `from`, `to`, `search`, `page`) / buat laporan |
| `PUT` / `DELETE` | `/api/laporan/[id]` | Edit / hapus laporan |
| `GET` / `POST` | `/api/rencana` | Master rencana kerja user |
| `PUT` / `DELETE` | `/api/rencana/[id]` | Edit / hapus rencana |
| `GET` / `POST` | `/api/tim` | Master tim kerja |
| `GET` | `/api/reports/export` | Export Excel |
| `GET` | `/api/kalender` | Data laporan untuk kalender |

### Portal e-Kinerja
| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/portal/test` | Uji koneksi Cookie + X-Auth |
| `POST` | `/api/portal/sync` | Kirim satu laporan ke portal |
| `POST` | `/api/portal/rencana-sync` | Tarik Tim Kerja, Program Kerja & IKI dari portal ke DB |
| `POST` | `/api/portal/map` | AI mapping rencana lokal ↔ portal |
| `POST` | `/api/portal/parse` * | Parse curl → kredensial (fallback AI) |

<sub>\* Parsing utama kini dilakukan **lokal di browser** (instan); endpoint AI hanya cadangan.</sub>

### Lainnya
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET/POST` | `/api/drive/auth` · `/callback` · `/disconnect` · `/folder` | OAuth & folder Google Drive |
| `POST` | `/api/upload/drive` | Unggah bukti ke Drive user |
| `GET/POST/DELETE` | `/api/telegram/link` | Kode pairing bot Telegram |
| `POST` | `/api/telegram/webhook` | Webhook bot Telegram |
| `POST` | `/api/ai/generate` · `/analyze-image` · `/review` · `...` | Fitur AI |
| `GET/POST/DELETE` | `/api/notulen/*` | Notulen rapat + generate dokumen |

---

## 9. 🖥️ Aplikasi Desktop

Agen sinkronisasi yang berjalan di komputer kantor pegawai:

| | |
|---|---|
| 📦 Unduh | Tombol **"Unduh Desktop"** di web (modal Sync ke e-Kinerja / halaman Pengaturan) |
| ⚙️ Konfigurasi awal | File `.env` di samping exe (`DATABASE_URL`, `SITE_URL`), lalu jalankan exe |
| 🔁 Auto-sync | Tray → interval menit + rentang hari (atau hari ini saja) + notifikasi Windows |
| 🧩 Fitur | Sync manual/semua, cek duplikat, reset status, mapping rencana→portal, sync master data, paste-curl auto parse |

**Build dari source:**

```bash
cd desktop
npm install
npm run pack     # → desktop/dist/KeepNoteAI-Desktop-win32-x64/KeepNoteAI-Desktop.exe
```

> Ikon exe diambil dari `desktop/icon.ico`. Jika logo berubah, regenerate `icon.ico` dari `public/logo.png` lalu build ulang.

---

## 10. 🤝 Contributing

Kontribusi sangat diterima! 🎉

1. **Fork** repository ini
2. Buat branch fitur: `git checkout -b fitur/NamaFitur`
3. Commit dengan pesan jelas: `git commit -m "feat: tambah fitur X"`
4. Push: `git push origin fitur/NamaFitur`
5. Buka **Pull Request**

**Guidelines:**
- `npm run lint` harus lolos sebelum submit PR.
- Commit message memakai [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `docs:`, `refactor:`.
- Jangan commit `.env`, file service-account, atau hasil build (`dist/`, `*.exe`) — sudah diblokir `.gitignore`.
- Uji manual fitur terkait sebelum submit PR.

---

## 11. 🗺️ Roadmap

- [ ] Code-signing exe (menghilangkan warning SmartScreen)
- [ ] Auto-update desktop (cek versi otomatis)
- [ ] Installer NSIS dengan shortcut otomatis
- [ ] Multi-SKP (pindah periode SKP dari dalam app)
- [ ] Dashboard statistik capaian per program/tim
- [ ] Notifikasi Telegram bila sync gagal
- [ ] Mode multi-bahasa (ID/EN)

Lihat [Issues](../../issues) untuk daftar bug & permintaan fitur aktif.

---

## 12. 📄 License

Didistribusikan dengan lisensi **MIT**.

> ⚠️ Catatan: proyek ini dibuat untuk keperluan internal pelaporan BPS. Pastikan penggunaan sesuai kebijakan instansi terkait akses ke portal e-Kinerja.

*(Buat file `LICENSE` berisi teks MIT jika repositori akan dipublikasikan.)*

---

## 13. 📮 Contact

| | |
|---|---|
| 👤 Maintainer | Tim Inovasi BPS |
| 📧 Email | restu.satrio@bps.go.id |
| 🌐 Website | https://keep-note-ai.vercel.app |
| 💬 Bot Telegram | [@KipappAIbot](https://t.me/KipappAIbot) |
| 🐛 Laporkan bug | [Issues](../../issues) |

---

## 14. 🙏 Acknowledgments

- [Next.js](https://nextjs.org) & [Vercel](https://vercel.com) — framework & hosting web
- [Neon](https://neon.tech) — PostgreSQL serverless
- [Electron](https://www.electronjs.org) — runtime aplikasi desktop
- [Drizzle ORM](https://orm.drizzle.team), [NextAuth/Auth.js](https://authjs.dev), [OpenRouter](https://openrouter.ai)
- Seluruh rekan Tim Inovasi BPS yang memberi masukan fitur 🙌

---
