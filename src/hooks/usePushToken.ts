// Hook: registrasi & manajemen Expo Push Token (Fase 6)
import { useEffect, useRef, useState } from "react";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Device from "expo-device";
import { getBisaToken } from "../lib/bisa-token";

const BACKEND_URL = (process.env.EXPO_PUBLIC_API_URL || "https://bisa-admin.vercel.app").replace(/\/$/, "");

// Lazy-load expo-notifications agar Expo Go (SDK 53+) tidak crash.
let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
} catch {
  console.log("[Push] expo-notifications tidak tersedia di environment ini — skip");
}

export function usePushToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const registeredRef = useRef(false);

  useEffect(() => {
    register();
    return () => {};
  }, []);

  const register = async () => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    // Expo Go (SDK 53+) tidak mendukung remote push — abort di sini.
    if (!Notifications) {
      console.log("[Push] expo-notifications tidak termuat — skip registrasi");
      setLoading(false);
      return;
    }

    // Web tidak mendukung remote push tanpa VAPID key — skip total.
    if (Platform.OS === "web") {
      console.log("[Push] Skip — web tidak mendukung push tanpa VAPID key");
      setLoading(false);
      return;
    }

    try {
      if (!Device.isDevice) {
        console.log("[Push] Skip — bukan physical device");
        setLoading(false);
        return;
      }

      // Android: channel wajib sebelum minta permission/token
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("bisa-default", {
          name: "BISA Notifikasi",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF6B00",
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("[Push] Permission tidak diberikan:", finalStatus);
        setLoading(false);
        return;
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

      if (!projectId) {
        console.error("[Push] Project ID tidak ditemukan di app.config.js");
        setLoading(false);
        return;
      }

      const expoToken = (
        await Notifications.getExpoPushTokenAsync({ projectId })
      ).data;

      setToken(expoToken);
      await sendToBackend(expoToken);
    } catch (e) {
      console.error("[Push] Gagal registrasi:", e);
    } finally {
      setLoading(false);
    }
  };

  // Listen token change (roll)
  useEffect(() => {
    if (!Notifications) return;
    if (Platform.OS === "web") return;
    const sub = Notifications.addPushTokenListener(async (newToken: any) => {
      setToken(newToken.data);
      await sendToBackend(newToken.data);
    });
    return () => sub.remove();
  }, []);

  return { token, loading };
}

async function sendToBackend(token: string) {
  try {
    const accessToken = await getBisaToken();
    if (!accessToken) {
      console.warn("[Push] Tidak ada access token — skip kirim ke backend");
      return;
    }

    const res = await fetch(`${BACKEND_URL}/api/user/push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      console.warn("[Push] Backend error:", res.status, err?.error || res.statusText);
    }
  } catch (e) {
    console.error("[Push] Gagal kirim token ke backend:", e);
  }
}

export async function clearPushToken() {
  try {
    const accessToken = await getBisaToken();
    if (!accessToken) return;
    await fetch(`${BACKEND_URL}/api/user/push-token`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {}
}
