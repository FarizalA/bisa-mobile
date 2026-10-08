import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Star, MessageSquare } from "lucide-react-native";
import { supabase } from "../../../../src/lib/supabase";
import { safeBack } from "@/lib/navigation";

interface ReviewItem {
  id: number;
  rating: number;
  komentar: string;
  created_at: string;
  reviewer_name: string;
  reviewer_avatar?: string;
  job_title?: string;
}

export default function MitraPublicReviewsPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [mitra, setMitra] = useState<any>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: u } = await supabase.from("users_bisa").select("id, name, face_url, rating, total_orders").eq("id", Number(id)).maybeSingle();
        if (u) setMitra(u);

        let { data: revs } = await supabase
          .from("reviews_bisa")
          .select("id, rating, komentar, created_at, reviewer_id, job_id, pekerjaan_id")
          .eq("reviewee_id", Number(id))
          .order("created_at", { ascending: false });

        if (!revs || revs.length === 0) {
          const { data: fData } = await supabase
            .from("ratings_bisa")
            .select("id, rating, review, created_at, rater_id, job_id")
            .eq("ratee_id", Number(id))
            .eq("is_public", true)
            .order("created_at", { ascending: false });

          if (fData) {
            revs = fData.map((d: any) => ({
              id: d.id,
              rating: d.rating,
              komentar: d.review || "",
              created_at: d.created_at,
              reviewer_id: d.rater_id,
              job_id: d.job_id,
              pekerjaan_id: d.job_id,
            })) as any;
          }
        }

        if (revs && revs.length > 0) {
          const rIds = [...new Set(revs.map((r: any) => r.reviewer_id).filter(Boolean))];
          const { data: reviewers } = await supabase.from("users_bisa").select("id, name, face_url").in("id", rIds);
          const rMap = Object.fromEntries(reviewers?.map((x: any) => [x.id, x]) || []);

          const jobIds = [...new Set(revs.map((r: any) => r.pekerjaan_id || r.job_id).filter(Boolean))];
          let jobMap: Record<string, string> = {};
          if (jobIds.length > 0) {
            const { data: jobs } = await supabase.from("pekerjaan_bisa").select("id, judul").in("id", jobIds);
            if (jobs) jobMap = Object.fromEntries(jobs.map((j: any) => [j.id, j.judul]));
          }

          const formatted: ReviewItem[] = revs.map((item: any) => ({
            id: item.id,
            rating: item.rating,
            komentar: item.komentar || "Memberikan penilaian tanpa komentar.",
            created_at: item.created_at,
            reviewer_name: rMap[item.reviewer_id]?.name || "Klien BISA",
            reviewer_avatar: rMap[item.reviewer_id]?.face_url,
            job_title: jobMap[item.pekerjaan_id || item.job_id] || "Pesanan Jasa",
          }));
          setReviews(formatted);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#faf8ff] items-center justify-center">
        <ActivityIndicator color="#FF6B00" size="large" />
      </View>
    );
  }

  const filtered = filterRating !== null ? reviews.filter((r) => r.rating === filterRating) : reviews;
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : mitra?.rating ? Number(mitra.rating).toFixed(1) : "0.0";
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
  const fiveStarPct = reviews.length > 0 ? Math.round((fiveStarCount / reviews.length) * 100) : 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#faf8ff]">
      {/* HEADER */}
      <View className="h-14 px-4 flex-row items-center gap-3 bg-[#faf8ff] border-b border-gray-100">
        <TouchableOpacity onPress={() => safeBack(router, "/c/home")} className="w-9 h-9 rounded-full bg-white items-center justify-center border border-gray-100">
          <ArrowLeft size={18} color="#131B2E" />
        </TouchableOpacity>
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-extrabold text-gray-900 leading-tight">Ulasan Pelanggan</Text>
          <Text className="text-[11px] text-gray-400 font-medium truncate">{mitra?.name || "Mitra BISA"}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* SUMMARY CARD */}
        <View className="bg-white rounded-3xl p-5 border border-gray-100 items-center mb-4 shadow-2xs">
          <View className="flex-row items-center gap-3 mb-2">
            <Text className="text-4xl font-black text-gray-900">{avgRating}</Text>
            <View>
              <View className="flex-row gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={14} color="#F59E0B" fill="#F59E0B" />
                ))}
              </View>
              <Text className="text-[11px] font-bold text-gray-400 mt-1">Berdasarkan {reviews.length} ulasan</Text>
            </View>
          </View>

          <View className="w-full pt-3 border-t border-gray-100 flex-row items-center gap-3">
            <View className="flex-1 bg-orange-100 h-2.5 rounded-full overflow-hidden">
              <View className="bg-[#FF6B00] h-full rounded-full" style={{ width: `${fiveStarPct}%` }} />
            </View>
            <Text className="text-[11px] font-bold text-[#5a4136]">{fiveStarPct}% bintang 5</Text>
          </View>
        </View>

        {/* STAR FILTER PILLS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ gap: 6 }}>
          <TouchableOpacity
            onPress={() => setFilterRating(null)}
            className={`px-3.5 py-1.5 rounded-full border ${
              filterRating === null ? "bg-[#FF6B00] border-[#FF6B00]" : "bg-white border-gray-200"
            }`}
          >
            <Text className={`text-xs font-bold ${filterRating === null ? "text-white" : "text-gray-600"}`}>
              Semua ({reviews.length})
            </Text>
          </TouchableOpacity>
          {[5, 4, 3, 2, 1].map((s) => {
            const count = reviews.filter((r) => r.rating === s).length;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setFilterRating(filterRating === s ? null : s)}
                className={`px-3 py-1.5 rounded-full border ${
                  filterRating === s ? "bg-[#FF6B00] border-[#FF6B00]" : "bg-white border-gray-200"
                }`}
              >
                <Text className={`text-xs font-bold ${filterRating === s ? "text-white" : "text-gray-600"}`}>
                  ⭐ {s} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* LIST */}
        <View className="gap-2.5">
          {filtered.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 border border-gray-100 items-center text-center gap-1.5">
              <MessageSquare size={24} color="#D1D5DB" />
              <Text className="text-xs font-bold text-gray-700">Tidak ada ulasan ditemukan</Text>
            </View>
          ) : (
            filtered.map((item) => (
              <View key={item.id} className="bg-white rounded-2xl p-4 border border-gray-100 gap-2 shadow-2xs">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                    <View className="w-9 h-9 rounded-full bg-orange-50 items-center justify-center overflow-hidden border border-orange-100">
                      {item.reviewer_avatar ? (
                        <Image source={{ uri: item.reviewer_avatar }} style={{ width: 36, height: 36 }} resizeMode="cover" />
                      ) : (
                        <Text className="text-xs font-extrabold text-orange-600">{item.reviewer_name.charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-xs font-bold text-gray-900 truncate">{item.reviewer_name}</Text>
                      <Text className="text-[10px] text-gray-400">
                        {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} • {item.job_title}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-0.5 bg-amber-50 px-2 py-0.5 rounded-full">
                    {[...Array(item.rating || 5)].map((_, i) => (
                      <Star key={i} size={11} color="#F59E0B" fill="#F59E0B" />
                    ))}
                  </View>
                </View>
                <Text className="text-xs text-gray-700 italic font-normal leading-relaxed">"{item.komentar}"</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
