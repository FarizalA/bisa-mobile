import React from "react";
import { View, Text, Image } from "react-native";

export default function DaftarProgressCard({
  ktpUri,
  faceUri,
}: {
  ktpUri: string | null;
  faceUri: string | null;
}) {
  const progress = ktpUri && faceUri ? 95 : ktpUri || faceUri ? 75 : 50;
  return (
    <View className="px-4 pt-3">
      <View className="bg-white rounded-2xl p-4 border border-gray-100">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <View className="w-6 h-6 rounded-full bg-[#ff6b00] items-center justify-center">
              <Text className="text-white text-[11px] font-black">1</Text>
            </View>
            <Text className="text-[13px] font-bold text-gray-900">Data Akun & Identitas</Text>
          </View>
          <Text className="text-[11px] font-bold text-[#ff6b00]">Langkah 1 / 2</Text>
        </View>
        <View className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex-row">
          <View className="h-full bg-[#ff6b00] rounded-full" style={{ width: `${progress}%` as any }} />
        </View>
        <View className="flex-row justify-between mt-2">
          <Text className="text-[11px] font-semibold text-gray-700">Informasi Pribadi & KYC ({progress}%)</Text>
          <Text className="text-[11px] text-gray-400">Verifikasi Admin</Text>
        </View>
      </View>
      <View className="mt-3 rounded-2xl p-3 border border-gray-100 flex-row items-center gap-2 overflow-hidden" style={{ backgroundColor: "#fff7ed" }}>
        <Image source={require("../../../assets/maskot3.png")} style={{ width: 84, height: 84 }} resizeMode="contain" />
        <View className="flex-1 bg-white p-2.5 rounded-xl border border-gray-100">
          <View className="flex-row items-center gap-1 mb-1">
            <Text className="text-[10px]">👋</Text>
            <Text className="text-[9px] font-bold text-[#ff6b00] tracking-widest">HALO PARTNER BARU!</Text>
          </View>
          <Text className="text-[11px] text-gray-800 leading-4 font-medium">
            Lengkapi datamu <Text className="font-black text-[#ff6b00]">sekali saja</Text> untuk mulai cari cuan dengan aman!
          </Text>
        </View>
      </View>
    </View>
  );
}
