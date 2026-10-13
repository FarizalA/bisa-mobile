# ROADMAP PENGEMBANGAN & PENYESUAIAN SISTEM BISA (MOBILE & BACKEND)

Dokumen ini adalah panduan strategis dan teknis menyeluruh hasil audit logika bisnis pada **BISA Mobile** dan **BISA Admin (Next.js/Vercel)**, mencakup bagian **Chat, Pemesanan, Escrow, Pembayaran, dan Dompet**.

---

## 📌 Ringkasan Hasil Audit & Temuan Lapangan

| Komponen | Status Saat Ini | Catatan & Temuan Teknis |
| :--- | :--- | :--- |
| **Midtrans Integration** | ⚠️ Berisiko Tinggi | `MIDTRANS_SERVER_KEY` masih dipanggil langsung di client HP (`src/lib/midtransDirect.ts`). Wajib dipindahkan ke API Route Vercel (`bisa-admin/app/api/...`). |
| **Penarikan Dana (WD)** | ✅ Sudah Ada | Sudah terimplementasi di `useDompetUnifiedLogic.ts` & `bisa-admin/app/admin/keuangan`. Alur: Pengajuan pending → Admin transfer bank manual → Admin klik ACC → Saldo dipotong & dicatat di ledger. |
| **Escrow & Refund** | 🟡 Berjalan di Klien | Logika rilis escrow (`releaseEscrowPayout`) dan refund (`processOrderRefund`) saat ini dieksekusi langsung dari HP. Rentan manipulasi jika ada modifikasi app. Perlu dipindahkan ke server-side admin/API. |
| **Lampiran Chat** | 🟢 Sesuai Arahan | Disepakati **hanya foto**. Dokumen pendukung lain cukup berupa link (Google Drive, dll). Diperlukan kompresi foto otomatis berapa pun ukuran aslinya. |
| **Notifikasi** | 🔴 Belum Terintegrasi | Belum ada token notification di database dan belum ada trigger push notification otomatis dari event server. |
| **Penyelesaian Sengketa** | 🟡 Perlu Alur Formal | Jika mitra tolak pembatalan atau revisi habis, belum ada tombol "Panggil Bantuan Admin / Dispute". |
| **Pengelolaan Chat** | 🟡 Hanya Hapus Sementara | Perlu fitur **Arsip Chat** agar riwayat penting tidak hilang tapi inbox tetap rapi. |

---

## 🗓️ Rute Tahapan Pengembangan (Step-by-Step Roadmap)

```
[ Fase 1: Keamanan & Payment Vercel ]
                 ⬇
[ Fase 2: Proteksi Server-Side Escrow & Dompet ]
                 ⬇
[ Fase 3: Auto-Kompresi Foto Otomatis (All Sizes) ]
                 ⬇
[ Fase 4: Alur Sengketa (Dispute) & Arsip Chat ]
                 ⬇
[ Fase 5: UI Transparansi Biaya & Detail Pesanan ]
                 ⬇
[ Fase 6: Infrastruktur Push Notification ]
```

---

### 🚀 FASE 1: Keamanan Payment Gateway (Migrasi Midtrans ke Vercel) - ✅ SELESAI
**Target Utama:** Mengamankan transaksi agar `MIDTRANS_SERVER_KEY` tidak tersimpan di APK/bundle HP.

1. **Backend (`bisa-admin`)** - ✅ SELESAI:
   - Buat endpoint API Route di Next.js App Router:
     - `POST /api/payment/snap`: Menerima `jobId`, `agreedPrice`, `customerName`, `customerEmail`. Mengembalikan `snapToken` dan `paymentUrl`. ✅
     - `POST /api/payment/status`: Mengecek status transaksi ke Midtrans v2 API dari server side. ✅
     - `POST /api/payment/webhook`: Menerima callback HTTP notifikasi dari Midtrans (status `settlement`, `expire`, `cancel`) untuk otomatis mengubah status pekerjaan di database Supabase ke `sedang_dikerjakan` / `escrow_held`. ✅
     - **Keamanan Tambahan**: Verifikasi SHA512 Signature Key di Webhook. ✅
   - Simpan `MIDTRANS_SERVER_KEY` secara aman di Vercel Project Environment Variables. ✅
