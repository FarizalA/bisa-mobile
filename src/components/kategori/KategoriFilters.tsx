import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Star, Flame, Banknote, Send } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { CATEGORIES } from "./KategoriConstants";

export function CategoryPills({
  selectedCategory,
  setSelectedCategory,
}: {
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
}) {
  return (
    <View className="bg-white border-b border-slate-100 py-2.5">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {CATEGORIES.map((cat) => {
          const isSelected =
            selectedCategory.toLowerCase() === cat.id.toLowerCase() ||
            selectedCategory.toLowerCase() === cat.label.toLowerCase() ||
            (cat.id === "Semua" && (selectedCategory === "Semua" || selectedCategory === "Semua Kategori" || selectedCategory === "Semua Jasa"));
          const IconComponent = cat.icon;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(cat.id === "Semua" ? "Semua Jasa" : cat.id);
              }}
              activeOpacity={0.85}
              className={`flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border ${isSelected ? "bg-[#ff6b00] border-[#ea580c] shadow-sm" : "bg-white border-slate-200"}`}
            >
              <IconComponent size={14} color={isSelected ? "#ffffff" : "#475569"} />
              <Text className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-700"}`}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function SortFilterBar({
  loading,
  count,
  sortBy,
  setSortBy,
  onlyAvailable,
  setOnlyAvailable,
  hasLocation,
}: {
  loading: boolean;
  count: number;
  sortBy: "populer" | "rating" | "termurah" | "terdekat";
  setSortBy: (v: "populer" | "rating" | "termurah" | "terdekat") => void;
  onlyAvailable: boolean;
  setOnlyAvailable: (v: boolean) => void;
  hasLocation: boolean;
}) {
  return (
    <View className="bg-white border-b border-slate-100 px-4 py-2 flex-row items-center justify-between gap-2">
      <Text className="text-[11px] font-bold text-slate-500 shrink-0">
        {loading ? "Memuat..." : `${count} Mitra`}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
        <TouchableOpacity onPress={() => setSortBy("rating")} className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1 ${sortBy === "rating" ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-100"}`}>
          <Star size={13} color="#f59e0b" fill="#f59e0b" />
          <Text className={`text-[11px] font-bold ${sortBy === "rating" ? "text-amber-800" : "text-slate-600"}`}>Rating</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSortBy("populer")} className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1 ${sortBy === "populer" ? "bg-orange-50 border border-orange-200" : "bg-slate-50 border border-slate-100"}`}>
          <Flame size={13} color="#ea580c" />
          <Text className={`text-[11px] font-bold ${sortBy === "populer" ? "text-orange-700" : "text-slate-600"}`}>Laris</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSortBy("termurah")} className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1 ${sortBy === "termurah" ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-100"}`}>
          <Banknote size={13} color="#16a34a" />
          <Text className={`text-[11px] font-bold ${sortBy === "termurah" ? "text-emerald-700" : "text-slate-600"}`}>Termurah</Text>
        </TouchableOpacity>
        {hasLocation ? (
          <TouchableOpacity onPress={() => setSortBy("terdekat")} className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1 ${sortBy === "terdekat" ? "bg-blue-50 border border-blue-200" : "bg-slate-50 border border-slate-100"}`}>
            <Send size={12} color="#2563eb" />
            <Text className={`text-[11px] font-bold ${sortBy === "terdekat" ? "text-blue-700" : "text-slate-600"}`}>Terdekat</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={() => setOnlyAvailable(!onlyAvailable)} className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 ${onlyAvailable ? "bg-emerald-600 border border-emerald-600" : "bg-slate-50 border border-slate-100"}`}>
          <View className={`w-1.5 h-1.5 rounded-full ${onlyAvailable ? "bg-white" : "bg-emerald-500"}`} />
          <Text className={`text-[11px] font-bold ${onlyAvailable ? "text-white" : "text-slate-600"}`}>Online</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
