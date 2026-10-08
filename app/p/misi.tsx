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
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Trophy,
  Zap,
  Target,
  Award,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { getStoredUser } from "../../src/lib/user-storage";
import ProviderBottomNav from "../../src/components/ProviderBottomNav";
import { safeBack } from "@/lib/navigation";

interface Misi {
  id: string;
  title: string;
  desc: string;
  reward_xp: number;
  reward_poin: number;
  progress: number;
  target: number;
  completed: boolean;
  type: "daily" | "weekly" | "special";
}

export default function MisiMitraPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");

  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [poin, setPoin] = useState(0);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const stored: any = await getStoredUser();
        if (!stored?.id) {
          router.replace("/(auth)/login" as any);
          return;
        }
        setUser(stored);

        // Fetch fresh stats mitra
        const { data: dbUser } = await supabase
          .from("users_bisa")
          .select("poin, xp, level, total_selesai")
          .eq("id", stored.id)
          .single();

        if (dbUser) {
          setPoin(dbUser.poin || 0);
          setXp(dbUser.xp || 150);
          setLevel(dbUser.level || 1);
        }

        const { count } = await supabase
          .from("pekerjaan_bisa")
          .select("*", { count: "exact", head: true })
          .eq("mitra_id", stored.id)
          .eq("status", "selesai");

        setCompletedJobsCount(count || 0);
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
        <Text className="text-sm text-gray-500 mt-2">Memuat misi & tantangan...</Text>
      </View>
    );
  }

  // Kalkulasi Misi Dinamis berdasarkan riwayat kerja
  const dailyMissions: Misi[] = [
    {
      id: "d1",
      title: "Selesaikan 1 Pekerjaan Hari Ini",
      desc: "Ambil dan tuntaskan minimal 1 order pekerjaan hari ini.",
      reward_xp: 50,
      reward_poin: 25,
      progress: Math.min(completedJobsCount, 1),
      target: 1,
      completed: completedJobsCount >= 1,
      type: "daily",
    },
    {
      id: "d2",
      title: "Respon Cepat Pelanggan",
      desc: "Balas tawaran atau chat pelanggan dalam waktu kurang dari 5 menit.",
      reward_xp: 30,
      reward_poin: 15,
      progress: 1,
      target: 1,
      completed: true,
      type: "daily",
    },
    {
      id: "d3",
      title: "Perbarui Radius Kerja",
      desc: "Buka pengaturan radar dan sesuaikan jangkauan kerja Anda.",
      reward_xp: 20,
      reward_poin: 10,
      progress: 1,
      target: 1,
      completed: true,
      type: "daily",
    },
  ];

  const weeklyMissions: Misi[] = [
    {
      id: "w1",
      title: "Tuntaskan 5 Pekerjaan Mingguan",
      desc: "Pertahankan performa dengan menyelesaikan 5 pekerjaan minggu ini.",
      reward_xp: 200,
      reward_poin: 100,
      progress: Math.min(completedJobsCount, 5),
      target: 5,
      completed: completedJobsCount >= 5,
      type: "weekly",
    },
    {
      id: "w2",
      title: "Raih Rating Bintang 5 Beruntun",
      desc: "Dapatkan review 5.0 dari 3 pelanggan berturut-turut.",
      reward_xp: 150,
      reward_poin: 75,
      progress: Math.min(completedJobsCount, 3),
      target: 3,
      completed: completedJobsCount >= 3,
      type: "weekly",
    },
    {
      id: "w3",
      title: "Duta Layanan Cepat (COD / Online)",
      desc: "Selesaikan pekerjaan dengan metode pembayaran apapun tanpa kendala.",
      reward_xp: 100,
      reward_poin: 50,
      progress: Math.min(completedJobsCount, 2),
      target: 2,
      completed: completedJobsCount >= 2,
      type: "weekly",
    },
  ];

  const currentList = activeTab === "daily" ? dailyMissions : weeklyMissions;
  const nextLevelXp = level * 500;
  const progressPercent = Math.min(100, Math.round((xp / nextLevelXp) * 100));

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      {/* Header */}
      <View className="h-16 px-4 flex-row items-center justify-between bg-white border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => safeBack(router, "/p/home")} className="w-9 h-9 rounded-full items-center justify-center">
            <ArrowLeft size={22} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Misi & Hadiah Mitra</Text>
        </View>
        <View className="flex-row items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
          <Award size={15} color="#D97706" />
          <Text className="text-xs font-extrabold text-amber-700">{poin} Poin</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View className="max-w-md w-full self-center">
          {/* Card Level Mitra */}
          <View className="rounded-[28px] p-6 mb-5 overflow-hidden" style={{ backgroundColor: "#1E293B" }}>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                <Trophy size={14} color="#F59E0B" />
                <Text className="text-xs font-bold text-white">Level {level} Mitra</Text>
              </View>
              <Image source={require("../../assets/maskot/maskot mengacungkan jempol.png")} style={{ width: 44, height: 44 }} resizeMode="contain" />
            </View>

            <Text className="text-2xl font-extrabold text-white mb-1">Mitra Teladan</Text>
            <Text className="text-xs text-gray-300">
              Kumpulkan XP dari setiap order untuk membuka lencana eksklusif dan prioritas radar.
            </Text>

            {/* XP Bar */}
            <View className="mt-5">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-xs font-bold text-orange-400">{xp} XP</Text>
                <Text className="text-xs font-bold text-gray-400">{nextLevelXp} XP (Level {level + 1})</Text>
              </View>
              <View className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                <View
                  className="h-full bg-gradient-to-r rounded-full"
                  style={{ width: `${progressPercent}%`, backgroundColor: "#FF6B00" }}
                />
              </View>
            </View>
          </View>

          {/* Tab Selector Misi Harian vs Mingguan */}
          <View className="flex-row bg-gray-100 p-1.5 rounded-2xl mb-5">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab("daily");
              }}
              className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
                activeTab === "daily" ? "bg-white shadow-sm" : ""
              }`}
            >
              <Flame size={16} color={activeTab === "daily" ? "#FF6B00" : "#6B7280"} />
              <Text className={`text-xs font-bold ${activeTab === "daily" ? "text-gray-900" : "text-gray-500"}`}>
                Misi Harian
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab("weekly");
              }}
              className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
                activeTab === "weekly" ? "bg-white shadow-sm" : ""
              }`}
            >
              <Target size={16} color={activeTab === "weekly" ? "#FF6B00" : "#6B7280"} />
              <Text className={`text-xs font-bold ${activeTab === "weekly" ? "text-gray-900" : "text-gray-500"}`}>
                Tantangan Mingguan
              </Text>
            </TouchableOpacity>
          </View>

          {/* List Misi */}
          <View className="gap-3.5">
            {currentList.map((misi) => (
              <View key={misi.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="text-sm font-extrabold text-gray-900">{misi.title}</Text>
                      {misi.completed && <CheckCircle2 size={16} color="#059669" />}
                    </View>
                    <Text className="text-xs text-gray-500 leading-4">{misi.desc}</Text>
                  </View>

                  <View className="items-end gap-1">
                    <View className="flex-row items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-md">
                      <Zap size={11} color="#FF6B00" />
                      <Text className="text-[11px] font-extrabold text-[#FF6B00]">+{misi.reward_xp} XP</Text>
                    </View>
                    <View className="flex-row items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md">
                      <Award size={11} color="#D97706" />
                      <Text className="text-[11px] font-extrabold text-amber-700">+{misi.reward_poin} Poin</Text>
                    </View>
                  </View>
                </View>

                {/* Progress bar per misi */}
                <View className="mt-3.5 pt-3 border-t border-gray-100">
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-[11px] font-bold text-gray-500">
                      Progress: {misi.progress}/{misi.target}
                    </Text>
                    <Text className="text-[11px] font-bold text-[#FF6B00]">
                      {misi.completed ? "Selesai" : `${Math.round((misi.progress / misi.target) * 100)}%`}
                    </Text>
                  </View>
                  <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (misi.progress / misi.target) * 100)}%`,
                        backgroundColor: misi.completed ? "#059669" : "#FF6B00",
                      }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <ProviderBottomNav active="profil" />
    </SafeAreaView>
  );
}
