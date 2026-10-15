/**
 * Reverse geocoding terpusat (OpenStreetMap Nominatim).
 *
 * Nominatim MEMBLOKIR request tanpa `User-Agent` (HTTP 403 "Access denied"),
 * dan di Android React Native sering tidak mengirim UA → alamat singkat tidak
 * pernah terisi. Karena itu header UA + Referer wajib diset eksplisit.
 *
 * Pemakaian:
 *   const alamat = await reverseGeocode(lat, lon); // string kecamatan/kota atau ""
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "BISA-Mobile/1.0 (https://bisa-admin.vercel.app)";

/** Ambil nama wilayah singkat (kecamatan/kota) dari koordinat. "" bila gagal. */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`${NOMINATIM_BASE}?format=json&lat=${lat}&lon=${lon}`, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://bisa-admin.vercel.app",
        Accept: "application/json",
      },
    });
    if (!res.ok) return "";
    const data = await res.json();
    const a = data?.address;
    if (!a) return "";
    return (
      a.suburb ||
      a.village ||
      a.town ||
      a.city_district ||
      a.county ||
      a.city ||
      ""
    );
  } catch {
    return "";
  }
}
