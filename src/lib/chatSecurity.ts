/**
 * Keamanan Chat: Filter Nomor HP, Nomor WhatsApp, dan Kontak Langsung
 */

const WORD_DIGIT_MAP: { [key: string]: string } = {
  nol: "0", kosong: "0", o: "0",
  satu: "1", st: "1",
  dua: "2", da: "2",
  tiga: "3", tg: "3",
  empat: "4", pt: "4",
  lima: "5", lm: "5",
  enam: "6", nm: "6",
  tujuh: "7", tj: "7",
  delapan: "8", lapan: "8", lp: "8",
  sembilan: "9", mbilan: "9",
};

export function containsPhoneNumber(text: string): { isForbidden: boolean; reason?: string } {
  if (!text) return { isForbidden: false };

  // 0. Whitelist system messages & special cards
  if (
    text.startsWith("[OFFER]:") ||
    text.startsWith("[ORDER]:") ||
    text.startsWith("[ORDER_RECEIPT]:") ||
    text.startsWith("[PAYMENT_PROOF]:") ||
    text.startsWith("[DELIVERY]:") ||
    text.startsWith("[REVISION]:")
  ) {
    return { isForbidden: false };
  }

  // Remove URLs before checking digits
  const textWithoutUrls = text.replace(/https?:\/\/[^\s]+/gi, "");

  if (!textWithoutUrls.trim() && text.includes("http")) {
    return { isForbidden: false };
  }

  const clean = textWithoutUrls.toLowerCase();

  // 1. Deteksi kata kunci WA / kontak langsung dengan angka
  const waKeywordRegex = /\b(wa|whatsapp|wea|w\.a|w\/a|hubungi|telp|telepon|telfon|kontak|no hp|nomor hp|nomer hp|call me|dm ig|telegram)\b/i;
  if (waKeywordRegex.test(clean) && /[0-9]{4,}/.test(clean.replace(/\s+/g, ""))) {
    return {
      isForbidden: true,
      reason: "Dilarang membagikan kontak WhatsApp / telepon demi keamanan transaksi BISA.",
    };
  }

  // 2. Normalisasi kata angka
  let normalizedWords = clean;
  for (const [word, digit] of Object.entries(WORD_DIGIT_MAP)) {
    const reg = new RegExp(`\\b${word}\\b`, "gi");
    normalizedWords = normalizedWords.replace(reg, digit);
  }

  // 3. Ekstrak hanya digit
  const onlyDigits = normalizedWords.replace(/[^0-9]/g, "");

  if (/^(08|628)[0-9]{7,12}$/.test(onlyDigits)) {
    return {
      isForbidden: true,
      reason: "Nomor telepon / kontak dilarang dikirim sebelum transaksi selesai.",
    };
  }

  if (/(08|628)[0-9]{8,12}/.test(onlyDigits)) {
    return {
      isForbidden: true,
      reason: "Nomor telepon / kontak dilarang dikirim demi keamanan bersama.",
    };
  }

  // 4. Deteksi deretan angka telepon >= 10 digit
  if (/[0-9]{10,14}/.test(onlyDigits)) {
    return {
      isForbidden: true,
      reason: "Pesan terindikasi mengandung nomor kontak / rekening luar aplikasi.",
    };
  }

  // 5. Pola Regex teks dengan pembatas
  const formattedPhoneRegex = /(\+62|62|08)[0-9\s\-_.]{7,14}/i;
  if (formattedPhoneRegex.test(clean)) {
    return {
      isForbidden: true,
      reason: "Nomor HP / telepon dilarang dibagikan melalui ruang chat.",
    };
  }

  return { isForbidden: false };
}
