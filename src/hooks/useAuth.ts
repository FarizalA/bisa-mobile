import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { validateEmail, validatePassword } from "../lib/validations";
import { setStoredUser } from "../lib/user-storage";
import { setBisaToken } from "../lib/bisa-token";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://bisa-admin.vercel.app").replace(/\/$/, "");

export function useAuthForm(mode: "login" | "daftar") {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState("");

  const submit = async () => {
    const e1 = validateEmail(email);
    const e2 = validatePassword(password, mode === "daftar" ? 6 : 1);
    const next = { email: e1 || undefined, password: e2 || undefined };
    setFieldErrors(next);
    if (e1 || e2) return;

    setServerError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const input = email.trim();

        // Login via backend: verifikasi + terbitkan token BISA (HS256).
        // Client tidak menyimpan logika password sendiri; backend yang memutuskan.
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: input, password }),
        });
        const data = await res.json().catch(() => ({} as any));
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Email / No HP atau kata sandi salah.");
        }

        // Simpan token BISA — dipakai sebagai Bearer di semua endpoint escrow.
        if (data.token) await setBisaToken(data.token);

        const user = data.user as any;
        const safe: any = { ...user };
        delete safe.password;
        await setStoredUser(safe);

        if (user.kyc_status === "Terverifikasi" || user.kyc_status === "approved") {
          router.replace("/");
        } else {
          // Menunggu verifikasi (KYC) — arahkan ke waiting
          router.replace("/waiting" as any);
        }
      } else {
        // DAFTAR — lewat backend (password di-hash di server, bukan plaintext di client).
        const normalizedEmail = email.trim().toLowerCase();
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password, name: normalizedEmail.split("@")[0] }),
        });
        const data = await res.json().catch(() => ({} as any));
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Gagal mendaftar. Coba lagi.");
        }

        if (data.token) await setBisaToken(data.token);
        const newUser: any = data.user;
        if (newUser) {
          const safe: any = { ...newUser };
          delete safe.password;
          await setStoredUser(safe);
        }
        Alert.alert("Berhasil", "Akun dibuat. Menunggu verifikasi admin.");
        router.replace("/waiting" as any);
      }
    } catch (e: any) {
      setServerError(e?.message ?? "Gagal terhubung ke database.");
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    fieldErrors,
    serverError,
    submit,
  };
}
