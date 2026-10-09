import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThumbsUp, ArrowRight, BadgeCheck, ShieldCheck, Zap } from "lucide-react-native";
import { useState, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { getStoredUser } from "../src/lib/user-storage";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState("Ada yang bisa dibantu? ✨");

  // Session check auto-redirect
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const user: any = await getStoredUser();
        if (user && user.id) {
          if (user.kyc_status === "Terverifikasi" || user.kyc_status === "approved") {
            router.replace("/c/home" as any);
            return;
          }
          if (user.kyc_status === "Menunggu") {
            router.replace("/waiting" as any);
            return;
          }
        }
      } catch (err) {
        console.warn("Session check error:", err);
      } finally {
        setLoading(false);
      }
    };
    checkUserSession();
  }, []);

  const handleMascotClick = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cheers = [
      "Halo kawan! 👋",
      "Ada yang bisa dibantu? ✨",
      "Siap sedia setiap saat! 🛠️",
      "Pasti BISA! 💪",
    ];
    setBubbleText(cheers[Math.floor(Math.random() * cheers.length)]);
    setShowBubble(true);
    setTimeout(() => setShowBubble(false), 2200);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#faf8ff] items-center justify-center">
        <ActivityIndicator size="large" color="#ff6b00" />
        <Text className="text-[12px] font-bold text-gray-500 mt-2">Memuat BISA App...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#faf8ff]">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-5 py-6 items-center justify-center max-w-[420px] w-full self-center">

          {/* Logo */}
          <View className="items-center">
            <View className="flex-row items-center justify-center">
              <Text className="text-[40px] font-black text-[#ff6b00] tracking-tight">B</Text>
              <View className="mx-1">
                <ThumbsUp size={28} color="#ff6b00" fill="#ff6b00" />
              </View>
              <Text className="text-[40px] font-black text-[#ff6b00] tracking-tight">SA</Text>
            </View>
            <Text className="text-[15px] font-semibold text-[#131b2e] text-center mt-1">
              Bisa bantu siapa saja. Bisa dikerjakan siapa saja.
            </Text>
          </View>

          {/* Mascot */}
          <View className="items-center mt-4">
            <TouchableOpacity activeOpacity={0.92} onPress={handleMascotClick} className="w-52 h-52 items-center justify-center">
              <Image
                source={require("../assets/maskot-jempol.png")}
                style={{ width: 208, height: 208 }}
                resizeMode="contain"
              />
              {showBubble ? (
                <View className="absolute -top-1 right-0 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                  <Text className="text-[12px] font-bold text-[#131b2e]">{bubbleText}</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <View className="mt-3 flex-row items-center bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
              <View className="h-2.5 w-2.5 rounded-full bg-[#006c49] mr-2" />
              <Text className="text-[13px] font-bold text-[#131b2e]">12.450+ Mitra Siap Membantu</Text>
            </View>
          </View>

          {/* Actions */}
          <View className="w-full gap-3 mt-6">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(auth)/daftar" as any);
              }}
              activeOpacity={0.88}
              className="w-full h-12 bg-[#ff6b00] rounded-full items-center justify-center flex-row shadow-md"
            >
              <Text className="text-white text-[17px] font-bold mr-2">Daftar Sekarang</Text>
              <ArrowRight size={18} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push("/(auth)/login" as any)}
              className="w-full h-12 bg-white rounded-full items-center justify-center border border-gray-200 shadow-sm"
            >
              <Text className="text-[#131b2e] text-[17px] font-bold">Masuk</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push("/c/home" as any)} 
              activeOpacity={0.7}
              className="items-center py-2 mt-1"
            >
              <Text className="text-[13px] font-semibold text-[#5a4136] text-center">
                Jelajahi Aplikasi →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Proof bar */}
          <View className="flex-row w-full gap-2 mt-4">
            <View className="flex-1 bg-white p-3 rounded-2xl items-center border border-gray-100 shadow-sm">
              <BadgeCheck size={18} color="#ff6b00" />
              <Text className="text-[11px] font-bold text-[#5a4136] mt-1 text-center">Mitra Terverifikasi</Text>
            </View>
            <View className="flex-1 bg-white p-3 rounded-2xl items-center border border-gray-100 shadow-sm">
              <ShieldCheck size={18} color="#006c49" />
              <Text className="text-[11px] font-bold text-[#5a4136] mt-1 text-center">Garansi Aman</Text>
            </View>
            <View className="flex-1 bg-white p-3 rounded-2xl items-center border border-gray-100 shadow-sm">
              <Zap size={18} color="#7c5800" />
              <Text className="text-[11px] font-bold text-[#5a4136] mt-1 text-center">Respon Kilat</Text>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
