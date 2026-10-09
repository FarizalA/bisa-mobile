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
