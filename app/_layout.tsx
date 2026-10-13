import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SupabaseProvider } from "../src/contexts/SupabaseContext";
import { PopupProvider } from "../src/components/PopupProvider.native";
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, StatusBar, Platform } from "react-native";
import "../global.css";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [ready, setReady] = useState(false);

  // Jangan stuck selamanya kalau font gagal load — fallback ke system font setelah 2.5 detik
  useEffect(() => {
    if (fontsLoaded || fontError) setReady(true);
    const t = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(t);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontError) console.warn("Font load error (fallback ke system font):", fontError);
  }, [fontError]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#faf8ff" }}>
        <ActivityIndicator size="large" color="#ff6b00" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      <SupabaseProvider>
        <PopupProvider>
          <Stack screenOptions={{ headerShown: false, animation: "none" }} />
        </PopupProvider>
      </SupabaseProvider>
    </SafeAreaProvider>
  );
}
