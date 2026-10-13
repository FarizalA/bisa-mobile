import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Archive } from "lucide-react-native";

interface InboxTabBarProps {
  activeTab: "all" | "archive";
  onChange: (tab: "all" | "archive") => void;
  accent: string;
}

/**
 * Tab bar untuk Inbox: "Semua" dan "Arsip".
 * Arsip = chat yang diarsipkan user sendiri (tidak dihapus permanen, tetap tersimpan
 * sebagai bukti histori percakapan transaksi).
 */
export default function InboxTabBar({ activeTab, onChange, accent }: InboxTabBarProps) {
  const tabs: { key: "all" | "archive"; label: string }[] = [
    { key: "all", label: "Semua" },
    { key: "archive", label: "Arsip" },
  ];

  return (
    <View className="flex-row gap-2 px-4 py-2.5 bg-white border-b border-gray-100">
      {tabs.map((t) => {
        const isActive = activeTab === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            onPress={() => onChange(t.key)}
            className="flex-row items-center gap-1.5 px-4 py-2 rounded-full border"
            style={{
              backgroundColor: isActive ? accent : "#F9FAFB",
              borderColor: isActive ? accent : "#E5E7EB",
            } as any}
            activeOpacity={0.8}
          >
            {t.key === "archive" ? (
              <Archive size={13} color={isActive ? "#FFFFFF" : "#6B7280"} />
            ) : null}
            <Text className="text-xs font-bold" style={{ color: isActive ? "#FFFFFF" : "#6B7280" } as any}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
