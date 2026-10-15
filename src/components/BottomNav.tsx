import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, DeviceEventEmitter } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { Home, Compass, Plus, Briefcase, User } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";

type NavTab = "home" | "radar" | "posting" | "aktivitas" | "profil";

// Indikator aktif = titik kecil di bawah label (tak ada kotak latar, tak jadi persegi).
// Didefinisikan di module scope (bukan dalam render) agar tidak dibuat ulang tiap render.
const Dot = ({ on, color }: { on: boolean; color: string }) =>
  on ? (
    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color, marginTop: 3 }} />
  ) : (
    <View style={{ width: 5, height: 5, marginTop: 3 }} />
  );

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
    if (active === tab) {
      if (tab === "home") {
        DeviceEventEmitter.emit("SCROLL_TO_TOP_CLIENT_HOME");
      }
      return;
    }
    try {
      (router as any).navigate(path as any);
    } catch {
      router.replace(path as any);
    }
  };

  return (
    <View
      className="bg-white border-t border-gray-100 px-2 pt-1.5 flex-row items-center justify-around"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {/* 1. Beranda */}
      <TouchableOpacity
        onPress={() => handlePress("home", "/c/home")}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <Home size={21} color={active === "home" ? "#ff6b00" : "#9ca3af"} />
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "home" ? "font-black text-[#ff6b00]" : "font-semibold text-gray-400"
          }`}
        >
          Beranda
        </Text>
        <Dot on={active === "home"} color="#ff6b00" />
      </TouchableOpacity>

      {/* 2. Radar */}
      <TouchableOpacity
        onPress={() => handlePress("radar", "/c/radar")}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <Compass size={21} color={active === "radar" ? "#ff6b00" : "#9ca3af"} />
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "radar" ? "font-black text-[#ff6b00]" : "font-semibold text-gray-400"
          }`}
        >
          Radar
        </Text>
        <Dot on={active === "radar"} color="#ff6b00" />
      </TouchableOpacity>

      {/* 3. FAB TENGAH: POSTING */}
      <TouchableOpacity
        onPress={() => handlePress("posting", "/c/posting")}
        activeOpacity={0.88}
        className="items-center justify-center -mt-6 px-1"
      >
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#ff6b00", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#ffffff", elevation: 4 }}>
          <Plus size={26} color="#ffffff" strokeWidth={3} />
        </View>
        <Text className="text-[10px] font-black text-gray-800 mt-0.5">Posting</Text>
      </TouchableOpacity>

      {/* 4. Aktivitas / Pekerjaan */}
      <TouchableOpacity
        onPress={() => handlePress("aktivitas", "/c/aktivitas")}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <View>
          <Briefcase size={21} color={active === "aktivitas" ? "#ff6b00" : "#9ca3af"} />
          {activeJobsCount > 0 ? (
            <View style={{ position: "absolute", top: -4, right: -9, backgroundColor: "#ff6b00", width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#ffffff" }}>
              <Text style={{ color: "#ffffff", fontSize: 9, fontWeight: "900" }}>{activeJobsCount}</Text>
            </View>
          ) : null}
        </View>
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "aktivitas" ? "font-black text-[#ff6b00]" : "font-semibold text-gray-400"
          }`}
        >
          Aktivitas
        </Text>
        <Dot on={active === "aktivitas"} color="#ff6b00" />
      </TouchableOpacity>

      {/* 5. Profil */}
      <TouchableOpacity
        onPress={() => handlePress("profil", "/c/profil")}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <User size={21} color={active === "profil" ? "#ff6b00" : "#9ca3af"} />
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "profil" ? "font-black text-[#ff6b00]" : "font-semibold text-gray-400"
          }`}
        >
          Profil
        </Text>
        <Dot on={active === "profil"} color="#ff6b00" />
      </TouchableOpacity>
    </View>
  );
}