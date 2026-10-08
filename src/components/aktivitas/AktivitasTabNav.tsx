import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";

export type AktivitasTabKey = "semua" | "belum_bayar" | "berjalan" | "selesai" | "dibatalkan";

interface AktivitasTabNavProps {
  activeTab: AktivitasTabKey;
  setActiveTab: (tab: AktivitasTabKey) => void;
  tabCounts: {
    belum_bayar: number;
    berjalan: number;
    selesai: number;
    dibatalkan: number;
  };
}

export default function AktivitasTabNav({
  activeTab,
  setActiveTab,
  tabCounts,
}: AktivitasTabNavProps) {
  const tabs: Array<{ key: AktivitasTabKey; label: string; count: number | null }> = [
    { key: "semua", label: "Semua", count: null },
    { key: "belum_bayar", label: "Belum Bayar", count: tabCounts.belum_bayar },
    { key: "berjalan", label: "Berjalan", count: tabCounts.berjalan },
    { key: "selesai", label: "Selesai", count: tabCounts.selesai },
    { key: "dibatalkan", label: "Dibatalkan", count: tabCounts.dibatalkan },
  ];

  return (
    <View className="bg-white border-b border-gray-100">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingVertical: 8 }}
      >
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
              className={`px-3.5 py-2 rounded-full flex-row items-center gap-1.5 border ${
                isActive
                  ? "bg-[#ff6b00] border-[#ea580c] shadow-xs"
                  : "bg-gray-50 border-gray-200/80"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isActive ? "text-white" : "text-gray-600"
                }`}
              >
                {tab.label}
              </Text>
              {tab.count !== null && tab.count > 0 && (
                <View
                  className={`min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center ${
                    isActive ? "bg-white" : "bg-orange-100"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black ${
                      isActive ? "text-[#ea580c]" : "text-[#ea580c]"
                    }`}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
