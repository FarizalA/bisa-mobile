import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Home, Search, MessageSquare, Briefcase, User } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";

type ProviderNavTab = "home" | "cari" | "aktivitas" | "chat" | "profil";

export default function ProviderBottomNav({
  active,
  activeJobsCount = 0,
}: {
  active: ProviderNavTab;
  activeJobsCount?: number;
}) {
  const router = useRouter();
  const [count, setCount] = useState(activeJobsCount);

  useEffect(() => {
    if (activeJobsCount > 0) {
      setCount(activeJobsCount);
      return;
    }

    const fetchActiveJobs = async () => {
      try {
        const user: any = await getStoredUser();
        if (!user?.id) return;
        const { count: c, error } = await supabase
          .from("pekerjaan_bisa")
          .select("*", { count: "exact", head: true })
          .eq("mitra_id", user.id)
          .in("status", [
            "mitra_ditemukan",
            "sedang_dikerjakan",
            "menunggu_konfirmasi_selesai",
          ]);

        if (!error && c !== null) {
          setCount(c);
        }
      } catch (err) {
        console.warn("fetchActiveJobs count err:", err);
      }
    };
    fetchActiveJobs();
  }, [activeJobsCount]);

  const handlePress = (tab: ProviderNavTab, path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (active === tab) return;
    router.replace(path as any);
  };

  return (
    <View className="bg-white border-t border-gray-100 px-2 py-1.5 flex-row items-center justify-around shadow-lg">
      {/* 1. Beranda */}
      <TouchableOpacity
        onPress={() => handlePress("home", "/p/home")}
        activeOpacity={0.8}
        className="flex-1 items-center justify-center py-1"
      >
        <View className={`p-1.5 rounded-xl ${active === "home" ? "bg-emerald-50" : ""}`}>
          <Home size={20} color={active === "home" ? "#059669" : "#9ca3af"} />
        </View>
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "home" ? "font-black text-emerald-700" : "font-semibold text-gray-400"
          }`}
        >
          Beranda
        </Text>
      </TouchableOpacity>

      {/* 2. Cari Job */}
      <TouchableOpacity
        onPress={() => handlePress("cari", "/p/cari-kerja")}
        activeOpacity={0.8}
        className="flex-1 items-center justify-center py-1"
      >
        <View className={`p-1.5 rounded-xl ${active === "cari" ? "bg-emerald-50" : ""}`}>
          <Search size={20} color={active === "cari" ? "#059669" : "#9ca3af"} />
        </View>
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "cari" ? "font-black text-emerald-700" : "font-semibold text-gray-400"
          }`}
        >
          Cari Job
        </Text>
      </TouchableOpacity>

      {/* 3. Aktivitas / Pekerjaan */}
      <TouchableOpacity
        onPress={() => handlePress("aktivitas", "/p/aktivitas")}
        activeOpacity={0.8}
        className="flex-1 items-center justify-center py-1 relative"
      >
        <View className={`p-1.5 rounded-xl relative ${active === "aktivitas" ? "bg-emerald-50" : ""}`}>
          <Briefcase size={20} color={active === "aktivitas" ? "#059669" : "#9ca3af"} />
          {count > 0 && (
            <View className="absolute -top-1 -right-1 bg-emerald-600 w-4 h-4 rounded-full items-center justify-center border border-white">
              <Text className="text-white text-[9px] font-black">{count}</Text>
            </View>
          )}
        </View>
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "aktivitas" ? "font-black text-emerald-700" : "font-semibold text-gray-400"
          }`}
        >
          Aktivitas
        </Text>
      </TouchableOpacity>

      {/* 4. Chat */}
      <TouchableOpacity
        onPress={() => handlePress("chat", "/p/chat")}
        activeOpacity={0.8}
        className="flex-1 items-center justify-center py-1"
      >
        <View className={`p-1.5 rounded-xl ${active === "chat" ? "bg-emerald-50" : ""}`}>
          <MessageSquare size={20} color={active === "chat" ? "#059669" : "#9ca3af"} />
        </View>
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "chat" ? "font-black text-emerald-700" : "font-semibold text-gray-400"
          }`}
        >
          Chat
        </Text>
      </TouchableOpacity>

      {/* 5. Profil */}
      <TouchableOpacity
        onPress={() => handlePress("profil", "/p/profil")}
        activeOpacity={0.8}
        className="flex-1 items-center justify-center py-1"
      >
        <View className={`p-1.5 rounded-xl ${active === "profil" ? "bg-emerald-50" : ""}`}>
          <User size={20} color={active === "profil" ? "#059669" : "#9ca3af"} />
        </View>
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "profil" ? "font-black text-emerald-700" : "font-semibold text-gray-400"
          }`}
        >
          Profil
        </Text>
      </TouchableOpacity>
    </View>
  );
}
