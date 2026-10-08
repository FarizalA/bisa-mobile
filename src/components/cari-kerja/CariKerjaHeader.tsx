import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { List, Map as MapIcon } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { type CariKerjaLogic } from "../../hooks/useCariKerjaLogic";

export default function CariKerjaHeader({ logic }: { logic: CariKerjaLogic }) {
  const { user, viewMode, setViewMode } = logic;

  return (
    <View className="bg-white/95 px-4 h-16 flex-row items-center justify-between border-b border-gray-100">
      <View className="flex-row items-center gap-2">
        <View className="w-9 h-9 rounded-full bg-emerald-600 items-center justify-center">
          <Text className="text-white font-extrabold text-lg">R</Text>
        </View>
        <View className="ml-1">
          <Text className="text-lg font-bold text-gray-900 leading-none">Radar</Text>
          <Text className="text-xs text-gray-500 font-semibold leading-tight">
            {user?.name?.split(" ")[0] || "Cari Kerja"}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-1 bg-gray-100 p-1 rounded-full">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode("list");
          }}
          activeOpacity={0.85}
          className={`p-2 rounded-full ${viewMode === "list" ? "bg-emerald-600" : ""}`}
        >
          <List size={18} color={viewMode === "list" ? "#ffffff" : "#6b7280"} strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode("map");
          }}
          activeOpacity={0.85}
          className={`p-2 rounded-full ${viewMode === "map" ? "bg-emerald-600" : ""}`}
        >
          <MapIcon size={18} color={viewMode === "map" ? "#ffffff" : "#6b7280"} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
