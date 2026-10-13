import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Star } from "lucide-react-native";
import { supabase } from "../../../src/lib/supabase";
import { getStoredUser } from "../../../src/lib/user-storage";
import { safeBack } from "@/lib/navigation";

export default function UlasanClientPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ulasan, setUlasan] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const stored: any = await getStoredUser();
      if (!stored?.id) {
        router.replace("/(auth)/login" as any);
        return;
      }
      setUser(stored);
      try {
        const { data, error } = await supabase
          .from("ratings_bisa")
          .select("id, rating, review, created_at, job_id, ratee_id")
          .eq("rater_id", stored.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data && data.length > 0) {
          const jobIds = [...new Set(data.map((d: any) => d.job_id).filter(Boolean))];
          const { data: jobs } = await supabase.from("pekerjaan_bisa").select("id, judul").in("id", jobIds as any);
          const mitraIds = [...new Set(data.map((d: any) => d.ratee_id).filter(Boolean))];
          const { data: mitras } = await supabase.from("users_bisa").select("id, name").in("id", mitraIds as any);
          const jobMap: Record<number, string> = {};
          (jobs || []).forEach((j: any) => (jobMap[j.id] = j.judul));
          const mitraMap: Record<number, string> = {};
          (mitras || []).forEach((m: any) => (mitraMap[m.id] = m.name));
          const formatted = data.map((item: any) => ({
            id: item.id,
            nama: mitraMap[item.ratee_id] || "Mitra",
            job: jobMap[item.job_id] || "Pekerjaan",
            rating: item.rating,
            created_at: item.created_at,
            comment: item.review || "Memberikan rating bintang " + item.rating,
          }));
          setUlasan(formatted);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  const averageRating =
    ulasan.length > 0 ? (ulasan.reduce((a, c) => a + c.rating, 0) / ulasan.length).toFixed(1) : "0.0";

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      {/* HEADER - 1:1 web/c/ulasan */}
      <View className="h-16 px-4 flex-row items-center bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.replace("/c/profil" as any)} className="w-10 h-10 rounded-full items-center justify-center mr-3">
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-[17px] font-extrabold text-gray-900 tracking-tight">Rating & Ulasan</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-md w-full self-center">
          {/* KARTU RATING - ORANGE (C) */}
          <View className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm mb-6 items-center">
            <Text className="text-sm font-bold text-gray-500 mb-2">Rating Rata-rata Klien</Text>
            <View className="flex-row items-center gap-4 mb-2">
              <Text className="text-[48px] leading-none font-black text-gray-900 tracking-tighter">{averageRating}</Text>
              <View>
                <View className="flex-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={22} color="#F59E0B" fill={star <= Math.round(Number(averageRating)) ? "#F59E0B" : "transparent"} />
                  ))}
                </View>
                <Text className="text-xs font-bold text-gray-400 mt-1">Dari {ulasan.length} ulasan</Text>
              </View>
            </View>
            <Text className="text-xs text-center text-gray-500 font-medium mt-2 max-w-[260px]">Rating ini diberikan oleh para mitra setelah pekerjaan selesai.</Text>
          </View>

          {/* DAFTAR ULASAN */}
          <View className="gap-4">
            <Text className="text-sm font-extrabold text-gray-900 ml-1">Riwayat Ulasan</Text>
            {ulasan.length === 0 ? (
              <View className="bg-white rounded-[24px] p-8 items-center border border-gray-100">
                <Text className="text-sm font-semibold text-gray-500 text-center">Belum ada ulasan yang Anda berikan.</Text>
              </View>
            ) : (
              ulasan.map((item: any) => (
                <View key={item.id} className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                  {/* dekorasi orange pojok */}
                  <View className="absolute top-0 right-0 w-20 h-20 bg-orange-50 rounded-bl-full opacity-60" />
                  <View className="flex-row justify-between items-start mb-4 relative z-10">
                    <View className="flex-row items-center gap-3">
                      <View className="w-11 h-11 rounded-full bg-orange-100 border border-orange-200 items-center justify-center">
                        <Text className="text-base font-extrabold text-orange-600">{item.nama?.charAt(0)?.toUpperCase() || "U"}</Text>
                      </View>
                      <View>
                        <Text className="text-[15px] font-bold text-gray-900">{item.nama}</Text>
                        <Text className="text-[11px] text-gray-500 font-semibold mt-0.5">{new Date(item.created_at).toLocaleDateString("id-ID")} • {item.job}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                      <Star size={14} color="#D97706" fill="#D97706" />
                      <Text className="text-xs font-extrabold text-amber-700">{item.rating}</Text>
                    </View>
                  </View>
                  <Text className="text-sm text-gray-700 leading-6 font-medium relative z-10">"{item.comment}"</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
