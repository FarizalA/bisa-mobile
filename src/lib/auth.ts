// src/lib/auth.ts
// Token BISA custom JWT dari POST /api/auth/login — disimpan di SecureStore.
// BUKAN Supabase Auth: mobile pakai login custom (tabel users_bisa).
import { getBisaToken } from "./bisa-token";

/** Retrieve BISA session token. */
export async function getSupabaseToken(): Promise<string> {
  const token = await getBisaToken();
  if (token) return token;
  throw new Error("Tidak terautentikasi – silakan login kembali.");
}
