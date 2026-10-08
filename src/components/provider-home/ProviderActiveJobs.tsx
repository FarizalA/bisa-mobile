import React from "react";
import { View, Text, TouchableOpacity, Image, Linking } from "react-native";
import { CheckCircle, Phone, ArrowRight, Navigation2, Flag } from "lucide-react-native";

interface JobItem {
  id: number;
  judul: string;
  pelanggan?: { name?: string; phone?: string; face_url?: string };
  is_online?: boolean;
  lokasi?: string;
  is_selected?: boolean;
}

interface ProviderActiveJobsProps {
  activeJobs: JobItem[];
  onViewAll: () => void;
  onJobDetail: (id: number) => void;
  onCall: (phone?: string) => void;
}

export default function ProviderActiveJobs({
  activeJobs,
  onViewAll,
  onJobDetail,
  onCall,
}: ProviderActiveJobsProps) {
  if (activeJobs.length === 0) return null;

  return (
    <View className="flex-col gap-2 mt-1">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-base font-bold text-gray-900">
            Job Aktifmu
          </Text>
          <View className="px-2 py-0.5 rounded-full bg-yellow-100">
            <Text className="text-yellow-700 text-xs font-bold">
              Sedang Berjalan ⚡ ({activeJobs.length})
            </Text>
          </View>
        </View>
        {activeJobs.length > 3 && (
          <TouchableOpacity onPress={onViewAll}>
            <Text className="text-xs font-bold text-emerald-600">
              Lihat Semua ({activeJobs.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {activeJobs.slice(0, 3).map((ajob) => (
        <View
          key={ajob.id}
          className="bg-white rounded-xl p-4 shadow-xs flex-col gap-3 border border-gray-100"
        >
          <View className="flex-col">
            <Text className="text-sm font-bold text-gray-900 leading-tight">
              {ajob.judul}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Klien:  
              <Text className="font-bold text-gray-900">
                {ajob.pelanggan?.name || "Klien"}
              </Text>
            </Text>
          </View>

          {/* Progress Step Bar 3 Langkah */}
          <View className="bg-gray-50 p-3 rounded-lg flex-col gap-1 border border-gray-100">
            <View className="flex-row items-center justify-between px-2">
              {/* Step 1 */}
              <View className="items-center gap-1">
                <View className="w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
                  <CheckCircle size={13} color="#ffffff" />
                </View>
                <Text className="text-[10px] font-semibold text-gray-500">
                  Diterima
                </Text>
              </View>

              {/* Line */}
              <View className="flex-1 h-0.5 bg-emerald-500 mx-2 -mt-4" />

              {/* Step 2 */}
              <View className="items-center gap-1">
                <View className="w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
                  <Navigation2 size={13} color="#ffffff" />
                </View>
                <Text className="text-[10px] text-emerald-600 font-bold">
                  Proses
                </Text>
              </View>

              {/* Line */}
              <View className="flex-1 h-0.5 bg-emerald-500 mx-2 -mt-4" />

              {/* Step 3 */}
              <View className="items-center gap-1">
                <View className="w-6 h-6 rounded-full bg-gray-200 items-center justify-center">
                  <Flag size={13} color="#9ba3af" />
                </View>
                <Text className="text-[10px] text-gray-400 font-semibold">
                  Selesai
                </Text>
              </View>
            </View>
          </View>

          {/* Lokasi Job */}
          <View className="flex-row items-center gap-1.5">
            <Navigation2 size={14} color="#059669" />
            <Text className="text-xs text-gray-900 flex-1" numberOfLines={1}>
              {ajob.is_online ? "Dikerjakan Secara Online" : ajob.lokasi || "Lokasi Pelanggan"}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-2 pt-1">
            {ajob.pelanggan?.phone && (
              <TouchableOpacity
                onPress={() => onCall(ajob.pelanggan?.phone)}
                className="flex-1 h-10 rounded-full bg-gray-100 flex-row items-center justify-center gap-1.5"
              >
                <Phone size={15} color="#374151" />
                <Text className="text-xs font-bold text-gray-700">Hubungi</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => onJobDetail(ajob.id)}
              className="flex-1 h-10 rounded-full bg-emerald-600 flex-row items-center justify-center gap-1.5 shadow-xs"
            >
              <Text className="text-xs font-bold text-white">Rincian Job</Text>
              <ArrowRight size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}
