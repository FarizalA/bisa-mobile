import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { MessageSquare, ArrowLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { safeBack } from "@/lib/navigation";

export default function ProviderAktivitasHeader() {
  const router = useRouter();
  return (
    <View className="bg-white px-4 pt-3 pb-3 border-b border-gray-100 flex-row items-center justify-between shadow-xs">
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            safeBack(router, "/p/home")
          }}
          className="w-10 h-10 -ml-2 items-center justify-center rounded-full"
          activeOpacity={0.8}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View>
          <Text className="text-lg font-black text-gray-900 leading-tight tracking-tight">Pekerjaan Saya</Text>
          <Text className="text-[11px] font-semibold text-gray-500">Daftar aktivitas & pesanan masuk</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/p/chat" as any);
        }}
        activeOpacity={0.85}
        className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 items-center justify-center"
      >
        <MessageSquare size={18} color="#059669" />
      </TouchableOpacity>
    </View>
  );
}
