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

### 🛡️ FASE 2: Proteksi Server-Side Escrow, Refund & Validasi Dompet - ✅ SELESAI (TESTED & VERIFIED)
**Target Utama:** Mencegah manipulasi saldo dari client-side dan memperkuat konsistensi buku besar keuangan.

1. **Pindahkan Eksekusi Dana ke Server (`bisa-admin`)** - ✅ SELESAI & TERUJI:
   - Buat endpoint unified di Next.js App Router:
     - `POST /api/order/action`: Menangani `release`, `refund`, `request_cancel`, dan `respond_cancel` dengan verifikasi JWT Supabase dan idempotency check. ✅
     - Endpoint pendukung: verifikasi `getAuthUser` dan pencatatan otomatis ke tabel `transactions`. ✅
   - *Status deploy*: Deployed di Vercel (`https://bisa-admin.vercel.app`). Respon 401 JSON untuk dummy token, 200 JSON untuk token valid. ✅

2. **Mobile Client (`bisa-mobile`)** - ✅ KODE SELESAI:
   - Buat `src/lib/auth.ts`: Helper `getSupabaseToken()` untuk autentikasi Bearer JWT. ✅
   - Refactor `src/lib/payment.ts`: Fungsi `releaseEscrowPayout` dan `processOrderRefund` diganti menjadi wrapper-fetch ke `/api/order/action`. ✅
   - Perbarui `src/hooks/useChatLogic.ts` & `app/c/aktivitas.tsx` untuk menggunakan API server-side baru. ✅
   - Pembersihan build: 0 error lint (`npx expo lint`) & 0 type error (`npx tsc --noEmit`). ✅
   - Commit semua perubahan ke git master. ✅

