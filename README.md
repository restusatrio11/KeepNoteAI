🚀 KeepNoteAI Reporting System

Sistem pelaporan pekerjaan berbasis AI yang mengubah input sederhana (foto + deskripsi) menjadi laporan profesional terstruktur dan dapat diekspor ke Excel.

📌 1. Project Overview

Aplikasi ini memungkinkan user untuk:

Login & mengelola akun
Mengisi laporan pekerjaan harian
Upload bukti kerja (foto)
Menggunakan AI untuk generate deskripsi profesional
Menyimpan data ke database
Export laporan ke Excel
🎯 2. Problem & Solution
Problem
Laporan kerja manual tidak konsisten
Deskripsi sering tidak profesional
Bukti kerja tidak terorganisir
Solution
AI otomatis menyusun laporan
Bukti kerja tersimpan rapi (Google Drive)
Export Excel siap kirim
🧠 3. Core Features
🔐 Authentication
Register & Login user
Session management
📋 Master Rencana Kerja
Data kegiatan utama (referensi laporan)
📝 Input Laporan

User mengisi:

Tanggal
Rencana kerja
Progress
Deskripsi (opsional)
Upload foto
🤖 AI Processing

Menggunakan:

OpenRouter

AI akan generate:

Kegiatan (deskripsi formal)
Capaian (hasil kerja)
☁️ Upload Bukti
Disimpan ke Google Drive
Menghasilkan link publik
📊 Export Excel

Kolom:

No
Tanggal
Rencana Kinerja
Kegiatan
Progress
Capaian
Bukti Dukung (link)
🏗️ 4. Tech Stack
Frontend + Backend
Next.js (App Router)
Deploy: Vercel

👉 Fullstack tanpa server terpisah

Database
Neon (PostgreSQL)
Authentication
NextAuth.js
AI
OpenRouter (model gratis)
Storage
Google Drive API
Export
ExcelJS / XLSX
🧩 5. System Architecture
User (Browser)
   ↓
Next.js (Frontend + API)
   ↓
API Routes
   ├── Auth (NextAuth)
   ├── Upload → Google Drive
   ├── AI → OpenRouter
   └── DB → Neon
   ↓
Export → Excel
🔄 6. Application Flow
🧑‍💻 1. Register & Login
User membuat akun
Login → mendapatkan session
📝 2. Input Laporan

User mengisi:

Tanggal
Rencana kerja
Progress
Deskripsi
Upload foto
☁️ 3. Upload File
File dikirim ke Google Drive
Simpan link ke database
🤖 4. AI Processing

Prompt ke AI:

Ubah deskripsi berikut menjadi laporan kerja profesional.

Deskripsi: "{{user_input}}"

Output:
Kegiatan:
Capaian:
💾 5. Save Data

Disimpan ke Neon:

hasil AI
progress
link bukti
📊 6. Export Excel

Generate file laporan berdasarkan filter tanggal/user

🗄️ 7. Database Schema
users
id UUID PRIMARY KEY
name TEXT
email TEXT UNIQUE
password TEXT
created_at TIMESTAMP
master_rencana
id UUID PRIMARY KEY
nama TEXT
created_at TIMESTAMP
laporan
id UUID PRIMARY KEY
user_id UUID
tanggal DATE
rencana_id UUID
kegiatan TEXT
progress TEXT
capaian TEXT
bukti_url TEXT
created_at TIMESTAMP
🔌 8. API Design
POST /api/laporan
{
  "tanggal": "2026-04-04",
  "rencana_id": "uuid",
  "progress": "80%",
  "deskripsi": "memperbaiki bug login",
  "file": "image"
}
Flow:
Upload file → Google Drive
AI generate → OpenRouter
Save → Neon
💸 9. Cost Strategy (Free Tier)
Service	Status
Vercel	✅ Free
Neon	✅ Free
OpenRouter	✅ Free model
Google Drive	✅ Free

👉 Sistem bisa berjalan tanpa biaya (low usage)

⚠️ 10. Challenges
Upload file di serverless
Setup Google Drive API (OAuth)
AI kadang tidak konsisten
Rate limit model gratis
🧪 11. Future Improvements
Role (admin / user)
Approval laporan
OCR dari gambar
Dashboard analytics
Notifikasi
🧠 12. AI Strategy

Gunakan model gratis di OpenRouter:

Mistral
DeepSeek
OpenChat

Tips:

Gunakan prompt yang konsisten
Validasi output AI sebelum save
🔥 13. Development Roadmap
Phase 1 (Core)
Auth (login/register)
CRUD laporan
Phase 2
AI integration
Phase 3
Google Drive upload
Phase 4
Export Excel
✅ 14. Feasibility

✔ Bisa dibuat full gratis
✔ Cocok untuk skala kecil–menengah
✔ Bisa dikembangkan jadi produk nyata

💡 15. Pragmatic Evaluation

Kelayakan: 9/10

Kelebihan:

Real problem solving
AI memberi value langsung
Bisa dipakai instansi

Kekurangan:

Integrasi Google Drive cukup kompleks
AI perlu kontrol output
🧭 16. Conclusion

Project ini:

Realistis
Scalable
Bisa jadi produk SaaS sederhana

👉 Cocok untuk:

Portofolio
Internal kantor
Produk digital awal
🔚 Final Insight (jujur & pragmatik)

Kalau kamu eksekusi ini sampai jadi:

kamu udah di level bukan cuma belajar coding, tapi bikin sistem nyata

Yang bikin project ini “naik kelas” bukan AI-nya, tapi:

auth ✔
data rapi ✔
export ✔

👉 AI itu cuma booster, bukan fondasi.