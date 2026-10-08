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
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Star, Check, ThumbsUp, ShieldCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../../../../src/lib/supabase";
import { getStoredUser } from "../../../../src/lib/user-storage";
import { safeBack } from "@/lib/navigation";

export default function MitraReviewPage() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);

  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "instruksi-jelas",
    "respons-cepat",
  ]);
  const [recommend, setRecommend] = useState<"yes" | "neutral">("yes");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [jobData, setJobData] = useState<any>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingRatingId, setExistingRatingId] = useState<number | null>(null);

  const availableTags = [
    { id: "instruksi-jelas", label: "📋 Instruksi Jelas" },
    { id: "respons-cepat", label: "⚡ Respons Cepat" },
    { id: "ramah-sopan", label: "🤝 Ramah & Sopan" },
    { id: "tempat-akses-mudah", label: "📍 Lokasi Mudah Dijangkau" },
    { id: "pembayaran-lancar", label: "💰 Pembayaran Lancar" },
  ];

  useEffect(() => {
    (async () => {
      try {
        const stored: any = await getStoredUser();
        if (!stored?.id) {
          router.replace("/(auth)/login" as any);
          return;
        }
        setUser(stored);

        const { data: job } = await supabase
          .from("pekerjaan_bisa")
          .select("*")
          .eq("id", jobId)
          .maybeSingle();

        if (job) {
          setJobData(job);
          if (job.pelanggan_id) {
            const { data: client } = await supabase
              .from("users_bisa")
              .select("id, name, face_url, address, rating")
              .eq("id", job.pelanggan_id)
              .maybeSingle();
            if (client) setClientData(client);
            else setClientData({ id: job.pelanggan_id, name: "Pelanggan BISA" } as any);
          }

          // Cek ulasan yang sudah ada
          const { data: existingRating } = await supabase
            .from("ratings_bisa")
            .select("id, rating, review, tags, recommend")
            .eq("job_id", Number(jobId))
            .eq("rater_id", Number(stored.id))
            .maybeSingle();

          if (existingRating) {
            setIsEditMode(true);
            setExistingRatingId(existingRating.id);
            setRating(existingRating.rating);
            setComment(existingRating.review || "");
            setSelectedTags(existingRating.tags || []);
            setRecommend((existingRating.recommend || "yes") as "yes" | "neutral");
          }
        } else {
          console.warn("Job ulasan tidak ditemukan:", jobId);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, router]);

  const toggleTag = (tagId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async () => {
    if (!jobData || !clientData || !user) {
      console.warn("handleSubmit blocked: missing", { hasJob: !!jobData, hasClient: !!clientData, hasUser: !!user, jobData, clientData });
      Alert.alert("Gagal", `Data belum siap: ${!jobData ? "job " : ""}${!clientData ? "pelanggan " : ""}${!user ? "user " : ""}belum termuat. Coba tarik untuk refresh.`);
      return;
    }
    if (!String(comment).trim() && !isEditMode) {
      // opsional: jangan blokir, tapi beri tahu
    }
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const rateeId = Number(clientData?.id ?? jobData?.pelanggan_id);
    console.log("[Mitra Ulasan] submit", { jobId, userId: user?.id, rateeId, rating, commentLen: comment.length, isEditMode, existingRatingId, tags: selectedTags, recommend });

    // Payload tanpa created_at (biar default DB), tanpa kolom yang mungkin belum ada di schema (is_rated_by_mitra)
    const basePayload: any = {
      job_id: Number(jobId),
      rater_id: Number(user.id),
      ratee_id: rateeId,
      rating: Number(rating),
      review: String(comment || "").trim() || null,
      tags: selectedTags,
      recommend: recommend,
      is_public: true,
    };

    const fallbackCreate = async () => {
      // Fallback insert polos jika upsert/update gagal karena RLS/unique
      const { error } = await supabase.from("ratings_bisa").insert(basePayload);
      if (error) throw error;
    };

    try {
      // 1) Jika edit mode → update by PK langsung (paling aman dari RLS)
      if (isEditMode && existingRatingId) {
        const { error: updErr } = await supabase
          .from("ratings_bisa")
          .update({ rating: basePayload.rating, review: basePayload.review, tags: basePayload.tags, recommend: basePayload.recommend, is_public: basePayload.is_public })
          .eq("id", existingRatingId);
        if (updErr) {
          console.warn("[Mitra Ulasan] update by id failed, try upsert:", updErr.message);
          // Fallback: upsert by unique (job_id, rater_id) — butuh constraint, kalau tak ada akan jadi insert-duplikat → tangkap 409
          const { error: upsertErr } = await supabase.from("ratings_bisa").upsert(basePayload, { onConflict: "job_id,rater_id" });
          if (upsertErr) throw upsertErr;
        }
      } else {
        // Baru: coba upsert dulu (idempotent), kalau 409 karena belum ada constraint → fallback insert
        const { error: upsertErr } = await supabase.from("ratings_bisa").upsert(basePayload, { onConflict: "job_id,rater_id" });
        if (upsertErr) {
          const msg = String(upsertErr.message || "");
          const isConflict = upsertErr.code === "23505" || msg.includes("duplicate") || msg.includes("409") || msg.includes("Conflict");
          if (isConflict && existingRatingId) {
            // Sudah ada tapi kita belum tau id → update by job+rater
            const { error: upd2 } = await supabase
              .from("ratings_bisa")
              .update({ rating: basePayload.rating, review: basePayload.review, tags: basePayload.tags, recommend: basePayload.recommend, is_public: basePayload.is_public })
              .eq("job_id", Number(jobId))
              .eq("rater_id", Number(user.id));
            if (upd2) throw upd2;
          } else if (isConflict) {
            // Fetch id lagi lalu update
            const { data: again } = await supabase.from("ratings_bisa").select("id").eq("job_id", Number(jobId)).eq("rater_id", Number(user.id)).maybeSingle();
            if (again?.id) {
              const { error: upd3 } = await supabase.from("ratings_bisa").update({ rating: basePayload.rating, review: basePayload.review, tags: basePayload.tags, recommend: basePayload.recommend, is_public: basePayload.is_public }).eq("id", again.id);
              if (upd3) throw upd3;
            } else {
              throw upsertErr;
            }
          } else {
            // Bukan 409 → coba insert polos
            await fallbackCreate();
          }
        }
      }

      // Poin +25 hanya untuk ulasan baru (jangan dobel reward saat edit)
      if (!isEditMode) {
        try {
          // via API biar RLS poin aman, fallback direct
          const rawApi = (process.env.EXPO_PUBLIC_API_URL || "").replace(/^EXPO_PUBLIC_API_URL=/, "").trim();
          const backendUrl = rawApi || (Platform.OS === "web" ? window.location.origin : "https://bisa-app.vercel.app");
          const r = await fetch(`${backendUrl}/api/orders/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: Number(jobId), reviewerId: Number(user.id), revieweeId: rateeId, rating: Number(rating), komentar: String(comment || "").trim(), tags: selectedTags, isPublic: true, recommend }),
          });
          // reward sudah ditangani API jika ini first time; kalau API 409/error, fallback manual poin tidak perlu (biar tidak double)
          await r.json().catch(() => ({}));
        } catch {}
        try {
          const { data: curUser } = await supabase.from("users_bisa").select("poin").eq("id", Number(user.id)).maybeSingle();
          const cur = Number(curUser?.poin || 0);
          await supabase.from("users_bisa").update({ poin: cur + 25 }).eq("id", Number(user.id));
        } catch {}
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success as any).catch(() => {});
      // Di web Alert.alert kadang tidak muncul — fallback ke window.alert + redirect
      if (Platform.OS === "web" && typeof window !== "undefined") {
        try { window.alert(isEditMode ? "Ulasan Diperbarui!" : "Ulasan Terkirim! +25 Poin"); } catch {}
        router.replace("/p/aktivitas" as any);
      } else {
        Alert.alert(
          isEditMode ? "Ulasan Diperbarui!" : "Ulasan Terkirim!",
          isEditMode ? "Penilaian berhasil diperbarui." : "Terima kasih! +25 BISA Poin.",
          [{ text: "Selesai", onPress: () => router.replace("/p/aktivitas" as any) }]
        );
      }
    } catch (e: any) {
      const msg = e?.message || e?.error_description || JSON.stringify(e) || "Terjadi kesalahan.";
      console.error("[Mitra Ulasan] gagal:", msg, e);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        try { window.alert("Gagal Menyimpan Ulasan: " + msg); } catch {}
      }
      Alert.alert("Gagal Menyimpan Ulasan", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !jobData || !clientData) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text className="text-sm text-gray-500 mt-2">Memuat formulir ulasan...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      {/* Header */}
      <View className="h-16 px-4 flex-row items-center justify-between bg-white border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => safeBack(router, "/p/aktivitas")} className="w-9 h-9 rounded-full items-center justify-center">
            <ArrowLeft size={22} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">{isEditMode ? "Edit Penilaian" : "Nilai Pelanggan"}</Text>
        </View>
        <View className="w-9 h-9 rounded-full bg-orange-50 items-center justify-center">
          <ShieldCheck size={18} color="#FF6B00" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-md w-full self-center">
          {/* Card Pelanggan */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-5 items-center">
            {clientData.face_url ? (
              <Image source={{ uri: clientData.face_url }} className="w-20 h-20 rounded-full bg-gray-100 mb-3" />
            ) : (
              <Image source={require("../../../../assets/mascot.png")} style={{ width: 80, height: 80 }} resizeMode="contain" className="mb-3" />
            )}
            <Text className="text-lg font-extrabold text-gray-900">{clientData.name}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Pelanggan • {jobData.judul || jobData.deskripsi}</Text>

            {/* Bintang Rating */}
            <View className="flex-row items-center gap-2 mt-5 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRating(star);
                  }}
                  activeOpacity={0.7}
                  className="p-1"
                >
                  <Star
                    size={36}
                    color="#F59E0B"
                    fill={star <= rating ? "#F59E0B" : "transparent"}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tag Pelanggan */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-5">
            <Text className="text-sm font-extrabold text-gray-900 mb-3">Bagaimana pengalaman bekerja sama?</Text>
            <View className="flex-row flex-wrap gap-2">
              {availableTags.map((tag) => {
                const active = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    onPress={() => toggleTag(tag.id)}
                    activeOpacity={0.8}
                    className={`px-3.5 py-2 rounded-xl border flex-row items-center gap-1.5 ${
                      active
                        ? "bg-orange-50 border-orange-500"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {active && <Check size={14} color="#FF6B00" />}
                    <Text className={`text-xs font-bold ${active ? "text-orange-600" : "text-gray-700"}`}>
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Rekomendasi Pelanggan */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-5">
            <Text className="text-sm font-extrabold text-gray-900 mb-3">Apakah Anda bersedia menerima order dari pelanggan ini lagi?</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setRecommend("yes")}
                className={`flex-1 p-3.5 rounded-2xl border flex-row items-center justify-center gap-2 ${
                  recommend === "yes" ? "bg-emerald-50 border-emerald-500" : "bg-gray-50 border-gray-200"
                }`}
              >
                <ThumbsUp size={16} color={recommend === "yes" ? "#059669" : "#6B7280"} />
                <Text className={`text-xs font-bold ${recommend === "yes" ? "text-emerald-700" : "text-gray-600"}`}>
                  Sangat Bersedia
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRecommend("neutral")}
                className={`flex-1 p-3.5 rounded-2xl border flex-row items-center justify-center gap-2 ${
                  recommend === "neutral" ? "bg-amber-50 border-amber-500" : "bg-gray-50 border-gray-200"
                }`}
              >
                <Text className={`text-xs font-bold ${recommend === "neutral" ? "text-amber-700" : "text-gray-600"}`}>
                  Biasa Saja
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Catatan Tambahan */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-6">
            <Text className="text-sm font-extrabold text-gray-900 mb-2">Catatan untuk Pelanggan (Opsional)</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Contoh: Pelanggan sangat ramah dan komunikasi sangat lancar..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 text-sm text-gray-900 h-24"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.88}
            className="w-full py-4 bg-[#FF6B00] rounded-2xl items-center shadow-md flex-row justify-center gap-2"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-extrabold text-base">{isEditMode ? "Perbarui Penilaian" : "Kirim Penilaian Pelanggan"}</Text>
            )}
          </TouchableOpacity>
          {isEditMode && <Text className="text-[11px] text-gray-400 text-center mt-2">Kamu sudah menilai job ini — menekan tombol akan memperbarui ulasan, bukan duplikat (fix 409).</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
