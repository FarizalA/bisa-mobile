import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  TextInput,
  Switch,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Store,
  Eye,
  Edit3,
  Award,
  Crown,
  Gem,
  MapPinned,
  Wallet,
  Star,
  Clock3,
  Bell,
  HelpCircle,
  Settings2,
  LogOut,
  ChevronRight,
  X,
  Navigation,
  CheckCircle2,
  Info,
  MessageSquare,
  Package,
  Tag,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useProfilMobileLogic } from "../../src/hooks/useProfilMobileLogic";

function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = new Date(until).getTime() - now;
  if (diff <= 0) return <Text className="text-red-500 font-bold text-[11px]">kedaluwarsa</Text>;
  const totalSec = Math.floor(diff / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <Text className="font-mono font-bold text-[11px] text-violet-700">
      {d > 0 ? `${d} hari ` : ""}{pad(h)}:{pad(m)}:{pad(s)}
    </Text>
  );
}

export default function ProviderProfilPage() {
  const router = useRouter();
  const logic = useProfilMobileLogic("mitra");
  const {
    user,
    loading,
    isActive,
    showLogoutModal,
    setShowLogoutModal,
    showLocationModal,
    setShowLocationModal,
    showNotifSettings,
    setShowNotifSettings,
    locCoord,
    detectingGPS,
    savingLocation,
    locAlamatSingkat,
    setLocAlamatSingkat,
    locAlamatLengkap,
    setLocAlamatLengkap,
    notifChat,
    setNotifChat,
    notifOrder,
    setNotifOrder,
    notifPromo,
    setNotifPromo,
    isFeaturedActive,
    openLocationModal,
    handleDetectGPS,
    handleToggleActive,
    handleSaveLocation,
    handleLogout,
  } = logic;

  // Responsive bottom inset biar tombol tidak ketutup navigation bar (Android 11/16)
  const insets = useSafeAreaInsets();

  if (loading || !user) {
    return (
      <View className="flex-1 bg-[#faf8ff] items-center justify-center">
        <ActivityIndicator color="#059669" size="large" />
      </View>
    );
  }

  const planLabelRaw = user?.subscription_plan ? String(user.subscription_plan) : "Unggulan";
  const planTitle = planLabelRaw.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  const rankRaw: string = user.rank || "Basic";
  const isLegend = rankRaw.toLowerCase().includes("legend");
  const daysLeft = isFeaturedActive && user?.featured_until ? Math.ceil((new Date(user.featured_until).getTime() - Date.now()) / 86400000) : 0;
  const subBadge = isFeaturedActive ? `${daysLeft} hari lagi` : user?.subscription_plan ? "Nonaktif" : undefined;

  const xp = user.experience_points || 0;
  const R = [
    { key: "basic", label: "Basic", min: 0, color: "#10B981" },
    { key: "intermediate", label: "Intermediate", min: 500, color: "#3B82F6" },
    { key: "advanced", label: "Advanced", min: 1500, color: "#F59E0B" },
    { key: "expert", label: "Expert", min: 3000, color: "#CA8A04" },
    { key: "legend", label: "Legend", min: 5000, color: "#8B5CF6" },
  ];
  let cur = R[0];
  let next: any = null;
  for (let i = 0; i < R.length; i++) if (xp >= R[i].min) cur = R[i];
  const idx = R.findIndex((r) => r.key === cur.key);
  if (idx < R.length - 1) next = R[idx + 1];
  const pct = next ? Math.min(100, Math.round(((xp - cur.min) / (next.min - cur.min)) * 100)) : 100;

  return (
    <View className="flex-1 bg-[#faf8ff]" style={!isActive ? ({ filter: "grayscale(1)", opacity: 0.97 } as any) : undefined}>
      <View className="absolute top-0 left-0 right-0 h-40 bg-[#eaedff]" />

      <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: "transparent" }}>
        <View className="bg-white/90 px-4 h-16 flex-row items-center justify-between border-b border-gray-100/50 shrink-0">
          <View className="flex-row items-center gap-3 flex-1 min-w-0">
            <TouchableOpacity
              onPress={() => router.replace("/p/home" as any)}
              className="w-9 h-9 rounded-full items-center justify-center"
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color="#374151" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">Profil Saya</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.replace("/c/home" as any)}
            activeOpacity={0.85}
            className="px-3 py-1 bg-orange-100 border border-orange-200 rounded-full flex-row items-center gap-1"
          >
            <Text className="text-[10px] font-black text-orange-700">⇄ Jadi Klien</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Mitra Profil Card — 1:1 web MitraProfilCard.tsx */}
          <View className="bg-white rounded-[20px] p-5 border border-gray-100 overflow-hidden relative">
            {isFeaturedActive ? (
              <LinearGradient
                colors={["#7C3AED", "#D946EF", "#FBBF24"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3 }}
              />
            ) : null}

            <View className="flex-row items-start gap-3">
              <View className="relative shrink-0">
                {isFeaturedActive ? (
                  <LinearGradient
                    colors={["#8B5CF6", "#D946EF", "#FBBF24"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 2, borderRadius: 999 }}
                  >
                    <View className="w-16 h-16 rounded-full overflow-hidden bg-[#eaedff] border-2 border-white items-center justify-center">
                      {user.face_url ? (
                        <Image source={{ uri: user.face_url }} style={{ width: 64, height: 64 }} resizeMode="cover" />
                      ) : (
                        <Image source={require("../../assets/maskot/maskot mengacungkan jempol.png")} style={{ width: 64, height: 64 }} resizeMode="cover" />
                      )}
                    </View>
                  </LinearGradient>
                ) : (
                  <View className="w-16 h-16 rounded-full overflow-hidden bg-[#eaedff] border-2 border-white items-center justify-center">
                    {user.face_url ? (
                      <Image source={{ uri: user.face_url }} style={{ width: 64, height: 64 }} resizeMode="cover" />
                    ) : (
                      <Image source={require("../../assets/maskot/maskot mengacungkan jempol.png")} style={{ width: 64, height: 64 }} resizeMode="cover" />
                    )}
                  </View>
                )}
                {isFeaturedActive ? (
                  <LinearGradient
                    colors={["#7C3AED", "#4F46E5"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: "#ffffff",
                    }}
                  >
                    <Text className="text-white text-[11px] font-extrabold" style={{ marginTop: -1 }}>✓</Text>
                  </LinearGradient>
                ) : null}
              </View>

              <View className="flex-1 min-w-0 pt-0.5">
                <Text className="text-[18px] leading-[24px] font-bold text-[#131b2e]" numberOfLines={1}>
                  {user.name || "Pengguna BISA"}
                </Text>
                <Text className="text-[12px] text-gray-500 mt-0.5" numberOfLines={1}>
                  {user.email}
                </Text>

                {/* Rank & Rating */}
                <View className="flex-row items-center gap-1.5 mt-1.5 flex-wrap">
                  <View className={`px-3 py-1 rounded-full flex-row items-center gap-1.5 ${isLegend ? "bg-[#F3E8FF]" : "bg-emerald-50"}`}>
                    {isLegend ? <Crown size={14} color="#7C3AED" fill="#7C3AED" /> : <Award size={13} color="#047857" />}
                    <Text className={`text-[11px] font-bold ${isLegend ? "text-[#7C3AED]" : "text-emerald-700"}`}>
                      {isLegend ? "Mitra Legend" : rankRaw}
                    </Text>
                  </View>
                  <View className="px-2.5 py-1 rounded-full flex-row items-center gap-1 bg-amber-50 border border-amber-100">
                    <Star size={13} color="#b45309" fill="#f59e0b" />
                    <Text className="text-[11px] font-bold text-amber-700">
                      {user.rating ? Number(user.rating).toFixed(1) : "Baru"}
                    </Text>
                  </View>
                </View>

                {/* Premium Banner */}
                {isFeaturedActive ? (
                  <View className="flex-row flex-wrap items-center gap-1.5 mt-1.5">
                    <View className="px-2.5 py-1 rounded-full bg-violet-600 flex-row items-center gap-1">
                      <Text className="text-[11px] font-extrabold text-white">⭐ Mitra Unggulan</Text>
                    </View>
                    <Text className="text-[11px] font-semibold text-violet-700">
                      Paket {planTitle} • {user?.featured_radius_km ?? 10} km • sisa{" "}
                      <Countdown until={user.featured_until} />
                    </Text>
                    <Text className="text-[10px] text-gray-400">— Smart #1 di radius sekitar</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Saldo Pendapatan */}
            <View className="flex-row items-center justify-between pt-3 mt-3 border-t border-gray-100">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
                  <Wallet size={16} color="#2563eb" />
                </View>
                <View>
                  <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Saldo Pendapatan</Text>
                  <Text className="text-[14px] font-extrabold text-[#131b2e]">
                    Rp{(user.saldo ?? user.balance ?? 0).toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/p/dompet" as any)}
                className="px-3 py-1.5 rounded-full bg-blue-50"
              >
                <Text className="text-[11px] font-bold text-blue-600">Tarik Tunai</Text>
              </TouchableOpacity>
            </View>

            {/* XP Bar */}
            {next ? (
              <View className="bg-[#eaedff] rounded-xl p-3 w-full mt-3">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-[11px] font-bold text-[#131b2e]">{xp} XP</Text>
                  <Text className="text-[10px] text-gray-600">
                    {next.min - xp} XP ke <Text className="font-bold">{next.label}</Text>
                  </Text>
                </View>
                <View className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                  <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: (cur as any).color }} />
                </View>
              </View>
            ) : null}
          </View>

          {/* Quick Actions 3-Grid — non-aktif = grayscale & switch off */}
          <View className="flex-row gap-3 mt-4">
            <View className={`flex-1 rounded-2xl p-3 border ${isActive ? "bg-white border-gray-100/50" : "bg-gray-50 border-gray-200"}`}>
              <View className="flex-row justify-between items-start mb-2">
                <View className={`w-7 h-7 rounded-full items-center justify-center ${isActive ? "bg-emerald-50" : "bg-gray-100"}`}>
                  <Store size={14} color={isActive ? "#059669" : "#9CA3AF"} />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleToggleActive();
                  }}
                  className={`w-8 h-4 rounded-full justify-center px-0.5 ${isActive ? "bg-[#10B981]" : "bg-gray-300"}`}
                  activeOpacity={0.8}
                >
                  <View className={`w-3 h-3 rounded-full bg-white ${isActive ? "self-end" : "self-start"}`} />
                </TouchableOpacity>
              </View>
              <Text className={`text-[12px] font-bold ${isActive ? "text-[#131b2e]" : "text-gray-500"}`}>{isActive ? "Aktif" : "Istirahat"}</Text>
              <Text className={`text-[10px] ${isActive ? "text-gray-400" : "text-gray-400"}`}>Terima Pesanan</Text>
            </View>

            <TouchableOpacity
              onPress={openLocationModal}
              activeOpacity={0.85}
              className="flex-1 bg-white rounded-2xl p-3 border border-gray-100/50"
            >
              <View className={`w-7 h-7 rounded-full items-center justify-center mb-2 ${user.latitude ? "bg-teal-50" : "bg-amber-50"}`}>
                <MapPinned size={14} color={user.latitude ? "#0D9488" : "#F59E0B"} />
              </View>
              <Text className={`text-[12px] font-bold ${user.latitude ? "text-[#131b2e]" : "text-amber-700"}`} numberOfLines={1}>
                {user.latitude ? "Radar Aktif" : "Set Lokasi"}
              </Text>
              <Text className="text-[10px] text-gray-400" numberOfLines={1}>
                {user.alamat_singkat || "Wajib diatur"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push(`/p/profil/${user.id}` as any)}
              activeOpacity={0.85}
              className="flex-1 bg-white rounded-2xl p-3 border border-gray-100/50"
            >
              <View className="w-7 h-7 rounded-full bg-blue-50 items-center justify-center mb-2">
                <Eye size={14} color="#2563eb" />
              </View>
              <Text className="text-[12px] font-bold text-[#131b2e]">Profil</Text>
              <Text className="text-[10px] text-gray-400">Lihat Publik</Text>
            </TouchableOpacity>
          </View>

          {/* Akun Saya */}
          <View className="mt-6">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Akun Saya</Text>
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              <TouchableOpacity onPress={() => router.push("/profil/edit" as any)} className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center shrink-0">
                  <Edit3 size={18} color="#059669" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-gray-900">Edit Profil</Text>
                  <Text className="text-[11px] text-gray-500">Ubah foto, gallery, layanan, portfolio</Text>
                </View>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/p/misi" as any)} className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center shrink-0">
                  <Award size={18} color="#9333EA" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-gray-900">Misi Saya</Text>
                  <Text className="text-[11px] text-gray-500">Misi aktif & reward naik pangkat</Text>
                </View>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/p/langganan" as any)} className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="w-10 h-10 rounded-xl bg-violet-50 items-center justify-center shrink-0">
                  <Gem size={18} color="#7C3AED" />
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-gray-900">Langganan & Kerjasama</Text>
                    <View className={`px-2.5 py-1 rounded-full ${isFeaturedActive ? "bg-emerald-100" : "bg-amber-100"}`}>
                      <Text className={`text-[10px] font-bold ${isFeaturedActive ? "text-emerald-700" : "text-amber-700"}`}>
                        {isFeaturedActive ? "Aktif" : "Boost #1"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] text-gray-500" numberOfLines={1}>
                    {isFeaturedActive ? `⭐ Featured aktif • ${planTitle} • ${subBadge}` : "Naik ke #1 di radius-mu — 49k/bln"}
                  </Text>
                </View>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity onPress={openLocationModal} className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center shrink-0">
                  <MapPinned size={18} color="#059669" />
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-gray-900">Titik Lokasi Radar & Kerja</Text>
                    <View className={`px-2.5 py-1 rounded-full ${user.latitude ? "bg-emerald-100" : "bg-amber-100"}`}>
                      <Text className={`text-[10px] font-bold ${user.latitude ? "text-emerald-700" : "text-amber-700"}`}>
                        {user.latitude ? "Aktif di Radar" : "Belum Diatur"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] text-gray-500" numberOfLines={1}>
                    {user.alamat_singkat || user.address || (user.latitude ? `${Number(user.latitude).toFixed(4)}, ${Number(user.longitude).toFixed(4)}` : "Wajib diatur agar terdeteksi klien")}
                  </Text>
                </View>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/p/dompet" as any)} className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center shrink-0">
                  <Wallet size={18} color="#059669" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-gray-900">Dompet BISA</Text>
                  <Text className="text-[11px] text-gray-500">Saldo & riwayat transaksi</Text>
                </View>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/p/ulasan" as any)} className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="w-10 h-10 rounded-xl bg-teal-50 items-center justify-center shrink-0">
                  <Star size={18} color="#0D9488" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-gray-900">Rating & Ulasan</Text>
                  <Text className="text-[11px] text-gray-500">Lihat ulasan dari pengguna lain</Text>
                </View>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Aktivitas */}
          <View className="mt-4">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Aktivitas</Text>
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              <TouchableOpacity onPress={() => router.push("/p/aktivitas" as any)} className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center shrink-0">
                  <Clock3 size={18} color="#059669" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-900">Riwayat Pesanan</Text>
                  <Text className="text-[11px] text-gray-500">Semua pesanan & pekerjaan Anda</Text>
                </View>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowNotifSettings(true)} className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center shrink-0">
                  <Bell size={18} color="#9333EA" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-900">Pengaturan Notifikasi</Text>
                  <Text className="text-[11px] text-gray-500">Atur preferensi notifikasi</Text>
                </View>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bantuan & Lainnya */}
          <View className="mt-4">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Bantuan & Lainnya</Text>
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              <TouchableOpacity onPress={() => router.push("/p/bantuan" as any)} className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="w-10 h-10 rounded-xl bg-sky-50 items-center justify-center shrink-0">
                  <HelpCircle size={18} color="#0284C7" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-900">Pusat Bantuan / FAQ</Text>
                  <Text className="text-[11px] text-gray-500">Pertanyaan umum & panduan</Text>
                </View>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/p/pengaturan" as any)} className="flex-row items-center gap-3.5 px-4 py-3.5">
                <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center shrink-0">
                  <Settings2 size={18} color="#4B5563" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-900">Pengaturan Akun</Text>
                  <Text className="text-[11px] text-gray-500">Ganti password, kelola akun</Text>
                </View>
                <ChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowLogoutModal(true)}
            className="w-full mt-6 bg-white border border-red-100 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
          >
            <LogOut size={18} color="#EF4444" />
            <Text className="font-bold text-sm text-red-500">Keluar dari Akun</Text>
          </TouchableOpacity>

          <View className="items-center py-6">
            <Text className="text-[10px] font-semibold text-gray-400">Aplikasi BISA v1.0.0</Text>
            <Text className="text-[9px] text-gray-300 mt-0.5">© 2026 BISA — Semua Hak Dilindungi</Text>
          </View>
        </ScrollView>

        {/* 1. Logout Modal */}
        <Modal visible={!!showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="bg-white w-full max-w-sm rounded-3xl p-6 items-center">
              <Image source={require("../../assets/maskot/maskot sakit.png")} style={{ width: 80, height: 80 }} resizeMode="contain" className="mb-3" />
              <Text className="font-extrabold text-lg text-gray-900 mb-1 text-center">Yakin Mau Keluar?</Text>
              <Text className="text-xs text-gray-500 text-center leading-relaxed mb-4">
                Kamu harus login kembali untuk mengakses fitur BISA. Data pekerjaanmu tetap aman kok! 😊
              </Text>
              <View className="flex-row gap-3 w-full">
                <TouchableOpacity onPress={() => setShowLogoutModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl items-center">
                  <Text className="font-bold text-xs text-gray-700">Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout} className="flex-1 py-3 bg-red-500 rounded-xl items-center flex-row justify-center gap-1">
                  <LogOut size={16} color="#fff" />
                  <Text className="font-bold text-xs text-white">Ya, Keluar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 2. Location Modal (1:1 Web with GPS Auto-detect & Lat/Lng) */}
        <Modal visible={!!showLocationModal} transparent animationType="slide" onRequestClose={() => setShowLocationModal(false)}>
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-white rounded-t-[32px] p-5 max-h-[85%]">
              <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
                <View>
                  <Text className="font-extrabold text-base text-gray-900">Titik Lokasi Radar Mitra</Text>
                  <Text className="text-[11px] text-gray-500">Tentukan lokasi pangkalan & acuan radar kerja</Text>
                </View>
                <TouchableOpacity onPress={() => setShowLocationModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} className="py-3">
                {/* GPS Detect Button */}
                <TouchableOpacity
                  onPress={handleDetectGPS}
                  disabled={detectingGPS}
                  className="w-full py-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex-row items-center justify-center gap-2 mb-3"
                >
                  {detectingGPS ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : (
                    <Navigation size={16} color="#059669" />
                  )}
                  <Text className="text-xs font-bold text-emerald-700">
                    {detectingGPS ? "Membaca GPS Realtime..." : "Deteksi Lokasi GPS Saya"}
                  </Text>
                </TouchableOpacity>

                {/* Coordinate Grid */}
                <View className="flex-row gap-2 mb-3">
                  <View className="flex-1 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    <Text className="text-[10px] text-gray-400 font-bold uppercase">Latitude</Text>
                    <Text className="font-mono font-bold text-xs text-gray-900 mt-0.5">
                      {locCoord?.lat ? locCoord.lat.toFixed(6) : "-"}
                    </Text>
                  </View>
                  <View className="flex-1 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    <Text className="text-[10px] text-gray-400 font-bold uppercase">Longitude</Text>
                    <Text className="font-mono font-bold text-xs text-gray-900 mt-0.5">
                      {locCoord?.lng ? locCoord.lng.toFixed(6) : "-"}
                    </Text>
                  </View>
                </View>

                {/* Info Box */}
                <View className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex-row items-start gap-2 mb-3">
                  <Info size={16} color="#059669" className="shrink-0 mt-0.5" />
                  <Text className="flex-1 text-[11px] text-emerald-800 leading-relaxed font-medium">
                    Titik ini menjadi acuan sistem menghitung jarak ke pelanggan di peta <Text className="font-bold">Radar</Text> dan pencarian mitra terdekat.
                  </Text>
                </View>

                {/* Inputs */}
                <Text className="text-xs font-bold text-gray-700 mb-1">Area Layanan / Kecamatan</Text>
                <TextInput
                  value={locAlamatSingkat}
                  onChangeText={setLocAlamatSingkat}
                  placeholder="Contoh: Bojongsari, Majenang"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 mb-3"
                />

                <Text className="text-xs font-bold text-gray-700 mb-1">Alamat Lengkap Domisili / Pangkalan</Text>
                <TextInput
                  value={locAlamatLengkap}
                  onChangeText={setLocAlamatLengkap}
                  placeholder="Jl. Gajah Mada No. 45"
                  multiline
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 mb-3 min-h-[64px]"
                />
              </ScrollView>

              <View
                className="pt-3 border-t border-gray-100 flex-row gap-2.5 bg-white"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
              >
                <TouchableOpacity onPress={() => setShowLocationModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl items-center">
                  <Text className="font-bold text-xs text-gray-700">Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveLocation}
                  disabled={savingLocation}
                  className="flex-[2] py-3 bg-emerald-600 rounded-xl items-center flex-row justify-center gap-1.5"
                >
                  {savingLocation ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <CheckCircle2 size={16} color="#fff" />
                  )}
                  <Text className="text-white font-extrabold text-xs">
                    {savingLocation ? "Menyimpan..." : "Simpan Lokasi Radar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 3. Notification Settings Modal (1:1 Web) */}
        <Modal visible={!!showNotifSettings} transparent animationType="slide" onRequestClose={() => setShowNotifSettings(false)}>
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-white rounded-t-[32px] p-5">
              <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
                <Text className="text-base font-extrabold text-gray-900">Pengaturan Notifikasi</Text>
                <TouchableOpacity onPress={() => setShowNotifSettings(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View className="py-4 gap-3">
                {/* Chat Toggle */}
                <View className="flex-row items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <View className="flex-row items-center gap-3 flex-1 mr-2">
                    <View className="w-9 h-9 rounded-xl bg-purple-50 items-center justify-center">
                      <MessageSquare size={18} color="#9333EA" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-gray-900">Pesan Masuk (Chat)</Text>
                      <Text className="text-[10px] text-gray-500">Notifikasi saat ada chat dari klien</Text>
                    </View>
                  </View>
                  <Switch
                    value={notifChat}
                    onValueChange={setNotifChat}
                    trackColor={{ false: "#D1D5DB", true: "#9333EA" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Pesanan Toggle */}
                <View className="flex-row items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <View className="flex-row items-center gap-3 flex-1 mr-2">
                    <View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center">
                      <Package size={18} color="#059669" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-gray-900">Pekerjaan & Pesanan</Text>
                      <Text className="text-[10px] text-gray-500">Notifikasi status order dan tawaran baru</Text>
                    </View>
                  </View>
                  <Switch
                    value={notifOrder}
                    onValueChange={setNotifOrder}
                    trackColor={{ false: "#D1D5DB", true: "#059669" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Promo Toggle */}
                <View className="flex-row items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <View className="flex-row items-center gap-3 flex-1 mr-2">
                    <View className="w-9 h-9 rounded-xl bg-amber-50 items-center justify-center">
                      <Tag size={18} color="#D97706" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-gray-900">Info Promo & Update</Text>
                      <Text className="text-[10px] text-gray-500">Penawaran diskon dan event mitra</Text>
                    </View>
                  </View>
                  <Switch
                    value={notifPromo}
                    onValueChange={setNotifPromo}
                    trackColor={{ false: "#D1D5DB", true: "#D97706" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowNotifSettings(false)}
                className="w-full py-3 bg-emerald-600 rounded-xl items-center mt-2"
              >
                <Text className="text-white font-bold text-xs">Simpan Pengaturan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
