export const KATEGORI_JASA = [
  "Semua Jasa",
  "Service AC & Elektronik",
  "Kelistrikan",
  "Tukang & Sanitasi Air",
  "Pertukangan Bangunan",
  "Kebersihan Rumah",
  "Antar & Kurir",
  "Layanan IT & Komputer",
  "Otomotif & Bengkel",
  "Lainnya",
] as const;

export const KATEGORI_ICON: Record<string, string> = {
  "Service AC & Elektronik": "ac_unit",
  Kelistrikan: "bolt",
  "Tukang & Sanitasi Air": "plumbing",
  "Pertukangan Bangunan": "architecture",
  "Kebersihan Rumah": "cleaning_services",
  "Antar & Kurir": "local_shipping",
  "Layanan IT & Komputer": "computer",
  "Otomotif & Bengkel": "two_wheeler",
  Lainnya: "apps",
  "Semua Jasa": "category",
};

export type KategoriJasa = (typeof KATEGORI_JASA)[number];
