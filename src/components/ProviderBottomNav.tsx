import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, DeviceEventEmitter } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Home, Search, MessageSquare, Briefcase, User } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { getStoredUser } from "../lib/user-storage";

type ProviderNavTab = "home" | "cari" | "aktivitas" | "chat" | "profil";

// Indikator aktif = titik kecil di bawah label (tak ada kotak latar, tak jadi persegi).
// Didefinisikan di module scope (bukan dalam render) agar tidak dibuat ulang tiap render.
const Dot = ({ on, color }: { on: boolean; color: string }) =>
  on ? (
    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color, marginTop: 3 }} />
  ) : (
    <View style={{ width: 5, height: 5, marginTop: 3 }} />
  );

export default function ProviderBottomNav({
  active,
  activeJobsCount = 0,
}: {
  active: ProviderNavTab;
  activeJobsCount?: number;
}) {
  const insets = useSafeAreaInsets();
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
    if (active === tab) {
      if (tab === "home") {
        DeviceEventEmitter.emit("SCROLL_TO_TOP_PROVIDER_HOME");
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
        onPress={() => handlePress("home", "/p/home")}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <Home size={21} color={active === "home" ? "#059669" : "#9ca3af"} />
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "home" ? "font-black text-emerald-700" : "font-semibold text-gray-400"
          }`}
        >
          Beranda
        </Text>
        <Dot on={active === "home"} color="#059669" />
      </TouchableOpacity>

      {/* 2. Cari Job */}
      <TouchableOpacity
        onPress={() => handlePress("cari", "/p/cari-kerja")}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <Search size={21} color={active === "cari" ? "#059669" : "#9ca3af"} />
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "cari" ? "font-black text-emerald-700" : "font-semibold text-gray-400"
          }`}
        >
          Cari Job
        </Text>
        <Dot on={active === "cari"} color="#059669" />
      </TouchableOpacity>

      {/* 3. Aktivitas / Pekerjaan */}
      <TouchableOpacity
        onPress={() => handlePress("aktivitas", "/p/aktivitas")}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <View>
          <Briefcase size={21} color={active === "aktivitas" ? "#059669" : "#9ca3af"} />
          {count > 0 ? (
            <View style={{ position: "absolute", top: -4, right: -9, backgroundColor: "#059669", width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#ffffff" }}>
              <Text style={{ color: "#ffffff", fontSize: 9, fontWeight: "900" }}>{count}</Text>
            </View>
          ) : null}
        </View>
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "aktivitas" ? "font-black text-emerald-700" : "font-semibold text-gray-400"
          }`}
        >
          Aktivitas
        </Text>
        <Dot on={active === "aktivitas"} color="#059669" />
      </TouchableOpacity>

      {/* 4. Chat */}
      <TouchableOpacity
        onPress={() => handlePress("chat", "/p/chat")}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <MessageSquare size={21} color={active === "chat" ? "#059669" : "#9ca3af"} />
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "chat" ? "font-black text-emerald-700" : "font-semibold text-gray-400"
          }`}
        >
          Chat
        </Text>
        <Dot on={active === "chat"} color="#059669" />
      </TouchableOpacity>

      {/* 5. Profil */}
      <TouchableOpacity
        onPress={() => handlePress("profil", "/p/profil")}
        activeOpacity={0.7}
        className="flex-1 items-center justify-center py-1"
      >
        <User size={21} color={active === "profil" ? "#059669" : "#9ca3af"} />
        <Text
          className={`text-[10px] mt-0.5 ${
            active === "profil" ? "font-black text-emerald-700" : "font-semibold text-gray-400"
          }`}
        >
          Profil
        </Text>
        <Dot on={active === "profil"} color="#059669" />
      </TouchableOpacity>
    </View>
  );
}