import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Star, User } from "lucide-react-native";
import { supabase } from "../../../src/lib/supabase";
import { getStoredUser } from "../../../src/lib/user-storage";
import { safeBack } from "@/lib/navigation";

export default function UlasanProviderPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ulasan, setUlasan] = useState<any[]>([]);

  const fetchUlasan = useCallback(async (userId: number) => {
    try {
      // Ambil dari ratings_bisa (sesuai data mobile)
      const { data, error } = await supabase
        .from("ratings_bisa")
        .select("id, rating, review, created_at, job_id, rater_id")
        .eq("ratee_id", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const jobIds = [...new Set(data.map((item: any) => item.job_id).filter(Boolean))];
        const { data: jobs } = await supabase
          .from("pekerjaan_bisa")
          .select("id, judul")
          .in("id", jobIds);

        const raterIds = [...new Set(data.map((item: any) => item.rater_id).filter(Boolean))];
        const { data: raters } = await supabase
          .from("users_bisa")
          .select("id, name, face_url")
          .in("id", raterIds);

        const jobMap = Object.fromEntries(jobs?.map((j: any) => [j.id, j.judul]) || []);
        const raterMap = Object.fromEntries(raters?.map((r: any) => [r.id, r]) || []);

        const formatted = data.map((item: any) => ({
          id: item.id,
          nama: raterMap[item.rater_id]?.name || "Klien BISA",
          avatar: raterMap[item.rater_id]?.face_url,
          job: jobMap[item.job_id] || "Pesanan Jasa",
          rating: item.rating,
          date: new Date(item.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          comment: item.review || "Memberikan rating bintang " + item.rating,
        }));
        setUlasan(formatted);
      } else {
        setUlasan([]);
      }
    } catch (e) {
      console.error("Gagal load ulasan mitra:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stored: any = await getStoredUser();
      if (!stored?.id) {
        router.replace("/(auth)/login" as any);
        return;
      }
      setUser(stored);
      fetchUlasan(stored.id);
    })();
  }, [router, fetchUlasan]);

  if (loading || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const averageRating =
    ulasan.length > 0
      ? (ulasan.reduce((acc, curr) => acc + curr.rating, 0) / ulasan.length).toFixed(1)
      : "0.0";

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      {/* Header */}
      <View className="h-16 px-4 flex-row items-center bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => safeBack(router, "/p/aktivitas")} className="w-9 h-9 rounded-full items-center justify-center mr-3">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 tracking-tight">Rating & Ulasan</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-md w-full self-center">
          {/* KARTU RATING (Mitra - Hijau) */}
          <View className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm mb-8 items-center">
            <Text className="text-sm font-bold text-gray-500 mb-3">Rating Mitra Anda</Text>
            <View className="flex-row items-center gap-4 mb-3">
              <Text className="text-6xl font-extrabold text-gray-900">{averageRating}</Text>
              <View>
                <View className="flex-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={20}
                      color="#10B981"
                      fill={star <= Math.round(Number(averageRating)) ? "#10B981" : "transparent"}
                    />
                  ))}
                </View>
                <Text className="text-xs font-bold text-gray-400 mt-1">Dari {ulasan.length} ulasan</Text>
              </View>
            </View>
            <Text className="text-xs text-center text-gray-500 leading-5 mt-2 px-4">
              Rating ini diberikan oleh Klien. Pertahankan kerjamu yang bagus untuk mendapatkan lebih banyak pesanan!
            </Text>
          </View>

          {/* DAFTAR ULASAN */}
          <View className="gap-5">
            <Text className="text-sm font-extrabold text-gray-900 ml-1">Ulasan Klien</Text>

            {ulasan.length === 0 ? (
              <View className="bg-white rounded-3xl p-10 items-center border border-gray-100">
                <Text className="text-sm font-bold text-gray-400">Belum Ada Ulasan</Text>
              </View>
            ) : (
              ulasan.map((item) => (
                <View key={item.id} className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm overflow-hidden">
                  {/* Dekorasi Pojok (Hijau) */}
                  <View className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-[100px] opacity-40" />

                  <View className="flex-row justify-between items-start mb-4 relative z-10">
                    <View className="flex-row items-center gap-3">
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} className="w-12 h-12 rounded-full bg-gray-100 border border-gray-100" />
                      ) : (
                        <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center border border-gray-100">
                          <Text className="text-lg font-bold text-gray-400">{item.nama.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View>
                        <Text className="text-sm font-bold text-gray-900">{item.nama}</Text>
                        <Text className="text-[10px] text-gray-500 font-medium">{item.date} • {item.job}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                      <Star size={14} color="#059669" fill="#059669" />
                      <Text className="text-xs font-extrabold text-emerald-700">{item.rating}</Text>
                    </View>
                  </View>

                  <Text className="text-[13px] text-gray-700 leading-5 relative z-10">
                    "{item.comment}"
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
