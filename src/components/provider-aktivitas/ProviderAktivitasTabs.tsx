import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";

export type ProviderAktivitasTabKey = "semua" | "lamaran" | "ditawarkan" | "berjalan" | "selesai" | "dibatalkan";

interface Props {
  activeTab: ProviderAktivitasTabKey;
  setActiveTab: (t: ProviderAktivitasTabKey) => void;
  tabCounts: { lamaran: number; ditawarkan: number; berjalan: number; selesai: number; dibatalkan: number };
}

export default function ProviderAktivitasTabs({ activeTab, setActiveTab, tabCounts }: Props) {
  const tabs: Array<{ key: ProviderAktivitasTabKey; label: string; count: number | null }> = [
    { key: "semua", label: "Semua", count: null },
    { key: "lamaran", label: "Lamaran Saya", count: tabCounts.lamaran },
    { key: "ditawarkan", label: "Ditawarkan", count: tabCounts.ditawarkan },
    { key: "berjalan", label: "Berjalan", count: tabCounts.berjalan },
    { key: "selesai", label: "Selesai", count: tabCounts.selesai },
    { key: "dibatalkan", label: "Dibatalkan", count: tabCounts.dibatalkan },
  ];

  return (
    <View className="bg-white border-b border-gray-100">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingVertical: 8 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key);
              }}
              activeOpacity={0.85}
              className={`px-3.5 py-2 rounded-full flex-row items-center gap-1.5 border ${isActive ? "bg-emerald-600 border-emerald-700 shadow-xs" : "bg-gray-50 border-gray-200/80"}`}
            >
              <Text className={`text-xs font-bold ${isActive ? "text-white" : "text-gray-600"}`}>{tab.label}</Text>
              {tab.count !== null && tab.count > 0 && (
                <View className={`min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center ${isActive ? "bg-white" : "bg-emerald-100"}`}>
                  <Text className="text-[10px] font-black text-emerald-700">{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
