import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { ChevronRight, Wifi, MapPin } from "lucide-react-native";

function getThumb(url?: string | null) {
  if (!url || !url.startsWith("http")) return null;
  if (url.includes("supabase.co") && !url.includes("?")) return `${url}?width=120&height=120&resize=cover&quality=70`;
  return url;
}

interface NearbyJobItem {
  id: number;
  judul?: string;
  deskripsi?: string;
  kategori?: string;
  is_online?: boolean;
  distance_km?: number;
  budget?: number | string;
  created_at?: string;
  pelanggan?: { name?: string; face_url?: string };
  pelanggan_name?: string;
  pelanggan_face_url?: string;
}

interface ProviderNearbyJobsProps {
  loading: boolean;
  refreshing: boolean;
  jobs: NearbyJobItem[];
  onViewAll: () => void;
  onJobDetail: (id: number) => void;
}

function ProviderNearbyJobsComponent({
  loading,
  refreshing,
  jobs,
  onViewAll,
  onJobDetail,
}: ProviderNearbyJobsProps) {
  return (
    <View className="flex-col gap-2.5 mt-1">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-bold text-gray-900">
            Kebutuhan Sekitar
          </Text>
          {jobs.length > 0 && (
            <View className="px-2 py-0.5 rounded-full bg-emerald-100 flex-row items-center gap-1">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <Text className="text-[10px] font-bold text-emerald-700">
                {jobs.length} Baru
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={onViewAll} className="flex-row items-center">
          <Text className="text-xs font-bold text-emerald-600">Lihat Semua</Text>
          <ChevronRight size={14} color="#059669" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View className="p-8 items-center justify-center">
          <ActivityIndicator color="#059669" />
          <Text className="text-xs text-gray-400 mt-2 font-medium">
            Memindai order di sekitar...
          </Text>
        </View>
      ) : jobs.length === 0 ? (
        <View className="py-7 px-4 bg-white rounded-xl items-center justify-center border border-dashed border-gray-200">
          <Text className="text-2xl mb-1">📡</Text>
          <Text className="text-xs font-bold text-gray-700">
            Belum ada permintaan di sekitar
          </Text>
          <Text className="text-[11px] text-gray-400 mt-0.5 text-center">
            Permintaan baru dari klien terdekat akan otomatis masuk di sini
          </Text>
        </View>
      ) : (
        <View className="flex-col gap-2.5">
          {jobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              onPress={() => onJobDetail(job.id)}
              activeOpacity={0.9}
              className="bg-white rounded-xl p-4 shadow-xs flex-col gap-2 border border-gray-100"
            >
              {/* Top Bar: Klien & Kategori */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden items-center justify-center">
                    <Image
                      source={
                        getThumb(job.pelanggan?.face_url || job.pelanggan_face_url)
                          ? { uri: getThumb(job.pelanggan?.face_url || job.pelanggan_face_url)! }
                          : require("../../../assets/mascot.png")
                      }
                      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f1f5f9" }}
                      contentFit="cover"
                      transition={100}
                      cachePolicy="memory-disk"
                      priority="low"
                      recyclingKey={String(job.id)}
                    />
                  </View>
                  <View className="flex-col">
                    <Text
                      className="text-xs font-bold text-gray-900 leading-none"
                      numberOfLines={1}
                    >
                      {job.pelanggan?.name || job.pelanggan_name || "Pelanggan"}
                    </Text>
                    <Text className="text-[10px] text-gray-400 mt-0.5">
                      {job.created_at
                        ? new Date(job.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Baru saja"}
                    </Text>
                  </View>
                </View>

                <View className="px-2.5 py-0.5 rounded-full bg-gray-100">
                  <Text className="text-[10px] font-bold text-gray-600">
                    {job.kategori || "Jasa Umum"}
                  </Text>
                </View>
              </View>

              {/* Judul Permintaan */}
              <Text className="text-sm font-bold text-gray-900 leading-snug">
                {job.judul || job.deskripsi || "Permintaan Layanan"}
              </Text>

              {/* Pill Tag (Online / Jarak) */}
              <View className="flex-row flex-wrap items-center gap-2">
                <View className="px-2 py-0.5 rounded-md bg-yellow-100 flex-row items-center gap-1">
                  {job.is_online ? (
                    <Wifi size={11} color="#854d0e" />
                  ) : (
                    <MapPin size={11} color="#854d0e" />
                  )}
                  <Text className="text-xs font-semibold text-yellow-800">
                    {job.is_online ? "Online" : "Di Lokasi"}
                  </Text>
                </View>

                {job.distance_km != null && !job.is_online && (
                  <View className="px-2 py-0.5 rounded-md bg-emerald-50 flex-row items-center gap-1">
                    <MapPin size={11} color="#047857" />
                    <Text className="text-xs font-semibold text-emerald-700">
                      {Number(job.distance_km).toFixed(1)} km dari lokasimu
                    </Text>
                  </View>
                )}
              </View>

              {/* Footer: Budget & Tombol Ambil Job */}
              <View className="flex-row items-center justify-between pt-2 mt-1 border-t border-gray-100">
                <View className="flex-col">
                  <Text className="text-[10px] text-gray-500 font-semibold">
                    Estimasi Anggaran
                  </Text>
                  <Text className="text-sm text-emerald-600 font-black">
                    {job.budget
                      ? typeof job.budget === "number"
                        ? `Rp ${job.budget.toLocaleString("id-ID")}`
                        : job.budget
                      : "Nego"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => onJobDetail(job.id)}
                  activeOpacity={1}
                  className="h-8 px-4 rounded-full bg-emerald-600 items-center justify-center shadow-xs"
                >
                  <Text className="text-xs font-bold text-white">Ambil Job</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
const ProviderNearbyJobs = React.memo(ProviderNearbyJobsComponent);
export default ProviderNearbyJobs;