2. **Mobile (`bisa-mobile`)** - ✅ SELESAI:
   - Refactor `src/lib/midtransDirect.ts` dan `src/hooks/useChatLogic.ts`:
     - Hapus penggunaan direct Server Key dari HP. ✅
     - Hubungkan permintaan pembuatan Snap Token dan cek status ke endpoint Vercel baru. ✅
   - Hapus `EXPO_PUBLIC_MIDTRANS_SERVER_KEY` dari file `.env` mobile. ✅

---

### 🛡️ FASE 2: Proteksi Server-Side Escrow, Refund & Validasi Dompet - 🟡 KODE SELESAI (MENUNGGU DEPLOY VERCEL & UJI END-TO-END)
**Target Utama:** Mencegah manipulasi saldo dari client-side dan memperkuat konsistensi buku besar keuangan.

1. **Pindahkan Eksekusi Dana ke Server (`bisa-admin`)** - ✅ SELESAI KODE:
   - Buat endpoint unified di Next.js App Router:
     - `POST /api/order/action`: Menangani `release`, `refund`, `request_cancel`, dan `respond_cancel` dengan verifikasi JWT Supabase dan idempotency check. ✅
     - `POST /api/order`: Fallback route untuk action handler. ✅
     - Endpoint pendukung: verifikasi `getAuthUser` dan pencatatan otomatis ke tabel `transactions`. ✅
   - *Status deploy*: Kode sudah di-commit & push ke GitHub (`main`), menunggu deployment Vercel selesai sinkronisasi route. ⏳
2. **Mobile Client (`bisa-mobile`)** - ✅ SELESAI KODE:
   - Buat `src/lib/auth.ts`: Helper `getSupabaseToken()` untuk autentikasi Bearer JWT. ✅
   - Refactor `src/lib/payment.ts`: Fungsi `releaseEscrowPayout` dan `processOrderRefund` diganti menjadi wrapper-fetch ke `/api/order/action`. ✅
   - Perbarui `src/hooks/useChatLogic.ts` & `app/c/aktivitas.tsx` untuk menggunakan API server-side baru. ✅
   - Pembersihan build: 0 error lint (`npx expo lint`) & 0 type error (`npx tsc --noEmit`). ✅
   - Commit semua perubahan ke git master. ✅
3. **Audit Konsistensi Saldo Dompet & Uji End-to-End**:
   - Sinkronisasi kolom `saldo` dan `balance` di tabel `users_bisa`. ✅
   - [ ] Uji release escrow via mobile/curl (cek saldo Mitra bertambah).
   - [ ] Uji refund order via mobile/curl (cek saldo Klien kembali).
   - [ ] Uji idempotensi (jalankan 2x, saldo tidak bertambah ganda).

---

### 🖼️ FASE 3: Kompresi Foto Otomatis Agresif (Semua Titik Upload)
**Target Utama:** Menjamin semua foto yang diunggah dikompresi otomatis tanpa batas ukuran awal, hemat bandwidth & storage Supabase.

1. **Standarisasi Kompresi**:
   - Titik upload: Chat gambar, Lampiran Hasil Kerja (`[DELIVERY]`), Lampiran Posting Pekerjaan, dan Foto KYC.
   - Otomatis kompres:
     - Mengubah resolusi maksimal (misal maks lebar/tinggi 1280px).
     - Kualitas JPEG 0.65 - 0.75 (penurunan ukuran file 70% - 90% dengan ketajaman visual tetap jernih).
     - Menghindari error memori pada file kamera resolusi tinggi (>15MB).
2. **Penolakan Dokumen Non-Foto**:
   - Jika pengguna membutuhkan pengiriman dokumen (PDF, CAD, ZIP, dll.), sediakan instruksi cepat di UI untuk menaruh tautan cloud (Google Drive/Dropbox/Onedrive).

---

### ⚖️ FASE 4: Alur Sengketa (Dispute Resolution) & Fitur Arsip Chat
**Target Utama:** Memberikan solusi formal jika terjadi perselisihan antara Klien dan Mitra.

