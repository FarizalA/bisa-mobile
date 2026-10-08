import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Lock } from "lucide-react-native";
import { safeBack } from "@/lib/navigation";

export default function DaftarHeader() {
  const router = useRouter();
  return (
    <View className="h-16 px-4 flex-row items-center justify-between bg-white/90 border-b border-gray-100">
      <View className="flex-row items-center gap-2 flex-1">
        <TouchableOpacity
          onPress={() => safeBack(router, "/")}
          className="w-9 h-9 rounded-full items-center justify-center active:bg-gray-100"
        >
          <ArrowLeft size={22} color="#1f2937" />
        </TouchableOpacity>
        <View className="flex-1 pr-2">
          <Text className="text-[10px] font-bold text-[#ff6b00] tracking-widest">BISA PARTNER</Text>
          <Text className="text-[16px] font-black text-gray-900 leading-5">Pendaftaran Lengkap & KYC</Text>
        </View>
      </View>
      <View className="bg-green-100 px-3 py-1 rounded-full flex-row items-center gap-1">
        <Lock size={11} color="#15803d" />
        <Text className="text-[11px] font-bold text-green-800">Aman</Text>
      </View>
    </View>
  );
}
