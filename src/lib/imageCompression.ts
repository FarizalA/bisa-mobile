import * as ImageManipulator from "expo-image-manipulator";

/**
 * Standar kompresi foto BISA — dipakai SEMUA titik upload:
 * chat gambar, lampiran hasil kerja, posting pekerjaan, avatar, galeri, portofolio.
 *
 * Prinsip:
 * - Tidak ada lagi penolakan berdasarkan ukuran file. Foto berapa pun tetap dikompresi.
 * - Resolusi dibatasi pada sisi terpanjang (rasio aspek dijaga otomatis oleh ImageManipulator).
 * - Kualitas JPEG 0.7 (penurunan ukuran 70-90%, tetap tajam di layar HP).
 * - Kegagalan kompresi tidak menghentikan upload (fallback ke file asli).
 */

/** Sisi terpanjang maksimum untuk foto umum (chat, delivery, posting). */
export const DEFAULT_MAX_DIMENSION = 1280;
/** Sisi terpanjang maksimum untuk foto profil (avatar 1:1, galeri, portofolio). */
export const PROFILE_MAX_DIMENSION = 1080;
/** Kualitas JPEG 0..1. */
export const DEFAULT_QUALITY = 0.7;

export type CompressOptions = {
  /** Sisi terpanjang maksimum dalam px. Default `DEFAULT_MAX_DIMENSION`. */
  maxDimension?: number;
  /** Kualitas JPEG 0..1. Default `DEFAULT_QUALITY`. */
  quality?: number;
  /** Kembalikan base64 untuk upload biner tanpa `fetch(uri)` (cross-platform). */
  base64?: boolean;
};

type CompressResult = {
  uri: string;
  base64?: string;
  width: number;
  height: number;
};

async function runCompress(uri: string, opts: CompressOptions): Promise<CompressResult> {
  const maxDimension = Number(opts.maxDimension) > 0 ? Number(opts.maxDimension) : DEFAULT_MAX_DIMENSION;
  const quality = typeof opts.quality === "number" ? opts.quality : DEFAULT_QUALITY;

  // Resize hanya diberi satu sisi → ImageManipulator menjaga rasio aspek otomatis.
  const res = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxDimension } }],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: !!opts.base64,
    }
  );

  return {
    uri: res.uri,
    base64: res.base64 ?? undefined,
    width: res.width ?? 0,
    height: res.height ?? 0,
  };
}

/**
 * Kompres foto sebelum diunggah. Aman untuk foto kamera resolusi tinggi (>15MB)
 * karena resize dilakukan lebih dulu sebelum re-encode JPEG.
 */
export async function compressImageDetailed(uri: string, options: CompressOptions = {}): Promise<CompressResult> {
  try {
    return await runCompress(uri, options);
  } catch (error) {
    console.error("[imageCompression] gagal kompresi, pakai file asli:", error);
    return { uri, base64: undefined, width: 0, height: 0 };
  }
}

/**
 * Kompres + kembalikan base64 untuk upload biner tanpa `fetch(fileUri)`.
 */
export async function compressImageWithBase64(
  uri: string,
  maxDimension = DEFAULT_MAX_DIMENSION,
  quality = DEFAULT_QUALITY
) {
  const res = await compressImageDetailed(uri, { maxDimension, quality, base64: true });
  return { uri: res.uri, base64: res.base64 };
}

/**
 * Kompres beberapa foto secara berurutan (hemat memori di HP kelas bawah).
 */
export async function compressMany(uris: string[], options: CompressOptions = {}) {
  const out: (CompressResult & { originalUri: string })[] = [];
  for (const uri of uris) {
    out.push({ ...(await compressImageDetailed(uri, options)), originalUri: uri });
  }
  return out;
}

/**
 * Konversi base64 string ke Uint8Array (pure cross-platform: Web, Android Hermes, iOS)
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
  if (typeof atob === "function") {
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let bufferLength = cleanBase64.length * 0.75;
  if (cleanBase64[cleanBase64.length - 1] === "=") {
    bufferLength--;
    if (cleanBase64[cleanBase64.length - 2] === "=") bufferLength--;
  }
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < cleanBase64.length; i += 4) {
    const enc1 = chars.indexOf(cleanBase64[i]);
    const enc2 = chars.indexOf(cleanBase64[i + 1]);
    const enc3 = chars.indexOf(cleanBase64[i + 2]);
    const enc4 = chars.indexOf(cleanBase64[i + 3]);
    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (enc3 !== 64 && enc3 !== -1) bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    if (enc4 !== 64 && enc4 !== -1) bytes[p++] = ((enc3 & 3) << 6) | enc4;
  }
  return bytes;
}