1. **Alur Sengketa (Dispute)**:
   - Tombol **"Ajukan Komplain / Sengketa"** muncul jika:
     - Permintaan revisi telah mencapai batas maksimal (`revision_count >= max_revision`).
     - Mitra menolak pengajuan pembatalan Klien.
   - Status pekerjaan berpindah ke: `dalam_sengketa`.
   - Admin di `bisa-admin` mendapatkan notifikasi sengketa di menu CS / Keuangan untuk meninjau bukti chat dan memutuskan:
     - *Admin Force Release* (dana ke Mitra jika pekerjaan valid).
     - *Admin Force Refund* (dana kembali ke Klien jika Mitra wanprestasi).
2. **Fitur Arsip Chat (Archive)**:
   - Tambahkan status `is_archived_by_client` / `is_archived_by_mitra`.
   - Pisahkan tab di Inbox Chat: **"Semua Chat"** dan **"Arsip"**.
   - Menghindari hapus permanen agar histori percakapan transaksi tetap tersimpan sebagai bukti hukum.

---

### 📊 FASE 5: Transparansi Rincian Biaya UI & Perbaikan Alur Pemesanan
**Target Utama:** Menghilangkan kebingungan pengguna mengenai nominal pembayaran dan status pekerjaan.

1. **Rincian Pembayaran (Payment Breakdown)**:
   - Tampilkan rincian transparan pada Sheet Pembayaran (`showPaySheet`):
     - Harga Jasa / Kesepakatan: `Rp xxx`
     - Biaya Layanan Aplikasi: `Rp xxx`
     - Biaya Penanganan Gateway: `Rp xxx`
     - **Total Tagihan**: `Rp xxx`
2. **Sempurnakan Halaman Kandidat & Detail Pekerjaan**:
   - Opsi Klien untuk mengirim pesan tanya jawab langsung ke kandidat sebelum menekan tombol "Pilih Mitra Ini".
   - Tampilkan timeline histori pesanan (Dibuat → Mitra Dipilih → Terbayar Escrow → Dikerjakan → Terkirim → Selesai).

---

### 🔔 FASE 6: Integrasi Notifikasi Terpadu (Push Notifications)
**Target Utama:** Memastikan pengguna tidak melewatkan update pesanan dan pesan chat.

1. **Persiapan Database & Token**:
   - Kolom `push_token` pada tabel `users_bisa`.
   - Registrasi token via `expo-notifications` saat login/buka aplikasi.
2. **Trigger Notifikasi Otomatis**:
   - Chat baru masuk.
   - Mitra mengajukan penawaran / melamar pekerjaan.
   - Status pembayaran berhasil (Escrow masuk).
   - Mitra mengirim hasil pekerjaan.
   - Pengajuan penarikan dana di-ACC atau ditolak oleh Admin.

---

## 🗄️ Rencana Perubahan Database (Pemberitahuan & Konfirmasi)

*Sesuai permintaan Anda, setiap perubahan tabel atau penambahan kolom baru akan kami koordinasikan dan mintakan izin terlebih dahulu sebelum dieksekusi di database Supabase.*

Berikut draft kolom/tabel yang direncanakan untuk tahapan di atas:

| Tabel | Jenis Perubahan | Deskripsi & Tujuan |
| :--- | :--- | :--- |
| `pekerjaan_bisa` | Tambah kolom `dispute_reason` (text, nullable) | Menyimpan alasan sengketa saat diajukan ke admin. |
| `pekerjaan_bisa` | Update enum status | Menambahkan status `dalam_sengketa` jika pekerjaan memerlukan mediasi admin. |
| `conversations` | Tambah kolom `archived_by_client` & `archived_by_mitra` (boolean default false) | Fitur pengarsipan chat agar tidak menumpuk di inbox utama. |
| `users_bisa` | Tambah kolom `expo_push_token` (text, nullable) | Menyimpan token perangkat untuk pengiriman notifikasi push. |

---

*Catatan: Dokumen ini akan diperbarui seiring berjalannya implementasi di setiap fase.*
