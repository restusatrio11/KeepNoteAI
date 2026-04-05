Design and generate a modern, production-ready frontend for a web application called **“Anti-Gravity Reporting System”**.

## 🎯 Core Goal

Create a clean, professional, mobile-first Progressive Web App (PWA) for daily work reporting. The design must feel like a real enterprise/internal tool — NOT overly “AI-styled”, NOT futuristic, but grounded, practical, and elegant.

---

## 🧩 Tech Requirements

* Framework: Next.js (App Router)
* Styling: Tailwind CSS
* Must support PWA (installable, responsive, fast)
* Mobile-first design (priority)
* Clean component structure

---

## 🎨 Design System

### Color Palette (Green Theme – Professional)

* Primary: #16A34A (Green 600)
* Secondary: #22C55E (Green 500)
* Background: #F9FAFB (Soft gray)
* Surface: #FFFFFF
* Text Primary: #111827 (Dark gray)
* Text Secondary: #6B7280
* Border: #E5E7EB

👉 Avoid neon, glowing, or “AI cyberpunk” styles.

---

### Typography

* Font: Inter or Geist (clean & modern)
* Headings: Semi-bold
* Body: Regular
* Clear spacing and hierarchy

---

### UI Style

* Rounded corners (xl / 2xl)
* Soft shadows (subtle, not heavy)
* Clean spacing
* Minimal icons (lucide-react)
* No clutter, no gradients overload

---

## 📱 Pages & Features

### 1. Authentication Pages

#### Login Page

* Simple centered card
* Email & password input
* “Masuk” button
* Link to register

#### Register Page

* Name, email, password
* Clean form layout

---

### 2. Dashboard (Main Page)

Mobile-first layout:

* Header:

  * Title: “Dashboard”
  * User avatar/menu

* Summary cards:

  * Total laporan
  * Progress minggu ini

* Button:

  * “+ Buat Laporan”

---

### 3. Input Laporan Page

Form layout (stacked mobile):

* Tanggal (date picker)
* Rencana kerja (dropdown)
* Progress (input/select)
* Deskripsi (textarea)
* Upload foto (drag & drop or file input)

Button:

* “Generate & Simpan”

UX:

* Show loading state when AI processing
* Show preview result (kegiatan & capaian)

---

### 4. List Laporan Page

* Card list style (mobile friendly)
* Each item:

  * Tanggal
  * Rencana kerja
  * Progress
  * Button detail

---

### 5. Detail Laporan

* Full detail:

  * Kegiatan
  * Capaian
  * Progress
  * Image preview
  * Link bukti (Google Drive)

---

### 6. Export Page

* Filter tanggal
* Button:

  * “Export Excel”

---

## ⚙️ Components to Build

* Button (primary, secondary)
* Input
* Select
* Card
* Navbar (mobile bottom nav optional)
* Modal
* Loading spinner

---

## 📲 PWA Requirements

* Installable on mobile
* App-like experience
* Splash screen
* Offline fallback (basic)

---

## 🧭 UX Principles

* Fast interaction
* No unnecessary animations
* Clear hierarchy
* Touch-friendly (big tap areas)
* Focus on usability, not decoration

---

## 🚫 Avoid

* Overly futuristic UI
* Neon/glow effects
* Complex animations
* Cluttered dashboards

---

## ✅ Expected Output

* Clean folder structure
* Reusable components
* Production-ready UI
* Looks like internal company tool (serious & usable)

---

## 💡 Design Reference Style

Think:

* Notion (clean)
* Linear (minimal)
* Google Workspace (practical)

NOT:

* Cyberpunk
* AI dashboard aesthetic
* Overdesigned UI kits
