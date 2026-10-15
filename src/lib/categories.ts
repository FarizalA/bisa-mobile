/**
 * SUMBER TUNGGAL kategori jasa BISA.
 *
 * Dipakai oleh: filter radar, katalog mitra, edit profil, posting pekerjaan.
 * JANGAN buat daftar kategori terpisah di file lain — impor dari sini.
 *
 * `id`   : nama resmi yang disimpan di kolom `users_bisa.kategori`.
 * `label`: teks yang ditampilkan (sekarang sama dengan id).
 * `icon` : nama ikon (material symbols / lucide) untuk tampilan.
 * `keywords`: kata kunci untuk mencocokkan `keahlian` teks-bebas (pencarian).
 */

export type KategoriDef = {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
};

export const CATEGORIES: KategoriDef[] = [
  { id: "Semua Jasa", label: "Semua Jasa", icon: "category", keywords: [] },
  { id: "Service Elektronik", label: "Service Elektronik", icon: "ac_unit", keywords: ["service", "servis", "elektronik", "ac", "kulkas", "mesin cuci", "tv", "freon"] },
  { id: "Tukang", label: "Tukang", icon: "architecture", keywords: ["tukang", "bangunan", "renovasi", "kayu", "las", "cat", "keramik", "batu", "atap", "plafon", "pipa", "sanitasi", "ledeng", "rumah"] },
  { id: "Kelistrikan", label: "Kelistrikan", icon: "bolt", keywords: ["listrik", "kabel", "lampu", "konslet", "panel", "saklar", "instalasi"] },
  { id: "Kebersihan Rumah", label: "Kebersihan Rumah", icon: "cleaning_services", keywords: ["kebersihan", "bersih", "cuci", "pel", "sapu", "setrika", "cleaning", "laundry", "taman", "kebun"] },
  { id: "Antar & Kurir", label: "Antar & Kurir", icon: "local_shipping", keywords: ["antar", "kurir", "kirim", "pindahan", "ojek", "logistik", "angkut"] },
  { id: "Layanan IT & Komputer", label: "Layanan IT & Komputer", icon: "computer", keywords: ["it", "laptop", "komputer", "hp", "web", "koding", "software", "cctv", "jaringan", "wifi", "digital"] },
  { id: "Otomotif & Bengkel", label: "Otomotif & Bengkel", icon: "two_wheeler", keywords: ["otomotif", "bengkel", "motor", "mobil", "ban", "oli", "montir", "cuci mobil", "cuci motor"] },
  { id: "Keamanan", label: "Keamanan", icon: "shield", keywords: ["keamanan", "satpam", "security", "jaga", "ronda"] },
  { id: "Sopir", label: "Sopir", icon: "directions_car", keywords: ["sopir", "driver", "mengemudi", "antar jemput"] },
  { id: "Baby Sitter", label: "Baby Sitter", icon: "child_care", keywords: ["baby sitter", "babysitter", "asuh", "anak", "pengasuh", "neni"] },
  { id: "Joki", label: "Joki", icon: "sports_esports", keywords: ["joki", "game", "tugas", "titip"] },
  { id: "Edukasi", label: "Edukasi", icon: "school", keywords: ["edukasi", "les", "tutor", "mengajar", "kursus", "guru", "privat", "belajar"] },
  { id: "Kreatif", label: "Kreatif", icon: "palette", keywords: ["kreatif", "foto", "video", "desain", "seni", "editor", "konten", "musik"] },
  { id: "Lainnya", label: "Lainnya", icon: "apps", keywords: ["lainnya", "lain"] },
];

/** Nama kategori tanpa "Semua Jasa" — untuk pemilihan (edit profil, dsb). */
export const CATEGORY_IDS = CATEGORIES.filter((c) => c.id !== "Semua Jasa").map((c) => c.id);

/** Label tampilan untuk sebuah id kategori. */
export function kategoriLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/** Kata kunci untuk sebuah kategori (untuk pencocokan teks keahlian). */
export function kategoriKeywords(id: string): string[] {
  return CATEGORIES.find((c) => c.id === id)?.keywords ?? [];
}

/**
 * Daftar nama kategori (termasuk "Semua Jasa") — bentuk lama yang masih dipakai
 * beberapa komponen filter. Dipertahankan agar tidak memutus impor yang ada.
 */
export const KATEGORI_JASA = CATEGORIES.map((c) => c.id);

/** Peta id kategori → nama ikon. Bentuk lama, dipertahankan untuk kompatibilitas. */
export const KATEGORI_ICON: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.icon])
);
