// src/lib/auth.ts
// Ambil JWT Supabase dari instance client yang sudah ada (SecureStore-backed).
// JANGAN createClient baru di sini — env NEXT_PUBLIC_* tidak ada di React Native.
import { supabase } from "./supabase";

/** Retrieve the current user's JWT access token. */
export async function getSupabaseToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error("Tidak terautentikasi – silakan login kembali.");
  }
  return data.session.access_token;
}