3. **Uji End-to-End & Verifikasi Konsistensi Saldo** - ✅ SELESAI:
   - Token Supabase test: user `testpelanggan@bisa.app` (id=1), saldo awal 250.000. ✅
   - **Test Release COD (#465)**: Status → `selesai`, payment_status → `cod_completed`, mitra ID 1 bertambah sesuai agreed_price. ✅
   - **Test Release Escrow Non-COD (#466)**: 
     - Agreed price: 12.000 | Fee: 6.000 (50%) | Earnings mitra: 6.000. ✅
     - Saldo mitra 316: **436.500 → 442.500** (+6.000) ✅
     - Record transaction di `transactions` table. ✅
   - **Test Refund (#464)**:
     - Amount refunded: 12.000. ✅
     - Saldo pelanggan ID 1: **250.000 → 262.000** (+12.000) ✅
     - Status job → `dibatalkan`, payment_status → `refunded`. ✅
   - **Test Idempotensi**:
     - Jalankan refund lagi pada job #464 yang sudah refunded → **400 "Dana sudah diproses sebelumnya"**. ✅
     - Saldo tidak berubah ganda. ✅
   - **Test Guard**:
     - Release job yang sudah refunded → ditolak (400). ✅

4. **Audit Konsistensi Saldo Dompet** ✅ SELESAI:
   - Sinkronisasi kolom `saldo` dan `balance` di tabel `users_bisa` diverifikasi setelah setiap transaksi. ✅

---

## 🎯 Ringkasan Status Semua Fase

| Fase | Komponen | Status | Bukti/Verifikasi |
|------|----------|--------|------------------|
| **FASE 1** | Midtrans Snap Payment | ✅ Selesai | Pembayaran online via snap_token berfungsi (status 200 + response valid). |
| **FASE 2** | Server-Side Escrow | ✅ Selesai | Endpoint `/api/order/action` deployed, tested release/refund/idempotency, saldo verified. |
| **FASE 3** | Photo Compression | ✅ Selesai (LINT/TYPECHECK CLEAN) | Helper `compressImageDetailed` di `src/lib/imageCompression.ts`. Semua titik upload (chat, delivery, posting, avatar, galeri, portofolio, KYC) pakai helper terpusat. Tidak ada lagi penolakan foto besar. |
| **FASE 4** | Dispute Resolution + Chat Archive | ✅ Selesai (LINT/TYPECHECK CLEAN) | DB: kolom dispute_* + enum `dalam_sengketa` + archived_by_*. Backend: `POST /api/order/action` (action dispute) + `/api/admin/disputes` (GET/POST resolve). Mobile: tombol sengketa Mitra + Klien, modal alasan, banner `dalam_sengketa`, inbox tab Arsip + toggle arsip per-chat. Admin: halaman `/admin/disputes` dengan filter Menunggu/Selesai/Semua, tombol Rilis Dana / Refund. |



---

### 🖼️ FASE 3: Kompresi Foto Otomatis Agresif (Semua Titik Upload) — ✅ SELESAI
**Target Utama:** Menjamin semua foto yang diunggah dikompresi otomatis tanpa batas ukuran awal, hemat bandwidth & storage Supabase.

1. **Standarisasi Kompresi**:
   - Titik upload: Chat gambar, Lampiran Hasil Kerja (`[DELIVERY]`), Lampiran Posting Pekerjaan, Foto KYC, Avatar, Galeri, Portofolio.
   - Otomatis kompres:
     - Resolusi maksimal 1280px sisi terpanjang (rasio aspek dijaga otomatis oleh `expo-image-manipulator`).
     - Kualitas JPEG 0.7 (penurunan ukuran file 70-90% dengan ketajaman visual tetap jernih).
     - Tidak ada lagi penolakan berdasarkan ukuran file — foto berapa pun tetap dikompresi.
     - Kegagalan kompresi fallback ke file asli (upload tidak terhenti).
2. **Penolakan Dokumen Non-Foto**:
   - Jika pengguna membutuhkan pengiriman dokumen (PDF, CAD, ZIP, dll.), sediakan instruksi cepat di UI untuk menaruh tautan cloud (Google Drive/Dropbox/Onedrive).

**File yang diubah:**
- `src/lib/imageCompression.ts` — rewrite helper terpusat.
- `src/hooks/useEditProfilMobileLogic.ts` — avatar, kamera, galeri, portofolio.
- `src/hooks/usePostingMobileLogic.ts` — foto posting.
- `src/hooks/useChatLogic.ts` — chat image + delivery image. Hapus `base64: true` di picker (hemat memori).
- `app/(auth)/daftar.tsx` — KTP & selfie.
- `app/p/aktivitas/[id].tsx` — delivery image. Hapus `base64: true` di picker.

---

### ⚖️ FASE 4: Alur Sengketa (Dispute Resolution) & Fitur Arsip Chat — ✅ SELESAI
**Target Utama:** Memberikan solusi formal jika terjadi perselisihan antara Klien dan Mitra.

1. **Perubahan Database** ✅:
   - `pekerjaan_bisa`: kolom `dispute_reason` (text), `dispute_at` (timestamp), `dispute_status` (default `pending`), `dispute_resolved_by_admin_id` (int).
   - Enum status ditambahkan `dalam_sengketa`.
   - `conversations`: kolom `archived_by_client` & `archived_by_mitra` (boolean default false).

2. **Backend (`bisa-admin`)** ✅:
   - `POST /api/order/action` menerima `action: "dispute"` — validasi user/role, guard status selesai/dibatalkan, set status `dalam_sengketa` & log admin.
   - `GET /api/admin/disputes?status=pending|resolved|all` — list sengketa dengan data pelanggan & mitra.
   - `POST /api/admin/disputes` — resolve dengan `decision: "release"` atau `"refund"`, hitung fee, update saldo, catat transaksi.

3. **Mobile (`bisa-mobile`)** ✅:
   - `src/lib/payment.ts`: fungsi `submitOrderDispute(jobId, reason)` memanggil `/api/order/action` dengan Bearer token.
   - `app/p/aktivitas/[id].tsx`: banner sengketa aktif, tombol "Sengketa" saat sedang dikerjakan, modal alasan.
   - `app/c/aktivitas.tsx` + `AktivitasJobCard`: tombol "Ajukan Sengketa" muncul saat hasil kerja dikirim (`menunggu_konfirmasi_selesai`), badge `dalam_sengketa`, modal alasan.
   - `src/lib/chatInbox.ts`: `fetchInboxChats(isMitra, archivedOnly)` + `toggleArchiveConversation()`.
   - `app/c/chat.tsx` & `app/p/chat.tsx`: tab "Semua" / "Arsip", toggle archive via long-press atau icon.

4. **Admin Dashboard** ✅:
   - Halaman baru `/admin/disputes` dengan filter Menunggu / Selesai / Semua.
   - Tombol "Rilis Dana ke Mitra" dan "Refund ke Pelanggan" (termasuk COD cancel) dengan catatan keputusan.
   - Menu navigasi "Sengketa & Dispute" di sidebar.

---

### 📊 FASE 5: Transparansi Rincian Biaya UI & Perbaikan Alur Pemesanan — ✅ SELESAI
**Target Utama:** Menghilangkan kebingungan pengguna mengenai nominal pembayaran dan status pekerjaan.

1. **Rincian Pembayaran (Payment Breakdown)** — ✅ SELESAI:
   - `payAgreedPrice` state baru di `src/hooks/useChatLogic.ts` (di-derive dari `agreed_price`/`budget`) untuk rincian akurat.
   - `app/c/direct-chat/[conversationId].tsx` — tambah card **Rincian Biaya** (Harga Jasa + Biaya Layanan + Biaya Gateway → **Total Tagihan**) via `calculatePaymentBreakdown` + `formatRupiah` di `showPaySheet`. Hanya klien yang punya pay sheet.
   - `src/components/chat/ChatModalsNative.tsx` — `MobileOrderDetailModal` sudah punya rincian lengkap sejak Fase 3.
2. **Sempurnakan Halaman Kandidat & Detail Pekerjaan** — ✅ SELESAI:
   - `app/c/pekerjaan/[id]/kandidat.tsx` — tambah tombol **"Tanya / Chat Kandidat"** (oren-outline, di atas Tolak/Pilih) + `handleChatKandidat` (find-or-create `conversations` `type=direct`, lalu `router.push /c/direct-chat/{id}`).
   - `src/lib/invoice.ts` — EXPORT baru `buildOrderTimeline(order) → TimelineStep[]` (Dibuat → Mitra Dipilih → Terbayar Escrow → Dikerjakan → Terkirim → Selesai), handle COD, cancelled, pending correctly.
   - `src/components/order/OrderTimeline.tsx` — komponen baru (dot hijau pomodoro utk done, oren clock utk active, merah X utk cancelled + garis vertikal).
   - `app/invoice/[id].tsx` — sisipkan card **Riwayat Pesanan** di bawah Rincian Biaya.
   - `src/components/chat/ChatModalsNative.tsx` — sisipkan card **Riwayat Pesanan** yang sama di `MobileOrderDetailModal`.
   - `app/c/direct-chat/[conversationId].tsx` — import `formatRupiah, calculatePaymentBreakdown` yg sebelumnya missing.

**Yang tersisa:** Fase 6 — push notifications.

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
