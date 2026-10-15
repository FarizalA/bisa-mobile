import { Stack, router, SplashScreen } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SupabaseProvider } from "../src/contexts/SupabaseContext";
import { PopupProvider } from "../src/components/PopupProvider.native";
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, StatusBar, Platform } from "react-native";

import { usePushToken } from "../src/hooks/usePushToken";
import "../global.css";

// Tahan splash native (assets/splash-icon.png) sampai konten siap
SplashScreen.preventAutoHideAsync().catch(() => {});

// Lazy-load expo-notifications agar tidak crash di Expo Go (SDK 53+ hapus remote push di Expo Go)
let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
} catch {
  console.log("[Push] expo-notifications tidak tersedia (Expo Go) — skip");
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Deep-link handler: ketika user tap notifikasi, arahkan ke URL di data
function useNotificationObserver() {
  useEffect(() => {
    if (!Notifications) return;
    // Web tidak punya remote push — jangan sentuh API notifications di sini.
    if (Platform.OS === "web") return;
    function redirect(notification: any) {
      const data: any = notification.request.content.data || {};
      const url: string | undefined = data.url;
      if (typeof url === "string" && url) {
        try { router.push(url as any); } catch (e) { console.warn("[Push] redirect gagal:", e); }
      }
    }

    let last: any;
    try {
      last = Notifications.getLastNotificationResponse?.();
    } catch (e) {
      console.warn("[Push] getLastNotificationResponse gagal:", e);
    }
    if (last?.notification) redirect(last.notification);

    if (typeof Notifications.addNotificationResponseReceivedListener !== "function") return;
    const sub = Notifications.addNotificationResponseReceivedListener((response: any) => {
      redirect(response.notification);
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [ready, setReady] = useState(false);

  // Push token registration (Fase 6)
  usePushToken();
  useNotificationObserver();

  // Jangan stuck selamanya kalau font gagal load — fallback ke system font setelah 2.5 detik
  useEffect(() => {
    if (fontsLoaded || fontError) setReady(true);
    const t = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(t);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontError) console.warn("Font load error (fallback ke system font):", fontError);
  }, [fontError]);

  // Sembunyikan splash native begitu konten siap
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      <SupabaseProvider>
        <PopupProvider>
          <Stack screenOptions={{ headerShown: false, animation: "none" }} />
          {/* Overlay saat font/bundle belum siap. Stack HARUS selalu di-mount agar
              navigation context tersedia — kalau tidak, screen bisa crash
              "Couldn't find a navigation context" saat redirect awal. */}
          {!ready && (
            <View
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#faf8ff" }}
            >
              <ActivityIndicator size="large" color="#ff6b00" />
            </View>
          )}
        </PopupProvider>
      </SupabaseProvider>
    </SafeAreaProvider>
  );
}
