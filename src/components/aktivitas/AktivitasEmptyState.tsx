import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { AktivitasTabKey } from "./AktivitasTabNav";

interface AktivitasEmptyStateProps {
  activeTab: AktivitasTabKey;
  jobsCount: number;
  onStartPosting: () => void;
}

export default function AktivitasEmptyState({ activeTab, jobsCount, onStartPosting }: AktivitasEmptyStateProps) {
  const emojiMap: Record<AktivitasTabKey, string> = {
    semua: "🛒",
    belum_bayar: "💳",
    berjalan: "⚙️",
    selesai: "✅",
    dibatalkan: "❌",
  };

  const titleMap: Record<AktivitasTabKey, string> = {
    semua: jobsCount === 0 ? "Belum Ada Pesanan" : "Tidak Ada Data",
    belum_bayar: "Tidak Ada Pesanan Belum Bayar",
    berjalan: "Tidak Ada Pekerjaan Berjalan",
    selesai: "Tidak Ada Pekerjaan Selesai",
    dibatalkan: "Tidak Ada Pekerjaan Dibatalkan",
  };

  const descMap: Record<AktivitasTabKey, string> = {
    semua:
      jobsCount === 0
        ? "Kamu belum memposting kebutuhan apapun. Ayo mulai posting untuk dapatkan mitra ahli"
        : "Tidak ada data pada tab ini",
    belum_bayar: "Tidak ada order yang menunggu pembayaran.",
    berjalan: "Tidak ada pekerjaan sedang diproses.",
    selesai: "Tidak ada pekerjaan yang selesai.",
    dibatalkan: "Tidak ada pekerjaan yang dibatalkan.",
  };

  return (
    <View className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 flex flex-col items-center justify-center text-center mt-10 shadow-sm">
      <Text className="text-5xl opacity-50 mb-4">{emojiMap[activeTab]}</Text>
      <Text className="font-bold text-lg text-gray-900 mb-1">{titleMap[activeTab]}</Text>
      <Text className="text-sm text-gray-500 mb-6">{descMap[activeTab]}</Text>
      {activeTab === "semua" && jobsCount === 0 && (
        <TouchableOpacity onPress={onStartPosting} className="bg-[#ff6b00] py-3 px-6 rounded-full shadow-md">
          <Text className="text-white font-bold text-sm">Mulai Posting Kebutuhan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
