# Panduan Pengguna KeepNoteAI (KipApp)

Selamat datang di **KeepNoteAI** — asisten pencatat laporan harian e-Kinerja/SKP yang membantu Anda mencatat kegiatan, membuat notulen rapat, merencanakan hari, dan mengirim laporan lewat web maupun bot Telegram, lengkap dengan bantuan AI.

Panduan ini menjelaskan **semua fitur dari sudut pandang pengguna**, langkah demi langkah.

---

## Daftar Isi
1. [Mulai: Akses, Registrasi & Login](#1-mulai)
2. [Navigasi Menu](#2-navigasi)
3. [Rencana Kinerja](#3-rencana-kinerja)
4. [Laporan Harian](#4-laporan-harian)
5. [Notulen Rapat](#5-notulen-rapat)
6. [Daily Planning (Rencana Harian)](#6-daily-planning)
7. [Dashboard & Analisis](#7-dashboard)
8. [Export ke Excel](#8-export)
9. [Pengaturan](#9-pengaturan)
10. [Bot Telegram](#10-bot-telegram)
11. [Integrasi Portal e-Kinerja/SKP](#11-portal)
12. [Tips & FAQ](#12-faq)

---

## 1. Mulai: Akses, Registrasi & Login

### Akses Aplikasi
Buka alamat web KeepNoteAI (mis. `https://keep-note-ai.vercel.app` atau alamat internal BPS) di browser.

### Registrasi (pertama kali)
1. Klik **Daftar** / buka halaman `/register`.
2. Isi **Nama Lengkap**, **Email**, dan **Password**.
3. Klik **Daftar**. Akun Anda langsung aktif.

### Login
1. Klik **Masuk** / buka `/login`.
2. Masukkan **Email** dan **Password**.
3. Klik **Masuk**.

> Setiap akun adalah **data pribadi**. Anda hanya melihat laporan, rencana, dan file milik Anda sendiri.

---

## 2. Navigasi Menu

Setelah login, Anda akan melihat menu utama (biasanya di sidebar/header):
- **Beranda / Dashboard** — ringkasan & analisis kerja.
- **Laporan** — daftar & pembuatan laporan harian.
- **Rencana** — Rencana Kinerja & Tim Kerja.
- **Notulen** — notulen rapat.
- **Planning** — rencana harian (to-do harian).
- **Pengaturan** — hubungkan Google Drive, Telegram, dan Portal.

---

## 3. Rencana Kinerja

Halaman **Rencana** adalah tempat Anda mendefinisikan apa yang akan dikerjakan (Program/Rencana Kinerja) dan Tim-nya. Data ini dipakai saat membuat laporan dan saat sinkron ke portal.

### 3.1 Membuat Tim Kerja
1. Buka **Rencana**.
2. Cari bagian **Tim Kerja** → klik **Tambah Tim**.
3. Isi **Nama Tim** dan **Keterangan** (opsional).
4. Simpan.

### 3.2 Membuat Program / Rencana Kinerja
1. Di bagian **Rencana Kinerja** → klik **Tambah Rencana**.
2. Isi:
   - **Kode** (mis. `PK-01`)
   - **Nama Rencana**
   - **Tim** (pilih dari daftar tim yang sudah dibuat)
   - **IKI** (Indikator Kinerja Individu, opsional)
3. Simpan.

### 3.3 Mengambil Rencana dari Portal (Otomatis)
Jika Anda sudah menghubungkan Portal (lihat [Bagian 11](#11-portal)):
1. Buka **Rencana** → klik **Sync dari Portal**.
2. Sistem menarik **Tim**, **Program**, dan **IKI** dari e-Kinerja ke akun Anda secara otomatis.

### 3.4 Memetakan Rencana ke Portal
Agar laporan bisa dikirim ke portal dengan benar:
1. Buka **Pengaturan → e-Kinerja/SKP → Peta Rencana Kinerja → Portal**.
2. Klik **Muat Daftar dari Portal** (mengambil daftar rencana dari e-Kinerja).
3. Untuk setiap Rencana di aplikasi, pilih Rencana Kinerja portal yang cocok dari kotak pencarian.
4. Peta tersimpan otomatis.

---

## 4. Laporan Harian

Halaman **Laporan** adalah fitur utama untuk mencatat kegiatan harian.

### 4.1 Membuat Laporan Baru
1. Buka **Laporan** → klik **Laporan Baru** (atau `/laporan/baru`).
2. Isi form:
   - **Tanggal Mulai & Selesai**
   - **Jam Mulai & Jam Selesai**
   - **Rencana Kinerja** (pilih dari daftar Anda)
   - **Kegiatan** (uraian pekerjaan)
   - **Progress** (0–100%)
   - **Capaian** (hasil yang dicapai)
   - **Bukti Dukung** (upload file → ke Google Drive Anda)
   - **Masukan SKP** (opsional)
3. Klik **Simpan**.

### 4.2 Bantuan AI (Merapikan Laporan)
Malas menulis formal? Biarkan AI:
1. Pada form laporan, ada tombol **Generate dengan AI** / kolom deskripsi kasual.
2. Ketik apa yang Anda kerjakan dengan bahasa sehari-hari (mis. *"tadi saya rapat evaluasi dan bantu bapak perbaiki laporan"*).
3. Klik **Generate** → AI mengubahnya menjadi kegiatan & capaian formal bahasa Indonesia.
4. AI menggunakan 3 laporan terakhir Anda sebagai referensi gaya penulisan.

### 4.3 Upload Bukti Dukung (Google Drive)
1. Pada form laporan, klik **Unggah Bukti** / pilih file.
2. File diunggah ke **Google Drive pribadi Anda** (yang dihubungkan di Pengaturan).
3. Link file otomatis tersimpan di laporan.

> Belum hubungkan Drive? Lihat [Bagian 9.1](#91-google-drive).

### 4.4 Mengirim Laporan ke Portal (Sync)
1. Buka **Laporan** → klik **Sync ke Portal**.
2. Pilih satu atau beberapa laporan yang ingin dikirim.
3. Klik **Kirim**. Sistem mengirim ke e-Kinerja dengan kode rencana (`rkid`) yang sudah dipetakan.
4. Status:
   - ✅ **Berhasil** — laporan masuk ke portal.
   - ⚠️ **Duplikat** — portal melaporkan laporan sudah ada (dilewati, tidak dikirim ulang).
   - ❌ **Gagal** — periksa koneksi portal (biasanya X-Auth kedaluwarsa, lihat [Bagian 11](#11-portal)).

---

## 5. Notulen Rapat

Halaman **Notulen** untuk mencatat dan membuat resume rapat.

### 5.1 Membuat Notulen Manual
1. Buka **Notulen** → **Notulen Baru**.
2. Isi: Judul, Tanggal, Waktu, Tempat, Pemimpin, Topik, Notulis, Peserta, Konten, serta URL Undangan & Daftar Hadir (jika ada).
3. Simpan.

### 5.2 Generate Notulen dengan AI
1. Buka **Notulen Baru** → pilih **Generate dari AI**.
2. Pilih sumber:
   - **Teks/Transkrip** — tempel catatan kasar rapat.
   - **Audio** — unggah rekaman rapat.
3. Klik **Generate**. AI membuat struktur: Judul, Kesimpulan, Pembahasan (per topik + solusi), dan Insight.
4. Edit jika perlu, lalu simpan.

### 5.3 Gabungkan ke PDF
1. Buka notulen yang sudah ada.
2. Klik **Gabung PDF** (Merge).
3. Sistem menggabungkan **Undangan + Notulen + Daftar Hadir** menjadi satu file PDF (file diambil dari Drive Anda).
4. PDF otomatis terunduh.

---

## 6. Daily Planning

Halaman **Planning** untuk to-do harian.

1. Buka **Planning**.
2. Tambah kegiatan harian: isi **Isi**, pilih **Warna** label, dan atur **Waktu Pengingat** (opsional).
3. Centang **Selesai** jika sudah dikerjakan.
4. Kegiatan tersimpan per hari dan hanya bisa dilihat oleh Anda.

---

## 7. Dashboard

Halaman **Beranda**:
- Menampilkan ringkasan laporan Anda (jumlah, progress).
- **Skor Kesehatan Kerja**: AI menganalisis riwayat laporan & memberi saran produktivitas.
- **Review Laporan**: AI menilai apakah sebuah laporan sudah berkualitas & realistis (cocokkan kegiatan dengan progress & capaian).

---

## 8. Export

1. Buka **Laporan**.
2. Atur filter (tanggal / rencana / kata kunci) jika diinginkan.
3. Klik **Export Excel**.
4. File Excel berisi seluruh laporan Anda (bukan milik user lain) akan terunduh.

---

## 9. Pengaturan

Buka **Pengaturan** untuk menghubungkan layanan eksternal.

### 9.1 Google Drive
Agar bukti tersimpan di **Drive Anda sendiri**:
1. Di Pengaturan → bagian **Integrasi Google Drive** → klik **Hubungkan Google Drive**.
2. Anda diarahkan ke login Google → pilih akun Drive Anda → **Izinkan**.
3. Kembali ke aplikasi, status berubah menjadi **Terhubung sebagai <email-anda>**.
4. Setelah ini, semua upload bukti masuk ke folder `KeepNoteAI` di Drive Anda.

Ingin putuskan? Klik **Putuskan Google Drive**.

### 9.2 Telegram
Lihat [Bagian 10](#10-bot-telegram) untuk langkah menghubungkan.

### 9.3 e-Kinerja / SKP (Portal)
Lihat [Bagian 11](#11-portal).

---

## 10. Bot Telegram

Kirim laporan langsung dari HP via Telegram — tanpa buka web.

### 10.1 Menghubungkan (lakukan sekali)
1. Di web, buka **Pengaturan → Telegram** → klik **Generate Kode**.
2. Salin **kode 6 huruf** yang muncul (berlaku 5 menit).
3. Buka Telegram, chat bot (`@KipappAIbot`) → kirim:
   ```
   /link KODE
   ```
4. Bot membalas *"Berhasil terhubung"*. Selesai — chat Telegram Anda kini terikat akun Anda.

### 10.2 Perintah Bot
| Perintah | Kegunaan |
|----------|----------|
| `/start` | Cek status koneksi & panduan |
| `/link KODE` | Hubungkan chat ke akun Anda |
| `/rk` | Lihat daftar Rencana Kinerja Anda |
| `/rk KODE` | Pilih RK aktif (laporan otomatis ke sini) |
| `/status` | Cek akun & RK aktif |
| `/unlink` | Putuskan koneksi Telegram |
| `/help` | Bantuan |

### 10.3 Mengirim Laporan lewat Bot
- **Kirim Foto/Dokumen** → tambahkan *caption* (keterangan). Bot akan:
  1. Mengunggah file ke **Drive Anda**.
  2. AI membuat *Kegiatan* & *Capaian* (dari caption atau isi gambar).
  3. Mencocokkan ke RK aktif (atau AI pilih RK yang paling cocok).
  4. Menyimpan laporan ke **akun Anda**.
- **Kirim Teks** → AI merapikan menjadi laporan formal & menyimpannya.

Balasan bot berisi ringkasan laporan & link untuk melihatnya di web.

> Satu akun Telegram = satu akun KeepNoteAI. Pastikan Anda `/link` dari akun web **Anda sendiri** agar laporan masuk ke akun yang benar.

---

## 11. Portal e-Kinerja / SKP

Integrasi ini mengirim laporan & mengambil rencana dari sistem e-Kinerja BPS.

### 11.1 Mengisi Kredensial (sekali, di Pengaturan)
1. Buka portal e-Kinerja di browser, lalu buka **DevTools** (F12) → tab **Network**.
2. Muat/isi halaman, lalu cari request ke `/api/...`.
3. Dari request tersebut, salin:
   - **Cookie** (header `Cookie` — seluruh nilainya).
   - **X-Auth** (header `X-Auth`, berbentuk `Bearer eyJ...` — ini JWT).
4. Di web KeepNoteAI → **Pengaturan → e-Kinerja/SKP**:
   - **URL Portal** (mis. `https://kipapp.bps.go.id`)
   - **Cookie Sesi** (tempel)
   - **X-Auth (JWT)** (tempel)
   - **SKP ID** (mis. `1344761` — ID SKP periode berjalan)
5. Klik **Simpan** (data dienkripsi) lalu **Test Koneksi**.
6. Jika muncul *"Koneksi portal OK"*, berarti siap.

> ⚠️ **X-Auth berlaku ±24 jam.** Jika sync gagal dengan pesan token, salin ulang Cookie & X-Auth dari DevTools.

### 11.2 Mengambil Rencana dari Portal
1. **Rencana** → **Sync dari Portal** (menarik Tim, Program, IKI).
2. Lalu lakukan **Peta Rencana** (Bagian [3.4](#34-memapakan-rencana-ke-portal)).

### 11.3 Mengirim Laporan ke Portal
1. **Laporan** → **Sync ke Portal** → pilih laporan → **Kirim** (lihat [4.4](#44-mengirim-laporan-ke-portal-sync)).

---

## 12. FAQ

**Q: Apakah rekan kerja bisa melihat laporan saya?**
A: Tidak. Setiap akun terisolasi. Anda hanya melihat data Anda sendiri, termasuk file Drive.

**Q: File bukti saya disimpan di mana?**
A: Di **Google Drive pribadi Anda** (folder `KeepNoteAI`), setelah Anda menghubungkan Drive di Pengaturan.

**Q: Bot mengirim laporan ke akun siapa?**
A: Ke akun yang melakukan `/link` dari chat tersebut. Pastikan Anda link dari akun web Anda sendiri.

**Q: Sync portal gagal terus.**
A: Biasanya X-Auth (JWT) sudah kedaluwarsa (~24 jam). Salin ulang Cookie & X-Auth dari DevTools portal, lalu Simpan & Test lagi.

**Q: Laporan saya muncul "Duplikat" saat sync.**
A: Portal melaporkan laporan tersebut sudah ada. Tidak dikirim ulang — ini normal.

**Q: Bisa pakai di HP?**
A: Ya. Aplikasi web responsif, dan Anda bisa kirim laporan lewat Bot Telegram dari HP.

**Q: Lupa password?**
A: Hubungi admin sistem untuk reset password (fitur reset mandiri dapat ditambahkan jika diperlukan).

---

*Panduan ini mencakup seluruh fitur KeepNoteAI dari sisi pengguna: web (rencana, laporan, notulen, planning, dashboard, export, pengaturan), bot Telegram, dan integrasi portal e-Kinerja/SKP.*
