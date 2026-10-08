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
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowRight, Star, Award, CheckCircle2, ShieldCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../../../../src/lib/supabase";
import { getStoredUser } from "../../../../src/lib/user-storage";

export default function ClientReviewSuccessPage() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [jobData, setJobData] = useState<any>(null);
  const [mitraData, setMitraData] = useState<any>(null);
  const [userPoin, setUserPoin] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const stored: any = await getStoredUser();
        const { data: job } = await supabase
          .from("pekerjaan_bisa")
          .select("*")
          .eq("id", jobId)
          .single();

        if (job) {
          setJobData(job);
          if (job.mitra_id) {
            const { data: mitra } = await supabase
              .from("users_bisa")
              .select("id, name, face_url, rating")
              .eq("id", job.mitra_id)
              .single();
            if (mitra) setMitraData(mitra);
          }
        }

        if (stored?.id) {
          const { data: userRecord } = await supabase
            .from("users_bisa")
            .select("poin")
            .eq("id", stored.id)
            .single();
          if (userRecord?.poin !== undefined) setUserPoin(userRecord.poin);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-md w-full self-center items-center">
          {/* Maskot Sukses & Jempol */}
          <Image
            source={require("../../../../assets/maskot/maskot mengacungkan jempol.png")}
            style={{ width: 140, height: 140 }}
            resizeMode="contain"
          />

          <View className="flex-row items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full mt-4">
            <CheckCircle2 size={16} color="#059669" />
            <Text className="text-xs font-bold text-emerald-800">Ulasan Berhasil Dikirim</Text>
          </View>

          <Text className="text-2xl font-extrabold text-gray-900 text-center mt-3">
            Terima Kasih atas Ulasan Anda!
          </Text>
          <Text className="text-xs text-gray-500 text-center mt-2 leading-5 px-4">
            Ulasan Anda sangat berarti bagi komunitas BISA untuk menjaga kualitas mitra layanan terpercaya.
          </Text>

          {/* Reward Poin Banner */}
          <View className="w-full bg-gradient-to-r bg-amber-50 rounded-3xl p-5 border border-amber-200 my-6 flex-row items-center gap-4 shadow-sm">
            <View className="w-14 h-14 rounded-2xl bg-amber-500 items-center justify-center shadow-md">
              <Award size={28} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-amber-900 uppercase tracking-wider">Hadiah Ulasan</Text>
              <Text className="text-xl font-extrabold text-amber-700 mt-0.5">+50 BISA Poin</Text>
              <Text className="text-[11px] text-amber-800/80">Total poin Anda sekarang: {userPoin} Poin</Text>
            </View>
          </View>

          {/* Card Ringkasan Singkat */}
          {mitraData && (
            <View className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6 flex-row items-center gap-3">
              {mitraData.face_url ? (
                <Image source={{ uri: mitraData.face_url }} className="w-12 h-12 rounded-xl bg-gray-100" />
              ) : (
                <Image source={require("../../../../assets/mascot.png")} style={{ width: 48, height: 48 }} resizeMode="contain" />
              )}
              <View className="flex-1">
                <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{mitraData.name}</Text>
                <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{jobData?.judul || "Pekerjaan BISA"}</Text>
              </View>
              <View className="flex-row items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg">
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-xs font-bold text-amber-900">{Number(mitraData.rating || 5).toFixed(1)}</Text>
              </View>
            </View>
          )}

          {/* Actions */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace("/c/home" as any);
            }}
            activeOpacity={0.88}
            className="w-full py-4 bg-[#FF6B00] rounded-2xl items-center flex-row justify-center gap-2 shadow-md mb-3"
          >
            <Text className="text-white font-extrabold text-base">Kembali ke Beranda</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace("/c/aktivitas" as any)}
            activeOpacity={0.7}
            className="w-full py-3.5 bg-white border border-gray-200 rounded-2xl items-center"
          >
            <Text className="text-gray-700 font-bold text-sm">Lihat Riwayat Pesanan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
