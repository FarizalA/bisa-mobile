import * as ImageManipulator from "expo-image-manipulator";

/**
 * Helper to compress images before upload
 * @param uri URI of the original image
 * @param maxWidth Maximum width of the image (default 1080)
 * @param compressQuality Quality 0 to 1 (default 0.7)
 * @returns URI of the compressed image
 */
export async function compressImage(uri: string, maxWidth = 1080, compressQuality = 0.7) {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: compressQuality, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.error("Image compression error:", error);
    // Jika gagal, kembalikan gambar aslinya agar proses upload tidak terhenti
    return uri;
  }
}

/**
 * Kompres gambar sekaligus mengembalikan base64 string untuk upload binary tanpa ketergantungan fetch(fileUri)
 */
export async function compressImageWithBase64(uri: string, maxWidth = 1080, compressQuality = 0.7) {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: compressQuality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return { uri: manipResult.uri, base64: manipResult.base64 };
  } catch (error) {
    console.error("Image compression error:", error);
    return { uri, base64: undefined };
  }
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
