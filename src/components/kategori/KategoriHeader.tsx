import React from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Search, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { RadarIcon } from "./KategoriConstants";
import { safeBack } from "@/lib/navigation";

export default function KategoriHeader({
  displayTitle,
  searchQuery,
  setSearchQuery,
}: {
  displayTitle: string;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) {
  const router = useRouter();
  return (
    <View className="bg-white px-4 pt-3 pb-3 border-b border-slate-100 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1 min-w-0 pr-2">
          <TouchableOpacity
            onPress={() => safeBack(router, "/c/home")}
            activeOpacity={0.8}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center shrink-0"
          >
            <ArrowLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-[#ea580c]" />
              <Text className="text-[11px] font-black text-[#ea580c] uppercase tracking-wider">KATALOG MITRA BISA</Text>
            </View>
            <Text className="text-xl font-black text-slate-900 leading-tight mt-0.5" numberOfLines={1}>
              {displayTitle}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/c/radar" as any);
          }}
          activeOpacity={0.85}
          className="px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 flex-row items-center gap-1.5 shrink-0"
        >
          <RadarIcon size={16} color="#ea580c" />
          <Text className="text-xs font-bold text-[#ea580c]">Radar</Text>
        </TouchableOpacity>
      </View>
      <View className="mt-3">
        <View className="h-10 bg-slate-100/90 rounded-2xl px-3.5 flex-row items-center gap-2.5 border border-slate-200/60">
          <Search size={17} color="#94a3b8" />
          <TextInput
            className="flex-1 text-xs font-medium text-slate-900 h-full"
            placeholder="Cari keahlian, nama, atau lokasi..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} className="w-5 h-5 rounded-full bg-slate-300 items-center justify-center">
              <X size={12} color="#475569" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}
