import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Zap } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { PersonSearchIcon } from "./KategoriConstants";
import KategoriProviderCard from "./KategoriProviderCard";

export function KategoriPromoBanner() {
  const router = useRouter();
  return (
    <View className="rounded-2xl p-4 flex-row items-center justify-between gap-3 shadow-md" style={{ backgroundColor: "#ea580c" }}>
      <View className="flex-1 min-w-0 pr-2">
        <View className="bg-white/20 self-start px-2.5 py-0.5 rounded-full flex-row items-center gap-1 mb-1.5">
          <Zap size={12} color="#ffffff" />
          <Text className="text-[10px] font-extrabold text-white tracking-wide uppercase">SOLUSI LANGSUNG</Text>
        </View>
        <Text className="text-[15px] font-black text-white leading-tight">Pekerjaan Mendesak?</Text>
        <Text className="text-[11px] text-orange-100 mt-0.5 leading-snug">Posting kebutuhanmu & dapatkan tawaran langsung</Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/c/posting" as any);
        }}
        activeOpacity={0.9}
        className="px-4 py-2 bg-white rounded-xl shadow-sm shrink-0"
      >
        <Text className="text-xs font-black text-[#ea580c]">Posting Gratis</Text>
      </TouchableOpacity>
    </View>
  );
}

export function KategoriListState({
  loading, refreshing, providers, searchQuery, selectedCategory, resetFilters,
}: {
  loading: boolean; refreshing: boolean; providers: any[];
  searchQuery: string; selectedCategory: string; resetFilters: () => void;
}) {
  const router = useRouter();
  if (loading && !refreshing) return <ActivityIndicator color="#ff6b00" className="py-12" />;
  if (providers.length === 0) {
    return (
      <View className="mt-4 bg-white rounded-3xl border border-slate-100 p-8 items-center justify-center shadow-sm">
        <View className="w-16 h-16 rounded-2xl bg-orange-50 items-center justify-center mb-3.5 border border-orange-100/50">
          <PersonSearchIcon size={32} color="#ea580c" />
        </View>
        <Text className="text-base font-black text-slate-900 text-center">Tidak ada mitra ditemukan</Text>
        <Text className="text-xs text-slate-400 text-center mt-1.5 max-w-[260px] leading-relaxed">
          {searchQuery ? `Tidak ada hasil untuk "${searchQuery}". Coba kata kunci lain.` : "Belum ada mitra terverifikasi untuk kategori ini di lokasimu."}
        </Text>
        <View className="flex-row items-center gap-3 mt-6">
          {(searchQuery || selectedCategory !== "Semua Jasa") ? (
            <TouchableOpacity onPress={resetFilters} activeOpacity={0.8} className="px-4 py-2.5 rounded-full bg-slate-100">
              <Text className="text-xs font-bold text-slate-700">Reset Filter</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/c/posting" as any);
            }}
            activeOpacity={0.9}
            className="px-5 py-2.5 rounded-full bg-[#ea580c] shadow-md shadow-orange-500/20"
          >
            <Text className="text-xs font-bold text-white">Posting Kebutuhan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  return (
    <View className="flex-col gap-3.5 mt-3.5">
      {providers.map((prov: any) => (
        <KategoriProviderCard key={prov.id} prov={prov} />
      ))}
    </View>
  );
}
