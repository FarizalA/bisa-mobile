import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { validateEmail, validatePassword } from "../lib/validations";
import { setStoredUser } from "../lib/user-storage";

function normalizePhone(p: string) {
  return p.replace(/\s+/g, "").replace(/[^0-9]/g, "").replace(/^0/, "").replace(/^62/, "");
}

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

        // 1. Coba via email (case-insensitive) — sama kayak web login/page.tsx
        let { data: users, error } = await supabase
          .from("users_bisa")
          .select("*")
          .ilike("email", input)
          .order("id", { ascending: false })
          .limit(1);

        // 2. Jika tidak ketemu via email, cari via nomor HP
        if ((!users || users.length === 0) && !error) {
          const { data: allUsers } = await supabase.from("users_bisa").select("*").limit(1000);
          if (allUsers) {
            const target = normalizePhone(input);
            const matched = allUsers.filter((u: any) => u.phone && normalizePhone(u.phone) === target);
            if (matched.length > 0) users = matched;
          }
        }

        if (error) throw new Error("Gagal konek server: " + error.message);
        if (!users || users.length === 0) throw new Error("Akun dengan email / No HP tersebut tidak ditemukan.");

        const user = (users as any[])[0];
        if (user.password !== password) throw new Error("Kata sandi salah. Silakan coba lagi.");

        // Cek banned / dibekukan — sama kayak web
        if (user.kyc_status === "Dibekukan" || user.is_banned || user.status === "Dibekukan" || user.banned_at) {
          const safe: any = { ...user };
          delete safe.password;
          await setStoredUser(safe);
          router.replace("/(auth)/login" as any);
          Alert.alert("Akun dibekukan", "Akun kamu sedang dibekukan. Hubungi admin BISA.");
          return;
        }

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
        // DAFTAR — insert ke users_bisa (flow simple untuk mobile dulu)
        const normalizedEmail = email.trim().toLowerCase();
        const dup = await supabase.from("users_bisa").select("id").ilike("email", normalizedEmail).limit(1);
        if (dup.data && dup.data.length > 0) {
          setServerError("Email sudah terdaftar. Silakan langsung masuk.");
          return;
        }
        const { data, error } = await supabase
          .from("users_bisa")
          .insert([
            {
              email: normalizedEmail,
              password,
              name: normalizedEmail.split("@")[0],
              kyc_status: "Menunggu",
            },
          ])
          .select();
        if (error) throw new Error(error.message);
        const newUser: any = data?.[0];
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
