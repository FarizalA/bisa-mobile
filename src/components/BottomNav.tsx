import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { Home, Compass, Plus, Briefcase, User } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";

type NavTab = "home" | "radar" | "posting" | "aktivitas" | "profil";

export default function BottomNav({ active }: { active: NavTab }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeJobsCount, setActiveJobsCount] = useState<number>(0);

  useEffect(() => {
    const fetchActiveJobs = async () => {
      try {
        const user: any = await getStoredUser();
        if (!user?.id) return;
        const { count, error } = await supabase
          .from("pekerjaan_bisa")
          .select("*", { count: "exact", head: true })
          .eq("pelanggan_id", user.id)
          .in("status", [
            "menunggu_verifikasi",
            "mencari_mitra",
            "ditawarkan",
            "diproses",
            "menuju_lokasi",
            "mulai_kerja",
          ]);

        if (!error && count !== null) {
          setActiveJobsCount(count);
        }
      } catch (err) {
        console.warn("fetchActiveJobs count err:", err);
      }
    };
    fetchActiveJobs();
  }, []);

  const handlePress = (tab: NavTab, path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (active === tab) return;
    try {
      (router as any).navigate(path as any);
    } catch {
      router.replace(path as any);
    }
  };

  return (
    <View
      className="bg-white border-t border-gray-100 px-2 pt-1.5 flex-row items-center justify-around shadow-lg"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {/* 1. Beranda */}
      <TouchableOpacity
        onPress={() => handlePress("home", "/c/home")}
        activeOpacity={0.8}
        className="flex-1 items-center justify-center py-1"
      >
        <View className={`w-9 h-9 rounded-full items-center justify-center ${active === "home" ? "bg-orange-50" : ""}`}>
          <Home size={20} color={active === "home" ? "#ff6b00" : "#9ca3af"} />
        </View>
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "home" ? "font-black text-[#ff6b00]" : "font-semibold text-gray-400"
          }`}
        >
          Beranda
        </Text>
      </TouchableOpacity>

      {/* 2. Radar */}
      <TouchableOpacity
        onPress={() => handlePress("radar", "/c/radar")}
        activeOpacity={0.8}
        className="flex-1 items-center justify-center py-1"
      >
        <View className={`w-9 h-9 rounded-full items-center justify-center ${active === "radar" ? "bg-orange-50" : ""}`}>
          <Compass size={20} color={active === "radar" ? "#ff6b00" : "#9ca3af"} />
        </View>
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "radar" ? "font-black text-[#ff6b00]" : "font-semibold text-gray-400"
          }`}
        >
          Radar
        </Text>
      </TouchableOpacity>

      {/* 3. FAB TENGAH: POSTING */}
      <TouchableOpacity
        onPress={() => handlePress("posting", "/c/posting")}
        activeOpacity={0.88}
        className="items-center justify-center -mt-6 px-1"
      >
        <View className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-[#ff6b00] items-center justify-center border-4 border-white shadow-lg">
          <Plus size={26} color="#ffffff" strokeWidth={3} />
        </View>
        <Text className="text-[10px] font-black text-gray-800 mt-0.5">Posting</Text>
      </TouchableOpacity>

      {/* 4. Aktivitas / Pekerjaan */}
      <TouchableOpacity
        onPress={() => handlePress("aktivitas", "/c/aktivitas")}
        activeOpacity={0.8}
        className="flex-1 items-center justify-center py-1 relative"
      >
        <View className={`w-9 h-9 rounded-full items-center justify-center relative ${active === "aktivitas" ? "bg-orange-50" : ""}`}>
          <Briefcase size={20} color={active === "aktivitas" ? "#ff6b00" : "#9ca3af"} />
          {activeJobsCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-[#ff6b00] w-4 h-4 rounded-full items-center justify-center border border-white">
              <Text className="text-white text-[9px] font-black">{activeJobsCount}</Text>
            </View>
          )}
        </View>
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "aktivitas" ? "font-black text-[#ff6b00]" : "font-semibold text-gray-400"
          }`}
        >
          Aktivitas
        </Text>
      </TouchableOpacity>

      {/* 5. Profil */}
      <TouchableOpacity
        onPress={() => handlePress("profil", "/c/profil")}
        activeOpacity={0.8}
        className="flex-1 items-center justify-center py-1"
      >
        <View className={`w-9 h-9 rounded-full items-center justify-center ${active === "profil" ? "bg-orange-50" : ""}`}>
          <User size={20} color={active === "profil" ? "#ff6b00" : "#9ca3af"} />
        </View>
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "profil" ? "font-black text-[#ff6b00]" : "font-semibold text-gray-400"
          }`}
        >
          Profil
        </Text>
      </TouchableOpacity>
    </View>
  );
}
