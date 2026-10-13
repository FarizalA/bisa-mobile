import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Clock, Wrench, Wallet } from "lucide-react-native";

interface ProviderKpiGridProps {
  stats: {
    pendingOffers: number;
    pendapatan: number;
  };
  activeJobsCount: number;
  onTarikDana: () => void;
}

export default function ProviderKpiGrid({
  stats,
  activeJobsCount,
  onTarikDana,
}: ProviderKpiGridProps) {
  return (
    <View className="flex-row gap-2">
      {/* Box 1: Penawaran */}
      <View className="flex-1 bg-yellow-50 rounded-xl p-3 flex-col justify-between shadow-xs border border-yellow-100">
        <View className="w-7 h-7 rounded-full bg-yellow-200 items-center justify-center mb-1">
          <Clock size={15} color="#a16207" />
        </View>
        <View>
          <Text className="text-2xl font-black text-gray-900 leading-tight">
            {stats.pendingOffers}
          </Text>
          <Text className="text-[11px] font-semibold text-gray-500">
            Penawaran
          </Text>
        </View>
      </View>

      {/* Box 2: Job Aktif */}
      <View className="flex-1 bg-emerald-50 rounded-xl p-3 flex-col justify-between shadow-xs border border-emerald-100">
        <View className="w-7 h-7 rounded-full bg-emerald-200 items-center justify-center mb-1">
          <Wrench size={15} color="#047857" />
        </View>
        <View>
          <Text className="text-2xl font-black text-gray-900 leading-tight">
            {activeJobsCount}
          </Text>
          <Text className="text-[11px] font-semibold text-gray-500">
            Job Aktif
          </Text>
        </View>
      </View>

      {/* Box 3: Saldo Dompet & Tarik Dana (1:1 Dompet BISA) */}
      <View className="flex-1 bg-emerald-50 rounded-xl p-3 flex-col justify-between shadow-xs border border-emerald-100">
        <View className="w-7 h-7 rounded-full bg-emerald-200 items-center justify-center mb-1">
          <Wallet size={15} color="#047857" />
        </View>
        <View>
          <Text
            className="text-[13px] font-bold text-gray-900 leading-tight"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {stats.pendapatan >= 1000000
              ? `Rp ${(stats.pendapatan / 1000000).toFixed(stats.pendapatan % 1000000 === 0 ? 0 : 1)} jt`
              : stats.pendapatan >= 1000
              ? `Rp ${(stats.pendapatan / 1000).toLocaleString("id-ID")} rb`
              : `Rp ${stats.pendapatan.toLocaleString("id-ID")}`}
          </Text>
          <TouchableOpacity onPress={onTarikDana} className="mt-0.5" activeOpacity={0.7}>
            <Text className="text-[11px] text-emerald-700 font-bold underline">
              Tarik Dana
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
