import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { Search, Clock } from "lucide-react-native";
import { type CariKerjaLogic } from "../../hooks/useCariKerjaLogic";

import { JobCardSkeleton } from "../SkeletonLoader";

export default function CariKerjaList({ logic }: { logic: CariKerjaLogic }) {
  const {
    viewMode,
    loading,
    error,
    sortedJobs,
    user,
    setSelectedJob,
    getCountdown,
    parseDeskripsi,
    timeAgo,
  } = logic;

  if (viewMode !== "list") return null;

  return (
    <View className="flex-1 px-4 py-3">
      {loading ? (
        <JobCardSkeleton />
      ) : error ? (
        <View className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
          <Text className="text-xs font-bold text-red-700">{error}</Text>
        </View>
      ) : sortedJobs.length === 0 ? (
        <View className="text-center py-12 items-center">
          <Text className="text-4xl mb-2">📡</Text>
          <Text className="text-gray-900 font-bold text-base mb-1">Tidak Ada Pekerjaan</Text>
          <Text className="text-gray-500 text-xs text-center">
            Coba perluas radius pencarian atau ubah filter kategori
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedJobs}
          keyExtractor={(job) => `job-${job.id}`}
          contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={true}
          renderItem={({ item: job }) => {
            const isMatch = user?.keahlian && user.keahlian.includes(job.kategori);
            const { textDesc } = parseDeskripsi(job.deskripsi);
            const countdown = getCountdown(job.deskripsi);

            return (
              <TouchableOpacity
                onPress={() => setSelectedJob(job)}
                activeOpacity={0.9}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex-col gap-2.5"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl items-center justify-center bg-emerald-50 shrink-0 border border-emerald-100">
                    <Text className="text-base">💼</Text>
                  </View>

                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-start justify-between gap-1">
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-bold text-gray-900 leading-tight" numberOfLines={1}>
                          {job.judul}
                        </Text>
                        <Text className="text-[11px] text-gray-500 mt-0.5 font-medium" numberOfLines={1}>
                          {job.pelanggan_name}
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-1 shrink-0">
                        {countdown && !countdown.expired && (
                          <View className="bg-red-50 border border-red-100 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                            <Clock size={11} color="#dc2626" />
                            <Text className="text-[10px] font-black text-red-600">{countdown.text}</Text>
                          </View>
                        )}
                        {isMatch && (
                          <View className="bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                            <Text className="text-[10px] font-black text-amber-700">Match</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                {textDesc ? (
                  <Text className="text-xs text-gray-600 leading-relaxed" numberOfLines={2}>
                    {textDesc}
                  </Text>
                ) : null}

                <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
                  <Text className="text-[11px] text-gray-400 font-medium">
                    {timeAgo(job.created_at)}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-black text-emerald-600">{job.budget}</Text>
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        job.is_online ? "bg-blue-100" : "bg-red-100"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          job.is_online ? "text-blue-800" : "text-red-700"
                        }`}
                      >
                        {job.is_online ? "Online" : `${job.distance_km.toFixed(1)} km`}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
