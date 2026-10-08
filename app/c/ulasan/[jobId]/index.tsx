import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Star, Check, AlertCircle, ShieldCheck, Calendar, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../../../../src/lib/supabase";
import { getStoredUser } from "../../../../src/lib/user-storage";
import { safeBack } from "@/lib/navigation";

export default function ClientReviewFormPage() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(["tepat-waktu", "rapi-bersih", "sangat-ramah"]);
  const [comment, setComment] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [jobData, setJobData] = useState<any>(null);
  const [mitraData, setMitraData] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const availableTags = [
    { id: "tepat-waktu", label: "Tepat Waktu ⚡" },
    { id: "rapi-bersih", label: "Hasil Rapi & Bersih ✨" },
    { id: "sangat-ramah", label: "Sangat Ramah 😊" },
    { id: "harga-transparan", label: "Harga Transparan 🏷️" },
    { id: "komunikasi-cepat", label: "Komunikasi Cepat 💬" },
    { id: "peralatan-lengkap", label: "Peralatan Lengkap 🧰" },
    { id: "bergaransi", label: "Bergaransi Terpercaya 🛡️" },
  ];
  const ratingLabels: Record<number, string> = {
    1: "Perlu Banyak Peningkatan",
    2: "Cukup, Masih Kurang",
    3: "Cukup Baik & Standar",
    4: "Sangat Baik & Memuaskan",
    5: "Luar Biasa Memuaskan!",
  };

  useEffect(() => {
    (async () => {
      try {
        const stored: any = await getStoredUser();
        if (!stored?.id) { router.replace("/(auth)/login" as any); return; }
        setUser(stored);
        const { data: job } = await supabase.from("pekerjaan_bisa").select("*").eq("id", jobId).single();
        if (job) {
          setJobData(job);
          const { data: mitra } = await supabase.from("users_bisa").select("*").eq("id", job.mitra_id).single();
          if (mitra) setMitraData(mitra);
          const { data: existing } = await supabase.from("ratings_bisa").select("id, rating, review, tags, is_public").eq("job_id", jobId).eq("rater_id", stored.id).maybeSingle();
          if (existing) {
            setIsEditMode(true);
            setRating(existing.rating);
            setComment(existing.review || "");
            setSelectedTags(existing.tags || []);
            setIsPublic(existing.is_public ?? true);
          }
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [jobId, router]);

  const toggleTag = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags((p) => (p.includes(id) ? p.filter((t) => t !== id) : [...p, id]));
  };

  const handleSubmit = async () => {
    if (!user || !jobData) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const numJobId = Number(jobId);
      const numRaterId = Number(user.id);
      const numRateeId = Number(jobData.mitra_id);

      // 1. Simpan/Upsert langsung ke database Supabase (Bypass CORS pada Expo Web / Mobile)
      const { error: revErr } = await supabase.from("ratings_bisa").upsert(
        {
          job_id: numJobId,
          rater_id: numRaterId,
          ratee_id: numRateeId,
          rating: Number(rating),
          review: comment.trim(),
          tags: selectedTags,
          is_public: isPublic,
          created_at: new Date().toISOString(),
        },
        { onConflict: "job_id,rater_id" }
      );

      if (revErr) {
        // Fallback jika constraint unik beda
        const { error: insertErr } = await supabase.from("ratings_bisa").insert({
          job_id: numJobId,
          rater_id: numRaterId,
          ratee_id: numRateeId,
          rating: Number(rating),
          review: comment.trim(),
          tags: selectedTags,
          is_public: isPublic,
        });
        if (insertErr && !insertErr.message.includes("duplicate")) {
          throw insertErr;
        }
      }

      // 2. Tandai pekerjaan_bisa -> is_rated = true
      await supabase.from("pekerjaan_bisa").update({ is_rated: true }).eq("id", numJobId);

      // 3. Hitung ulang rating rata-rata Mitra di users_bisa
      try {
        const { data: allRatings } = await supabase.from("ratings_bisa").select("rating").eq("ratee_id", numRateeId);
        if (allRatings && allRatings.length > 0) {
          const avg = allRatings.reduce((acc, curr) => acc + Number(curr.rating || 0), 0) / allRatings.length;
          await supabase.from("users_bisa").update({ rating: parseFloat(avg.toFixed(1)), total_reviews: allRatings.length }).eq("id", numRateeId);
        }
      } catch (rateErr) {
        console.warn("Gagal update statistik rating mitra:", rateErr);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/c/ulasan/${jobId}/sukses` as any);
    } catch (e: any) {
      Alert.alert("Gagal", e?.message || "Terjadi kesalahan saat menyimpan ulasan.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View className="flex-1 items-center justify-center bg-[#F8FAFC]"><ActivityIndicator size="large" color="#F97316" /><Text className="text-sm text-gray-500 mt-2">Memuat...</Text></View>;
  }
  if (!jobData || !mitraData) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center p-6">
        <AlertCircle size={48} color="#F97316" />
        <Text className="text-lg font-bold text-gray-900 mt-3">Data Tidak Ditemukan</Text>
        <TouchableOpacity onPress={() => safeBack(router, "/c/aktivitas")} className="mt-4 px-6 py-3 bg-[#F97316] rounded-xl"><Text className="text-white font-bold">Kembali</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={["top"]}>
      {/* Header - c orange */}
      <View className="h-16 px-4 flex-row items-center justify-between bg-white border-b border-gray-200">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => safeBack(router, "/c/aktivitas")} className="w-10 h-10 rounded-full items-center justify-center">
            <X size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">{isEditMode ? "Edit Ulasan" : "Beri Ulasan Mitra"}</Text>
        </View>
        {mitraData?.profile_picture || mitraData?.face_url ? (
          <Image source={{ uri: mitraData.profile_picture || mitraData.face_url }} className="w-8 h-8 rounded-full bg-gray-100" />
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-2xl w-full self-center">
          {/* Hero Banner Orange */}
          <View className="rounded-2xl p-6 mb-5 overflow-hidden" style={{ backgroundColor: "#F97316" }}>
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <View className="self-start flex-row items-center gap-1.5 px-3 py-1.5 rounded-full mb-3" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                  <Check size={14} color="#fff" /><Text className="text-xs font-bold text-white">Pekerjaan Selesai</Text>
                </View>
                <Text className="text-xl font-extrabold text-white">Terima Kasih!</Text>
                <Text className="text-sm text-white/90 leading-5 mt-1">Bantu {mitraData?.name} dan komunitas BISA dengan ulasan jujurmu.</Text>
              </View>
              <Image source={require("../../../../assets/maskot/maskot mengacungkan jempol.png")} style={{ width: 80, height: 80 }} resizeMode="contain" />
            </View>
          </View>

          {/* Mitra Info Card */}
          <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5 flex-row gap-4">
            <View className="w-14 h-14 rounded-full items-center justify-center overflow-hidden" style={{ backgroundColor: "#F97316" }}>
              {mitraData?.profile_picture || mitraData?.face_url ? (
                <Image source={{ uri: mitraData.profile_picture || mitraData.face_url }} className="w-14 h-14 rounded-full" />
              ) : (
                <Text className="text-white font-bold text-lg">{mitraData?.name?.charAt(0) || "M"}</Text>
              )}
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="font-bold text-gray-900">{mitraData?.name}</Text>
                {(mitraData?.is_verified || mitraData?.is_mitra_verified) && (
                  <View className="flex-row items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={12} color="#059669" /><Text className="text-xs font-bold text-emerald-700">Terverifikasi</Text>
                  </View>
                )}
              </View>
              <Text className="text-sm text-gray-600 mt-0.5" numberOfLines={1}>{jobData?.judul || jobData?.deskripsi || "Pesanan Jasa"}</Text>
              <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <View className="flex-row items-center gap-1.5"><Calendar size={14} color="#9CA3AF" /><Text className="text-xs text-gray-500">{new Date(jobData?.created_at).toLocaleDateString("id-ID")}</Text></View>
                <View className="items-end"><Text className="font-bold text-gray-900">Rp{Number(jobData?.harga_deal || jobData?.agreed_price || jobData?.total_harga || jobData?.harga || 0).toLocaleString("id-ID")}</Text><Text className="text-xs text-gray-500">Escrow</Text></View>
              </View>
            </View>
          </View>

          {/* Star Rating - c orange/amber */}
          <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-5 items-center">
            <Text className="text-sm font-medium text-gray-600 mb-4">Berapa bintang untuk servis ini?</Text>
            <View className="flex-row gap-2 mb-4">
              {[1,2,3,4,5].map((r) => (
                <TouchableOpacity key={r} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRating(r); }} className="p-1">
                  <Star size={40} color={r <= rating ? "#FBBF24" : "#D1D5DB"} fill={r <= rating ? "#FBBF24" : "transparent"} />
                </TouchableOpacity>
              ))}
            </View>
            <View className="px-4 py-2 rounded-full" style={{ backgroundColor: "#FEF3C7" }}>
              <Text className="text-sm font-bold text-amber-900">{ratingLabels[rating]} {"⭐".repeat(rating)}</Text>
            </View>
          </View>

          {/* Tags - orange */}
          <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
            <Text className="font-bold text-gray-900 mb-1">Apa yang paling kamu suka?</Text>
            <Text className="text-xs text-gray-500 mb-3">Pilih keunggulan mitra</Text>
            <View className="flex-row flex-wrap gap-2">
              {availableTags.map((tag) => {
                const active = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity key={tag.id} onPress={() => toggleTag(tag.id)} className={`px-3 py-2 rounded-full ${active ? "bg-[#F97316]" : "bg-gray-100"}`}>
                    <Text className={`text-xs font-bold ${active ? "text-white" : "text-gray-700"}`}>{tag.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Comment */}
          <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
            <View className="flex-row justify-between mb-3"><Text className="font-bold text-gray-900">Ulasan Tambahan</Text><Text className="text-xs text-gray-500">{comment.length} / 300</Text></View>
            <TextInput value={comment} onChangeText={(t) => setComment(t.slice(0,300))} maxLength={300} placeholder="Ceritakan lebih detail pengalaman servisnya di sini... (opsional)" placeholderTextColor="#9CA3AF" multiline numberOfLines={4} textAlignVertical="top" className="bg-gray-50 rounded-xl p-3 text-sm text-gray-900 border border-gray-200 h-28" />
          </View>

          {/* Public Toggle - orange */}
          <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5 flex-row items-center justify-between">
            <View className="flex-1 pr-4"><Text className="font-bold text-gray-900">Tampilkan Ulasan Publik</Text><Text className="text-xs text-gray-500 mt-1">Ulasan akan tampil di profil mitra</Text></View>
            <TouchableOpacity onPress={() => setIsPublic(!isPublic)} activeOpacity={0.8} className={`w-11 h-6 rounded-full p-0.5 flex-row ${isPublic ? "bg-[#F97316] justify-end" : "bg-gray-300 justify-start"}`}>
              <View className="w-5 h-5 bg-white rounded-full" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom - orange */}
      <View className="absolute bottom-0 inset-x-0 bg-white/95 border-t border-gray-200 px-4 py-3" style={{ paddingBottom: 20 }}>
        <View className="max-w-2xl w-full self-center gap-3">
          <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.9} className="w-full h-12 rounded-full items-center justify-center flex-row gap-2" style={{ backgroundColor: submitting ? "#FDBA74" : "#F97316" }}>
            <Text className="text-white font-bold">{submitting ? "Mengirim..." : isEditMode ? "Perbarui Ulasan" : "Kirim Rating Sekarang"}</Text>
            <Star size={18} color="#fff" fill="#fff" />
          </TouchableOpacity>
          <View className="flex-row items-center justify-center gap-1.5"><ShieldCheck size={14} color="#6B7280" /><Text className="text-xs text-gray-500">Ulasanmu membantu menjaga standar kualitas BISA</Text></View>
        </View>
      </View>
    </SafeAreaView>
  );
}
